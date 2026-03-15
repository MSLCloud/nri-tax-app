import React from 'react';

export default function Dashboard({ user, onNavigate, onLogout }) {
  const incomeModules = [
    {
      id: 'w2',
      title: 'W2 Salary Income',
      icon: '💼',
      description: 'Employment income',
      forms: ['1040'],
      status: 'coming-soon'
    },
    {
      id: 'mf',
      title: 'Mutual Funds (MTM)',
      icon: '📈',
      description: 'PFIC gains & reporting',
      forms: ['8621', '1040'],
      status: 'active'
    },
    {
      id: 'rental',
      title: 'Real Estate Rental',
      icon: '🏠',
      description: 'Rental property income',
      forms: ['Schedule E', '1040'],
      status: 'coming-soon'
    },
    {
      id: 'business',
      title: 'Business Income',
      icon: '🏢',
      description: 'Self-employment income',
      forms: ['Schedule C', '1040'],
      status: 'coming-soon'
    },
    {
      id: 'crypto',
      title: 'Cryptocurrency',
      icon: '₿',
      description: 'Crypto gains & losses',
      forms: ['8949', '1040'],
      status: 'coming-soon'
    },
    {
      id: 'itc',
      title: 'Foreign Tax Credit',
      icon: '🌍',
      description: 'Form 1118 FTC',
      forms: ['1118', '1040'],
      status: 'coming-soon'
    }
  ];

  const taxSummary = {
    w2Income: 0,
    mtmGain: 0,
    rentalIncome: 0,
    businessIncome: 0,
    totalIncome: 0,
    estimatedTax: 0
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-6 flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold text-gray-800">NRI Tax Suite</h1>
            <p className="text-gray-600 text-sm mt-1">Complete US-India tax filing platform</p>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{user?.email}</span>
            <button
              onClick={onLogout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-semibold"
            >
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* Tax Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">TOTAL INCOME</p>
            <p className="text-3xl font-bold text-blue-600">${taxSummary.totalIncome.toFixed(2)}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">ESTIMATED TAX</p>
            <p className="text-3xl font-bold text-orange-600">${taxSummary.estimatedTax.toFixed(2)}</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">FILING STATUS</p>
            <p className="text-xl font-bold text-green-600">In Progress</p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <p className="text-gray-600 text-sm font-semibold mb-2">TAX YEAR</p>
            <p className="text-2xl font-bold text-purple-600">2025</p>
          </div>
        </div>

        {/* Income Modules */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">Income Sources</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incomeModules.map((module) => (
              <div
                key={module.id}
                className={`p-6 rounded-lg shadow transition ${
                  module.status === 'active'
                    ? 'bg-white hover:shadow-lg cursor-pointer'
                    : 'bg-gray-100 opacity-60'
                }`}
                onClick={() => module.status === 'active' && onNavigate(module.id === 'mf' ? 'kfintech-pdf' : 'upload')}
              >
                <div className="flex items-start justify-between mb-4">
                  <span className="text-4xl">{module.icon}</span>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    module.status === 'active'
                      ? 'bg-green-100 text-green-800'
                      : 'bg-gray-300 text-gray-700'
                  }`}>
                    {module.status === 'active' ? 'Active' : 'Coming Soon'}
                  </span>
                </div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">{module.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{module.description}</p>
                <div className="flex flex-wrap gap-2">
                  {module.forms.map((form) => (
                    <span key={form} className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                      {form}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Forms Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-12">
          {/* Required Forms */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📋 Forms to File</h3>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                <p className="font-semibold text-gray-800">Form 1040</p>
                <p className="text-sm text-gray-600">US Individual Income Tax Return</p>
              </div>
              <div className="p-3 bg-green-50 rounded border-l-4 border-green-500">
                <p className="font-semibold text-gray-800">Form 8621</p>
                <p className="text-sm text-gray-600">PFIC Reporting (for MF)</p>
              </div>
              <div className="p-3 bg-purple-50 rounded border-l-4 border-purple-500">
                <p className="font-semibold text-gray-800">Form 1118</p>
                <p className="text-sm text-gray-600">Foreign Tax Credit</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded border-l-4 border-yellow-500">
                <p className="font-semibold text-gray-800">Form 114 (FBAR)</p>
                <p className="text-sm text-gray-600">Foreign Bank Account Report</p>
              </div>
            </div>
          </div>

          {/* Compliance Calendar */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-xl font-bold text-gray-800 mb-4">📅 Compliance Deadlines</h3>
            <div className="space-y-3">
              <div className="p-3 bg-red-50 rounded border-l-4 border-red-500">
                <p className="font-semibold text-gray-800">Jan 15</p>
                <p className="text-sm text-gray-600">FBAR Due (Form 114)</p>
              </div>
              <div className="p-3 bg-orange-50 rounded border-l-4 border-orange-500">
                <p className="font-semibold text-gray-800">Mar 1</p>
                <p className="text-sm text-gray-600">Form 8621 Due</p>
              </div>
              <div className="p-3 bg-green-50 rounded border-l-4 border-green-500">
                <p className="font-semibold text-gray-800">Apr 15</p>
                <p className="text-sm text-gray-600">Form 1040 Due</p>
              </div>
              <div className="p-3 bg-blue-50 rounded border-l-4 border-blue-500">
                <p className="font-semibold text-gray-800">Jun 15</p>
                <p className="text-sm text-gray-600">Estimated Tax Q2 (Form 1040-ES)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-gradient-to-r from-blue-500 to-blue-700 p-8 rounded-lg shadow text-white">
          <h3 className="text-2xl font-bold mb-4">🚀 Get Started</h3>
          <p className="mb-6">Add your income sources to auto-calculate your US-India tax liability</p>
          <button
            onClick={() => onNavigate('kfintech-pdf')}
            className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"
          >
            Upload Kfintech PDF
          </button>
        </div>
      </div>
    </div>
  );
}
