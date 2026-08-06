import { useState, useEffect } from 'react';

import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import PassView from './components/PassView';
import { RefreshCw } from 'lucide-react';

// Minimal client-side router — no react-router dependency needed
function getPassCodeFromUrl() {
  const path = window.location.pathname; // e.g. /pass/EVT-ABC123
  const match = path.match(/^\/pass\/([^/]+)$/);
  return match ? match[1] : null;
}

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [theme, setTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('eventora_theme');
      return stored ? stored : 'dark';
    } catch {
      return 'dark';
    }
  });

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('eventora_theme', theme);
  }, [theme]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Check if this is a public pass link — render without auth check
  const passCode = getPassCodeFromUrl();
  if (passCode) {
    return (
      <div className="app-root" data-theme={theme}>
        <PassView ticketCode={passCode} />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="app-loading-screen">
        <RefreshCw className="spinner text-blue" size={32} />
        <p>Connecting to Eventora...</p>
      </div>
    );
  }

  return (
    <div className="app-root">
      {!session ? (
        <Auth theme={theme} toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} />
      ) : (
        <AdminDashboard session={session} theme={theme} toggleTheme={() => setTheme(prev => prev === 'dark' ? 'light' : 'dark')} />
      )}
    </div>
  );
}
