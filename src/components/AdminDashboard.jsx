import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Users, DollarSign, CheckCircle2, UserCheck, Search, Filter, 
  Plus, Download, Trash2, X, RefreshCw, AlertCircle, FileSpreadsheet,
  CheckCircle, ShieldAlert
} from 'lucide-react';

export default function AdminDashboard() {
  const [guests, setGuests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Search and filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All'); // 'All', 'CheckedIn', 'Pending'
  const [typeFilter, setTypeFilter] = useState('All'); // 'All', 'Alcoholic', 'Non-Alcoholic'
  
  // Manual add guest modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newGuestName, setNewGuestName] = useState('');
  const [newGuestEmail, setNewGuestEmail] = useState('');
  const [newGuestType, setNewGuestType] = useState('Non-Alcoholic');
  const [newGuestAmount, setNewGuestAmount] = useState('50');
  const [modalSubmitting, setModalSubmitting] = useState(false);
  const [modalError, setModalError] = useState('');

  // Fetch guests from Supabase
  const fetchGuests = async () => {
    try {
      setLoading(true);
      setErrorMsg('');
      const { data, error } = await supabase
        .from('passes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGuests(data || []);
    } catch (err) {
      console.error('Error fetching guests:', err);
      setErrorMsg('Failed to load guest list. Make sure the Supabase table exists.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  // Update default price in modal when ticket type changes
  const handleModalTypeChange = (type) => {
    setNewGuestType(type);
    setNewGuestAmount(type === 'Alcoholic' ? '90' : '50');
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
      alert('Failed to update check-in in database. Reverting state...');
      // Revert state
      fetchGuests();
    }
  };

  // Delete guest
  const handleDeleteGuest = async (id, name) => {
    if (!window.confirm(`Are you sure you want to cancel the pass for ${name}? This will permanently remove them from the system.`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('passes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      // Update local state
      setGuests(prev => prev.filter(g => g.id !== id));
    } catch (err) {
      console.error('Error deleting guest:', err);
      alert('Failed to delete guest.');
    }
  };

  // Manual guest registration from modal
  const handleAddGuestSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!newGuestName.trim()) {
      setModalError('Please enter guest name.');
      return;
    }
    if (!newGuestEmail.trim()) {
      setModalError('Please enter guest email.');
      return;
    }
    const parsedAmount = parseFloat(newGuestAmount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setModalError('Please enter a valid amount.');
      return;
    }

    setModalSubmitting(true);

    try {
      const randStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ticketCode = `EVT-${randStr}`;

      const { data, error } = await supabase
        .from('passes')
        .insert([
          {
            name: newGuestName.trim(),
            email: newGuestEmail.trim(),
            ticket_type: newGuestType,
            amount_paid: parsedAmount,
            ticket_code: ticketCode,
            checked_in: false
          }
        ])
        .select();

      if (error) throw error;

      // Reset and close modal
      setNewGuestName('');
      setNewGuestEmail('');
      setNewGuestType('Non-Alcoholic');
      setNewGuestAmount('50');
      setShowAddModal(false);
      
      // Fetch fresh data
      fetchGuests();
    } catch (err) {
      console.error('Error adding manual guest:', err);
      setModalError(err.message || 'Error occurred while saving guest.');
    } finally {
      setModalSubmitting(false);
    }
  };

  // Export filtered guest list to CSV
  const handleExportCSV = () => {
    if (filteredGuests.length === 0) {
      alert('No guests found to export.');
      return;
    }

    const headers = ['Ticket Code', 'Name', 'Email', 'Ticket Type', 'Amount Paid ($)', 'Checked In', 'Check In Time', 'Purchase Time'];
    const rows = filteredGuests.map(g => [
      g.ticket_code,
      g.name,
      g.email,
      g.ticket_type,
      g.amount_paid,
      g.checked_in ? 'YES' : 'NO',
      g.checked_in_at ? new Date(g.checked_in_at).toLocaleString() : '',
      new Date(g.created_at).toLocaleString()
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "eventora_guest_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Calculate Metrics
  const totalPasses = guests.length;
  const totalRevenue = guests.reduce((sum, g) => sum + parseFloat(g.amount_paid || 0), 0);
  const checkedInCount = guests.filter(g => g.checked_in).length;
  const pendingCount = totalPasses - checkedInCount;
  
  const alcoholicCount = guests.filter(g => g.ticket_type === 'Alcoholic').length;
  const nonAlcoholicCount = totalPasses - alcoholicCount;
  
  const checkInRate = totalPasses > 0 ? Math.round((checkedInCount / totalPasses) * 100) : 0;

  // Filter Guests List
  const filteredGuests = guests.filter(guest => {
    const matchesSearch = 
      guest.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      guest.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      guest.ticket_code.toLowerCase().includes(searchTerm.toLowerCase());
      
    const matchesStatus = 
      statusFilter === 'All' || 
      (statusFilter === 'CheckedIn' && guest.checked_in) || 
      (statusFilter === 'Pending' && !guest.checked_in);
      
    const matchesType = 
      typeFilter === 'All' || 
      guest.ticket_type === typeFilter;
      
    return matchesSearch && matchesStatus && matchesType;
  });

  // Get Initials for Avatar
  const getInitials = (name) => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <div className="dashboard-container">
      {/* Dashboard Header */}
      <div className="dashboard-header-panel">
        <div>
          <h1 className="dashboard-title text-gradient">Organizer Dashboard</h1>
          <p className="dashboard-subtitle">Manage admissions, view metrics, and verify guest passes in real-time.</p>
        </div>
        <div className="header-actions">
          <button onClick={fetchGuests} className="btn btn-secondary btn-icon-only" title="Refresh Data">
            <RefreshCw className={loading ? 'spinner' : ''} size={18} />
          </button>
          <button onClick={handleExportCSV} className="btn btn-secondary">
            <Download size={18} />
            Export CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-primary">
            <Plus size={18} />
            Add Guest
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="metrics-grid">
        <div className="metric-card glass-panel">
          <div className="metric-meta">
            <div className="metric-icon-circle icon-cyan-bg">
              <Users className="icon-cyan" size={24} />
            </div>
            <span className="metric-label">Passes Sold</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{totalPasses}</span>
            <div className="metric-sub-label">
              <span className="text-pink font-semibold">{alcoholicCount}</span> Alc / <span className="text-cyan font-semibold">{nonAlcoholicCount}</span> Non
            </div>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-meta">
            <div className="metric-icon-circle icon-success-bg">
              <DollarSign className="text-success" size={24} />
            </div>
            <span className="metric-label">Total Revenue</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value text-success">${totalRevenue.toFixed(2)}</span>
            <div className="metric-sub-label">
              Avg: ${(totalPasses > 0 ? totalRevenue / totalPasses : 0).toFixed(1)} / pass
            </div>
          </div>
        </div>

        <div className="metric-card glass-panel">
          <div className="metric-meta">
            <div className="metric-icon-circle icon-pink-bg">
              <UserCheck className="icon-pink" size={24} />
            </div>
            <span className="metric-label">Admitted Guests</span>
          </div>
          <div className="metric-value-row">
            <span className="metric-value">{checkedInCount} <span className="value-total">/ {totalPasses}</span></span>
            <div className="metric-sub-label">
              Pending: <span className="font-semibold text-warning">{pendingCount}</span>
            </div>
          </div>
          {/* Progress bar */}
          <div className="progress-bar-container">
            <div className="progress-bar-fill" style={{ width: `${checkInRate}%` }}></div>
          </div>
          <span className="progress-percentage">{checkInRate}% Checked In</span>
        </div>
      </div>

      {/* Guest List Management Panel */}
      <div className="guest-management-panel glass-panel">
        <div className="panel-header">
          <h2 className="panel-title">Pass Holders List</h2>
          <span className="list-counter">{filteredGuests.length} Guests showing</span>
        </div>

        {/* Filter and Search Bar */}
        <div className="filters-bar">
          <div className="search-box-container">
            <Search className="search-icon" size={18} />
            <input 
              type="text" 
              placeholder="Search by name, email, or code..." 
              className="form-input search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="filters-group">
            {/* Ticket type filter */}
            <div className="filter-select-wrapper">
              <Filter className="filter-icon" size={16} />
              <select 
                className="form-input filter-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
              >
                <option value="All">All Tiers</option>
                <option value="Alcoholic">Alcoholic Pass</option>
                <option value="Non-Alcoholic">Non-Alcoholic Pass</option>
              </select>
            </div>

            {/* Check-in status tabs */}
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

        {/* Data content */}
        {errorMsg && (
          <div className="db-error-alert">
            <AlertCircle size={20} />
            <span>{errorMsg}</span>
          </div>
        )}

        {loading ? (
          <div className="loading-state">
            <RefreshCw className="spinner text-purple" size={32} />
            <p>Syncing guest passes from database...</p>
          </div>
        ) : filteredGuests.length === 0 ? (
          <div className="empty-state">
            <FileSpreadsheet size={48} className="text-muted" />
            <h3>No Guest Passes Found</h3>
            <p>Try modifying your search queries or filters, or add a guest manually.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="guest-table">
              <thead>
                <tr>
                  <th>Attendee</th>
                  <th>Ticket Details</th>
                  <th>Amount Paid</th>
                  <th>Registration Date</th>
                  <th>Check-In Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGuests.map((guest) => {
                  const initials = getInitials(guest.name);
                  const isAlc = guest.ticket_type === 'Alcoholic';
                  
                  return (
                    <tr key={guest.id} className={guest.checked_in ? 'tr-admitted' : ''}>
                      {/* Guest info card */}
                      <td>
                        <div className="guest-profile">
                          <div className={`guest-avatar ${isAlc ? 'avatar-alc' : 'avatar-non'}`}>
                            {initials}
                          </div>
                          <div className="guest-info">
                            <span className="guest-name text-truncate">{guest.name}</span>
                            <span className="guest-email text-truncate">{guest.email}</span>
                          </div>
                        </div>
                      </td>

                      {/* Ticket details */}
                      <td>
                        <div className="guest-ticket-cell">
                          <span className={`badge ${isAlc ? 'badge-pink' : 'badge-cyan'}`}>
                            {guest.ticket_type}
                          </span>
                          <span className="guest-ticket-code">{guest.ticket_code}</span>
                        </div>
                      </td>

                      {/* Negotiated Amount paid */}
                      <td>
                        <span className="guest-amount font-semibold text-success">
                          ${parseFloat(guest.amount_paid).toFixed(2)}
                        </span>
                      </td>

                      {/* Created date/time */}
                      <td className="guest-date-cell">
                        {new Date(guest.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </td>

                      {/* Status */}
                      <td>
                        {guest.checked_in ? (
                          <div className="status-badge-container">
                            <span className="badge badge-success">
                              <CheckCircle size={12} />
                              Admitted
                            </span>
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

                      {/* Action buttons */}
                      <td>
                        <div className="table-actions-cell">
                          <button
                            onClick={() => handleToggleCheckIn(guest)}
                            className={`btn btn-check-in ${guest.checked_in ? 'btn-admitted' : 'btn-primary'}`}
                          >
                            {guest.checked_in ? 'Cancel Check-in' : 'Mark Admitted'}
                          </button>
                          <button
                            onClick={() => handleDeleteGuest(guest.id, guest.name)}
                            className="btn btn-danger btn-icon-only btn-sm"
                            title="Cancel Pass"
                          >
                            <Trash2 size={16} />
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

      {/* Manual Registration Modal */}
      {showAddModal && (
        <div className="modal-overlay">
          <div className="modal-content glass-panel floating">
            <div className="modal-header">
              <h3>Manual Guest Pass Registration</h3>
              <button onClick={() => setShowAddModal(false)} className="btn-close-modal">
                <X size={20} />
              </button>
            </div>
            
            {modalError && (
              <div className="form-error-banner">
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleAddGuestSubmit} className="modal-form">
              <div className="form-group">
                <label>Guest Name</label>
                <input 
                  type="text" 
                  placeholder="Enter attendee's full name" 
                  className="form-input"
                  value={newGuestName}
                  onChange={(e) => setNewGuestName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Guest Email</label>
                <input 
                  type="email" 
                  placeholder="Enter attendee's email" 
                  className="form-input"
                  value={newGuestEmail}
                  onChange={(e) => setNewGuestEmail(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Pass Type</label>
                <select 
                  className="form-input form-select"
                  value={newGuestType}
                  onChange={(e) => handleModalTypeChange(e.target.value)}
                >
                  <option value="Non-Alcoholic">Non-Alcoholic ($50)</option>
                  <option value="Alcoholic">Alcoholic ($90)</option>
                </select>
              </div>

              <div className="form-group">
                <label>Amount Paid ($)</label>
                <input 
                  type="number" 
                  step="any"
                  placeholder="Enter amount paid" 
                  className="form-input text-success font-semibold"
                  value={newGuestAmount}
                  onChange={(e) => setNewGuestAmount(e.target.value)}
                  required
                />
                <span className="input-tip">* You can input custom rates for negotiated cash purchases at the gate.</span>
              </div>

              <div className="modal-footer-actions">
                <button 
                  type="button" 
                  onClick={() => setShowAddModal(false)} 
                  className="btn btn-secondary"
                  disabled={modalSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={modalSubmitting}
                >
                  {modalSubmitting ? 'Registering...' : 'Add Attendee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
