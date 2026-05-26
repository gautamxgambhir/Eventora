import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { User, Mail, Sparkles, Calendar, MapPin, Key, Award, Check, Save } from 'lucide-react';

export default function UserProfile({ user, onSelectParty, onClose }) {
  const [profile, setProfile] = useState(null);
  const [name, setName] = useState('');
  const [avatarSeed, setAvatarSeed] = useState('');
  const [parties, setParties] = useState([]);

  const getInitials = (value) => {
    if (!value) return 'U';
    const parts = value.trim().split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return value.substring(0, 2).toUpperCase();
  };

  const getAvatarBackground = (seed) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 68%, 64%)`;
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    fetchProfileAndParties();
  }, [user]);

  const fetchProfileAndParties = async () => {
    try {
      setLoading(true);
      // Fetch Profile
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (profileError) throw profileError;
      
      setProfile(profileData);
      setName(profileData.name || '');
      
      // Extract seed from URL if possible, otherwise use user ID
      const seedMatch = profileData.avatar_url?.match(/seed=([^&]+)/);
      setAvatarSeed(seedMatch ? seedMatch[1] : profileData.name || user.id);

      // Fetch joined parties
      const { data: partiesData, error: partiesError } = await supabase
        .from('party_admins')
        .select('role, party:parties(id, name, code, date, location)')
        .eq('user_id', user.id);

      if (partiesError) throw partiesError;
      setParties(partiesData || []);
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setStatusMsg({ type: 'error', text: 'Failed to load profile data.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setStatusMsg({ type: '', text: '' });

    const newAvatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed.trim())}`;

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: name.trim(),
          avatar_url: newAvatarUrl
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setStatusMsg({ type: 'success', text: 'Profile updated successfully!' });
      // Refresh local profile state
      setProfile(prev => ({ ...prev, name: name.trim(), avatar_url: newAvatarUrl }));
    } catch (error) {
      console.error('Error updating profile:', error);
      setStatusMsg({ type: 'error', text: error.message || 'Failed to update profile.' });
    } finally {
      setSaving(false);
    }
  };

  const displayName = profile?.name || user.user_metadata?.full_name || user.email || 'User';
  const displayAvatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url;
  const avatarFallback = {
    initials: getInitials(displayName),
    bg: getAvatarBackground(displayName)
  };
  const previewAvatarUrl = `https://api.dicebear.com/7.x/adventurer/svg?seed=${encodeURIComponent(avatarSeed.trim() || user.id)}`;

  return (
    <div className="profile-page-container">
      <div className="profile-grid-layout">
        
        {/* Left Side: Edit Profile details */}
        <div className="profile-details-card glass-panel">
          <h2 className="profile-section-title">Edit Profile Details</h2>
          <p className="profile-section-subtitle">Customize your organizer display credentials.</p>

          {statusMsg.text && (
            <div className={`form-${statusMsg.type}-banner`}>
              {statusMsg.text}
            </div>
          )}

          <div className="profile-avatar-preview-section">
            <div className="profile-avatar-wrapper">
              {displayAvatarUrl ? (
                <img 
                  src={displayAvatarUrl} 
                  alt="Avatar Preview" 
                  className="profile-big-avatar"
                  onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/adventurer/svg?seed=fallback'; }}
                />
              ) : (
                <div className="profile-avatar-fallback" style={{ background: avatarFallback.bg }}>
                  {avatarFallback.initials}
                </div>
              )}
            </div>
            <div className="avatar-meta-input">
              <span className="avatar-preview-label">Avatar Preview</span>
              <span className="avatar-preview-tip">Enter any text seed below to generate a unique adventurer avatar!</span>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="profile-form">
            <div className="form-group">
              <label htmlFor="prof-name">Display Name</label>
              <div className="input-with-icon">
                <User className="input-icon" size={18} />
                <input 
                  id="prof-name"
                  type="text"
                  placeholder="Your Name"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="prof-email">Email Address (Read-only)</label>
              <div className="input-with-icon">
                <Mail className="input-icon" size={18} />
                <input 
                  id="prof-email"
                  type="email"
                  className="form-input form-input-readonly"
                  value={profile?.email || user.email}
                  readOnly
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="prof-seed">Avatar Seed</label>
              <div className="input-with-icon">
                <Sparkles className="input-icon" size={18} />
                <input 
                  id="prof-seed"
                  type="text"
                  placeholder="e.g. your nickname, favorite color, etc."
                  className="form-input"
                  value={avatarSeed}
                  onChange={(e) => setAvatarSeed(e.target.value)}
                />
              </div>
            </div>

            <div className="profile-action-buttons">
              <button 
                type="button" 
                onClick={onClose} 
                className="btn btn-secondary"
                disabled={saving}
              >
                Back to Dashboard
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <div className="spinner-border" />
                ) : (
                  <>
                    <Save size={18} />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Right Side: List of joined parties */}
        <div className="profile-parties-card glass-panel">
          <h2 className="profile-section-title">My Parties ({parties.length})</h2>
          <p className="profile-section-subtitle">You are registered as an admin or organizer in these events.</p>

          {loading ? (
            <div className="loading-state">
              <div className="spinner text-purple" />
              <p>Fetching your associated events...</p>
            </div>
          ) : parties.length === 0 ? (
            <div className="empty-state-small">
              <Calendar size={32} className="text-muted" />
              <p className="empty-desc-text">You haven't created or joined any parties yet.</p>
            </div>
          ) : (
            <div className="profile-parties-list">
              {parties.map(({ role, party }) => {
                if (!party) return null;
                return (
                  <div 
                    key={party.id} 
                    className="profile-party-row"
                    onClick={() => {
                      onSelectParty(party.id);
                      onClose();
                    }}
                  >
                    <div className="profile-party-row-main">
                      <h4 className="profile-party-name">{party.name}</h4>
                      <div className="profile-party-meta">
                        <span><Calendar size={12} /> {party.date}</span>
                        {party.location && <span><MapPin size={12} /> {party.location}</span>}
                      </div>
                    </div>
                    <div className="profile-party-row-side">
                      <div className="party-row-code-label">
                        <Key size={10} />
                        <span>{party.code}</span>
                      </div>
                      <span className={`badge ${role === 'Organizer' ? 'badge-pink' : 'badge-cyan'}`}>
                        <Award size={10} />
                        {role}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
