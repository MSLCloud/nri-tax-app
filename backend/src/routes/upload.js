const express = require('express');
const multer = require('multer');
const router = express.Router();

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowed = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/pdf'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  }
});

// POST /api/upload/csv
// Parse CSV file
router.post('/csv', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const csv = req.file.buffer.toString('utf-8');
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());

    const data = lines.slice(1)
      .filter(line => line.trim())
      .map(line => {
        const values = line.split(',').map(v => v.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index];
        });
        return row;
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