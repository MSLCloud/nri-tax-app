/**
 * MTM Engine for Indian Mutual Funds (PFIC Compliance)
 * Processes KFintech transactions + NAV/FX data → IRS Form 8621 MTM Summary
 * 
 * Per IRC §1296 (Mark-to-Market Election)
 */

// ============================================================================
// 1. DATA MODELS
// ============================================================================

/**
 * Raw transaction row from KFintech (after parsing/normalizing)
 */
export interface Transaction {
  fundName: string;          // e.g., "Kotak Small Cap Fund"
  trxnDate: Date;            // transaction date
  trxnType: 'BUY' | 'SELL' | 'DIVIDEND' | 'STT' | 'OTHER';
  trxnUnits: number;         // positive for BUY, negative for SELL
  amountINR: number;         // transaction amount in INR (gross)
  amountUSD: number;         // same transaction converted to USD
}

/**
 * Year-end NAV and FX data (user-maintained file)
 * Maps to: NAV_Calculation_31_Dec_25.xlsx sheet
 */
export interface YearEndNavFx {
  fundName: string;          // must match Transaction.fundName
  year: number;              // calendar year, e.g., 2022, 2023, 2024, 2025
  navInr: number;            // NAV per unit at last business day of year, in INR
  fxUsdPerInr: number;       // INR → USD rate on that year-end date
}

/**
 * Per-fund, per-year position derived from transactions
 * Replicates: Consolidated_Pivot_2022_2025 sheet
 */
export interface YearlyPosition {
  fundName: string;
  year: number;
  additionsUSD: number;      // sum of BUY amountUSD in that year
  unitsYearEnd: number;      // cumulative units held at 31 Dec of that year
}

/**
 * MTM summary row (one per fund per year)
 * Replicates: MTM_Summary sheet with IRS Form 8621 Part IV mapping
 */
export interface MtmSummaryRow {
  fundName: string;
  year: number;

  // Inputs from transactions
  additionsUSD: number;
  unitsYearEnd: number;

  // Inputs from NAV/FX file
  navInr: number;
  fxUsdPerInr: number;

  // Computed FMV
  fmvInr: number;            // unitsYearEnd * navInr
  fmvUsd: number;            // fmvInr * fxUsdPerInr

  // IRC §1296 MTM Calculation (Form 8621 Part IV)
  // Box 10b: Beginning Basis
  beginningBasisUSD: number; // cumulative additions before this year

  // Box 10c: MTM Gain/Loss (before loss limitation)
  mtmGainLossUSD: number;    // fmvUsd - beginningBasisUSD

  // Box 10d: MTM Inclusion (after loss limitation)
  // Per IRC §1296(a)(2): loss is ordinary only to extent of prior gains
  mtmInclusionUSD: number;   // max(mtmGainLossUSD, 0) for now
}

// ============================================================================
// 2. NORMALIZE NAV/FX FILE
// ============================================================================

/**
 * Normalize raw NAV/FX rows from CSV/XLSX into typed YearEndNavFx
 * 
 * Supports flexible column naming:
 * - Scheme Name, Fund Name, SHORT_NAME
 * - NAV_YearEnd_INR, NAV_31Dec2025, NAV per unit
 * - FX_YearEnd_USD_per_INR, Exchange Rate
 * - Year (explicit) or inferred from NAV column header (e.g., "NAV_31Dec2025" → 2025)
 */
