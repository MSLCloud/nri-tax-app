const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');
const axios = require('axios');
const pdfParse = require('pdf-parse');
const {
  buildYearlyPositions,
  computeMtmSummary,
  normalizeYearEndNavFx,
  parseTransactionsFromRaw
} = require('../utils/mtm-engine');
const { parseKfintechStatement } = require('../utils/kfintech-pdf-parser');

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

/**
 * POST /api/mf/parse-kfintech-pdf
 * Accept a Kfintech PDF statement, extract text via pdf-parse or OCR.Space fallback,
 * then parse structured data using kfintech-pdf-parser.
 */
router.post('/parse-kfintech-pdf', upload.single('pdf'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'PDF file is required. Upload as "pdf" field.' });
    }

    console.log(`[parse-kfintech-pdf] Received PDF: ${req.file.originalname} (${req.file.size} bytes)`);

    const pdfBuffer = req.file.buffer;
    let pdfText = '';

    // Step 1: Try extracting text directly using pdf-parse
    try {
      console.log('[parse-kfintech-pdf] Attempting text extraction with pdf-parse...');
      const pdfData = await pdfParse(pdfBuffer);
      pdfText = (pdfData.text || '').trim();
      console.log(`[parse-kfintech-pdf] pdf-parse extracted ${pdfText.length} characters from ${pdfData.numpages} pages`);
    } catch (parseErr) {
      console.warn('[parse-kfintech-pdf] pdf-parse failed:', parseErr.message);
    }

    // Step 2: If text extraction failed or returned empty, fall back to OCR.Space
    if (!pdfText) {
      console.log('[parse-kfintech-pdf] Text extraction empty/failed, falling back to OCR.Space...');

      const base64Pdf = pdfBuffer.toString('base64');
      const ocrPayload = {
        apikey: 'K87899142372',
        base64Image: `data:application/pdf;base64,${base64Pdf}`,
        isOverlayRequired: false
      };

      try {
        const ocrResponse = await axios.post('https://api.ocr.space/parse/image', ocrPayload, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 60000
        });

        const ocrData = ocrResponse.data;
        if (ocrData && ocrData.ParsedResults && ocrData.ParsedResults.length > 0) {
          pdfText = ocrData.ParsedResults.map(r => r.ParsedText || '').join('\n').trim();
          console.log(`[parse-kfintech-pdf] OCR.Space extracted ${pdfText.length} characters`);
        } else {
          const errorMsg = ocrData?.ErrorMessage || 'No parsed results returned';
          console.error('[parse-kfintech-pdf] OCR.Space returned no results:', errorMsg);
          return res.status(500).json({
            error: 'OCR failed to extract text from PDF',
            details: errorMsg
          });
        }
      } catch (ocrErr) {
        console.error('[parse-kfintech-pdf] OCR.Space request failed:', ocrErr.message);
        return res.status(500).json({
          error: 'OCR service request failed',
          details: ocrErr.message
        });
      }
    }

    // Step 3: Parse the extracted text
    if (!pdfText) {
      return res.status(500).json({ error: 'Could not extract any text from the PDF' });
    }

    console.log('[parse-kfintech-pdf] Parsing extracted text with kfintech-pdf-parser...');
    const parsed = parseKfintechStatement(pdfText);
    console.log(`[parse-kfintech-pdf] Parsed ${parsed.funds.length} funds, ${parsed.transactions.length} transactions`);

    res.json({ success: true, parsed });

  } catch (error) {
    console.error('[parse-kfintech-pdf] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/health', (req, res) => {
  res.json({ status: 'MF routes working' });
});

module.exports = router;
