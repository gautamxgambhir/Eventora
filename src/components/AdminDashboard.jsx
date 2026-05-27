import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import UserProfile from './UserProfile';
import { 
  Users, CheckCircle, Search, Filter, Plus, Download, 
  Trash2, X, RefreshCw, AlertCircle, FileSpreadsheet, Key, Calendar, 
  MapPin, LogOut, User as UserIcon, Copy, Check, Users2, Shield, Settings,
  Sparkles, Sun, Moon
} from 'lucide-react';

export default function AdminDashboard({ session, theme, toggleTheme }) {
  const currentUser = session.user;
  const [profile, setProfile] = useState(null);
  
  // View states
  const [showProfileView, setShowProfileView] = useState(false);
  
  // Parties state
  const [parties, setParties] = useState([]);
  const [selectedParty, setSelectedParty] = useState(null);
  const [collaborators, setCollaborators] = useState([]);
  const [partiesLoading, setPartiesLoading] = useState(true);
  
  // Guests state
  const [guests, setGuests] = useState([]);
  const [guestsLoading, setGuestsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Search & Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'CheckedIn', 'Pending'
  const [typeFilter, setTypeFilter] = useState('All'); // 'All', 'Alcoholic', 'Non-Alcoholic'

  // Modals state
  const [showCreatePartyModal, setShowCreatePartyModal] = useState(false);
  const [newPartyName, setNewPartyName] = useState('');
  const [newPartyDate, setNewPartyDate] = useState('');
  const [newPartyLoc, setNewPartyLoc] = useState('');
  const [createPartyLoading, setCreatePartyLoading] = useState(false);

  const [showEditPartyModal, setShowEditPartyModal] = useState(false);
  const [editPartyName, setEditPartyName] = useState('');
  const [editPartyDate, setEditPartyDate] = useState('');
  const [editPartyLoc, setEditPartyLoc] = useState('');
  const [editPartyLoading, setEditPartyLoading] = useState(false);

  const [showJoinPartyModal, setShowJoinPartyModal] = useState(false);
  const [joinAccessCode, setJoinAccessCode] = useState('');
  const [joinPartyLoading, setJoinPartyLoading] = useState(false);

  const [showAddGuestModal, setShowAddGuestModal] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestType, setGuestType] = useState('');
  const [guestAmount, setGuestAmount] = useState('0');
  const [addGuestLoading, setAddGuestLoading] = useState(false);
  const [addGuestError, setAddGuestError] = useState('');
  // Pass types state
  const [passTypes, setPassTypes] = useState([]);
  const [guestPassTypeId, setGuestPassTypeId] = useState(null);
  const [showManagePassTypesModal, setShowManagePassTypesModal] = useState(false);
  const [newPassName, setNewPassName] = useState('');
  const [newPassPrice, setNewPassPrice] = useState('0');
  const [passTypesLoading, setPassTypesLoading] = useState(false);

  const [activeTab, setActiveTab] = useState('Overview');
  const [copied, setCopied] = useState(false);

  // Fetch logged in user profile
  useEffect(() => {
    fetchUserProfile();
  }, [currentUser]);

  // Fetch user parties on mount
  useEffect(() => {
    fetchUserParties();
  }, [currentUser]);

  // Fetch guests and collaborators when selectedParty changes
  useEffect(() => {
    if (selectedParty) {
      fetchGuests();
      fetchPassTypes();
      fetchCollaborators();
      localStorage.setItem('eventora_active_party_id', selectedParty.id);
    } else {
      setGuests([]);
      setCollaborators([]);
    }
  }, [selectedParty]);

  const fetchPassTypes = async () => {
    if (!selectedParty) return;
    try {
      setPassTypesLoading(true);
      const { data, error } = await supabase
        .from('pass_types')
        .select('*')
        .eq('party_id', selectedParty.id)
        .order('created_at', { ascending: true });
      if (error) throw error;
      setPassTypes(data || []);
    } catch (err) {
      console.error('Error fetching pass types:', err);
    } finally {
      setPassTypesLoading(false);
    }
  };

  const handleAddPassType = async (e) => {
    e && e.preventDefault();
    if (!newPassName.trim() || isNaN(Number(newPassPrice))) return;
    try {
      const { error } = await supabase
        .from('pass_types')
        .insert([{ party_id: selectedParty.id, name: newPassName.trim(), price: parseFloat(newPassPrice) }]);
      if (error) throw error;
      setNewPassName('');
      setNewPassPrice('0');
      fetchPassTypes();
    } catch (err) {
      console.error('Error creating pass type:', err);
      alert('Failed to create pass type: ' + err.message);
    }
  };

  const handleDeletePassType = async (id) => {
    if (!window.confirm('Delete this pass option? Existing passes will keep their recorded price.')) return;
    try {
      const { error } = await supabase.from('pass_types').delete().eq('id', id);
      if (error) throw error;
      fetchPassTypes();
    } catch (err) {
      console.error('Error deleting pass type:', err);
      alert('Failed to delete pass type.');
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .single();
      if (error) throw error;
      setProfile(data);
    } catch (err) {
      console.error('Error fetching user profile:', err);
    }
  };

  const fetchUserParties = async (selectId = null) => {
    try {
      setPartiesLoading(true);
      const { data, error } = await supabase
        .from('party_admins')
        .select('role, party:parties(*)')
        .eq('user_id', currentUser.id);

      if (error) throw error;

      const loadedParties = data
        .map(item => ({ ...item.party, role: item.role }))
        .filter(p => p !== null);

      setParties(loadedParties);

      // Determine which party to select
      if (loadedParties.length > 0) {
        const cachedId = selectId || localStorage.getItem('eventora_active_party_id');
        const found = loadedParties.find(p => p.id === cachedId);
        setSelectedParty(found || loadedParties[0]);
      } else {
        setSelectedParty(null);
      }
    } catch (err) {
      console.error('Error fetching parties:', err);
    } finally {
      setPartiesLoading(false);
    }
  };

  const fetchGuests = async () => {
    if (!selectedParty) return;
    try {
      setGuestsLoading(true);
      setErrorMsg('');
      const { data, error } = await supabase
        .from('passes')
        .select('*, added_by:profiles(name, avatar_url), pass_type:pass_types(*)')
        .eq('party_id', selectedParty.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuests(data || []);
    } catch (err) {
      console.error('Error fetching guests:', err);
      setErrorMsg('Failed to sync guest passes.');
    } finally {
      setGuestsLoading(false);
    }
  };

  const fetchCollaborators = async () => {
    if (!selectedParty) return;
    try {
      const { data, error } = await supabase
        .from('party_admins')
        .select('role, user:profiles(id, name, email, avatar_url)')
        .eq('party_id', selectedParty.id);

      if (error) throw error;
      setCollaborators(data || []);
    } catch (err) {
      console.error('Error fetching collaborators:', err);
    }
  };

  // Toggle check-in status
  const handleToggleCheckIn = async (guest) => {
    const updatedStatus = !guest.checked_in;
    const checkInTime = updatedStatus ? new Date().toISOString() : null;

    // Optimistic UI update
    setGuests(prev => prev.map(g => 
      g.id === guest.id 
        ? { ...g, checked_in: updatedStatus, checked_in_at: checkInTime } 
        : g
    ));

    try {
      const { error } = await supabase
        .from('passes')
        .update({ 
          checked_in: updatedStatus, 
          checked_in_at: checkInTime 
        })
        .eq('id', guest.id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating check-in:', err);
      alert('Failed to update check-in status.');
      fetchGuests();
    }
  };

  // Delete/refund guest pass
  const handleDeleteGuest = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete the pass for ${name}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('passes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setGuests(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error('Error deleting guest:', err);
      alert('Failed to delete guest pass.');
    }
  };

  // Create new party
  const handleCreateParty = async (e) => {
    e.preventDefault();
    if (!newPartyName.trim() || !newPartyDate) return;
    
    setCreatePartyLoading(true);
    try {
      // Generate a unique 6-character code
      const accessCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Insert party
      const { data: partyData, error: partyError } = await supabase
        .from('parties')
        .insert([{
          name: newPartyName.trim(),
          date: newPartyDate,
          location: newPartyLoc.trim(),
          code: accessCode
        }])
        .select();

      if (partyError) throw partyError;
      const createdParty = partyData[0];

      const { error: adminError } = await supabase
        .from('party_admins')
        .insert([{
          party_id: createdParty.id,
          user_id: currentUser.id,
          role: 'Organizer'
        }]);

      if (adminError) throw adminError;

      // Close modal and refresh list
      setNewPartyName('');
      setNewPartyDate('');
      setNewPartyLoc('');
      setShowCreatePartyModal(false);
      
      // Fetch user parties and select the newly created one
      fetchUserParties(createdParty.id);
    } catch (err) {
      console.error('Error creating party:', err);
      alert('Failed to create party: ' + err.message);
    } finally {
      setCreatePartyLoading(false);
    }
  };

  // Edit party details
  const handleEditParty = async (e) => {
    e.preventDefault();
    if (!editPartyName.trim() || !editPartyDate) return;

    setEditPartyLoading(true);
    try {
      const { data, error } = await supabase
        .from('parties')
        .update({
          name: editPartyName.trim(),
          date: editPartyDate,
          location: editPartyLoc.trim(),
        })
        .eq('id', selectedParty.id)
        .select();

      if (error) throw error;

      const updatedParty = { ...selectedParty, ...data[0] };
      
      // Update selectedParty state
      setSelectedParty(updatedParty);

      // Update parties list state
      setParties(prev => prev.map(p => p.id === selectedParty.id ? updatedParty : p));

      setShowEditPartyModal(false);
    } catch (err) {
      console.error('Error updating party:', err);
      alert('Failed to update party info: ' + err.message);
    } finally {
      setEditPartyLoading(false);
    }
  };

  // Join party using access code
  const handleJoinParty = async (e) => {
    e.preventDefault();
    if (!joinAccessCode.trim()) return;

    setJoinPartyLoading(true);
    try {
      const cleanCode = joinAccessCode.trim().toUpperCase();

      // Find party
      const { data: partyData, error: partyError } = await supabase
        .from('parties')
        .select('*')
        .eq('code', cleanCode);

      if (partyError) throw partyError;
      
      if (!partyData || partyData.length === 0) {
        alert('Invalid access code. Please double-check.');
        setJoinPartyLoading(false);
        return;
      }

      const partyToJoin = partyData[0];

      // Add user to membership relation (as Admin collaborator)
      const { error: joinError } = await supabase
        .from('party_admins')
        .insert([{
          party_id: partyToJoin.id,
          user_id: currentUser.id,
          role: 'Admin'
        }]);

      // If it returns a primary key violation (they are already in it), we can ignore it
      if (joinError && joinError.code !== '23505') {
        throw joinError;
      }

      // Success
      setJoinAccessCode('');
      setShowJoinPartyModal(false);
      fetchUserParties(partyToJoin.id);
    } catch (err) {
      console.error('Error joining party:', err);
      alert('Failed to join party: ' + err.message);
    } finally {
      setJoinPartyLoading(false);
    }
  };

  // Add guest manually
  const handleAddGuest = async (e) => {
    e.preventDefault();
    setAddGuestError('');
    if (!guestName.trim()) return;

    const parsedAmount = parseFloat(guestAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setAddGuestError('Enter a valid positive price.');
      return;
    }

    setAddGuestLoading(true);
    try {
      const randStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ticketCode = `EVT-${randStr}`;

      // Determine ticket_type for legacy column to satisfy DB constraints.
      // Prefer the selected pass type's name, otherwise fall back to guestType or 'Custom'.
      let ticketTypeToInsert = 'Custom';
      if (guestPassTypeId) {
        const sel = passTypes.find(p => p.id === guestPassTypeId || p.id === String(guestPassTypeId));
        if (sel && sel.name) ticketTypeToInsert = sel.name;
      } else if (guestType && guestType.trim()) {
        ticketTypeToInsert = guestType.trim();
      }

      const insertObj = {
        party_id: selectedParty.id,
        added_by: currentUser.id,
        name: guestName.trim(),
        email: null,
        ticket_type: ticketTypeToInsert,
        amount_paid: parsedAmount,
        ticket_code: ticketCode,
        checked_in: false
      };
      if (guestPassTypeId) insertObj.pass_type_id = guestPassTypeId;

      const { data, error } = await supabase
        .from('passes')
        .insert([insertObj])
        .select();

      if (error) throw error;

      setGuestName('');
      setGuestType('Non-Alcoholic');
      setGuestAmount('50');
      setGuestPassTypeId(null);
      setShowAddGuestModal(false);
      fetchGuests();
    } catch (err) {
      console.error('Error adding guest:', err);
      setAddGuestError(err.message || 'Error occurred.');
    } finally {
      setAddGuestLoading(false);
    }
  };

  // Dynamic values updating default prices
  const handleGuestTypeChange = (type) => {
    setGuestType(type);
    setGuestAmount(type === 'Alcoholic' ? '90' : '50');
    setGuestPassTypeId(null);
  };

  const handleGuestPassTypeSelect = (id) => {
    if (!id) {
      // custom
      setGuestPassTypeId(null);
      setGuestType('Custom');
      setGuestAmount('0');
      return;
    }
    const sel = passTypes.find(p => p.id === id);
    if (!sel) return;
    setGuestPassTypeId(id);
    setGuestType(sel.name);
    setGuestAmount(String(sel.price));
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredGuests.length === 0) return;
    
    const headers = ['Ticket Code', 'Name', 'Pass Type', 'Type Price (₹)', 'Amount Paid (₹)', 'Admitted', 'Registered By', 'Purchase Time'];
    const rows = filteredGuests.map(g => [
      g.ticket_code,
      g.name,
      g.pass_type?.name || 'Custom',
      g.pass_type && g.pass_type.price !== null && g.pass_type.price !== undefined ? parseFloat(g.pass_type.price).toFixed(2) : '',
      g.amount_paid,
      g.checked_in ? 'YES' : 'NO',
      g.added_by?.name || 'System',
      new Date(g.created_at).toLocaleString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.href = encodedUri;
    link.download = `${selectedParty.name.toLowerCase().replace(/\s+/g, '_')}_guests.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Handle access code copy
  const handleCopyCode = () => {
    if (!selectedParty) return;
    navigator.clipboard.writeText(selectedParty.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Metrics
  const totalPasses = guests.length;
  const totalRevenue = guests.reduce((sum, g) => sum + parseFloat(g.amount_paid || 0), 0);
  const admittedCount = guests.filter(g => g.checked_in).length;
  const pendingCount = totalPasses - admittedCount;
  const checkInRate = totalPasses > 0 ? Math.round((admittedCount / totalPasses) * 100) : 0;

  // Filtered guest list
  const filteredGuests = guests.filter(g => {
    const term = searchTerm.toLowerCase();
    const matchesSearch = 
      g.name.toLowerCase().includes(term) || 
      g.ticket_code.toLowerCase().includes(term);
    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'CheckedIn' && g.checked_in) || 
      (statusFilter === 'Pending' && !g.checked_in);

    const matchesType = typeFilter === 'All' || g.pass_type?.id === typeFilter;

    return matchesSearch && matchesStatus && matchesType;
  });

  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.split(' ');
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getAvatarBackground = (seed) => {
    let hash = 0;
    for (let i = 0; i < seed.length; i += 1) {
      hash = seed.charCodeAt(i) + ((hash << 5) - hash);
    }
    const hue = Math.abs(hash) % 360;
    return `hsl(${hue}, 68%, 64%)`;
  };

  const getCurrentAvatar = () => {
    const avatarUrl = profile?.avatar_url || currentUser.user_metadata?.avatar_url;
    if (avatarUrl) {
      return { url: avatarUrl };
    }

    const displayName = profile?.name || currentUser.user_metadata?.full_name || currentUser.email || 'User';
    return {
      initials: getInitials(displayName),
      bg: getAvatarBackground(displayName)
    };
  };

  const currentAvatar = getCurrentAvatar();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="admin-layout-wrapper">
      
      {/* Top Navbar */}
      <nav className="dash-navbar glass-panel">
        <div className="navbar-container">
          <div className="navbar-logo" onClick={() => setShowProfileView(false)}>
            <Sparkles className="icon-blue" size={20} />
            <span className="logo-text text-gradient">EVENTORA</span>
          </div>
          
          <div className="navbar-user-controls">
            <button onClick={toggleTheme} className="btn btn-secondary btn-theme-toggle" title="Toggle theme">
              {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            {profile && (
              <button 
                onClick={() => setShowProfileView(true)} 
                className={`user-profile-badge-btn ${showProfileView ? 'profile-badge-btn-active' : ''}`}
                title="Edit Profile"
              >
                {currentAvatar.url ? (
                  <img 
                    src={currentAvatar.url} 
                    alt={profile.name} 
                    className="navbar-user-avatar"
                    onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/adventurer/svg?seed=avatar'; }}
                  />
                ) : (
                  <div className="navbar-avatar-fallback" style={{ background: currentAvatar.bg }}>
                    {currentAvatar.initials}
                  </div>
                )}
                <span className="navbar-user-name text-truncate">{profile.name}</span>
              </button>
            )}
            
            <button onClick={handleSignOut} className="btn btn-secondary btn-signout" title="Sign Out">
              <LogOut size={16} />
              <span className="btn-text-responsive">Sign Out</span>
            </button>
          </div>
        </div>
      </nav>

      {/* Main Body */}
      {showProfileView ? (
        <UserProfile 
          user={currentUser} 
          onSelectParty={(partyId) => {
            const found = parties.find(p => p.id === partyId);
            if (found) setSelectedParty(found);
          }} 
          onClose={() => {
            setShowProfileView(false);
            fetchUserProfile(); // Sync profile edits
          }} 
        />
      ) : (
        <div className="dash-body-grid">
          
          {/* Left Sidebar */}
          <aside className="sidebar glass-panel">
            <div className="sidebar-section-header">
              <h3>Party Management</h3>
            </div>

            {partiesLoading ? (
              <div className="sidebar-loading">
                <RefreshCw className="spinner" size={20} />
                <span>Loading events...</span>
              </div>
            ) : selectedParty ? (
              <>
                <div className="sidebar-current-party">
                  <div>
                    <p className="sidebar-current-party-label">Current Party</p>
                    <strong className="sidebar-current-party-name">{selectedParty.name}</strong>
                    <span className="sidebar-current-party-meta">
                      {selectedParty.date} · {selectedParty.location || 'Venue not set'}
                    </span>
                  </div>
                  {parties.length > 1 && (
                    <select
                      className="form-input sidebar-party-switcher"
                      value={selectedParty.id}
                      onChange={(e) => {
                        const next = parties.find(p => p.id === e.target.value);
                        if (next) {
                          setSelectedParty(next);
                          setActiveTab('Overview');
                        }
                      }}
                    >
                      {parties.map((party) => (
                        <option key={party.id} value={party.id}>{party.name}</option>
                      ))}
                    </select>
                  )}
                </div>
                <div className="sidebar-tabs">
                  {['Overview', 'Party Info', 'Admins', 'Passes', 'Settings'].map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      className={`sidebar-tab-btn ${activeTab === tab ? 'sidebar-tab-active' : ''}`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </>
            ) : parties.length === 0 ? (
              <div className="sidebar-empty">
                <p>No parties found.</p>
              </div>
            ) : (
              <div className="sidebar-parties-list">
                {parties.map((party) => (
                  <button
                    key={party.id}
                    onClick={() => {
                      setSelectedParty(party);
                      setActiveTab('Overview');
                    }}
                    className={`sidebar-party-btn ${selectedParty?.id === party.id ? 'party-btn-active' : ''}`}
                  >
                    <div className="sidebar-party-btn-meta">
                      <span className="sidebar-party-name text-truncate">{party.name}</span>
                      <span className="sidebar-party-date">{party.date}</span>
                    </div>
                    <span className={`role-badge ${party.role === 'Organizer' ? 'role-org' : 'role-admin'}`}>
                      {party.role[0]}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="sidebar-footer-actions">
              <button onClick={() => setShowJoinPartyModal(true)} className="btn btn-secondary btn-full">
                <Key size={14} />
                <span>Join with Code</span>
              </button>
              <button onClick={() => setShowCreatePartyModal(true)} className="btn btn-primary btn-full">
                <Plus size={14} />
                <span>Create Party</span>
              </button>
            </div>
          </aside>

          {/* Main workspace panels */}
          <main className="workspace">
            {selectedParty ? (
              <div className="workspace-container">
                
                {/* Party Details Header */}
                <div className="party-details-card-header glass-panel">
                  <div className="party-header-meta">
                    <h1 className="active-party-title">{selectedParty.name}</h1>
                    <div className="active-party-details-row">
                      <span><Calendar size={14} /> {selectedParty.date}</span>
                      {selectedParty.location && <span><MapPin size={14} /> {selectedParty.location}</span>}
                    </div>
                  </div>

                  <div className="party-access-code-box">
                    <span className="access-code-label">Access Code</span>
                    <div className="access-code-input-group">
                      <span className="access-code-value">{selectedParty.code}</span>
                      <button onClick={handleCopyCode} className="btn-copy-code" title="Copy Code">
                        {copied ? <Check size={14} className="text-success" /> : <Copy size={14} />}
                      </button>
                    </div>
                  </div>
                </div>

                {activeTab === 'Overview' && (
                  <>
                    <div className="collaborators-card glass-panel">
                      <div className="collab-header">
                        <Users2 size={18} className="icon-blue" />
                        <h3>Event Admins & Collaborators</h3>
                        <span className="collab-count">{collaborators.length}</span>
                      </div>
                      <div className="collaborators-list">
                        {collaborators.map(({ role, user: collabUser }) => {
                          if (!collabUser) return null;
                          return (
                            <div key={collabUser.id} className="collab-avatar-card" title={`${collabUser.name} (${role})`}>
                              <img 
                                src={collabUser.avatar_url} 
                                alt={collabUser.name} 
                                className="collab-avatar" 
                                onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/adventurer/svg?seed=fallback'; }}
                              />
                              <div className="collab-info-tooltip">
                                <span className="tooltip-name">{collabUser.name}</span>
                                <span className="tooltip-email">{collabUser.email}</span>
                                <span className={`badge tooltip-badge ${role === 'Organizer' ? 'badge-pink' : 'badge-cyan'}`}>
                                  {role}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="metrics-grid">
                      <div className="metric-card glass-panel">
                        <div className="metric-meta">
                          <div className="metric-icon-circle icon-blue-bg">
                            <Users className="icon-blue" size={20} />
                          </div>
                          <span className="metric-label">Passes Sold</span>
                        </div>
                        <div className="metric-value-row">
                          <span className="metric-value">{totalPasses}</span>
                          <div className="metric-sub-label">{passTypes.length} pass type{passTypes.length !== 1 ? 's' : ''}</div>
                        </div>
                      </div>

                      <div className="metric-card glass-panel">
                        <div className="metric-meta">
                          <div className="metric-icon-circle icon-success-bg">
                            <Shield className="text-success" size={20} />
                          </div>
                          <span className="metric-label">Total Revenue</span>
                        </div>
                        <div className="metric-value-row">
                          <span className="metric-value text-success">₹{totalRevenue.toFixed(2)}</span>
                          <div className="metric-sub-label">
                            Avg: ₹{(totalPasses > 0 ? totalRevenue / totalPasses : 0).toFixed(1)}/pass
                          </div>
                        </div>
                      </div>

                      <div className="metric-card glass-panel">
                        <div className="metric-meta">
                          <div className="metric-icon-circle icon-pink-bg">
                            <CheckCircle className="icon-pink" size={20} />
                          </div>
                          <span className="metric-label">Admissions</span>
                        </div>
                        <div className="metric-value-row">
                          <span className="metric-value">{admittedCount} <span className="value-total">/ {totalPasses}</span></span>
                          <div className="metric-sub-label">
                            Pending: <span className="font-semibold text-warning">{pendingCount}</span>
                          </div>
                        </div>
                        <div className="progress-bar-container">
                          <div className="progress-bar-fill" style={{ width: `${checkInRate}%` }}></div>
                        </div>
                        <span className="progress-percentage">{checkInRate}% Checked In</span>
                      </div>
                    </div>

                    <div className="overview-panel glass-panel">
                      <h3 className="overview-title">Quick Review</h3>
                      <p className="overview-copy">This is your current party workspace. Use the Passes tab to add ticket holders, set pass type and rupee pricing, and manage check-ins. All values are now tracked in rupees.</p>
                    </div>
                  </>
                )}

                {activeTab === 'Party Info' && (
                  <div className="party-info-panel glass-panel">
                    <div className="section-heading-row">
                      <h2>Party Information</h2>
                      <span className="badge badge-cyan">{selectedParty.role}</span>
                    </div>
                    <div className="party-info-grid">
                      <div className="party-info-card">
                        <span className="info-label">Party Name</span>
                        <strong>{selectedParty.name}</strong>
                      </div>
                      <div className="party-info-card">
                        <span className="info-label">Event Date</span>
                        <strong>{selectedParty.date}</strong>
                      </div>
                      <div className="party-info-card">
                        <span className="info-label">Location</span>
                        <strong>{selectedParty.location || 'Not set'}</strong>
                      </div>
                      <div className="party-info-card">
                        <span className="info-label">Access Code</span>
                        <strong>{selectedParty.code}</strong>
                      </div>
                    </div>
                    <p className="section-note">Organizers can choose pass types and prices while registering guests in the Passes tab. You can also change event details from the party settings area.</p>
                    {selectedParty.role === 'Organizer' && (
                      <button 
                        type="button" 
                        className="btn btn-secondary" 
                        onClick={() => {
                          setEditPartyName(selectedParty.name);
                          setEditPartyDate(selectedParty.date);
                          setEditPartyLoc(selectedParty.location || '');
                          setShowEditPartyModal(true);
                        }}
                        style={{ marginTop: '20px' }}
                      >
                        <Settings size={16} />
                        Edit Party Info
                      </button>
                    )}
                  </div>
                )}

                {activeTab === 'Admins' && (
                  <div className="collaborators-card glass-panel">
                    <div className="collab-header">
                      <Users2 size={18} className="icon-blue" />
                      <h3>Current Admins</h3>
                      <span className="collab-count">{collaborators.length}</span>
                    </div>
                    <div className="collaborators-list">
                      {collaborators.map(({ role, user: collabUser }) => {
                        if (!collabUser) return null;
                        return (
                          <div key={collabUser.id} className="collab-avatar-card" title={`${collabUser.name} (${role})`}>
                            <img 
                              src={collabUser.avatar_url} 
                              alt={collabUser.name} 
                              className="collab-avatar" 
                              onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/adventurer/svg?seed=fallback'; }}
                            />
                            <div className="collab-info-tooltip">
                              <span className="tooltip-name">{collabUser.name}</span>
                              <span className="tooltip-email">{collabUser.email}</span>
                              <span className={`badge tooltip-badge ${role === 'Organizer' ? 'badge-pink' : 'badge-cyan'}`}>
                                {role}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activeTab === 'Passes' && (
                  <div className="guest-management-panel glass-panel">
                    <div className="panel-header">
                      <h2 className="panel-title">Guest Pass Holders</h2>
                      <div className="panel-header-actions">
                        <button onClick={handleExportCSV} className="btn btn-secondary btn-sm-text" title="Export CSV">
                          <Download size={14} />
                          <span>Export CSV</span>
                        </button>
                        <button type="button" className="btn btn-secondary btn-sm-text" onClick={() => setShowManagePassTypesModal(true)} title="Manage pass types">
                          <Settings size={14} />
                          <span>Manage Types</span>
                        </button>
                        <button onClick={() => setShowAddGuestModal(true)} className="btn btn-primary btn-sm-text">
                          <Plus size={14} />
                          <span>Add Guest</span>
                        </button>
                      </div>
                    </div>

                    <div className="filters-bar">
                      <div className="search-box-container">
                        <Search className="search-icon" size={16} />
                        <input 
                          type="text" 
                          placeholder="Search name or ticket code..." 
                          className="form-input search-input"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>

                      <div className="filters-group">
                        <div className="filter-select-wrapper">
                          <Filter className="filter-icon" size={14} />
                          <select 
                            className="form-input filter-select"
                            value={typeFilter}
                            onChange={(e) => setTypeFilter(e.target.value)}
                          >
                            <option value="All">All Tiers</option>
                            {passTypes.map(pt => (
                              <option key={pt.id} value={pt.id}>{pt.name} (₹{pt.price})</option>
                            ))}
                          </select>
                        </div>

                        <div className="tabs-group">
                          <button 
                            onClick={() => setStatusFilter('All')}
                            className={`tab-btn ${statusFilter === 'All' ? 'tab-btn-active' : ''}`}
                          >
                            All
                          </button>
                          <button 
                            onClick={() => setStatusFilter('CheckedIn')}
                            className={`tab-btn ${statusFilter === 'CheckedIn' ? 'tab-btn-active' : ''}`}
                          >
                            Admitted
                          </button>
                          <button 
                            onClick={() => setStatusFilter('Pending')}
                            className={`tab-btn ${statusFilter === 'Pending' ? 'tab-btn-active' : ''}`}
                          >
                            Pending
                          </button>
                        </div>
                      </div>
                    </div>

                    {guestsLoading ? (
                      <div className="loading-state">
                        <RefreshCw className="spinner text-purple" size={24} />
                        <p>Syncing guest passes...</p>
                      </div>
                    ) : filteredGuests.length === 0 ? (
                      <div className="empty-state">
                        <FileSpreadsheet size={36} className="text-muted" />
                        <h3>No passes found</h3>
                        <p>Search terms or filter toggles matched zero guests.</p>
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="guest-table">
                          <thead>
                            <tr>
                              <th>Attendee</th>
                              <th>Tier / Code</th>
                              <th>Amount (₹)</th>
                              <th>Added By</th>
                              <th>Added At</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredGuests.map((guest) => {
                              const initials = getInitials(guest.name);
                              const passName = guest.pass_type?.name || 'Custom';
                              const passPrice = guest.pass_type?.price;
                              
                              return (
                                <tr key={guest.id} className={guest.checked_in ? 'tr-admitted' : ''}>
                                  <td>
                                    <div className="guest-profile">
                                      <div className={`guest-avatar`}>
                                        {initials}
                                      </div>
                                      <div className="guest-info">
                                        <span className="guest-name text-truncate">{guest.name}</span>
                                      </div>
                                    </div>
                                  </td>
                                  <td>
                                    <div className="guest-ticket-cell">
                                      <span className={`badge badge-neutral`}>
                                        {passName}
                                      </span>
                                      <span className="guest-ticket-code">{guest.ticket_code}</span>
                                      {passPrice !== undefined && passPrice !== null && (
                                        <span className="guest-pass-price">Type price: ₹{parseFloat(passPrice).toFixed(2)}</span>
                                      )}
                                    </div>
                                  </td>
                                  <td>
                                    <span className="guest-amount font-semibold text-success">
                                      ₹{parseFloat(guest.amount_paid).toFixed(2)}
                                    </span>
                                  </td>
                                  <td>
                                    {guest.added_by ? (
                                      <div className="guest-added-by-profile" title={guest.added_by.name}>
                                        <img 
                                          src={guest.added_by.avatar_url} 
                                          alt={guest.added_by.name} 
                                          className="added-by-avatar"
                                          onError={(e) => { e.target.src = 'https://api.dicebear.com/7.x/adventurer/svg?seed=fallback'; }}
                                        />
                                        <span className="added-by-name text-truncate">{guest.added_by.name.split(' ')[0]}</span>
                                      </div>
                                    ) : (
                                      <span className="text-muted text-xs">System</span>
                                    )}
                                  </td>
                                  <td>
                                    <span className="guest-date-cell">
                                      {guest.created_at 
                                        ? new Date(guest.created_at).toLocaleString(undefined, {
                                            month: 'short',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                          })
                                        : 'N/A'}
                                    </span>
                                  </td>
                                  <td>
                                    {guest.checked_in ? (
                                      <div className="status-badge-container">
                                        <span className="badge badge-success">Admitted</span>
                                        {guest.checked_in_at && (
                                          <span className="status-timestamp">
                                            {new Date(guest.checked_in_at).toLocaleTimeString('en-US', {
                                              hour: '2-digit',
                                              minute: '2-digit'
                                            })}
                                          </span>
                                        )}
                                      </div>
                                    ) : (
                                      <span className="badge badge-warning">Pending</span>
                                    )}
                                  </td>
                                  <td>
                                    <div className="table-actions-cell">
                                      <button
                                        onClick={() => handleToggleCheckIn(guest)}
                                        className={`btn btn-check-in ${guest.checked_in ? 'btn-admitted' : 'btn-primary'}`}
                                      >
                                        {guest.checked_in ? 'Cancel Check-in' : 'Admit Guest'}
                                      </button>
                                      <button
                                        onClick={() => handleDeleteGuest(guest.id, guest.name)}
                                        className="btn btn-danger btn-icon-only btn-sm"
                                      >
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'Settings' && (
                  <div className="settings-panel glass-panel">
                    <div className="section-heading-row">
                      <h2>Dashboard Settings</h2>
                      <span className="section-label">Personalize your workspace</span>
                    </div>
                    <div className="settings-grid">
                      <div className="settings-card">
                        <div className="settings-card-header">
                          <span>Theme</span>
                          <button onClick={toggleTheme} className="btn-theme-toggle">
                            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
                            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
                          </button>
                        </div>
                        <p className="section-note">Switch between white and dark theme for better visibility at any time.</p>
                      </div>
                      <div className="settings-card">
                        <div className="settings-card-header">
                          <span>Pricing Flexibility</span>
                        </div>
                        <p className="section-note">Organizers can set pass type and enter rupee pricing per guest. There is no dollar pricing anywhere in this workspace.</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="workspace-empty-state glass-panel">
                <Users2 size={64} className="icon-blue" />
                <h2>Welcome to Eventora</h2>
                <p>To start managing guest passes, select an existing party from the sidebar, join a party using an access code, or create a brand new party!</p>
                <div className="empty-state-actions">
                  <button onClick={() => setShowJoinPartyModal(true)} className="btn btn-secondary">
                    <Key size={16} />
                    Join with Code
                  </button>
                  <button onClick={() => setShowCreatePartyModal(true)} className="btn btn-primary">
                    <Plus size={16} />
                    Create New Party
                  </button>
                </div>
              </div>
            )}
          </main>

        </div>
      )}

      {/* Modal: Manage Pass Types */}
      {showManagePassTypesModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Manage Pass Types</h3>
              <button onClick={() => setShowManagePassTypesModal(false)} className="btn-close-modal">
                <X size={18} />
              </button>
            </div>
            <div style={{padding: 12}}>
              {passTypesLoading ? (
                <p>Loading...</p>
              ) : (
                <div style={{display: 'grid', gap: 8}}>
                  {passTypes.length === 0 && <p className="text-muted">No pass types yet. Add one below.</p>}
                  {passTypes.map(pt => (
                    <div key={pt.id} style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8}}>
                      <div>
                        <strong>{pt.name}</strong>
                        <div className="input-tip">₹{pt.price}</div>
                      </div>
                      <div style={{display: 'flex', gap: 8}}>
                        <button className="btn btn-danger" onClick={() => handleDeletePassType(pt.id)}>Delete</button>
                      </div>
                    </div>
                  ))}

                  <hr />
                  <form onSubmit={handleAddPassType} style={{display: 'grid', gap: 8}}>
                    <div className="form-group">
                      <label>Pass Name</label>
                      <input className="form-input" value={newPassName} onChange={(e) => setNewPassName(e.target.value)} placeholder="e.g. General" />
                    </div>
                    <div className="form-group">
                      <label>Price (₹)</label>
                      <input className="form-input" type="number" step="any" value={newPassPrice} onChange={(e) => setNewPassPrice(e.target.value)} />
                    </div>
                    <div style={{display: 'flex', gap: 8}}>
                      <button className="btn btn-secondary" type="button" onClick={() => { setNewPassName(''); setNewPassPrice('0'); }}>Reset</button>
                      <button className="btn btn-primary" type="submit">Add Pass Type</button>
                    </div>
                  </form>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal 1: Create Party */}
      {showCreatePartyModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Create New Party Workspace</h3>
              <button onClick={() => setShowCreatePartyModal(false)} className="btn-close-modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleCreateParty} className="modal-form">
              <div className="form-group">
                <label>Party Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Summer Gala 2026" 
                  className="form-input"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={newPartyDate}
                  onChange={(e) => setNewPartyDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Location / Venue</label>
                <input 
                  type="text" 
                  placeholder="e.g. Grand Ballroom, Chicago" 
                  className="form-input"
                  value={newPartyLoc}
                  onChange={(e) => setNewPartyLoc(e.target.value)}
                />
              </div>
              <div className="modal-footer-actions">
                <button type="button" onClick={() => setShowCreatePartyModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={createPartyLoading}>
                  {createPartyLoading ? 'Creating...' : 'Create Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Party Details */}
      {showEditPartyModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Edit Party Details</h3>
              <button onClick={() => setShowEditPartyModal(false)} className="btn-close-modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleEditParty} className="modal-form">
              <div className="form-group">
                <label>Party Name</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={editPartyName}
                  onChange={(e) => setEditPartyName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  className="form-input"
                  value={editPartyDate}
                  onChange={(e) => setEditPartyDate(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Location / Venue</label>
                <input 
                  type="text" 
                  className="form-input"
                  value={editPartyLoc}
                  onChange={(e) => setEditPartyLoc(e.target.value)}
                />
              </div>
              <div className="modal-footer-actions">
                <button type="button" onClick={() => setShowEditPartyModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={editPartyLoading}>
                  {editPartyLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Join Party */}
      {showJoinPartyModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Join Existing Party Workspace</h3>
              <button onClick={() => setShowJoinPartyModal(false)} className="btn-close-modal">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleJoinParty} className="modal-form">
              <div className="form-group">
                <label>Party Access Code</label>
                <input 
                  type="text" 
                  placeholder="Enter 6-digit uppercase code" 
                  className="form-input uppercase-input"
                  value={joinAccessCode}
                  onChange={(e) => setJoinAccessCode(e.target.value)}
                  maxLength={6}
                  required
                />
                <span className="input-tip">* Input the code generated by the party creator to join as an administrator.</span>
              </div>
              <div className="modal-footer-actions">
                <button type="button" onClick={() => setShowJoinPartyModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={joinPartyLoading}>
                  {joinPartyLoading ? 'Joining...' : 'Join Party'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Add Guest */}
      {showAddGuestModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel">
            <div className="modal-header">
              <h3>Register Guest Pass</h3>
              <button onClick={() => setShowAddGuestModal(false)} className="btn-close-modal">
                <X size={18} />
              </button>
            </div>
            {addGuestError && <div className="form-error-banner">{addGuestError}</div>}
            <form onSubmit={handleAddGuest} className="modal-form">
              <div className="form-group">
                <label>Attendee Full Name</label>
                <input 
                  type="text" 
                  placeholder="Enter name" 
                  className="form-input"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label>Pass Type</label>
                <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                  <select
                    className="form-input form-select"
                    value={guestPassTypeId || 'custom'}
                    onChange={(e) => handleGuestPassTypeSelect(e.target.value === 'custom' ? null : e.target.value)}
                  >
                    <option value="custom">Custom / No preset</option>
                    {passTypesLoading ? (
                      <option value="loading">Loading...</option>
                    ) : (
                      passTypes.map(pt => (
                        <option key={pt.id} value={pt.id}>{pt.name} (₹{pt.price})</option>
                      ))
                    )}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Amount (₹)</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input text-success font-semibold"
                  placeholder="Enter amount in rupees"
                  value={guestAmount}
                  onChange={(e) => setGuestAmount(e.target.value)}
                  required
                />
                <span className="input-tip">* Change the amount for the specific pass tier or custom pricing.</span>
              </div>
              <div className="modal-footer-actions">
                <button type="button" onClick={() => setShowAddGuestModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={addGuestLoading}>
                  {addGuestLoading ? 'Registering...' : 'Register Guest'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
