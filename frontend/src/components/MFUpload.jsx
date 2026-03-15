import React, { useState } from 'react';
import { saveFunds, saveCalculation } from '../utils/supabaseClient';

export default function MFUpload({ onNavigate, user }) {
  const [funds, setFunds] = useState([]);
  const [activeTab, setActiveTab] = useState('manual'); // manual, upload, kfintech
  const [formData, setFormData] = useState({
    fundName: '',
    isin: '',
    country: '',
    acquisitionDate: '',
    acquisitionMethod: 'purchase',
    sharesAcquired: '',
    pricePerShare: '',
    currency: 'INR',
    pficRegime: '1291',
    isMarketable: false,
    costBasisUSD: '',
    sharesHeldYearEnd: '',
    navPerShareYearEnd: '',
    navCurrencyYearEnd: 'INR'
  });
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadError, setUploadError] = useState('');

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const calculateCostBasis = () => {
    const shares = parseFloat(formData.sharesAcquired);
    const pricePerShare = parseFloat(formData.pricePerShare);
    
    if (shares && pricePerShare) {
      const fxRate = formData.currency === 'INR' ? 0.012 : 1;
      const costBasis = shares * pricePerShare * fxRate;
      setFormData(prev => ({
        ...prev,
        costBasisUSD: costBasis.toFixed(2)
      }));
    }
  };

  const calculateYearEndFMV = () => {
    const shares = parseFloat(formData.sharesHeldYearEnd);
    const nav = parseFloat(formData.navPerShareYearEnd);
    
    if (shares && nav) {
      const fxRate = formData.navCurrencyYearEnd === 'INR' ? 0.012 : 1;
      const fmv = shares * nav * fxRate;
      return fmv.toFixed(2);
    }
    return 0;
  };

  const addFund = () => {
    if (!formData.fundName || !formData.acquisitionDate || !formData.sharesAcquired) {
      alert('Please fill all required fields');
      return;
    }

    const yearEndFMV = calculateYearEndFMV();
    const mtmGain = parseFloat(yearEndFMV) - parseFloat(formData.costBasisUSD || 0);

    setFunds(prev => [...prev, {
      id: Date.now(),
      ...formData,
      yearEndFMV,
      mtmGain: mtmGain.toFixed(2)
    }]);

    // Reset form
    setFormData({
      fundName: '',
      isin: '',
      country: '',
      acquisitionDate: '',
      acquisitionMethod: 'purchase',
      sharesAcquired: '',
      pricePerShare: '',
      currency: 'INR',
      pficRegime: '1291',
      isMarketable: false,
      costBasisUSD: '',
      sharesHeldYearEnd: '',
      navPerShareYearEnd: '',
      navCurrencyYearEnd: 'INR'
    });
  };

  const removeFund = (id) => {
    setFunds(prev => prev.filter(f => f.id !== id));
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadFile(file);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = file.name.endsWith('.csv') ? 'csv' : 'excel';
      const response = await fetch(`http://localhost:5000/api/upload/${endpoint}`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        // Parse and add funds from file
        const parsedFunds = result.data.map((row, idx) => ({
          id: Date.now() + idx,
          fundName: row['Fund Name'] || row['Scheme Name'] || 'Unknown',
          isin: row['ISIN'] || '',
          country: 'India',
          acquisitionDate: row['Acquisition Date'] || new Date().toISOString().split('T')[0],
          acquisitionMethod: 'purchase',
          sharesAcquired: row['Units'] || row['Shares'] || '0',
          pricePerShare: row['NAV at Purchase'] || '0',
          currency: 'INR',
          pficRegime: '1291',
          isMarketable: false,
          costBasisUSD: (parseFloat(row['Cost Basis USD']) || 0).toFixed(2),
          sharesHeldYearEnd: row['Units'] || row['Shares'] || '0',
          navPerShareYearEnd: row['NAV at Year End'] || row['NAV'] || '0',
          navCurrencyYearEnd: 'INR',
          yearEndFMV: row['Year End FMV'] || '0',
          mtmGain: row['MTM Gain'] || '0'
        }));

        setFunds(prev => [...prev, ...parsedFunds]);
        setUploadFile(null);
        alert(`${parsedFunds.length} funds imported successfully!`);
      }
    } catch (error) {
      setUploadError('Error uploading file: ' + error.message);
    }
  };

  const totalMTMGain = funds.reduce((sum, f) => sum + parseFloat(f.mtmGain), 0);
  const totalFMV = funds.reduce((sum, f) => sum + parseFloat(f.yearEndFMV), 0);

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 p-6">
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-blue-400 hover:text-blue-300 mb-4"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-4xl font-bold mb-2">Mutual Funds (PFIC)</h1>
        <p className="text-gray-400">IRS Form 8621 Compliant Data Entry</p>
      </div>

      {/* Main Content */}
      <div className="flex h-screen">
        {/* LEFT SIDEBAR: Funds List */}
        <div className="w-1/3 bg-gray-800 border-r border-gray-700 overflow-y-auto p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold mb-4">📊 Added Funds ({funds.length})</h2>
            
            {funds.length > 0 && (
              <div className="mb-6 p-4 bg-blue-900 rounded-lg border border-blue-700">
                <p className="text-sm text-gray-300 mb-1">Total MTM Gain</p>
                <p className="text-2xl font-bold text-green-400">${totalMTMGain.toFixed(2)}</p>
                <p className="text-sm text-gray-400 mt-2">Year-End FMV: ${totalFMV.toFixed(2)}</p>
              </div>
            )}

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {funds.map((fund, idx) => (
                <div key={fund.id} className="p-3 bg-gray-700 rounded-lg border border-gray-600">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-semibold text-sm">{idx + 1}. {fund.fundName}</p>
                      <p className="text-xs text-gray-400">{fund.country} • {fund.pficRegime}</p>
                    </div>
                    <button
                      onClick={() => removeFund(fund.id)}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">Shares</p>
                      <p className="font-semibold">{fund.sharesHeldYearEnd}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Gain</p>
                      <p className="font-semibold text-green-400">${fund.mtmGain}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {funds.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-8">No funds added yet. Use options on the right →</p>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Data Entry */}
        <div className="w-2/3 overflow-y-auto p-8">
          {/* Tabs */}
          <div className="flex gap-4 mb-8 border-b border-gray-700">
            <button
              onClick={() => setActiveTab('manual')}
              className={`pb-4 font-semibold transition ${
                activeTab === 'manual'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              ✏️ Manual Entry
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`pb-4 font-semibold transition ${
                activeTab === 'upload'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              📤 Upload File
            </button>
            <button
              onClick={() => setActiveTab('kfintech')}
              className={`pb-4 font-semibold transition ${
                activeTab === 'kfintech'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
            >
              🔗 Kfintech API (Phase 3)
            </button>
          </div>

          {/* TAB 1: Manual Entry */}
          {activeTab === 'manual' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-bold mb-4">Fund Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Fund Name *</label>
                    <input
                      type="text"
                      name="fundName"
                      value={formData.fundName}
                      onChange={handleInputChange}
                      placeholder="e.g., Kotak Small Cap"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">ISIN</label>
                    <input
                      type="text"
                      name="isin"
                      value={formData.isin}
                      onChange={handleInputChange}
                      placeholder="e.g., INF179K01DB3"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-400 outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4">Acquisition Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Acquisition Date *</label>
                    <input
                      type="date"
                      name="acquisitionDate"
                      value={formData.acquisitionDate}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Method</label>
                    <select
                      name="acquisitionMethod"
                      value={formData.acquisitionMethod}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-400 outline-none"
                    >
                      <option value="purchase">Purchase</option>
                      <option value="gift">Gift</option>
                      <option value="inheritance">Inheritance</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Shares Acquired *</label>
                    <input
                      type="number"
                      name="sharesAcquired"
                      value={formData.sharesAcquired}
                      onChange={handleInputChange}
                      placeholder="1000"
                      step="0.01"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Price Per Share *</label>
                    <input
                      type="number"
                      name="pricePerShare"
                      value={formData.pricePerShare}
                      onChange={handleInputChange}
                      placeholder="100"
                      step="0.01"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Currency *</label>
                    <select
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-400 outline-none"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                <button
                  onClick={calculateCostBasis}
                  className="mt-4 w-full bg-gray-700 hover:bg-gray-600 px-4 py-2 rounded font-semibold transition"
                >
                  Calculate Cost Basis (USD)
                </button>

                {formData.costBasisUSD && (
                  <div className="mt-4 p-3 bg-green-900 rounded border border-green-700">
                    <p className="text-sm">Cost Basis (USD): <span className="font-bold text-green-400">${formData.costBasisUSD}</span></p>
                  </div>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4">PFIC Regime Selection</h3>
                <div className="space-y-3">
                  <label className="flex p-3 border border-gray-600 rounded cursor-pointer hover:bg-gray-700 transition"
                    style={{ borderColor: formData.pficRegime === '1291' ? '#3B82F6' : undefined }}>
                    <input
                      type="radio"
                      name="pficRegime"
                      value="1291"
                      checked={formData.pficRegime === '1291'}
                      onChange={handleInputChange}
                      className="mr-3"
                    />
                    <div>
                      <p className="font-semibold text-sm">Section 1291 (Default)</p>
                      <p className="text-xs text-gray-400">Excess distribution rules</p>
                    </div>
                  </label>

                  <label className="flex p-3 border border-gray-600 rounded cursor-pointer hover:bg-gray-700 transition"
                    style={{ borderColor: formData.pficRegime === 'QEF' ? '#3B82F6' : undefined }}>
                    <input
                      type="radio"
                      name="pficRegime"
                      value="QEF"
                      checked={formData.pficRegime === 'QEF'}
                      onChange={handleInputChange}
                      className="mr-3"
                    />
                    <div>
                      <p className="font-semibold text-sm">QEF Election</p>
                      <p className="text-xs text-gray-400">Qualified Electing Fund</p>
                    </div>
                  </label>

                  <label className="flex p-3 border border-gray-600 rounded cursor-pointer hover:bg-gray-700 transition"
                    style={{ borderColor: formData.pficRegime === 'MTM' ? '#3B82F6' : undefined }}>
                    <input
                      type="radio"
                      name="pficRegime"
                      value="MTM"
                      checked={formData.pficRegime === 'MTM'}
                      onChange={handleInputChange}
                      className="mr-3"
                    />
                    <div>
                      <p className="font-semibold text-sm">MTM Election</p>
                      <p className="text-xs text-gray-400">Mark-to-Market</p>
                    </div>
                  </label>
                </div>

                {formData.pficRegime === 'MTM' && (
                  <label className="flex items-center p-3 bg-blue-900 rounded border border-blue-700 mt-4">
                    <input
                      type="checkbox"
                      name="isMarketable"
                      checked={formData.isMarketable}
                      onChange={handleInputChange}
                      className="mr-3"
                    />
                    <span className="text-sm">Confirm marketable stock (Sec. 1296)</span>
                  </label>
                )}
              </div>

              <div>
                <h3 className="text-lg font-bold mb-4">Year-End Position (Dec 31, 2025)</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-semibold mb-2">Shares at Year-End *</label>
                    <input
                      type="number"
                      name="sharesHeldYearEnd"
                      value={formData.sharesHeldYearEnd}
                      onChange={handleInputChange}
                      placeholder="1000"
                      step="0.01"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">NAV Per Share *</label>
                    <input
                      type="number"
                      name="navPerShareYearEnd"
                      value={formData.navPerShareYearEnd}
                      onChange={handleInputChange}
                      placeholder="150"
                      step="0.01"
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-500 focus:border-blue-400 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold mb-2">Currency *</label>
                    <select
                      name="navCurrencyYearEnd"
                      value={formData.navCurrencyYearEnd}
                      onChange={handleInputChange}
                      className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white focus:border-blue-400 outline-none"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                    </select>
                  </div>
                </div>

                {formData.sharesHeldYearEnd && formData.navPerShareYearEnd && (
                  <div className="mt-4 p-4 bg-green-900 rounded border border-green-700">
                    <p className="text-sm mb-2">Year-End FMV (USD): <span className="font-bold text-green-400">${calculateYearEndFMV()}</span></p>
                    <p className="text-sm">MTM Gain: <span className="font-bold text-green-400">${(parseFloat(calculateYearEndFMV()) - parseFloat(formData.costBasisUSD || 0)).toFixed(2)}</span></p>
                  </div>
                )}
              </div>

              <button
                onClick={addFund}
                className="w-full bg-green-600 hover:bg-green-700 px-6 py-3 rounded-lg font-bold text-lg transition"
              >
                + Add Fund
              </button>
            </div>
          )}

          {/* TAB 2: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-6">
              <div className="p-8 border-2 border-dashed border-gray-600 rounded-lg text-center">
                <p className="text-3xl mb-4">📁</p>
                <h3 className="text-lg font-bold mb-2">Upload CSV or Excel</h3>
                <p className="text-gray-400 mb-6">Bulk import your mutual fund holdings</p>

                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileUpload}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded text-white cursor-pointer"
                />

                {uploadFile && (
                  <p className="mt-4 text-green-400">✓ {uploadFile.name} ready to upload</p>
                )}

                {uploadError && (
                  <p className="mt-4 text-red-400">✕ {uploadError}</p>
                )}
              </div>

              <div className="p-6 bg-gray-800 rounded-lg border border-gray-700">
                <h4 className="font-bold mb-3">Expected CSV Format:</h4>
                <pre className="text-xs bg-gray-900 p-4 rounded overflow-x-auto text-gray-300">
{`Fund Name,ISIN,Acquisition Date,Units,NAV at Purchase,Cost Basis USD,Units at Year End,NAV at Year End
Kotak Small Cap,INF179K01DB3,2022-03-15,1000,75,9000,1000,150
HDFC Growth,INF179X01DXE,2021-01-10,500,250,1500,500,280`}
                </pre>
              </div>
            </div>
          )}

          {/* TAB 3: Kfintech API */}
          {activeTab === 'kfintech' && (
            <div className="space-y-6 text-center py-12">
              <p className="text-5xl">🔗</p>
              <h3 className="text-2xl font-bold">Kfintech API Integration</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Direct sign-in to Kfintech to auto-import your mutual fund portfolio, NAV history, and cost basis.
              </p>
              <p className="text-sm text-gray-500">Coming in Phase 3</p>
              <button className="bg-gray-700 px-6 py-2 rounded font-semibold opacity-50 cursor-not-allowed">
                Sign in with Kfintech (Disabled)
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-6 flex gap-4">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex-1 bg-gray-700 hover:bg-gray-600 px-6 py-3 rounded-lg font-semibold transition"
        >
          Cancel
        </button>
        <button
          onClick={() => {
            if (funds.length > 0) {
              localStorage.setItem('mf_funds', JSON.stringify(funds));
              onNavigate('results');
            } else {
              alert('Please add at least one fund');
            }
          }}
          disabled={funds.length === 0}
          className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-3 rounded-lg font-semibold transition"
        >
          Continue to Results ({funds.length} funds)
        </button>
      </div>
    </div>
  );
}