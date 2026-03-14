const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['text/csv', 'text/plain', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

/**
 * RFC 4180 compliant CSV parser - handles quoted fields with commas inside
 */
function parseCSV(csvText) {
  const lines = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    if (char === '"') {
      inQuotes = !inQuotes;
      current += char;
    } else if (inQuotes) {
      if (char === '\n' || char === '\r') {
        current += char;
      } else {
        current += char;
      }
    } else if (char === '\n' || (char === '\r' && csvText[i + 1] !== '\n')) {
      lines.push(current);
      current = '';
    } else if (char === '\r' && csvText[i + 1] === '\n') {
      lines.push(current);
      current = '';
      i++;
    } else {
      current += char;
    }
  }
  if (current) lines.push(current);

  const parseRow = (line) => {
    const values = [];
    let val = '';
    let quoted = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (quoted && line[i + 1] === '"') {
          val += '"';
          i++;
        } else {
          quoted = !quoted;
        }
      } else if ((c === ',' && !quoted) || (c === '\n' && !quoted) || (c === '\r' && !quoted)) {
        values.push(val.trim());
        val = '';
      } else {
        val += c;
      }
    }
    values.push(val.trim());
    return values;
  };

  const rows = lines.filter(l => l.trim()).map(parseRow);
  return rows;
}

/**
 * Map various mutual fund statement column names to our standard fields
 * Supports: CAMS, Kfintech, and our expected format
 */
const COLUMN_ALIASES = {
  schemeName: ['Scheme Name', 'scheme_name', 'Scheme', 'Fund Name', 'fund_name', 'Fund', 'Scheme/Fund'],
  units: ['Units', 'units', 'Balance Units', 'balance_units', 'Quantity', 'quantity'],
  nav: ['NAV', 'nav', 'Nav', 'NAV per Unit', 'nav_per_unit'],
  costBasis: ['Cost Basis', 'cost_basis', 'Cost', 'Purchase Value', 'purchase_value', 'Amount', 'amount', 'Value (Rs)', 'Value (USD)'],
  fmvUsd: ['FMV (USD)', 'fmv_usd', 'FMV', 'Value USD', 'value_usd']
};

function mapRowToStandard(row, headers) {
  const getValue = (aliases) => {
    for (const alias of aliases) {
      const key = headers.find(h => h.trim().toLowerCase() === alias.toLowerCase());
      if (key !== undefined && row[key] !== undefined && row[key] !== '') {
        return String(row[key]).trim();
      }
    }
    return null;
  };

  return {
    schemeName: getValue(COLUMN_ALIASES.schemeName) || 'Unknown Scheme',
    units: getValue(COLUMN_ALIASES.units) || '0',
    nav: getValue(COLUMN_ALIASES.nav) || '0',
    costBasis: getValue(COLUMN_ALIASES.costBasis) || '0',
    fmvUsd: getValue(COLUMN_ALIASES.fmvUsd)
  };
}

// POST /api/upload/csv
// Parse CSV file - supports quoted fields and multiple column name formats
router.post('/csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    let csv = req.file.buffer.toString('utf-8');
    if (csv.charCodeAt(0) === 0xFEFF) csv = csv.slice(1); // Remove BOM
    const rows = parseCSV(csv);

    if (rows.length === 0) {
      return res.status(400).json({ error: 'CSV file is empty' });
    }

    const headers = rows[0];
    const dataRows = rows.slice(1);

    const data = dataRows
      .filter(values => values.some(v => v && v.trim()))
      .map(values => {
        const row = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return mapRowToStandard(row, headers);
      })
      .filter(row => {
        const units = parseFloat(String(row.units).replace(/,/g, ''));
        const nav = parseFloat(String(row.nav).replace(/,/g, ''));
        return !isNaN(units) && !isNaN(nav) && units > 0 && nav > 0;
      });

    res.json({
      success: true,
      fileName: req.file.originalname,
      rowCount: data.length,
      headers,
      data
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/upload/excel
// Parse Excel file (basic support)
router.post('/excel', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    res.json({
      success: true,
      message: 'Excel upload received. Advanced parsing coming soon.',
      fileName: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;