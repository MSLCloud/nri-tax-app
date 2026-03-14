import React, { useState } from 'react';

export default function FileUpload({ onUpload, onNavigate }) {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const validTypes = ['text/csv', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'text/plain'];
      if (validTypes.includes(selectedFile.type)) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please upload a CSV or Excel file');
        setFile(null);
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Please select a file');
      return;
    }

    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const endpoint = file.name.endsWith('.csv') ? 'csv' : 'excel';
      
      const response = await fetch(`http://localhost:5000/api/upload/${endpoint}`, {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (!response.ok) {
        setError(result.error || `Upload failed (${response.status})`);
        setUploading(false);
        return;
      }

      if (result.success) {
        if (!result.data || !Array.isArray(result.data)) {
          setError(result.message || 'Excel parsing coming soon. Please use CSV for now.');
          setUploading(false);
          return;
        }
        const count = result.data.length;
        alert(`File uploaded successfully! ${count} fund(s) parsed.`);
        
        // Backend returns standardized: schemeName, units, nav, costBasis, fmvUsd (optional)
        const parsedFunds = result.data.map(row => {
          const units = parseFloat(String(row.units || '0').replace(/,/g, '')) || 0;
          const nav = parseFloat(String(row.nav || '0').replace(/,/g, '')) || 0;
          const costBasis = parseFloat(String(row.costBasis || '0').replace(/,/g, '')) || 0;
          // FMV: use provided fmvUsd, or compute as units * nav (assume same currency as cost basis)
          const fmv = row.fmvUsd ? parseFloat(String(row.fmvUsd).replace(/,/g, '')) : units * nav;
          const gain = fmv - costBasis;
          return {
            schemeName: row.schemeName || 'Unknown',
            units: String(units),
            navPerUnit: String(nav),
            costBasis: String(costBasis),
            fmv: fmv.toFixed(2),
            gain: gain.toFixed(2)
          };
        });

        if (onUpload) onUpload(parsedFunds);
        onNavigate('upload');
      } else {
        setError(result.error || 'Error uploading file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      setError('Error uploading file: ' + error.message);
    }

    setUploading(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-2xl mx-auto">
        <button
          onClick={() => onNavigate('dashboard')}
          className="text-blue-600 hover:underline mb-4"
        >
          ← Back to Dashboard
        </button>

        <h1 className="text-3xl font-bold text-gray-800 mb-8">Upload Fund Statement</h1>

        <div className="bg-white p-8 rounded-lg shadow">
          <div className="border-2 border-dashed border-blue-300 rounded-lg p-8 text-center">
            <p className="text-gray-600 mb-4 text-lg">
              📁 Upload CSV or Excel file with your mutual fund holdings
            </p>

            <input
              type="file"
              accept=".csv,.xlsx,.xls"
              onChange={handleFileChange}
              className="block w-full mb-4"
            />

            {file && (
              <p className="mt-4 text-green-600 font-semibold">
                ✅ Selected: {file.name}
              </p>
            )}

            {error && (
              <p className="mt-4 text-red-600 font-semibold">
                ❌ {error}
              </p>
            )}

            <button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="mt-6 bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg font-semibold disabled:opacity-50 transition"
            >
              {uploading ? '⏳ Uploading...' : '📤 Upload File'}
            </button>
          </div>

          <div className="mt-8 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold mb-2">📋 Expected CSV Format:</h3>
            <pre className="text-sm bg-white p-3 rounded overflow-x-auto border border-gray-200">
{`Scheme Name,Units,NAV,Cost Basis
Kotak Small Cap,1000,100,50000
HDFC Growth,500,250,80000
Axis Bluechip,2000,150,200000`}
            </pre>
          </div>

          <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
            <h3 className="font-semibold mb-2">💡 Tips:</h3>
            <ul className="text-sm text-gray-700 list-disc list-inside space-y-1">
              <li>Column headers are case-sensitive</li>
              <li>NAV should be in your local currency (INR)</li>
              <li>Cost Basis should be in USD</li>
              <li>Make sure all values are numbers (no commas)</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}