import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import QRCodeDisplay from './QRCodeDisplay';
import { CheckCircle, XCircle, Download, AlertCircle, Sparkles } from 'lucide-react';
import html2canvas from 'html2canvas';

export default function PassView({ ticketCode }) {
  const [pass, setPass]               = useState(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const cardRef                       = useRef(null);
  const [downloading, setDownloading] = useState(false);

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

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        backgroundColor: '#0a0a0a',
        scale: 3,
        useCORS: true,
        logging: false,
        foreignObjectRendering: false,
      });
      const link = document.createElement('a');
      link.download = `pass-${ticketCode}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (e) {
      console.error('Download failed:', e);
    } finally {
      setDownloading(false);
    }
  };

  /* ── Loading ─────────────────────────────────────────────── */
  if (loading) {
    return (
      <div className="pv-root">
        <div className="pv-loading">
          <div className="pv-spinner" />
          <p>Loading your pass…</p>
        </div>
      </div>
    );
  }

  /* ── Error ───────────────────────────────────────────────── */
  if (error || !pass) {
    return (
      <div className="pv-root">
        <div className="pv-error-card">
          <AlertCircle size={40} />
          <h2>Pass Not Found</h2>
          <p>{error || 'This link appears to be invalid.'}</p>
        </div>
      </div>
    );
  }

  // All derived values after pass is confirmed loaded
  const passUrl       = `${window.location.origin}/pass/${ticketCode}`;
  const shortCode     = ticketCode?.includes('-')
    ? ticketCode.split('-').slice(1).join('-')
    : (ticketCode || '');
  const passTypeName  = pass.pass_type?.name  || pass.ticket_type || 'General';
  const partyName     = pass.party?.name      || 'Event';
  const partyDate     = pass.party?.date
    ? new Date(pass.party.date + 'T00:00:00').toLocaleDateString(undefined, { weekday:'long', day:'numeric', month:'long', year:'numeric' })
    : '';
  const partyLocation = pass.party?.location  || '';
  const amountPaid    = parseFloat(pass.amount_paid || 0).toFixed(2);

  return (
    <div className="pv-root">

      {/* Top brand */}
      <div className="pv-brand">
        <Sparkles size={16} className="pv-brand-icon" />
        <span className="pv-brand-text">EVENTORA</span>
      </div>

      {/* Pass card */}
      <div className="pv-card-outer">
        <div className="pv-card" ref={cardRef}>

          {/* Gold marble noise overlay */}
          <div className="pv-marble-overlay" />

          {/* Admitted ribbon */}
          {pass.checked_in && (
            <div className="pv-admitted-ribbon">✓ ADMITTED</div>
          )}

          {/* ── Header section ── */}
          <div className="pv-header">
            <div className="pv-header-top">
              <span className="pv-event-label">EVENT PASS</span>
              <span className="pv-pass-type-chip">{passTypeName}</span>
            </div>
            <h1 className="pv-party-name">{partyName}</h1>
            {partyDate     && <p className="pv-meta-line">{partyDate}</p>}
            {partyLocation && <p className="pv-meta-line">{partyLocation}</p>}
          </div>

          {/* Gold tear line */}
          <div className="pv-tear">
            <div className="pv-tear-notch left" />
            <div className="pv-tear-line" />
            <div className="pv-tear-notch right" />
          </div>

          {/* ── Body: guest info + QR ── */}
          <div className="pv-body">
            <div className="pv-fields">

              <div className="pv-field">
                <span className="pv-field-label">Guest Name</span>
                <span className="pv-field-value">{pass.name}</span>
              </div>

              <div className="pv-field">
                <span className="pv-field-label">Amount Paid</span>
                <span className="pv-field-value pv-amount">₹{amountPaid}</span>
              </div>

              {pass.pass_type?.price != null && (
                <div className="pv-field">
                  <span className="pv-field-label">Pass Price</span>
                  <span className="pv-field-value">₹{parseFloat(pass.pass_type.price).toFixed(2)}</span>
                </div>
              )}

              {/* Code */}
              <div className="pv-field" style={{ marginTop: 'auto', paddingTop: 16 }}>
                <span className="pv-field-label">Entry Code</span>
                <div className="pv-code-row">
                  {shortCode.split('').map((ch, i) => (
                    <span key={i} className="pv-code-char">{ch}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* QR */}
            <div className="pv-qr-col">
              <div className="pv-qr-box">
                <QRCodeDisplay
                  value={passUrl}
                  size={136}
                  darkColor="#0a0a0a"
                  lightColor="#ffffff"
                />
              </div>
              <span className="pv-qr-hint">Scan at entry</span>
            </div>
          </div>

          {/* ── Status footer ── */}
          <div className={`pv-footer ${pass.checked_in ? 'pv-footer-in' : 'pv-footer-pending'}`}>
            {pass.checked_in ? (
              <><CheckCircle size={14} /> Admitted{pass.checked_in_at ? ` · ${new Date(pass.checked_in_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}` : ''}</>
            ) : (
              <><XCircle size={14} /> Not Yet Admitted — Present this pass at entry</>
            )}
          </div>
        </div>

        {/* Download */}
        <button className="pv-download-btn" onClick={handleDownload} disabled={downloading}>
          <Download size={15} />
          {downloading ? 'Saving…' : 'Save Pass as Image'}
        </button>
      </div>

      <p className="pv-footnote">Powered by Eventora · Non-transferable</p>
    </div>
  );
}
