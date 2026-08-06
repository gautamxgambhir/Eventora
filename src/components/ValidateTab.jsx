import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Search, QrCode, CheckCircle, XCircle, AlertCircle,
  Camera, CameraOff, RefreshCw, X, UserCheck
} from 'lucide-react';

/**
 * ValidateTab — admin-only guest validation panel.
 * Two modes:
 *   1. Manual code entry — staff types/pastes the 6-char code
 *   2. QR scanner       — camera scans the QR and auto-admits
 */
export default function ValidateTab({ selectedParty, currentUser, showToast, onGuestAdmitted }) {
  // ── Code entry mode ──────────────────────────────────────────
  const [codeInput, setCodeInput]         = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult]   = useState(null); // pass object or null
  const [lookupError, setLookupError]     = useState('');
  const [admitLoading, setAdmitLoading]   = useState(false);

  // ── QR scanner mode ─────────────────────────────────────────
  const [scannerMode, setScannerMode]     = useState(false);
  const [scannerReady, setScannerReady]   = useState(false);
  const [scannerError, setScannerError]   = useState('');
  const scannerRef                        = useRef(null); // Html5Qrcode instance
  const scannerDivId                      = 'evtora-qr-scanner';
  const scanCooldownRef                   = useRef(false);  // prevents double-fire

  // ── Admission modal ─────────────────────────────────────────
  const [admitModal, setAdmitModal]       = useState(null); // { pass, alreadyAdmitted }

  /* ── Lookup a pass by code ─────────────────────────────────── */
  const lookupPass = useCallback(async (rawCode) => {
    const code = rawCode.trim().toUpperCase();
    if (!code) return;

    // Accept both "XXXXXX" (short) and "EVT-XXXXXX" (full)
    const ticketCode = code.startsWith('EVT-') ? code : `EVT-${code}`;

    setLookupLoading(true);
    setLookupError('');
    setLookupResult(null);

    try {
      const { data, error } = await supabase
        .from('passes')
        .select('*, pass_type:pass_types(name, price), party:parties(name)')
        .eq('ticket_code', ticketCode)
        .eq('party_id', selectedParty.id)
        .single();

      if (error || !data) {
        setLookupError('No pass found with that code for this event.');
        return;
      }

      setLookupResult(data);
    } catch (e) {
      setLookupError(e.message || 'Lookup failed.');
    } finally {
      setLookupLoading(false);
    }
  }, [selectedParty]);

  /* ── Admit a guest (toggle check-in) ──────────────────────── */
  const admitGuest = useCallback(async (pass, forceAdmit = true) => {
    const newStatus  = forceAdmit ? true : !pass.checked_in;
    const checkInAt  = newStatus ? new Date().toISOString() : null;

    setAdmitLoading(true);
    try {
      const { error } = await supabase
        .from('passes')
        .update({ checked_in: newStatus, checked_in_at: checkInAt })
        .eq('id', pass.id);

      if (error) throw error;

      // Log the activity
      await supabase.from('party_activity_log').insert([{
        party_id: selectedParty.id,
        user_id: currentUser.id,
        action: newStatus ? 'check-in' : 'check-out',
        description: `${newStatus ? 'Admitted' : 'Revoked admission for'} "${pass.name}" via ${forceAdmit ? 'QR scan' : 'code'}`
      }]);

      const updatedPass = { ...pass, checked_in: newStatus, checked_in_at: checkInAt };

      // Show admission modal
      setAdmitModal({ pass: updatedPass, wasAdmitted: newStatus });

      // Refresh guest list in parent
      if (onGuestAdmitted) onGuestAdmitted();

      // Update lookup result if visible
      setLookupResult(updatedPass);
    } catch (e) {
      showToast('Failed to update admission: ' + (e.message || 'Unknown error'));
    } finally {
      setAdmitLoading(false);
    }
  }, [selectedParty, currentUser, onGuestAdmitted, showToast]);

  /* ── QR scan success handler ──────────────────────────────── */
  const handleScanSuccess = useCallback(async (decodedText) => {
    if (scanCooldownRef.current) return;
    scanCooldownRef.current = true;
    setTimeout(() => { scanCooldownRef.current = false; }, 3000); // 3 s cooldown

    // Extract ticket code from URL or raw value
    let code = decodedText.trim();
    try {
      const url = new URL(code);
      const parts = url.pathname.split('/');
      const passIdx = parts.indexOf('pass');
      if (passIdx !== -1 && parts[passIdx + 1]) {
        code = parts[passIdx + 1].toUpperCase();
      }
    } catch {
      // Not a URL, use raw value
      code = code.toUpperCase();
    }

    const ticketCode = code.startsWith('EVT-') ? code : `EVT-${code}`;

    try {
      const { data, error } = await supabase
        .from('passes')
        .select('*, pass_type:pass_types(name, price), party:parties(name)')
        .eq('ticket_code', ticketCode)
        .eq('party_id', selectedParty.id)
        .single();

      if (error || !data) {
        showToast('QR code not recognized for this event.', 'warning');
        return;
      }

      if (data.checked_in) {
        // Already admitted — show modal but don't re-admit
        setAdmitModal({ pass: data, wasAdmitted: true, alreadyAdmitted: true });
        return;
      }

      // Admit the guest
      await admitGuest(data, true);
    } catch (e) {
      showToast('Scan error: ' + (e.message || 'Unknown error'));
    }
  }, [selectedParty, admitGuest, showToast]);

  /* ── Start QR scanner ─────────────────────────────────────── */
  const startScanner = useCallback(async () => {
    setScannerError('');
    setScannerReady(false);

    // Small delay so the DOM div is mounted
    await new Promise(r => setTimeout(r, 150));

    try {
      const qr = new Html5Qrcode(scannerDivId);
      scannerRef.current = qr;

      await qr.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 220, height: 220 } },
        handleScanSuccess,
        () => {} // ignore errors (constant scan failures until found)
      );
      setScannerReady(true);
    } catch (e) {
      setScannerError('Camera access denied or unavailable. Please allow camera permissions.');
      console.error('QR scanner error:', e);
    }
  }, [handleScanSuccess]);

  /* ── Stop QR scanner ──────────────────────────────────────── */
  const stopScanner = useCallback(async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
        scannerRef.current.clear();
      } catch (e) {
        console.error('Stop scanner error:', e);
      }
      scannerRef.current = null;
    }
    setScannerReady(false);
  }, []);

  /* ── Toggle scanner mode ──────────────────────────────────── */
  useEffect(() => {
    if (scannerMode) {
      startScanner();
    } else {
      stopScanner();
    }
    return () => { stopScanner(); };
  }, [scannerMode]);

  /* ── Cleanup on unmount ───────────────────────────────────── */
  useEffect(() => {
    return () => { stopScanner(); };
  }, []);

  /* ── Reset on party change ────────────────────────────────── */
  useEffect(() => {
    setCodeInput('');
    setLookupResult(null);
    setLookupError('');
    setScannerMode(false);
  }, [selectedParty?.id]);

  const handleCodeSubmit = (e) => {
    e.preventDefault();
    lookupPass(codeInput);
  };

  const shortCode = (tc) => tc?.includes('-') ? tc.split('-').slice(1).join('-') : tc;

  return (
    <div className="validate-tab-root glass-panel">
      <div className="validate-header">
        <div className="validate-header-left">
          <UserCheck size={20} className="icon-blue" />
          <h2>Guest Validation</h2>
        </div>
        <div className="validate-mode-toggle">
          <button
            className={`validate-mode-btn ${!scannerMode ? 'mode-active' : ''}`}
            onClick={() => setScannerMode(false)}
          >
            <Search size={14} /> Code Entry
          </button>
          <button
            className={`validate-mode-btn ${scannerMode ? 'mode-active' : ''}`}
            onClick={() => setScannerMode(true)}
          >
            <QrCode size={14} /> QR Scanner
          </button>
        </div>
      </div>

      {/* ── Code entry panel ──────────────────────────────────── */}
      {!scannerMode && (
        <div className="validate-code-panel">
          <p className="validate-hint">
            Enter the 6-character code on the guest's pass, or the full ticket code (e.g. EVT-ABC123).
          </p>

          <form className="validate-code-form" onSubmit={handleCodeSubmit}>
            <div className="validate-code-input-row">
              <input
                type="text"
                className="form-input validate-code-input"
                placeholder="e.g. ABC123 or EVT-ABC123"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  setLookupError('');
                  setLookupResult(null);
                }}
                autoComplete="off"
                spellCheck={false}
                maxLength={12}
              />
              <button
                type="submit"
                className="btn btn-primary"
                disabled={lookupLoading || !codeInput.trim()}
              >
                {lookupLoading ? <RefreshCw size={15} className="spinner" /> : <Search size={15} />}
                Look Up
              </button>
            </div>
          </form>

          {/* Lookup error */}
          {lookupError && (
            <div className="validate-feedback validate-feedback-error">
              <AlertCircle size={16} />
              <span>{lookupError}</span>
            </div>
          )}

          {/* Lookup result */}
          {lookupResult && (
            <div className={`validate-result-card ${lookupResult.checked_in ? 'result-admitted' : 'result-pending'}`}>
              <div className="result-status-icon">
                {lookupResult.checked_in
                  ? <CheckCircle size={28} className="text-success" />
                  : <XCircle size={28} className="text-warning" />
                }
              </div>
              <div className="result-info">
                <h3 className="result-name">{lookupResult.name}</h3>
                <div className="result-meta-row">
                  <span className="badge badge-neutral">{lookupResult.pass_type?.name || lookupResult.ticket_type || 'General'}</span>
                  <span className="result-code">{lookupResult.ticket_code}</span>
                </div>
                <div className="result-meta-row">
                  <span className="result-amount text-success">₹{parseFloat(lookupResult.amount_paid || 0).toFixed(2)} paid</span>
                  {lookupResult.checked_in && lookupResult.checked_in_at && (
                    <span className="result-time text-muted">
                      Admitted at {new Date(lookupResult.checked_in_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit' })}
                    </span>
                  )}
                </div>
              </div>
              <div className="result-actions">
                <button
                  className={`btn ${lookupResult.checked_in ? 'btn-danger' : 'btn-primary'} btn-admit`}
                  onClick={() => admitGuest(lookupResult, false)}
                  disabled={admitLoading}
                >
                  {admitLoading
                    ? <RefreshCw size={14} className="spinner" />
                    : lookupResult.checked_in
                      ? <XCircle size={14} />
                      : <CheckCircle size={14} />
                  }
                  {lookupResult.checked_in ? 'Revoke Admission' : 'Admit Guest'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── QR Scanner panel ──────────────────────────────────── */}
      {scannerMode && (
        <div className="validate-scanner-panel">
          {scannerError ? (
            <div className="scanner-error-state">
              <CameraOff size={40} className="text-danger" />
              <p>{scannerError}</p>
              <button className="btn btn-secondary" onClick={startScanner}>
                <RefreshCw size={14} /> Retry
              </button>
            </div>
          ) : (
            <>
              <div className="scanner-container">
                <div id={scannerDivId} className="scanner-viewport" />
                {!scannerReady && (
                  <div className="scanner-loading-overlay">
                    <RefreshCw size={24} className="spinner text-blue" />
                    <p>Starting camera…</p>
                  </div>
                )}
                {scannerReady && (
                  <div className="scanner-target-frame">
                    <div className="scanner-corner tl" /><div className="scanner-corner tr" />
                    <div className="scanner-corner bl" /><div className="scanner-corner br" />
                  </div>
                )}
              </div>
              <p className="scanner-hint">
                <Camera size={14} /> Point at a guest's QR code — admission is automatic
              </p>
            </>
          )}
        </div>
      )}

      {/* ── Admission modal ───────────────────────────────────── */}
      {admitModal && (
        <div className="modal-overlay" onClick={() => setAdmitModal(null)}>
          <div
            className={`admit-modal glass-panel ${admitModal.wasAdmitted ? 'admit-modal-success' : 'admit-modal-revoke'}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="btn-close-modal admit-modal-close" onClick={() => setAdmitModal(null)}>
              <X size={18} />
            </button>

            <div className="admit-modal-icon">
              {admitModal.wasAdmitted
                ? <CheckCircle size={52} className="text-success" />
                : <XCircle size={52} className="text-danger" />
              }
            </div>

            <h2 className="admit-modal-title">
              {admitModal.alreadyAdmitted
                ? 'Already Admitted'
                : admitModal.wasAdmitted
                  ? 'Guest Admitted!'
                  : 'Admission Revoked'
              }
            </h2>

            <p className="admit-modal-name">{admitModal.pass.name}</p>

            <div className="admit-modal-meta">
              <span className="badge badge-neutral">
                {admitModal.pass.pass_type?.name || admitModal.pass.ticket_type || 'General'}
              </span>
              <span className="admit-modal-code">{admitModal.pass.ticket_code}</span>
            </div>

            {admitModal.alreadyAdmitted && (
              <p className="admit-modal-warning">
                <AlertCircle size={14} /> This pass was already admitted earlier.
              </p>
            )}

            {admitModal.wasAdmitted && admitModal.pass.checked_in_at && (
              <p className="admit-modal-time text-muted">
                {new Date(admitModal.pass.checked_in_at).toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
              </p>
            )}

            <button
              className="btn btn-primary admit-modal-done"
              onClick={() => setAdmitModal(null)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
