/**
 * MTM Engine for Indian Mutual Funds (PFIC Compliance)
 * Processes KFintech transactions + NAV/FX data → IRS Form 8621 MTM Summary
 */

// ============================================================================
// 1. NORMALIZE NAV/FX FILE
// ============================================================================

function normalizeYearEndNavFx(rawRows, yearHint) {
    const result = [];
  
    for (const row of rawRows) {
      // Map fund name
      const fundName =
        row['Fund Name'] ||
        row['Scheme Name'] ||
        row['SHORT_NAME'] ||
        row['scheme_name'] ||
        '';
  
      if (!fundName) continue;
  
      // Extract year
      let year = yearHint || row['Year'] || row['year'];
      if (!year) {
        const navKeys = Object.keys(row).filter(k =>
          k.toLowerCase().includes('nav')
        );
        for (const key of navKeys) {
          const match = key.match(/(\d{4})/);
          if (match) {
            year = parseInt(match[1], 10);
            break;
          }
        }
      }
  
      if (!year) continue;
  
      // Extract NAV
      const navInr =
        parseFloat(row['NAV_YearEnd_INR']) ||
        parseFloat(row['nav_inr']) ||
        parseFloat(row['NAV per unit']) ||
        0;
  
      if (navInr <= 0) continue;
  
      // Extract FX rate
      const fxUsdPerInr =
        parseFloat(row['FX_YearEnd_USD_per_INR']) ||
        parseFloat(row['fx_rate']) ||
        parseFloat(row['Exchange Rate']) ||
        0.012;
  
      if (fxUsdPerInr <= 0) continue;
  
      result.push({
        fundName: fundName.trim(),
        year,
        navInr,
        fxUsdPerInr
      });
    }
  
    return result;
  }
  
  // ============================================================================
  // 2. BUILD YEARLY POSITIONS FROM KFINTECH TRANSACTIONS
  // ============================================================================
  
  function buildYearlyPositions(transactions) {
    const grouped = new Map();
  
    // Group transactions by (fundName, year)
    for (const trx of transactions) {
      const year = new Date(trx.trxnDate).getFullYear();
      const key = trx.fundName;
  
      if (!grouped.has(key)) {
        grouped.set(key, new Map());
      }
      const yearMap = grouped.get(key);
      if (!yearMap.has(year)) {
        yearMap.set(year, []);
      }
      yearMap.get(year).push(trx);
    }
  
    const result = [];
  
    // Process each fund
    for (const [fundName, yearMap] of grouped) {
      const years = Array.from(yearMap.keys()).sort((a, b) => a - b);
  
      let cumulativeUnits = 0;
  
      for (const year of years) {
        const yearTransactions = yearMap.get(year);
  
        // Calculate additions (BUY only)
        const additionsUSD = yearTransactions
          .filter(t => t.trxnType === 'BUY')
          .reduce((sum, t) => sum + (t.amountUSD || 0), 0);
  
        // Calculate net units change (BUY + SELL)
        const netUnitsChange = yearTransactions
          .filter(t => t.trxnType === 'BUY' || t.trxnType === 'SELL')
          .reduce((sum, t) => sum + (t.trxnUnits || 0), 0);
  
        cumulativeUnits += netUnitsChange;
  
        result.push({
          fundName,
          year,
          additionsUSD,
          unitsYearEnd: Math.max(0, cumulativeUnits)
        });
      }
    }
  
    return result;
  }
  
  // ============================================================================
  // 3. COMPUTE MTM SUMMARY
  // ============================================================================
  
  function computeMtmSummary(yearlyPositions, yearEndNavFxList) {
    // Index NAV/FX data
    const navFxMap = new Map();
    for (const navFx of yearEndNavFxList) {
      const key = `${navFx.fundName}|${navFx.year}`;
      navFxMap.set(key, navFx);
    }
  
    // Group positions by fund
    const positionsByFund = new Map();
    for (const pos of yearlyPositions) {
      if (!positionsByFund.has(pos.fundName)) {
        positionsByFund.set(pos.fundName, []);
      }
      positionsByFund.get(pos.fundName).push(pos);
    }
  
    const result = [];
  
    // Process each fund independently
    for (const [fundName, positions] of positionsByFund) {
      positions.sort((a, b) => a.year - b.year);
  
      let cumulativeAdditionsUSD = 0;
  
      for (const pos of positions) {
        if (pos.unitsYearEnd <= 0) continue;
  
        const key = `${fundName}|${pos.year}`;
        const navFx = navFxMap.get(key);
  
        if (!navFx) {
          console.warn(
            `Missing NAV/FX data for ${fundName} in year ${pos.year}`
          );
          continue;
        }
  
        // Compute FMV
        const fmvInr = pos.unitsYearEnd * navFx.navInr;
        const fmvUsd = fmvInr * navFx.fxUsdPerInr;
  
        // Beginning basis
        const beginningBasisUSD = cumulativeAdditionsUSD;
  
        // MTM Gain/Loss
        const mtmGainLossUSD = fmvUsd - beginningBasisUSD;
  
        // MTM Inclusion (loss limitation)
        const mtmInclusionUSD = Math.max(mtmGainLossUSD, 0);
  
        cumulativeAdditionsUSD += pos.additionsUSD;
  
        result.push({
          fundName,
          year: pos.year,
          additionsUSD: pos.additionsUSD,
          unitsYearEnd: pos.unitsYearEnd,
          navInr: navFx.navInr,
          fxUsdPerInr: navFx.fxUsdPerInr,
          fmvInr,
          fmvUsd,
          beginningBasisUSD,
          mtmGainLossUSD,
          mtmInclusionUSD
        });
      }
    }
  
    return result;
  }
  
  // ============================================================================
  // 4. HELPER: Parse Transactions from Raw Rows
  // ============================================================================
  
  function parseTransactionsFromRaw(rawRows) {
    return rawRows.map((row) => ({
      fundName: row['Fund Name'] || row['Scheme Name'] || row['SHORT_NAME'] || '',
      trxnDate: row['Transaction Date'] || row['Date'] || new Date(),
      trxnType: (row['Type'] || row['TRXN_TYPE'] || 'OTHER').toUpperCase(),
      trxnUnits: parseFloat(row['Units'] || row['TRXN_UNITS'] || '0'),
      amountINR: parseFloat(row['Amount INR'] || row['amount_inr'] || '0'),
      amountUSD: parseFloat(row['Amount USD'] || row['amount_usd'] || '0')
    })).filter(t => t.fundName); // Filter out empty rows
  }
  
  // ============================================================================
  // 5. EXPORTS
  // ============================================================================
  
  module.exports = {
    normalizeYearEndNavFx,
    buildYearlyPositions,
    computeMtmSummary,
    parseTransactionsFromRaw
  };