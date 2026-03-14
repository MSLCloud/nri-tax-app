# FileUpload Component - Step-by-Step Testing Guide

This guide walks you through testing the CSV upload flow and fixing any issues.

---

## Prerequisites

1. **Start the app**
   - Frontend: `npm start` (runs on http://localhost:3000)
   - Backend: `npm start` in backend folder (runs on http://localhost:5000)

2. **Log in** with a valid Supabase user

---

## Step 1: Test Standard CSV Format

**Expected format** (our documented format):

```
Scheme Name,Units,NAV,Cost Basis
Kotak Small Cap Fund,1000,100,50000
HDFC Growth Fund,500,250,80000
```

**How to test:**
1. Go to Dashboard → click **"📁 Upload CSV/Excel"**
2. Select `frontend/public/test-data/mf-statement-standard.csv`
3. Click **"📤 Upload File"**

**Expected result:**
- Alert: "File uploaded successfully! 3 fund(s) parsed."
- You are navigated to **Upload Mutual Funds** page
- You see 3 funds pre-populated in the list:
  - Kotak Small Cap Fund: 1000 × 100 = $100,000 FMV
  - HDFC Growth Fund: 500 × 250 = $125,000 FMV
  - Axis Bluechip Fund: 2000 × 150 = $300,000 FMV

**If it fails:** Check browser console (F12) and backend terminal for errors.

---

## Step 2: Test CAMS-Style Format

Real CAMS/Kfintech statements use different column names: `fund_name`, `balance_units`, `nav`, `amount`.

**Test file:** `mf-statement-cams-format.csv`

**How to test:**
1. Upload `mf-statement-cams-format.csv`
2. Verify 2 funds appear with correct scheme names (including quoted names with spaces)

**Expected result:**
- 2 funds parsed
- "Aditya Birla Sun Life Liquid Fund - Growth" and "UTI Nifty Next 50 Index Fund - Direct Plan"

---

## Step 3: Test Quoted Fields (Commas Inside)

Some statements have commas inside scheme names, e.g. `"Kotak Small Cap Fund, Growth"`.

**Test file:** `mf-statement-quoted-commas.csv`

**How to test:**
1. Upload `mf-statement-quoted-commas.csv`
2. Verify scheme names are parsed correctly (no split on internal commas)

**Expected result:**
- "Kotak Small Cap Fund, Growth" appears as one scheme name
- 2 funds total

---

## Step 4: Test End-to-End → Database

1. After uploading any CSV, you land on MFUpload with funds pre-filled
2. Click **"Continue to Results"**
3. Verify:
   - Tax calculation runs
   - Funds are saved to `mf_holdings` in Supabase
   - You see Tax Results page

**Verify in Supabase:**
- Table Editor → `mf_holdings`
- Rows should have: `scheme_name`, `units`, `nav_per_unit`, `fmv_usd`, `cost_basis_usd`, `mtm_gain_usd`

---

## Step 5: Test Error Cases

| Test | Action | Expected |
|------|--------|----------|
| No file | Click Upload without selecting | "Please select a file" |
| Wrong type | Select .txt or .pdf | "Please upload a CSV or Excel file" |
| Empty CSV | Upload file with only headers, no data | 0 funds parsed, navigates with empty list |
| Excel file | Upload .xlsx | Message: "Excel parsing coming soon. Please use CSV for now." |

---

## Supported Column Name Variations

The parser maps these column names automatically:

| Our Field | Accepted CSV Headers |
|-----------|---------------------|
| Scheme Name | Scheme Name, scheme_name, Fund Name, fund_name, Scheme, Fund |
| Units | Units, units, Balance Units, balance_units, Quantity |
| NAV | NAV, nav, Nav, NAV per Unit |
| Cost Basis | Cost Basis, cost_basis, Cost, Amount, amount, Value (Rs), Value (USD) |
| FMV (optional) | FMV (USD), fmv_usd, FMV, Value USD |

---

## Troubleshooting

### "Error uploading file"
- Ensure backend is running on port 5000
- Check CORS is enabled
- Look at Network tab (F12) for the actual API response

### Funds show "Unknown Scheme"
- Your CSV headers don't match any known alias
- Add your header to `COLUMN_ALIASES` in `backend/src/routes/upload.js`

### Numbers parsed as 0
- Remove commas from numbers (e.g. use 1000 not 1,000)
- Ensure no currency symbols in numeric columns

### Excel not working
- Excel parsing is not yet implemented
- Use CSV export from Excel: File → Save As → CSV (Comma delimited)
