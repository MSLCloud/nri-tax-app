-- Run this in Supabase SQL Editor: https://app.supabase.com → Your Project → SQL Editor

-- 0. Fix existing tables: drop FK constraints that cause "violates foreign key constraint" errors
ALTER TABLE mf_holdings DROP CONSTRAINT IF EXISTS mf_holdings_user_id_fkey;
ALTER TABLE tax_calculations DROP CONSTRAINT IF EXISTS tax_calculations_user_id_fkey;

-- 1. Create mf_holdings table (if not exists)
-- Note: user_id stores auth user UUID; RLS enforces access. FK removed to avoid sync issues.
CREATE TABLE IF NOT EXISTS mf_holdings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  scheme_name TEXT NOT NULL,
  units DECIMAL(15,4) NOT NULL,
  nav_per_unit DECIMAL(15,4) NOT NULL,
  fmv_usd DECIMAL(15,2) NOT NULL,
  cost_basis_usd DECIMAL(15,2) NOT NULL,
  mtm_gain_usd DECIMAL(15,2) NOT NULL,
  is_pfic BOOLEAN DEFAULT true,
  tax_year INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Create tax_calculations table
CREATE TABLE IF NOT EXISTS tax_calculations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  tax_year INTEGER NOT NULL,
  total_income_usd DECIMAL(15,2) NOT NULL,
  mtm_gain_usd DECIMAL(15,2) NOT NULL,
  federal_tax DECIMAL(15,2) NOT NULL,
  niit DECIMAL(15,2) NOT NULL,
  total_tax_liability DECIMAL(15,2) NOT NULL,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS and add policies for mf_holdings
ALTER TABLE mf_holdings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own mf_holdings" ON mf_holdings;
CREATE POLICY "Users can insert own mf_holdings"
  ON mf_holdings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own mf_holdings" ON mf_holdings;
CREATE POLICY "Users can read own mf_holdings"
  ON mf_holdings FOR SELECT
  USING (auth.uid() = user_id);

-- 4. Enable RLS and add policies for tax_calculations
ALTER TABLE tax_calculations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert own tax_calculations" ON tax_calculations;
CREATE POLICY "Users can insert own tax_calculations"
  ON tax_calculations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can read own tax_calculations" ON tax_calculations;
CREATE POLICY "Users can read own tax_calculations"
  ON tax_calculations FOR SELECT
  USING (auth.uid() = user_id);
