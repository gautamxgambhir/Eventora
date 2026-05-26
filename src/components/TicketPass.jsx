import React, { useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import { Download, Check, Sparkles, AlertCircle } from 'lucide-react';

export default function TicketPass({ guestData }) {
  const ticketRef = useRef(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownload = async () => {
    if (!ticketRef.current) return;
    try {
      setDownloading(true);
      
      // Wait a tiny bit for rendering
      await new Promise(resolve => setTimeout(resolve, 300));
      
      const canvas = await html2canvas(ticketRef.current, {
        backgroundColor: '#070311', // Match --bg-dark
        scale: 2, // High resolution
        logging: false,
        useCORS: true,
      });

      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `eventora-ticket-${guestData.ticket_code}.png`;
      link.href = dataUrl;
      link.click();
      
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (error) {
      console.error('Error generating ticket image:', error);
      alert('Failed to generate ticket download. You can take a screenshot of your pass!');
    } finally {
      setDownloading(false);
    }
  };

  const formattedDate = guestData.created_at 
    ? new Date(guestData.created_at).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    : new Date().toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

  const isAlcoholic = guestData.ticket_type === 'Alcoholic';

  return (
    <div className="ticket-wrapper">
      {/* Visual Ticket container (for export) */}
      <div 
        ref={ticketRef} 
        className={`ticket-container ${isAlcoholic ? 'ticket-alcoholic' : 'ticket-non-alcoholic'}`}
      >
        {/* Holographic light effect overlay */}
        <div className="ticket-holo"></div>
        
        {/* Main Body */}
        <div className="ticket-body">
          <div className="ticket-header">
            <span className="ticket-brand">
              EVENTORA <span className="brand-dot">.</span>
            </span>
            <div className={`ticket-category-badge ${isAlcoholic ? 'cat-alc' : 'cat-non'}`}>
              {guestData.ticket_type.toUpperCase()} PASS
            </div>
          </div>
          
          <div className="ticket-middle">
            <div className="ticket-title">NEON NIGHTS 2026</div>
            <div className="ticket-subtitle font-accent">THE ULTIMATE PARTY EXPERIENCE</div>
          </div>

          <div className="ticket-footer">
            <div className="ticket-info-grid">
              <div className="info-item">
                <span className="info-label">ATTENDEE</span>
                <span className="info-value text-truncate">{guestData.name}</span>
              </div>
              <div className="info-item">
                <span className="info-label">DATE & TIME</span>
                <span className="info-value">{formattedDate}</span>
              </div>
              <div className="info-item">
                <span className="info-label">SECURE CODE</span>
                <span className="info-value ticket-code-text">{guestData.ticket_code}</span>
              </div>
              <div className="info-item">
                <span className="info-label">PAID AMOUNT</span>
                <span className="info-value amount-text">${parseFloat(guestData.amount_paid).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tear-off divider */}
        <div className="ticket-divider">
          <div className="divider-notch notch-top"></div>
          <div className="divider-line"></div>
          <div className="divider-notch notch-bottom"></div>
        </div>

        {/* Tear-off stub */}
        <div className="ticket-stub">
          <div className="stub-header">
            <span className="stub-date">MAY 30, 2026</span>
          </div>
          
          <div className="stub-middle">
            <div className="stub-venue">NEON DOME</div>
            <div className="stub-city">CHICAGO, IL</div>
          </div>

          <div className="stub-barcode-container">
            {/* Generate visual SVG barcode */}
            <svg className="barcode" viewBox="0 0 100 40">
              <rect x="0" width="1" height="40" fill="currentColor"/>
              <rect x="2" width="2" height="40" fill="currentColor"/>
              <rect x="5" width="1" height="40" fill="currentColor"/>
              <rect x="8" width="3" height="40" fill="currentColor"/>
              <rect x="12" width="1" height="40" fill="currentColor"/>
              <rect x="14" width="2" height="40" fill="currentColor"/>
              <rect x="17" width="1" height="40" fill="currentColor"/>
              <rect x="19" width="3" height="40" fill="currentColor"/>
              <rect x="23" width="1" height="40" fill="currentColor"/>
              <rect x="26" width="2" height="40" fill="currentColor"/>
              <rect x="29" width="1" height="40" fill="currentColor"/>
              <rect x="31" width="3" height="40" fill="currentColor"/>
              <rect x="35" width="2" height="40" fill="currentColor"/>
              <rect x="38" width="1" height="40" fill="currentColor"/>
              <rect x="40" width="2" height="40" fill="currentColor"/>
              <rect x="43" width="1" height="40" fill="currentColor"/>
              <rect x="45" width="3" height="40" fill="currentColor"/>
              <rect x="49" width="1" height="40" fill="currentColor"/>
              <rect x="51" width="2" height="40" fill="currentColor"/>
              <rect x="54" width="1" height="40" fill="currentColor"/>
              <rect x="56" width="3" height="40" fill="currentColor"/>
              <rect x="60" width="1" height="40" fill="currentColor"/>
              <rect x="62" width="2" height="40" fill="currentColor"/>
              <rect x="65" width="1" height="40" fill="currentColor"/>
              <rect x="67" width="3" height="40" fill="currentColor"/>
              <rect x="71" width="1" height="40" fill="currentColor"/>
              <rect x="73" width="2" height="40" fill="currentColor"/>
              <rect x="76" width="1" height="40" fill="currentColor"/>
              <rect x="78" width="3" height="40" fill="currentColor"/>
              <rect x="82" width="2" height="40" fill="currentColor"/>
              <rect x="85" width="1" height="40" fill="currentColor"/>
              <rect x="87" width="2" height="40" fill="currentColor"/>
              <rect x="90" width="1" height="40" fill="currentColor"/>
              <rect x="92" width="3" height="40" fill="currentColor"/>
              <rect x="96" width="1" height="40" fill="currentColor"/>
              <rect x="98" width="2" height="40" fill="currentColor"/>
            </svg>
            <span className="barcode-number">{guestData.ticket_code}</span>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="ticket-actions">
        <button 
          onClick={handleDownload} 
          disabled={downloading}
          className="btn btn-primary btn-download"
        >
          {downloading ? (
            <>
              <Sparkles className="spinner" size={18} />
              Generating Pass...
            </>
          ) : downloadSuccess ? (
            <>
              <Check size={18} />
              Saved to Downloads!
            </>
          ) : (
            <>
              <Download size={18} />
              Download Digital Pass
            </>
          )}
        </button>
        <p className="ticket-hint">
          <AlertCircle size={14} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'text-bottom' }} />
          Present this barcode at the entry gate.
        </p>
      </div>
    </div>
  );
}
