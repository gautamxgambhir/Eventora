import React, { useState } from 'react';
import LandingPage from './components/LandingPage';
import AdminDashboard from './components/AdminDashboard';
import { Ticket, LayoutDashboard, Sparkles } from 'lucide-react';

export default function App() {
  const [view, setView] = useState('landing'); // 'landing' or 'admin'

  return (
    <div className="app-layout">
      {/* Top Navigation Bar */}
      <nav className="navbar glass-panel">
        <div className="container nav-container">
          <div className="nav-logo" onClick={() => setView('landing')}>
            <Sparkles className="icon-cyan logo-sparkle" size={20} />
            <span className="logo-text text-gradient">EVENTORA</span>
          </div>
          
          <div className="nav-links">
            <button 
              onClick={() => setView('landing')} 
              className={`nav-link-btn ${view === 'landing' ? 'nav-active-landing' : ''}`}
            >
              <Ticket size={18} />
              <span>Get Passes</span>
            </button>
            <button 
              onClick={() => setView('admin')} 
              className={`nav-link-btn ${view === 'admin' ? 'nav-active-admin' : ''}`}
            >
              <LayoutDashboard size={18} />
              <span>Dashboard</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content container">
        {view === 'landing' ? (
          <LandingPage />
        ) : (
          <AdminDashboard />
        )}
      </main>

      {/* Footer */}
      <footer className="footer border-glow">
        <div className="container footer-content">
          <p>© 2026 Eventora Inc. All rights reserved.</p>
          <div className="footer-links">
            <span>Privacy Policy</span>
            <span>•</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
