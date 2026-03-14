import React, { useState, useEffect } from 'react';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MFUpload from './components/MFUpload';
import TaxResults from './components/TaxResults';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');

  useEffect(() => {
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage('dashboard');
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('funds');
    setUser(null);
    setCurrentPage('login');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div>
      {currentPage === 'dashboard' && (
        <Dashboard 
          user={user} 
          onNavigate={handleNavigate}
          onLogout={handleLogout}
        />
      )}
      {currentPage === 'upload' && (
        <MFUpload onNavigate={handleNavigate} />
      )}
      {currentPage === 'results' && (
        <TaxResults onNavigate={handleNavigate} />
      )}
    </div>
  );
}

export default App;