import React, { useState } from 'react';
import { saveFunds, saveCalculation } from '../utils/supabaseClient';

export default function MFUpload({ onNavigate, user }) {
  const [funds, setFunds] = useState([]);
  const [formData, setFormData] = useState({
    schemeName: '',
    units: '',
    navPerUnit: '',
    costBasis: ''
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleAddFund = () => {
    if (formData.schemeName && formData.units && formData.navPerUnit && formData.costBasis) {
      const fmv = parseFloat(formData.units) * parseFloat(formData.navPerUnit);
      const gain = fmv - parseFloat(formData.costBasis);
      
      setFunds(prev => [...prev, {
        ...formData,
        fmv: fmv.toFixed(2),
        gain: gain.toFixed(2)
      }]);
      
      setFormData({
        schemeName: '',
        units: '',
        navPerUnit: '',
        costBasis: ''
      });
    }
  };

  const handleRemoveFund = (index) => {
    setFunds(prev => prev.filter((_, i) => i !== index));
  };

  const totalGain = funds.reduce((sum, f) => sum + parseFloat(f.gain), 0);

  const handleContinue = async () => {
    if (funds.length > 0 && user) {
      setLoading(true);
      try {
        const response = await fetch('http://localhost:5000/api/calculate/mtm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ funds })
        });
        
        const result = await response.json();

        const { error: fundsError } = await saveFunds(user.id, funds);
        if (fundsError) {
          console.error('Error saving funds:', fundsError);
          alert('Error saving funds to database');
          setLoading(false);
          return;
        }

        const { error: calcError } = await saveCalculation(user.id, result.summary);
        if (calcError) {
          console.error('Error saving calculation:', calcError);
          alert('Error saving calculation to database');
          setLoading(false);
          return;
        }

        localStorage.setItem('funds', JSON.stringify(funds));
        localStorage.setItem('calculation', JSON.stringify(result));

        onNavigate('results');
      } catch (error) {
        console.error('Error:', error);
        alert('Error calculating and saving tax data');
      }
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-blue-600 hover:underline mb-4"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-800">Upload Mutual Funds</h1>
        <p className="text-gray-600">Add your mutual fund holdings</p>

        <div className="bg-white p-6 rounded-lg shadow mb-8 mt-8">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Scheme Name</label>
              <input
                type="text"
                name="schemeName"
                value={formData.schemeName}
                onChange={handleInputChange}
                placeholder="e.g., Kotak Small Cap Fund"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Units</label>
                <input
                  type="number"
                  name="units"
                  value={formData.units}
                  onChange={handleInputChange}
                  placeholder="1000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">NAV per Unit</label>
                <input
                  type="number"
                  name="navPerUnit"
                  value={formData.navPerUnit}
                  onChange={handleInputChange}
                  placeholder="100"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Cost Basis (USD)</label>
                <input
                  type="number"
                  name="costBasis"
                  value={formData.costBasis}
                  onChange={handleInputChange}
                  placeholder="5000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
            </div>

            <button
              onClick={handleAddFund}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold transition"
            >
              Add Fund
            </button>
          </div>
        </div>

        {funds.length > 0 && (
          <div className="bg-white p-6 rounded-lg shadow mb-8">
            <h3 className="text-lg font-bold mb-4">Added Funds ({funds.length})</h3>
            <div className="space-y-2">
              {funds.map((fund, index) => (
                <div key={index} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                  <div>
                    <p className="font-semibold">{fund.schemeName}</p>
                    <p className="text-sm text-gray-600">
                      {fund.units} units × ${fund.navPerUnit} = ${fund.fmv}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold ${parseFloat(fund.gain) > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ${fund.gain}
                    </p>
                    <button
                      onClick={() => handleRemoveFund(index)}
                      className="text-red-600 hover:underline text-sm mt-1"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded">
              <p className="text-lg font-bold text-blue-600">
                Total MTM Gain: ${totalGain.toFixed(2)}
              </p>
            </div>
          </div>
        )}

        <div className="flex gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-semibold"
          >
            Cancel
          </button>
          <button
            onClick={handleContinue}
            disabled={funds.length === 0 || loading}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold disabled:opacity-50 transition"
          >
            {loading ? 'Saving...' : 'Continue to Results'}
          </button>
        </div>
      </div>
    </div>
  );
}