export function normalizeYearEndNavFx(
  rawRows: any[],
  yearHint?: number
): YearEndNavFx[] {
  const result: YearEndNavFx[] = [];

  for (const row of rawRows) {
    // Map fund name (try multiple column names)
    const fundName =
      row['Fund Name'] ||
      row['Scheme Name'] ||
      row['SHORT_NAME'] ||
      row['scheme_name'] ||
      '';

    if (!fundName) continue; // Skip if no fund name

    // Extract year (try explicit column first, then infer from NAV column)
    let year = yearHint || row['Year'] || row['year'];
    if (!year) {
      // Try to infer from NAV column name (e.g., "NAV_31Dec2025" → 2025)
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

    if (!year) continue; // Skip if year cannot be determined

    // Extract NAV (try multiple column names)
    const navInr =
      parseFloat(row['NAV_YearEnd_INR']) ||
      parseFloat(row['nav_inr']) ||
      parseFloat(row['NAV per unit']) ||
      parseFloat(
        Object.values(row).find((v: any) =>
          typeof v === 'number' && v > 0 && v < 10000
        ) as any
      ) ||
      0;

    if (navInr <= 0) continue; // Skip invalid NAV

    // Extract FX rate (try multiple column names)
    const fxUsdPerInr =
      parseFloat(row['FX_YearEnd_USD_per_INR']) ||
      parseFloat(row['fx_rate']) ||
      parseFloat(row['Exchange Rate']) ||
      parseFloat(row['INR to USD']) ||
      0.012; // Default fallback

    if (fxUsdPerInr <= 0) continue; // Skip invalid FX

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
// 3. BUILD YEARLY POSITIONS FROM KFINTECH TRANSACTIONS
// ============================================================================

/**
 * Build per-fund, per-year positions from raw KFintech transactions
 * 
 * Logic:
 * 1. Group by (fundName, year)
 * 2. For each group:
 *    - additionsUSD = sum(amountUSD) for BUY transactions
 *    - netUnitsChange = sum(trxnUnits) for BUY and SELL
 * 3. For each fund, compute running unitsYearEnd:
 *    - Year 1: unitsYearEnd = netUnitsChange
 *    - Year N: unitsYearEnd = previous unitsYearEnd + netUnitsChange
 */
export function buildYearlyPositions(
  transactions: Transaction[]
): YearlyPosition[] {
  // Group transactions by (fundName, year)
  const grouped = new Map<string, Map<number, Transaction[]>>();

  for (const trx of transactions) {
    const year = trx.trxnDate.getFullYear();
    const key = trx.fundName;

    if (!grouped.has(key)) {
      grouped.set(key, new Map());
    }
    const yearMap = grouped.get(key)!;
    if (!yearMap.has(year)) {
      yearMap.set(year, []);
    }
    yearMap.get(year)!.push(trx);
  }

  const result: YearlyPosition[] = [];

  // Process each fund
  for (const [fundName, yearMap] of grouped) {
    const years = Array.from(yearMap.keys()).sort((a, b) => a - b);

    let cumulativeUnits = 0; // Running total units

    for (const year of years) {
      const yearTransactions = yearMap.get(year)!;

      // Calculate additions (BUY transactions only)
      const additionsUSD = yearTransactions
        .filter(t => t.trxnType === 'BUY')
        .reduce((sum, t) => sum + t.amountUSD, 0);

      // Calculate net units change (BUY + SELL, SELL is negative)
      const netUnitsChange = yearTransactions
        .filter(t => t.trxnType === 'BUY' || t.trxnType === 'SELL')
        .reduce((sum, t) => sum + t.trxnUnits, 0);

      cumulativeUnits += netUnitsChange;

      result.push({
        fundName,
        year,
        additionsUSD,
        unitsYearEnd: Math.max(0, cumulativeUnits) // Prevent negative units
      });
    }
  }

  return result;
}

// ============================================================================
// 4. COMPUTE MTM SUMMARY
// ============================================================================

/**
 * Compute MTM summary rows from yearly positions and year-end NAV/FX
 * 
 * Per IRC §1296 (Mark-to-Market Election):
 * 
 * For each fund-year where units > 0:
 *   FMV (USD) = (Units at Year-End × NAV_INR) × FX_Rate
 *   Beginning Basis = Cumulative Additions up to start of this year
 *   MTM Gain/Loss = FMV - Beginning Basis
 *   MTM Inclusion = max(MTM Gain/Loss, 0) [loss limitation applies separately]
 * 
 * Each fund tracked independently with its own timeline.
 */
export function computeMtmSummary(
  yearlyPositions: YearlyPosition[],
  yearEndNavFxList: YearEndNavFx[]
): MtmSummaryRow[] {
  // Index NAV/FX data by (fundName, year)
  const navFxMap = new Map<string, YearEndNavFx>();
  for (const navFx of yearEndNavFxList) {
    const key = `${navFx.fundName}|${navFx.year}`;
    navFxMap.set(key, navFx);
  }

  // Group yearly positions by fund
  const positionsByFund = new Map<string, YearlyPosition[]>();
  for (const pos of yearlyPositions) {
    if (!positionsByFund.has(pos.fundName)) {
      positionsByFund.set(pos.fundName, []);
    }
    positionsByFund.get(pos.fundName)!.push(pos);
  }

  const result: MtmSummaryRow[] = [];

  // Process each fund independently
  for (const [fundName, positions] of positionsByFund) {
    // Sort positions by year
    positions.sort((a, b) => a.year - b.year);

    let cumulativeAdditionsUSD = 0; // Running total additions

    for (const pos of positions) {
      // Skip if no units held at year-end
      if (pos.unitsYearEnd <= 0) continue;

      // Look up NAV/FX data
      const key = `${fundName}|${pos.year}`;
      const navFx = navFxMap.get(key);

      if (!navFx) {
        console.warn(
          `Missing NAV/FX data for ${fundName} in year ${pos.year}, skipping`
        );
        continue;
      }

      // Compute FMV
      const fmvInr = pos.unitsYearEnd * navFx.navInr;
      const fmvUsd = fmvInr * navFx.fxUsdPerInr;

      // Beginning basis = cumulative additions before this year
      const beginningBasisUSD = cumulativeAdditionsUSD;

      // MTM Gain/Loss (before loss limitation)
      const mtmGainLossUSD = fmvUsd - beginningBasisUSD;

      // MTM Inclusion (IRC §1296 loss limitation: loss ordinary only to extent of prior gains)
      // For now: max(gain, 0). Full loss limitation logic added in Phase 3.
      const mtmInclusionUSD = Math.max(mtmGainLossUSD, 0);

      // Accumulate additions for next year
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
// 5. EXAMPLE USAGE
// ============================================================================

/**
 * Example: Run the full MTM pipeline
 */
export function exampleUsage() {
  console.log('=== MTM Engine Example ===\n');

  // Sample transactions (KFintech data)
  const transactions: Transaction[] = [
    // Fund 1: Kotak Small Cap (bought 2023, held through 2025)
    {
      fundName: 'Kotak Small Cap Fund',
      trxnDate: new Date('2023-03-15'),
      trxnType: 'BUY',
      trxnUnits: 1000,
      amountINR: 75000,
      amountUSD: 900
    },
    {
      fundName: 'Kotak Small Cap Fund',
      trxnDate: new Date('2024-06-20'),
      trxnType: 'BUY',
      trxnUnits: 500,
      amountINR: 75000,
      amountUSD: 900
    },
    {
      fundName: 'Kotak Small Cap Fund',
      trxnDate: new Date('2025-01-10'),
      trxnType: 'SELL',
      trxnUnits: -200,
      amountINR: 30000,
      amountUSD: 360
    },

    // Fund 2: HDFC Growth (bought 2022, sold 2023)
    {
      fundName: 'HDFC Growth Fund',
      trxnDate: new Date('2022-01-10'),
      trxnType: 'BUY',
      trxnUnits: 500,
      amountINR: 125000,
      amountUSD: 1500
    },
    {
      fundName: 'HDFC Growth Fund',
      trxnDate: new Date('2023-12-20'),
      trxnType: 'SELL',
      trxnUnits: -500,
      amountINR: 140000,
      amountUSD: 1680
    }
  ];

  // Sample NAV/FX data (user-maintained)
  const yearEndNavFx: YearEndNavFx[] = [
    // Kotak Small Cap Fund
    { fundName: 'Kotak Small Cap Fund', year: 2023, navInr: 75, fxUsdPerInr: 0.012 },
    { fundName: 'Kotak Small Cap Fund', year: 2024, navInr: 95, fxUsdPerInr: 0.0122 },
    { fundName: 'Kotak Small Cap Fund', year: 2025, navInr: 120, fxUsdPerInr: 0.0125 },

    // HDFC Growth Fund
    { fundName: 'HDFC Growth Fund', year: 2022, navInr: 250, fxUsdPerInr: 0.0122 },
    { fundName: 'HDFC Growth Fund', year: 2023, navInr: 280, fxUsdPerInr: 0.0122 }
  ];

  console.log('Step 1: Build Yearly Positions');
  const positions = buildYearlyPositions(transactions);
  console.log(JSON.stringify(positions, null, 2));
  console.log('\n');

  console.log('Step 2: Compute MTM Summary');
  const mtmSummary = computeMtmSummary(positions, yearEndNavFx);
  console.log(JSON.stringify(mtmSummary, null, 2));
  console.log('\n');

  console.log('Step 3: Summary by Fund');
  for (const row of mtmSummary) {
    console.log(
      `${row.fundName} (${row.year}): ` +
      `Units=${row.unitsYearEnd}, FMV=$${row.fmvUsd.toFixed(2)}, ` +
      `MTM Inclusion=$${row.mtmInclusionUSD.toFixed(2)}`
    );
  }
}

// ============================================================================
// 6. HELPER: CSV/XLSX Parsing (example)
// ============================================================================

/**
 * Helper to load and parse transactions from raw CSV/XLSX rows
 * (Assumes columns: Fund Name, Transaction Date, Type, Units, Amount INR, Amount USD)
 */
export function parseTransactionsFromRaw(rawRows: any[]): Transaction[] {
  return rawRows.map((row) => ({
    fundName: row['Fund Name'] || row['Scheme Name'] || '',
    trxnDate: new Date(row['Transaction Date'] || row['Date'] || ''),
    trxnType: (row['Type'] || 'OTHER') as 'BUY' | 'SELL' | 'DIVIDEND' | 'STT' | 'OTHER',
    trxnUnits: parseFloat(row['Units'] || row['TRXN_UNITS'] || '0'),
    amountINR: parseFloat(row['Amount INR'] || row['amount_inr'] || '0'),
    amountUSD: parseFloat(row['Amount USD'] || row['amount_usd'] || '0')
  }));
}

// Run example if executed directly
if (require.main === module) {
  exampleUsage();
}
