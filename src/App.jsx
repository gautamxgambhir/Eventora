import { useState, useEffect } from 'react';

import { supabase } from './supabaseClient';
import Auth from './components/Auth';
import AdminDashboard from './components/AdminDashboard';
import { RefreshCw } from 'lucide-react';

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
    // Set theme on mount + whenever it changes.
    // (Keeps React lint happy; avoids direct DOM mutation during render.)
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('eventora_theme', theme);
  }, [theme]);



  useEffect(() => {
    // Fetch active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen to authentication changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

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
