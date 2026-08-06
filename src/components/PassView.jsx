import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import QRCodeDisplay from './QRCodeDisplay';
import { Sparkles, CheckCircle, XCircle, Download, AlertCircle } from 'lucide-react';
import html2canvas from 'html2canvas';

/**
 * PassView — public guest-facing page.
 * URL: /pass/<ticket_code>
 * No authentication required.
 */
export default function PassView({ ticketCode }) {
  const [pass, setPass]     = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const cardRef             = useRef(null);
  const [downloading, setDownloading] = useState(false);

  // The publicly shareable URL that gets encoded in the QR
  const passUrl = `${window.location.origin}/pass/${ticketCode}`;

  useEffect(() => {
    if (!ticketCode) { setError('Invalid pass link.'); setLoading(false); return; }
    fetchPass();
  }, [ticketCode]);

  const fetchPass = async () => {
    try {
      setLoading(true);
      setError('');
      const { data, error: err } = await supabase
        .from('passes')
        .select('*, pass_type:pass_types(name, price), party:parties(name, date, location)')
        .eq('ticket_code', ticketCode)
        .single();

      if (err || !data) throw new Error('Pass not found. Please check your link.');
      setPass(data);
    } catch (e) {
      setError(e.message || 'Failed to load pass.');
    } finally {
      setLoading(false);
    }
  };

  // Extract the 6-char code from ticket_code ("EVT-XXXXXX" → "XXXXXX")
  const shortCode = ticketCode?.includes('-')
    ? ticketCode.split('-').slice(1).join('-')
    : ticketCode;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#18181b',
        scale: 2,
        useCORS: true,
      });
      const link = document.createElement('a');
      link.download = `pass-${shortCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  /* ─── Loading ──────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="pass-view-root">
        <div className="pass-view-loading">
          <div className="spinner-ring" />
          <p>Loading your pass…</p>
        </div>
      </div>
    );
  }

  /* ─── Error ────────────────────────────────────────────────── */
  if (error || !pass) {
    return (
      <div className="pass-view-root">
        <div className="pass-view-error-card">
          <AlertCircle size={40} className="text-danger" />
          <h2>Pass Not Found</h2>
          <p>{error || 'This link appears to be invalid.'}</p>
        </div>
      </div>
    );
  }

  const passTypeName  = pass.pass_type?.name  || pass.ticket_type || 'General';
  const partyName     = pass.party?.name      || 'Event';
  const partyDate     = pass.party?.date      ? new Date(pass.party.date).toLocaleDateString(undefined, { weekday:'long', year:'numeric', month:'long', day:'numeric' }) : '';
  const partyLocation = pass.party?.location  || '';
  const amountPaid    = parseFloat(pass.amount_paid || 0).toFixed(2);

  return (
    <div className="pass-view-root">

      {/* Branding bar */}
      <div className="pass-view-topbar">
        <Sparkles size={18} className="icon-blue" />
        <span className="logo-text text-gradient">EVENTORA</span>
      </div>

      {/* Pass card */}
      <div className="pass-card-wrapper">
        <div className="pass-card" ref={cardRef}>

          {/* Admitted ribbon */}
          {pass.checked_in && (
            <div className="pass-admitted-ribbon">
              <CheckCircle size={14} /> ADMITTED
            </div>
          )}

          {/* Header */}
          <div className="pass-card-header">
            <span className="pass-event-label">Event Pass</span>
            <h1 className="pass-party-name">{partyName}</h1>
            {partyDate     && <p className="pass-party-meta">{partyDate}</p>}
            {partyLocation && <p className="pass-party-meta">{partyLocation}</p>}
          </div>

          <div className="pass-card-divider">
            <div className="pass-divider-notch left" />
            <div className="pass-divider-line" />
            <div className="pass-divider-notch right" />
          </div>

          {/* Guest info */}
          <div className="pass-card-body">
            <div className="pass-guest-info">
              <div className="pass-field">
                <span className="pass-field-label">Guest Name</span>
                <span className="pass-field-value">{pass.name}</span>
              </div>
              <div className="pass-field">
                <span className="pass-field-label">Pass Type</span>
                <span className="pass-field-value pass-type-badge">{passTypeName}</span>
              </div>
              <div className="pass-field">
                <span className="pass-field-label">Amount Paid</span>
                <span className="pass-field-value text-success">₹{amountPaid}</span>
              </div>
              {pass.pass_type?.price && (
                <div className="pass-field">
                  <span className="pass-field-label">Pass Price</span>
                  <span className="pass-field-value">₹{parseFloat(pass.pass_type.price).toFixed(2)}</span>
                </div>
              )}
            </div>

            {/* QR + Code */}
            <div className="pass-qr-section">
              <div className="pass-qr-frame">
                <QRCodeDisplay
                  value={passUrl}
                  size={148}
                />
              </div>
              <div className="pass-short-code">
                {shortCode.split('').map((ch, i) => (
                  <span key={i} className="code-char">{ch}</span>
                ))}
              </div>
              <p className="pass-code-hint">Show QR or read code to staff at entry</p>
            </div>
          </div>

          {/* Status footer */}
          <div className={`pass-card-footer ${pass.checked_in ? 'footer-admitted' : 'footer-pending'}`}>
            {pass.checked_in ? (
              <>
                <CheckCircle size={15} />
                <span>Admitted{pass.checked_in_at ? ` · ${new Date(pass.checked_in_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}` : ''}</span>
              </>
            ) : (
              <>
                <XCircle size={15} />
                <span>Not Yet Admitted — Present this pass at entry</span>
              </>
            )}
          </div>
        </div>

        {/* Download button */}
        <button
          className="btn btn-secondary pass-download-btn"
          onClick={handleDownload}
          disabled={downloading}
        >
          <Download size={15} />
          {downloading ? 'Saving…' : 'Save Pass as Image'}
        </button>
      </div>

      <p className="pass-view-footer-note">
        Powered by Eventora · This pass is non-transferable
      </p>
    </div>
  );
}
