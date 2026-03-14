import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_SUPABASE_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Sign up
export const signUp = async (email, password) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });
  return { data, error };
};

// Sign in
export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { data, error };
};

// Sign out
export const signOut = async () => {
  const { error } = await supabase.auth.signOut();
  return { error };
};

// Get current user
export const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getSession();
  return { data, error };
};

// Save calculation to database
export const saveCalculation = async (userId, calculation) => {
  const { data, error } = await supabase
    .from('tax_calculations')
    .insert([{
      user_id: userId,
      tax_year: 2025,
      total_income_usd: calculation.totalMTM,
      mtm_gain_usd: calculation.totalMTM,
      federal_tax: calculation.federalTax,
      niit: calculation.niit,
      total_tax_liability: calculation.totalTax,
      status: 'draft'
    }]);
  return { data, error };
};

// Save funds to database
export const saveFunds = async (userId, funds) => {
  const fundsToSave = funds.map(fund => ({
    user_id: userId,
    scheme_name: fund.schemeName,
    units: parseFloat(fund.units),
    nav_per_unit: parseFloat(fund.navPerUnit),
    fmv_usd: parseFloat(fund.fmv),
    cost_basis_usd: parseFloat(fund.costBasis),
    mtm_gain_usd: parseFloat(fund.gain),
    is_pfic: true,
    tax_year: 2025
  }));

  const { data, error } = await supabase
    .from('mf_holdings')
    .insert(fundsToSave);
  return { data, error };
};

// Get user's calculations
export const getUserCalculations = async (userId) => {
  const { data, error } = await supabase
    .from('tax_calculations')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};

// Get user's funds
export const getUserFunds = async (userId) => {
  const { data, error } = await supabase
    .from('mf_holdings')
    .select('*')
    .eq('user_id', userId);
  return { data, error };
};