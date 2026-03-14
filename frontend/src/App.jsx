import React, { useState, useEffect } from 'react';
import { getCurrentUser, signOut } from './utils/supabaseClient';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import MFUpload from './components/MFUpload';
import TaxResults from './components/TaxResults';
import FileUpload from './components/FileUpload';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [uploadedFunds, setUploadedFunds] = useState(null);

  useEffect(() => {
    const checkUser = async () => {
      const { data } = await getCurrentUser();
      if (data.session) {
        setUser({
          email: data.session.user.email,
          id: data.session.user.id
        });
      }
      setLoading(false);
    };
    
    checkUser();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
    setCurrentPage('dashboard');
  };

  const handleLogout = async () => {
    await signOut();
    setUser(null);
    setCurrentPage('login');
  };

  const handleNavigate = (page) => {
    setCurrentPage(page);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-lg text-gray-600">Loading...</p>
      </div>
    );
  }

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
        <MFUpload onNavigate={handleNavigate} user={user} initialFunds={uploadedFunds} onFundsLoaded={() => setUploadedFunds(null)} />
      )}
      {currentPage === 'fileupload' && (
        <FileUpload onNavigate={handleNavigate} onUpload={setUploadedFunds} />
      )}
      {currentPage === 'results' && (
        <TaxResults onNavigate={handleNavigate} user={user} />
      )}
    </div>
  );
}

export default App;