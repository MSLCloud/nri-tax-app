const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const {
  buildYearlyPositions,
  computeMtmSummary,
  normalizeYearEndNavFx,
  parseTransactionsFromRaw
} = require('../utils/mtm-engine');

const router = express.Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }
});

/**
 * POST /api/mf/upload-kfintech
 */
router.post('/upload-kfintech', upload.fields([
  { name: 'kfintechFile', maxCount: 1 },
  { name: 'navFxFile', maxCount: 1 }
]), async (req, res) => {
  try {
    const { userId, taxYear } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId required' });
    }

    // Parse Kfintech
    if (!req.files.kfintechFile || req.files.kfintechFile.length === 0) {
      return res.status(400).json({ error: 'Kfintech file required' });
    }

    const kfintechFile = req.files.kfintechFile[0];
    const kfintechWorkbook = XLSX.read(kfintechFile.buffer);
    const kfintechSheet = kfintechWorkbook.Sheets[kfintechWorkbook.SheetNames[0]];
    const kfintechRows = XLSX.utils.sheet_to_json(kfintechSheet);

    console.log(`✓ Parsed ${kfintechRows.length} rows from Kfintech`);

    const transactions = parseTransactionsFromRaw(kfintechRows);
    console.log(`✓ Converted to ${transactions.length} transactions`);

    // Parse NAV/FX
    if (!req.files.navFxFile || req.files.navFxFile.length === 0) {
      return res.status(400).json({ error: 'NAV/FX file required' });
    }

    const navFxFile = req.files.navFxFile[0];
    const navFxWorkbook = XLSX.read(navFxFile.buffer);
    const navFxSheet = navFxWorkbook.Sheets[navFxWorkbook.SheetNames[0]];
    const navFxRows = XLSX.utils.sheet_to_json(navFxSheet);

    console.log(`✓ Parsed ${navFxRows.length} NAV/FX records`);

    const navFxData = normalizeYearEndNavFx(navFxRows);
    console.log(`✓ Normalized ${navFxData.length} NAV/FX records`);

    // Build positions
    const yearlyPositions = buildYearlyPositions(transactions);
    console.log(`✓ Built ${yearlyPositions.length} yearly positions`);

    // Compute MTM
    const mtmSummary = computeMtmSummary(yearlyPositions, navFxData);
    console.log(`✓ Computed MTM for ${mtmSummary.length} fund-years`);

    if (mtmSummary.length === 0) {
      return res.status(400).json({ 
        error: 'No MTM data computed. Check NAV/FX matches fund names.' 
      });
    }

    res.json({
      success: true,
      message: `Successfully processed ${new Set(mtmSummary.map(r => r.fundName)).size} funds`,
      fundCount: new Set(mtmSummary.map(r => r.fundName)).size,
      fundYearCount: mtmSummary.length,
      mtmSummary: mtmSummary.map(row => ({
        fundName: row.fundName,
        year: row.year,
        unitsYearEnd: row.unitsYearEnd,
        navInr: row.navInr,
        fmvUsd: parseFloat(row.fmvUsd.toFixed(2)),
        mtmInclusionUSD: parseFloat(row.mtmInclusionUSD.toFixed(2)),
        beginningBasisUSD: parseFloat(row.beginningBasisUSD.toFixed(2)),
        mtmGainLossUSD: parseFloat(row.mtmGainLossUSD.toFixed(2))
      }))
    });

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'MF routes working' });
});

module.exports = router;