const express = require('express');
const router = express.Router();

// POST /api/calculate/mtm
// Calculate MTM tax for mutual funds
router.post('/mtm', (req, res) => {
  try {
    const { funds } = req.body;
    
    if (!funds || funds.length === 0) {
      return res.status(400).json({ error: 'No funds provided' });
    }

    // Calculate totals
    let totalMTM = 0;
    let totalFMV = 0;
    let totalBasis = 0;

    const calculatedFunds = funds.map(fund => {
      const fmv = parseFloat(fund.units) * parseFloat(fund.navPerUnit);
      const basis = parseFloat(fund.costBasis);
      const gain = fmv - basis;
      
      totalMTM += gain;
      totalFMV += fmv;
      totalBasis += basis;

      return {
        ...fund,
        fmv: parseFloat(fmv.toFixed(2)),
        mtm_gain: parseFloat(gain.toFixed(2))
      };
    });

    // Calculate taxes
    const federalTaxRate = 0.32; // 32% bracket
    const niitRate = 0.038; // 3.8% NIIT

    const federalTax = totalMTM * federalTaxRate;
    const niit = totalMTM * niitRate;
    const totalTax = federalTax + niit;

    res.json({
      success: true,
      summary: {
        totalMTM: parseFloat(totalMTM.toFixed(2)),
        totalFMV: parseFloat(totalFMV.toFixed(2)),
        totalBasis: parseFloat(totalBasis.toFixed(2)),
        federalTax: parseFloat(federalTax.toFixed(2)),
        niit: parseFloat(niit.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2))
      },
      funds: calculatedFunds
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/calculate/complete
// Calculate complete tax return (all income sources)
router.post('/complete', (req, res) => {
  try {
    const { w2Income, mtmGains, rentalIncome, businessIncome } = req.body;

    // Total income
    const totalIncome = 
      (parseFloat(w2Income) || 0) +
      (parseFloat(mtmGains) || 0) +
      (parseFloat(rentalIncome) || 0) +
      (parseFloat(businessIncome) || 0);

    // Standard deduction 2025
    const standardDeduction = 13850;

    // Taxable income
    const taxableIncome = Math.max(0, totalIncome - standardDeduction);

    // Simple tax calculation (will be more complex with brackets)
    const federalTax = taxableIncome * 0.32;
    const niit = Math.max(0, mtmGains - 250000) * 0.038; // NIIT threshold

    const totalTax = federalTax + niit;

    res.json({
      success: true,
      calculation: {
        totalIncome: parseFloat(totalIncome.toFixed(2)),
        standardDeduction,
        taxableIncome: parseFloat(taxableIncome.toFixed(2)),
        federalTax: parseFloat(federalTax.toFixed(2)),
        niit: parseFloat(niit.toFixed(2)),
        totalTax: parseFloat(totalTax.toFixed(2))
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;