const express = require('express');
const PDFDocument = require('pdfkit');
const router = express.Router();

// POST /api/forms/generate-1040
// Generate Form 1040 PDF
router.post('/generate-1040', (req, res) => {
  try {
    const { name, ssn, totalIncome, taxableIncome, federalTax, withholding } = req.body;

    // Create PDF
    const doc = new PDFDocument({ bufferPages: true });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Form1040.pdf"');
      res.send(pdfBuffer);
    });

    // Add content to PDF
    doc.fontSize(12).text('FORM 1040 - U.S. Individual Income Tax Return', { align: 'center' });
    doc.fontSize(10).text(`Tax Year: 2025`, { align: 'center' });
    
    doc.moveTo(50, 100).lineTo(550, 100).stroke();
    
    doc.fontSize(9);
    doc.text(`Name: ${name || 'N/A'}`, 60, 120);
    doc.text(`SSN: ${ssn || 'N/A'}`, 60, 140);
    
    doc.moveTo(50, 160).lineTo(550, 160).stroke();
    
    doc.fontSize(11).text('Income Information', 60, 180);
    doc.fontSize(9);
    doc.text(`Total Income: $${totalIncome || 0}`, 60, 210);
    doc.text(`Standard Deduction: $13,850`, 60, 230);
    doc.text(`Taxable Income: $${taxableIncome || 0}`, 60, 250);
    
    doc.moveTo(50, 270).lineTo(550, 270).stroke();
    
    doc.fontSize(11).text('Tax Calculation', 60, 290);
    doc.fontSize(9);
    doc.text(`Federal Tax: $${federalTax || 0}`, 60, 320);
    doc.text(`Tax Withheld: $${withholding || 0}`, 60, 340);
    doc.text(`Amount Due/Refund: $${(federalTax || 0) - (withholding || 0)}`, 60, 360);
    
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/forms/generate-8621
// Generate Form 8621 PDF (PFIC)
router.post('/generate-8621', (req, res) => {
  try {
    const { name, ssn, funds, mtmGain } = req.body;

    const doc = new PDFDocument({ bufferPages: true });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Form8621.pdf"');
      res.send(pdfBuffer);
    });

    doc.fontSize(12).text('FORM 8621 - Return by a Shareholder of a Passive Foreign Investment Company', { align: 'center' });
    doc.fontSize(9);
    doc.text(`Name: ${name || 'N/A'} SSN: ${ssn || 'N/A'}`, 60, 120);
    
    doc.moveTo(50, 140).lineTo(550, 140).stroke();
    
    doc.fontSize(10).text('PFIC Holdings', 60, 160);
    
    let yPosition = 190;
    doc.fontSize(8);
    
    if (funds && funds.length > 0) {
      funds.forEach((fund, index) => {
        doc.text(`${index + 1}. ${fund.schemeName}`, 70, yPosition);
        doc.text(`   Units: ${fund.units} | NAV: $${fund.navPerUnit} | FMV: $${fund.fmv}`, 70, yPosition + 15);
        yPosition += 40;
      });
    }
    
    doc.moveTo(50, yPosition).lineTo(550, yPosition).stroke();
    
    doc.fontSize(10).text('Summary', 60, yPosition + 20);
    doc.fontSize(9);
    doc.text(`Total MTM Gain: $${mtmGain || 0}`, 60, yPosition + 45);
    doc.text(`Election Type: Mark-to-Market (MTM)`, 60, yPosition + 65);
    
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/forms/generate-1118
// Generate Form 1118 PDF (Foreign Tax Credit)
router.post('/generate-1118', (req, res) => {
  try {
    const { name, ssn, foreignTaxPaid, ftcLimit, ftcClaimed } = req.body;

    const doc = new PDFDocument({ bufferPages: true });
    const chunks = [];

    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename="Form1118.pdf"');
      res.send(pdfBuffer);
    });

    doc.fontSize(12).text('FORM 1118 - Foreign Tax Credit', { align: 'center' });
    doc.fontSize(9);
    doc.text(`Name: ${name || 'N/A'} SSN: ${ssn || 'N/A'}`, 60, 120);
    
    doc.moveTo(50, 140).lineTo(550, 140).stroke();
    
    doc.fontSize(10).text('Foreign Taxes Paid', 60, 160);
    doc.fontSize(9);
    doc.text(`India - Income Tax: $${foreignTaxPaid || 0}`, 60, 190);
    
    doc.moveTo(50, 210).lineTo(550, 210).stroke();
    
    doc.fontSize(10).text('FTC Limitation Calculation', 60, 230);
    doc.fontSize(9);
    doc.text(`FTC Limit: $${ftcLimit || 0}`, 60, 260);
    doc.text(`Foreign Tax Paid: $${foreignTaxPaid || 0}`, 60, 280);
    doc.text(`FTC to Claim: $${ftcClaimed || 0}`, 60, 300);
    
    doc.end();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;