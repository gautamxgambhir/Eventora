import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import TicketPass from './TicketPass';
import { Sparkles, Calendar, MapPin, Ticket, ShieldCheck, Mail, User, DollarSign } from 'lucide-react';

export default function LandingPage() {
  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ticketType, setTicketType] = useState('Non-Alcoholic');
  const [amountPaid, setAmountPaid] = useState('50'); // Defaults to 50 for Non-Alcoholic
  
  // App states
  const [loading, setLoading] = useState(false);
  const [bookedTicket, setBookedTicket] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  
  // Countdown state
  const [timeLeft, setTimeLeft] = useState({
    days: 0, hours: 0, minutes: 0, seconds: 0
  });

  // Calculate countdown to May 30, 2026
  useEffect(() => {
    const targetDate = new Date('2026-05-30T21:00:00+05:30'); // Event start time
    
    const calculateTime = () => {
      const difference = +targetDate - +new Date();
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60)
      });
    };

    calculateTime();
    const interval = setInterval(calculateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Update default price when ticket type is selected
  const handleTicketTypeChange = (type) => {
    setTicketType(type);
    if (type === 'Alcoholic') {
      setAmountPaid('90');
    } else {
      setAmountPaid('50');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!name.trim()) {
      setErrorMsg('Please enter your name.');
      return;
    }
    if (!email.trim()) {
      setErrorMsg('Please enter your email.');
      return;
    }
    
    const parsedAmount = parseFloat(amountPaid);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      setErrorMsg('Please enter a valid amount paid.');
      return;
    }

    setLoading(true);

    try {
      // Generate a unique ticket code: EVT-XXXXXX
      const randStr = Math.random().toString(36).substring(2, 8).toUpperCase();
      const ticketCode = `EVT-${randStr}`;

      const { data, error } = await supabase
        .from('passes')
        .insert([
          {
            name: name.trim(),
            email: email.trim(),
            ticket_type: ticketType,
            amount_paid: parsedAmount,
            ticket_code: ticketCode,
            checked_in: false
          }
        ])
        .select();

      if (error) throw error;

      if (data && data.length > 0) {
        setBookedTicket(data[0]);
      } else {
        throw new Error('No data returned from database.');
      }
    } catch (err) {
      console.error('Registration error:', err);
      setErrorMsg(err.message || 'An error occurred during booking. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setName('');
    setEmail('');
    setTicketType('Non-Alcoholic');
    setAmountPaid('50');
    setBookedTicket(null);
    setErrorMsg('');
  };

  return (
    <div className="landing-container">
      {/* Event Banner & Intro */}
      <section className="event-hero">
        <div className="event-badge">
          <Sparkles size={14} className="icon-cyan" />
          <span>ANNUAL EVENT 2026</span>
        </div>
        
        <h1 className="hero-title text-gradient">NEON NIGHTS 2026</h1>
        <p className="hero-description">
          Lose yourself in the beat. Join us for Chicago's most anticipated neon festival, featuring global DJs, holographic visuals, and immersive light installations.
        </p>

        {/* Countdown Timer */}
        <div className="countdown-container glass-panel">
          <div className="countdown-item">
            <span className="count-number text-gradient-cyan">{timeLeft.days}</span>
            <span className="count-label">Days</span>
          </div>
          <div className="countdown-divider">:</div>
          <div className="countdown-item">
            <span className="count-number text-gradient-cyan">{timeLeft.hours}</span>
            <span className="count-label">Hours</span>
          </div>
          <div className="countdown-divider">:</div>
          <div className="countdown-item">
            <span className="count-number text-gradient-cyan">{timeLeft.minutes}</span>
            <span className="count-label">Mins</span>
          </div>
          <div className="countdown-divider">:</div>
          <div className="countdown-item">
            <span className="count-number text-gradient-cyan">{timeLeft.seconds}</span>
            <span className="count-label">Secs</span>
          </div>
        </div>

        {/* Event Meta Details */}
        <div className="event-details-grid">
          <div className="detail-card glass-panel">
            <Calendar className="detail-icon icon-pink" size={24} />
            <div className="detail-info">
              <h3>Date & Time</h3>
              <p>May 30, 2026</p>
              <p className="detail-subtext">Doors open at 9:00 PM</p>
            </div>
          </div>
          <div className="detail-card glass-panel">
            <MapPin className="detail-icon icon-cyan" size={24} />
            <div className="detail-info">
              <h3>Location Venue</h3>
              <p>The Neon Dome</p>
              <p className="detail-subtext">Chicago, IL 60611</p>
            </div>
          </div>
        </div>
      </section>

      {/* Main interaction section */}
      <section className="booking-section">
        {bookedTicket ? (
          // Success State - Shows Ticket
          <div className="success-container glass-panel glowing">
            <div className="success-header">
              <div className="success-icon-circle">
                <ShieldCheck size={32} />
              </div>
              <h2 className="success-title">Pass Generated Successfully!</h2>
              <p className="success-desc">
                Your pass has been registered in our database. Download your digital ticket below and show it at the entrance.
              </p>
            </div>
            
            <TicketPass guestData={bookedTicket} />
            
            <button onClick={handleReset} className="btn btn-secondary btn-new-ticket">
              Book Another Pass
            </button>
          </div>
        ) : (
          // Booking Form State
          <div className="booking-grid">
            {/* Ticket Tier Cards */}
            <div className="ticket-tiers">
              <h2 className="section-title">Select Your Pass Tier</h2>
              <div className="tiers-list">
                {/* Non-Alcoholic card */}
                <div 
                  className={`tier-card glass-panel ${ticketType === 'Non-Alcoholic' ? 'active-cyan' : ''}`}
                  onClick={() => handleTicketTypeChange('Non-Alcoholic')}
                >
                  <div className="tier-header">
                    <span className="badge badge-cyan">Non-Alcoholic</span>
                    <span className="tier-price">$50</span>
                  </div>
                  <h3 className="tier-name">Vibe Pass</h3>
                  <ul className="tier-features">
                    <li>Full Main Stage Access</li>
                    <li>Unlimited Soft Drinks & Mocktails</li>
                    <li>Glowing Neon Wristband</li>
                    <li>Standard Digital Admission Ticket</li>
                  </ul>
                  <button 
                    type="button" 
                    className={`btn ${ticketType === 'Non-Alcoholic' ? 'btn-primary' : 'btn-secondary'} btn-full`}
                    onClick={() => handleTicketTypeChange('Non-Alcoholic')}
                  >
                    Select Pass
                  </button>
                </div>

                {/* Alcoholic card */}
                <div 
                  className={`tier-card glass-panel ${ticketType === 'Alcoholic' ? 'active-pink' : ''}`}
                  onClick={() => handleTicketTypeChange('Alcoholic')}
                >
                  <div className="tier-header">
                    <span className="badge badge-pink">Alcoholic Included</span>
                    <span className="tier-price">$90</span>
                  </div>
                  <h3 className="tier-name">Clubber Pass</h3>
                  <ul className="tier-features">
                    <li>Full Main Stage + VIP Bar Access</li>
                    <li>3 Premium Drink Coupons (Beer/Cocktails)</li>
                    <li>Fast-Track Entry Lane</li>
                    <li>Holographic Digital Admission Ticket</li>
                  </ul>
                  <button 
                    type="button" 
                    className={`btn ${ticketType === 'Alcoholic' ? 'btn-primary' : 'btn-secondary'} btn-full`}
                    onClick={() => handleTicketTypeChange('Alcoholic')}
                  >
                    Select Pass
                  </button>
                </div>
              </div>
            </div>

            {/* Registration Form */}
            <div className="registration-panel glass-panel">
              <h2 className="section-title">Attendee Registration</h2>
              <p className="panel-desc">
                Fill in the details below to secure your event pass.
              </p>

              {errorMsg && (
                <div className="form-error-banner">
                  <span>{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="booking-form">
                <div className="form-group">
                  <label htmlFor="full-name">Full Name</label>
                  <div className="input-with-icon">
                    <User className="input-icon" size={18} />
                    <input 
                      id="full-name"
                      type="text" 
                      placeholder="Enter guest name" 
                      className="form-input"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="email-address">Email Address</label>
                  <div className="input-with-icon">
                    <Mail className="input-icon" size={18} />
                    <input 
                      id="email-address"
                      type="email" 
                      placeholder="Enter guest email" 
                      className="form-input"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="pass-category">Pass Category</label>
                  <div className="input-with-icon">
                    <Ticket className="input-icon" size={18} />
                    <select 
                      id="pass-category"
                      className="form-input form-select"
                      value={ticketType}
                      onChange={(e) => handleTicketTypeChange(e.target.value)}
                    >
                      <option value="Non-Alcoholic">Non-Alcoholic ($50)</option>
                      <option value="Alcoholic">Alcoholic ($90)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="negotiated-price">Amount Paid ($)</label>
                  <div className="input-with-icon">
                    <DollarSign className="input-icon text-success" size={18} />
                    <input 
                      id="negotiated-price"
                      type="number" 
                      step="any"
                      placeholder="Enter negotiated amount" 
                      className="form-input text-success font-semibold"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      required
                    />
                  </div>
                  <span className="input-tip">
                    * Negotiated rate? Adjust the price field to what the attendee paid.
                  </span>
                </div>

                <button 
                  type="submit" 
                  disabled={loading} 
                  className="btn btn-primary btn-submit-registration btn-full"
                >
                  {loading ? (
                    <>
                      <div className="spinner-border" />
                      Registering Pass...
                    </>
                  ) : (
                    <>
                      <Ticket size={20} />
                      Submit & Generate Pass
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
