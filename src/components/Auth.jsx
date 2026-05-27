import { useMemo, useState } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, LogIn, UserPlus, Globe, Moon, Sun } from 'lucide-react';

export default function Auth({ theme, toggleTheme }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const isDark = useMemo(() => theme === 'dark', [theme]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
        setInfoMsg('Registration successful! Please check your email for confirmation, or try logging in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password,
        });
        if (error) throw error;
      }
    } catch (error) {
      console.error('Authentication error:', error);
      setErrorMsg(error.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setErrorMsg('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Google OAuth error:', error);
      setErrorMsg(error.message || 'Could not initiate Google login.');
    }
  };

  return (
    <div className="auth-wrapper">
      <button
        onClick={toggleTheme}
        className="auth-theme-toggle"
        title="Toggle theme"
        type="button"
      >
        {isDark ? <Sun size={18} /> : <Moon size={18} />}
        <span>{isDark ? 'Light Mode' : 'Dark Mode'}</span>
      </button>
      <div className="auth-card glass-panel">
        <div className="auth-header">
          <h1 className="logo-text">EVENTORA</h1>
          <p className="auth-subtitle">
            {isSignUp ? 'Create your organizer account' : 'Sign in to manage your party passes'}
          </p>
        </div>


        {errorMsg && <div className="form-error-banner">{errorMsg}</div>}
        {infoMsg && <div className="form-info-banner">{infoMsg}</div>}

        <div
          className={`auth-mode-panel ${isSignUp ? 'auth-mode-panel-signup' : 'auth-mode-panel-signin'}`}
          key={isSignUp ? 'signup' : 'signin'}
        >
          <form onSubmit={handleAuth} className="auth-form">
            <div className="form-group">
              <label htmlFor="auth-email">Email Address</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={18} />
                <input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="auth-password">Password</label>
              <div className="input-with-icon">
                <Lock className="input-icon" size={18} />
                <input
                  id="auth-password"
                  type="password"
                  placeholder="••••••••"
                  className="form-input"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn btn-primary btn-full btn-auth">
              {loading ? (
                <div className="spinner-border" />
              ) : isSignUp ? (
                <>
                  <UserPlus size={18} />
                  Create Account
                </>
              ) : (
                <>
                  <LogIn size={18} />
                  Sign In
                </>
              )}
            </button>
          </form>
        </div>



        <div className="auth-divider-line">
          <span>or continue with</span>
        </div>

        <button onClick={handleGoogleLogin} className="btn btn-secondary btn-full btn-google">
          <Globe size={18} className="google-icon" />
          <span>Sign in with Google</span>
        </button>

        <div className="auth-footer">
          <button 
            type="button" 
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setInfoMsg('');
            }}
            className="btn-toggle-auth"
          >
            {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
}
