import React, { useState } from 'react';
import axios from 'axios';

export default function KfintechPdfUpload({ onNavigate }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setPdfFile(file);
      setError('');
      setResult(null);
    } else if (file) {
      setError('Please select a PDF file');
      setPdfFile(null);
    }
  };

  const handleCalculateMTM = async () => {
    if (!pdfFile) {
      setError('Please select a PDF file first');
      return;
    }

    setUploading(true);
    setError('');
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('pdf', pdfFile);

      const response = await axios.post(
        'http://localhost:5000/api/mf/parse-kfintech-pdf',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
          timeout: 120000
        }
      );

      if (response.data.success) {
        setResult(response.data.parsed);
      } else {
        setError(response.data.error || 'Failed to parse PDF');
      }
    } catch (err) {
      console.error('Upload error:', err);
      if (err.code === 'ERR_NETWORK') {
        setError('Network Error - Make sure the backend is running on port 5000');
      } else if (err.response) {
        setError(err.response.data?.error || `Server error (${err.response.status})`);
      } else {
        setError('Error uploading file: ' + err.message);
      }
    }

    setUploading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#1a1a2e',
      color: '#fff',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '40px 20px'
    }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '8px' }}>
        PFIC Mark-to-Market Election
      </h1>
      <p style={{ color: '#9ca3af', marginBottom: '40px' }}>
        2025 Tax Year MTM Calculation
      </p>

      {/* PDF Upload Area */}
      <div style={{
        border: '2px dashed #4b5563',
        borderRadius: '12px',
        padding: '40px',
        textAlign: 'center',
        maxWidth: '500px',
        width: '100%',
        marginBottom: '24px',
        background: '#16213e'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '16px' }}>
          {'\uD83D\uDCCA'}
        </div>
        <p style={{ color: '#d1d5db', marginBottom: '20px', fontSize: '1rem' }}>
          Select Kfintech Consolidated Statement (PDF)
        </p>

        <label style={{
          display: 'inline-block',
          background: '#10b981',
          color: '#fff',
          padding: '10px 24px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: '600',
          fontSize: '0.95rem',
          marginBottom: '12px'
        }}>
          Choose PDF File
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />
        </label>

        {pdfFile && (
          <p style={{ color: '#9ca3af', marginTop: '8px', fontSize: '0.9rem' }}>
            {pdfFile.name}
          </p>
        )}
      </div>

      {/* Calculate MTM Button */}
      <button
        onClick={handleCalculateMTM}
        disabled={!pdfFile || uploading}
        style={{
          background: uploading ? '#6b7280' : '#10b981',
          color: '#fff',
          border: 'none',
          padding: '14px 48px',
          borderRadius: '8px',
          fontSize: '1.1rem',
          fontWeight: '700',
          cursor: uploading ? 'not-allowed' : 'pointer',
          opacity: (!pdfFile || uploading) ? 0.6 : 1,
          marginBottom: '24px',
          maxWidth: '500px',
          width: '100%'
        }}
      >
        {uploading ? 'Processing...' : 'Calculate MTM'}
      </button>

      {/* Error Display */}
      {error && (
        <div style={{
          background: '#7f1d1d',
          border: '1px solid #dc2626',
          borderRadius: '8px',
          padding: '12px 20px',
          maxWidth: '500px',
          width: '100%',
          marginBottom: '24px'
        }}>
          <p style={{ color: '#fca5a5', fontSize: '0.95rem' }}>{error}</p>
        </div>
      )}

      {/* Results Display */}
      {result && (
        <div style={{
          background: '#16213e',
          border: '1px solid #374151',
          borderRadius: '12px',
          padding: '24px',
          maxWidth: '600px',
          width: '100%',
          marginBottom: '24px'
        }}>
          <h3 style={{ fontSize: '1.3rem', fontWeight: '700', marginBottom: '16px', color: '#10b981' }}>
            Parsed Results
          </h3>

          {result.investorName && (
            <p style={{ marginBottom: '8px' }}>
              <span style={{ color: '#9ca3af' }}>Investor: </span>
              <span style={{ fontWeight: '600' }}>{result.investorName}</span>
            </p>
          )}
          {result.panNumber && (
            <p style={{ marginBottom: '16px' }}>
              <span style={{ color: '#9ca3af' }}>PAN: </span>
              <span style={{ fontWeight: '600' }}>{result.panNumber}</span>
            </p>
          )}

          <p style={{ marginBottom: '8px' }}>
            <span style={{ color: '#9ca3af' }}>Funds found: </span>
            <span style={{ fontWeight: '600', color: '#60a5fa' }}>{result.funds?.length || 0}</span>
          </p>
          <p style={{ marginBottom: '16px' }}>
            <span style={{ color: '#9ca3af' }}>Transactions: </span>
            <span style={{ fontWeight: '600', color: '#60a5fa' }}>{result.transactions?.length || 0}</span>
          </p>

          {result.funds && result.funds.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontWeight: '600', marginBottom: '8px', color: '#d1d5db' }}>Funds:</h4>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {result.funds.map((fund, idx) => (
                  <li key={idx} style={{
                    background: '#1a1a2e',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    marginBottom: '6px',
                    fontSize: '0.9rem',
                    color: '#e5e7eb'
                  }}>
                    {idx + 1}. {fund}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.transactions && result.transactions.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <h4 style={{ fontWeight: '600', marginBottom: '8px', color: '#d1d5db' }}>Transactions:</h4>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid #374151' }}>
                      <th style={{ textAlign: 'left', padding: '8px', color: '#9ca3af' }}>Date</th>
                      <th style={{ textAlign: 'left', padding: '8px', color: '#9ca3af' }}>Type</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#9ca3af' }}>Amount</th>
                      <th style={{ textAlign: 'right', padding: '8px', color: '#9ca3af' }}>Units</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.transactions.slice(0, 20).map((txn, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1f2937' }}>
                        <td style={{ padding: '8px', color: '#e5e7eb' }}>{txn.trxnDate}</td>
                        <td style={{ padding: '8px', color: txn.trxnType === 'BUY' ? '#10b981' : txn.trxnType === 'SELL' ? '#ef4444' : '#9ca3af' }}>
                          {txn.trxnType}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', color: '#e5e7eb' }}>
                          {txn.amountINR?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td style={{ textAlign: 'right', padding: '8px', color: '#e5e7eb' }}>
                          {txn.trxnUnits?.toFixed(4)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {result.transactions.length > 20 && (
                  <p style={{ color: '#9ca3af', fontSize: '0.85rem', marginTop: '8px' }}>
                    ...and {result.transactions.length - 20} more transactions
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Back Button */}
      <button
        onClick={() => onNavigate('dashboard')}
        style={{
          background: 'transparent',
          color: '#60a5fa',
          border: '1px solid #374151',
          padding: '10px 32px',
          borderRadius: '8px',
          cursor: 'pointer',
          fontSize: '0.95rem',
          marginTop: '12px'
        }}
      >
        Back to Dashboard
      </button>
    </div>
  );
}
