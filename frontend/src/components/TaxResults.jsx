import React, { useEffect, useState } from 'react';

export default function TaxResults({ onNavigate }) {
  const [funds, setFunds] = useState([]);
  const [calculations, setCalculations] = useState(null);

  useEffect(() => {
    const savedCalculation = localStorage.getItem('calculation');
    const savedFunds = localStorage.getItem('funds');
    
    if (savedCalculation && savedFunds) {
      const calc = JSON.parse(savedCalculation);
      setFunds(JSON.parse(savedFunds));
      
      // Use calculation from backend
      setCalculations({
        totalMTM: calc.summary.totalMTM,
        federalTax: calc.summary.federalTax,
        niit: calc.summary.niit,
        totalTax: calc.summary.totalTax
      });
    }
  }, []);

  if (!calculations) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data found. Please upload funds first.</p>
          <button
            onClick={() => onNavigate('upload')}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg"
          >
            Upload Funds
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-blue-600 hover:underline mb-4"
        >
          ← Back to Dashboard
        </button>
        <h1 className="text-3xl font-bold text-gray-800 mb-8">Tax Calculation Results</h1>

        <div className="bg-white p-8 rounded-lg shadow mb-8">
          <h2 className="text-2xl font-bold mb-8">FY2025 Tax Summary</h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-blue-50 p-6 rounded-lg">
              <p className="text-gray-600 text-sm mb-2">MTM GAIN (TAXABLE)</p>
              <p className="text-3xl font-bold text-blue-600">
                ${calculations.totalMTM.toFixed(2)}
              </p>
            </div>

            <div className="bg-orange-50 p-6 rounded-lg">
              <p className="text-gray-600 text-sm mb-2">FEDERAL TAX (32%)</p>
              <p className="text-3xl font-bold text-orange-600">
                ${calculations.federalTax.toFixed(2)}
              </p>
            </div>

            <div className="bg-red-50 p-6 rounded-lg">
              <p className="text-gray-600 text-sm mb-2">TOTAL TAX LIABILITY</p>
              <p className="text-3xl font-bold text-red-600">
                ${calculations.totalTax.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="border-t pt-8">
            <h3 className="text-lg font-bold mb-4">Forms to File</h3>
            <div className="space-y-3">
              <div className="p-3 bg-green-50 rounded">Form 1040 - US Individual Income Tax Return</div>
              <div className="p-3 bg-green-50 rounded">Form 8621 - PFIC Reporting</div>
              <div className="p-3 bg-green-50 rounded">Form 1118 - Foreign Tax Credit</div>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-3 rounded-lg font-semibold"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => alert('PDF download coming next!')}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-semibold"
          >
            Download Forms (PDF)
          </button>
        </div>
      </div>
    </div>
  );
}