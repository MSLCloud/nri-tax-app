import React from 'react';

export default function Dashboard({ user, onNavigate, onLogout }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white shadow">
        <div className="max-w-6xl mx-auto px-4 py-6 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">NRI Tax App</h1>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user.email}</span>
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        <h2 className="text-2xl font-bold mb-8">Tax Year 2025</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">FILING STATUS</h3>
            <p className="text-2xl font-bold text-blue-600">In Progress</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">ESTIMATED TAX</h3>
            <p className="text-2xl font-bold text-green-600">$0.00</p>
            <p className="text-xs text-gray-500 mt-1">Upload data to calculate</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-gray-600 text-sm font-semibold mb-2">DOCUMENTS READY</h3>
            <p className="text-2xl font-bold text-orange-600">0/4</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          <button
            onClick={() => onNavigate('upload')}
            className="bg-blue-600 hover:bg-blue-700 text-white p-8 rounded-lg text-center font-semibold text-lg transition"
          >
            📤 Upload Mutual Funds
          </button>

          <button
            onClick={() => onNavigate('results')}
            className="bg-green-600 hover:bg-green-700 text-white p-8 rounded-lg text-center font-semibold text-lg transition"
          >
            📊 View Tax Results
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-xl font-bold mb-4">Compliance Calendar</h3>
          <div className="space-y-3">
            <div className="flex items-center gap-4 p-3 bg-yellow-50 rounded">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold text-gray-800">Jan 15 - FBAR Due</p>
                <p className="text-sm text-gray-600">FinCEN Form 114</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-blue-50 rounded">
              <span className="text-2xl">📋</span>
              <div>
                <p className="font-semibold text-gray-800">Mar 1 - Form 8621 Due</p>
                <p className="text-sm text-gray-600">PFIC Reporting</p>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-green-50 rounded">
              <span className="text-2xl">📄</span>
              <div>
                <p className="font-semibold text-gray-800">Apr 15 - Form 1040 Due</p>
                <p className="text-sm text-gray-600">Main Tax Return</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}