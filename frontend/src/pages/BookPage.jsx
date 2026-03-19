import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useYacht } from '../context/YachtContext';
import { bookingApi } from '../api/client';
import Calendar from '../components/Calendar';
import toast from 'react-hot-toast';

const CHARTER_TYPES = [
  { key: 'full_day', label: 'Full-Day Charter', desc: '8 hours on the water', icon: '☀️' },
  { key: 'half_day', label: 'Half-Day Charter', desc: '4 hours, morning or afternoon', icon: '⛵' },
  { key: 'hourly', label: 'Hourly Rental', desc: 'Flexible, 2hr minimum', icon: '⏱️' },
  { key: 'multi_day', label: 'Multi-Day Trip', desc: 'Overnight & extended voyages', icon: '🌊' },
];

function fmtDate(s) {
  if (!s) return '—';
  const [y, m, d] = s.split('-');
  return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}`;
}

export default function BookPage() {
  const { user } = useAuth();
  const { yacht, extras } = useYacht();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    charter_type: 'full_day', start_date: '', end_date: null,
    hourly_hours: 4,
    num_guests: 2, extras: [], notes: '',
    guest_name: '', guest_email: '', guest_phone: '',
  });
  const [rangeEnd, setRangeEnd] = useState(null);
  const [confirmed, setConfirmed] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) setForm(f => ({ ...f, guest_name: user.name, guest_email: user.email, guest_phone: user.phone || '' }));
  }, [user]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const toggleExtra = id => set('extras', form.extras.includes(id) ? form.extras.filter(x => x !== id) : [...form.extras, id]);

  const basePrice = () => {
    if (!yacht?.pricing) return 0;
    const p = yacht.pricing;
    switch (form.charter_type) {
      case 'full_day': return p.full_day;
      case 'half_day': return p.half_day;
      case 'hourly': return p.hourly * (form.hourly_hours || 4);
      case 'multi_day': {
        if (form.start_date && rangeEnd) {
          const days = Math.floor((new Date(rangeEnd) - new Date(form.start_date)) / 86400000) + 1;
          return p.daily_multi * Math.max(1, days);
        }
        return p.daily_multi;
      }
      default: return 0;
    }
  };
  const extrasTotal = form.extras.reduce((s, id) => { const e = extras.find(x => x.key === id); return s + (e?.price || 0); }, 0);
  const grandTotal = basePrice() + extrasTotal;

  const submit = async () => {
    setLoading(true);
    try {
      const payload = {
        ...form,
        hourly_hours: form.charter_type === 'hourly' ? (form.hourly_hours || 4) : undefined,
        end_date: form.charter_type === 'multi_day' ? (rangeEnd || null) : null,
      };
      const { data } = await bookingApi.create(payload);
      setConfirmed(data);
      setStep(5);
      toast.success('Booking submitted!');
    } catch (err) {
      const msg = err.response?.data?.detail;
      if (err.response?.status === 409) toast.error(msg || 'Those dates are not available.');
      else toast.error(msg || 'Booking failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const steps = ['Charter Type', 'Select Date', 'Your Details', 'Add-ons & Review'];

  return (
    <>
      <style>{`
        .book-wrap { min-height: 100vh; padding: 110px 40px 60px; max-width: 900px; margin: 0 auto; }
        @media(max-width:640px) { .book-wrap { padding: 90px 20px 40px; } }
        .step-bar { display: flex; align-items: center; margin-bottom: 48px; overflow-x: auto; padding-bottom: 4px; gap: 0; }
        .step-item { display: flex; align-items: center; gap: 10px; white-space: nowrap; }
        .step-circle { width: 26px; height: 26px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; transition: all .2s; }
        .step-circle.done { background: var(--gold); border-color: var(--gold); color: var(--deep); }
        .step-circle.active { border-color: var(--gold); color: var(--gold); }
        .step-label { font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); transition: color .2s; }
        .step-label.active { color: var(--cream); }
        .step-sep { width: 32px; height: 1px; background: var(--border); margin: 0 12px; flex-shrink: 0; }

        .type-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        @media(max-width:500px) { .type-grid { grid-template-columns: 1fr; } }
        .type-card { border: 1px solid var(--border); padding: 24px; cursor: pointer; transition: all .2s; display: flex; align-items: flex-start; gap: 16px; }
        .type-card.selected { border-color: var(--gold); background: rgba(201,168,76,.07); }
        .type-card:hover:not(.selected) { border-color: rgba(201,168,76,.35); }
        .type-icon { font-size: 28px; }
        .type-name { font-size: 15px; margin-bottom: 4px; }
        .type-desc { font-size: 12px; color: var(--muted); }
        .type-price { font-family:'Cormorant Garamond',serif; font-size: 20px; color: var(--gold2); margin-top: 8px; }

        .extras-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 14px; }
        .extra-card { border: 1px solid var(--border); padding: 18px; cursor: pointer; transition: all .2s; display: flex; gap: 14px; align-items: flex-start; }
        .extra-card.selected { border-color: var(--gold); background: rgba(201,168,76,.07); }
        .extra-card:hover:not(.selected) { border-color: rgba(201,168,76,.3); }
        .extra-chk { width: 18px; height: 18px; border: 1px solid var(--border); flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 10px; margin-top: 1px; }
        .extra-card.selected .extra-chk { background: var(--gold); border-color: var(--gold); color: var(--deep); }

        .price-summary { border: 1px solid var(--border); padding: 24px; background: var(--glass); }
        .price-row { display: flex; justify-content: space-between; align-items: center; padding: 10px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
        .price-row:last-child { border-bottom: none; }
        .price-total { font-family:'Cormorant Garamond',serif; font-size: 28px; color: var(--gold2); }

        .confirm-box { border: 1px solid var(--gold); padding: 48px 40px; text-align: center; max-width: 520px; margin: 0 auto; }
        .confirm-ref { font-family:'Cormorant Garamond',serif; font-size: 40px; color: var(--gold2); margin: 16px 0; }
        .confirm-row { display: flex; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid var(--border); font-size: 13px; }
        .confirm-row:last-of-type { border-bottom: none; }
        @media(max-width:480px) { .confirm-box { padding: 32px 20px; } }
      `}</style>

      <div className="book-wrap">
        {step < 5 && (
          <>
            <div className="page-header">
              <h1 className="page-title">Book Your <em>Charter</em></h1>
              <div className="gold-line" />
            </div>

            {/* Step bar */}
            <div className="step-bar">
              {steps.map((s, i) => (
                <div key={s} className="step-item">
                  <div className={`step-circle${step > i+1 ? ' done' : step === i+1 ? ' active' : ''}`}>
                    {step > i+1 ? '✓' : i+1}
                  </div>
                  <span className={`step-label${step === i+1 ? ' active' : ''}`}>{s}</span>
                  {i < steps.length-1 && <div className="step-sep" />}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Step 1: Charter type */}
        {step === 1 && (
          <div>
            <div className="type-grid" role="list">
              {CHARTER_TYPES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  role="listitem"
                  className={`type-card${form.charter_type === t.key ? ' selected' : ''}`}
                  aria-pressed={form.charter_type === t.key}
                  onClick={() => { set('charter_type', t.key); setRangeEnd(null); set('start_date', ''); }}
                >
                  <div className="type-icon">{t.icon}</div>
                  <div>
                    <div className="type-name">{t.label}</div>
                    <div className="type-desc">{t.desc}</div>
                    <div className="type-price">
                      {t.key === 'full_day' && `$${yacht?.pricing?.full_day?.toLocaleString() || '—'}`}
                      {t.key === 'half_day' && `$${yacht?.pricing?.half_day?.toLocaleString() || '—'}`}
                      {t.key === 'hourly' && `$${yacht?.pricing?.hourly?.toLocaleString() || '—'}/hr`}
                      {t.key === 'multi_day' && `$${yacht?.pricing?.daily_multi?.toLocaleString() || '—'}/day`}
                    </div>
                  </div>
                </button>
              ))}
            </div>
            {form.charter_type === 'hourly' && (
              <div className="price-summary mt-24" style={{ maxWidth: 520 }}>
                <div className="price-row">
                  <span>Hours</span>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <input
                      type="number"
                      min={2}
                      max={24}
                      value={form.hourly_hours || 4}
                      onChange={e => set('hourly_hours', parseInt(e.target.value || '0', 10))}
                      style={{ width: 90 }}
                    />
                    <span className="text-muted" style={{ fontSize: 11 }}>(min 2)</span>
                  </span>
                </div>
              </div>
            )}
            <div className="flex justify-between mt-40">
              <div />
              <button className="btn-gold" onClick={() => setStep(2)}>Continue →</button>
            </div>
          </div>
        )}

        {/* Step 2: Date */}
        {step === 2 && (
          <div>
            {form.charter_type === 'multi_day' && (
              <p className="text-muted mb-16" style={{ fontSize: 13 }}>Select your start date, then your return date.</p>
            )}
            <Calendar
              selected={form.start_date}
              onSelect={d => set('start_date', d)}
              rangeEnd={rangeEnd}
              onRangeEnd={setRangeEnd}
              multiDay={form.charter_type === 'multi_day'}
            />
            {form.start_date && (
              <div className="price-summary mt-24">
                <div className="price-row"><span>Selected Date</span><span>{fmtDate(form.start_date)}</span></div>
                {rangeEnd && <div className="price-row"><span>Return Date</span><span>{fmtDate(rangeEnd)}</span></div>}
                <div className="price-row"><span>Charter Type</span><span>{CHARTER_TYPES.find(t => t.key === form.charter_type)?.label}</span></div>
              </div>
            )}
            <div className="flex justify-between mt-32">
              <button className="btn-outline" onClick={() => setStep(1)}>← Back</button>
              <button className="btn-gold" disabled={!form.start_date || (form.charter_type === 'multi_day' && !rangeEnd)} onClick={() => setStep(3)}
                style={{ opacity: form.start_date && (form.charter_type !== 'multi_day' || rangeEnd) ? 1 : 0.5 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Guest details */}
        {step === 3 && (
          <div>
            <div className="form-grid">
              <div className="field">
                <label>Full Name</label>
                <input placeholder="Your full name" value={form.guest_name} onChange={e => set('guest_name', e.target.value)} required />
              </div>
              <div className="field">
                <label>Email Address</label>
                <input type="email" placeholder="your@email.com" value={form.guest_email} onChange={e => set('guest_email', e.target.value)} required />
              </div>
              <div className="field">
                <label>Phone Number</label>
                <input placeholder="+1 555 000 0000" value={form.guest_phone} onChange={e => set('guest_phone', e.target.value)} />
              </div>
              <div className="field">
                <label>Number of Guests</label>
                <input
                  type="number"
                  min={1}
                  max={yacht?.max_guests || 12}
                  value={form.num_guests}
                  onChange={e => set('num_guests', parseInt(e.target.value || '1', 10))}
                />
                {yacht?.max_guests && form.num_guests > yacht.max_guests && (
                  <p className="text-muted" style={{ color: 'var(--red)', fontSize: 11, marginTop: 6 }}>
                    Max capacity is {yacht.max_guests} guests.
                  </p>
                )}
              </div>
              <div className="field full-col">
                <label>Special Requests</label>
                <textarea placeholder="Occasion, dietary requirements, anything else…" value={form.notes} onChange={e => set('notes', e.target.value)} />
              </div>
            </div>
            <div className="flex justify-between mt-32">
              <button className="btn-outline" onClick={() => setStep(2)}>← Back</button>
              <button className="btn-gold" disabled={!form.guest_name || !form.guest_email} onClick={() => setStep(4)}
                style={{ opacity: form.guest_name && form.guest_email ? 1 : 0.5 }}>
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Extras + Review */}
        {step === 4 && (
          <div>
            <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 24, fontWeight: 300, marginBottom: 24 }}>Premium <em style={{ fontStyle:'italic', color:'var(--gold2)' }}>Add-ons</em></h3>
            <div className="extras-grid">
              {extras.map(e => (
                <div key={e.key} className={`extra-card${form.extras.includes(e.key) ? ' selected' : ''}`} onClick={() => toggleExtra(e.key)}>
                  <div className="extra-chk">{form.extras.includes(e.key) ? '✓' : ''}</div>
                  <div>
                    <div style={{ fontSize: 22, marginBottom: 6 }}>{e.icon}</div>
                    <div style={{ fontSize: 13, marginBottom: 3 }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--muted)' }}>{e.description}</div>
                    <div style={{ color: 'var(--gold2)', fontSize: 13, marginTop: 8 }}>${e.price?.toLocaleString()}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="price-summary mt-32">
              <h3 style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 22, fontWeight: 300, marginBottom: 16 }}>Booking Summary</h3>
              <div className="price-row"><span style={{ color: 'var(--muted)' }}>Guest</span><span>{form.guest_name}</span></div>
              <div className="price-row"><span style={{ color: 'var(--muted)' }}>Date</span><span>{fmtDate(form.start_date)}{rangeEnd ? ` → ${fmtDate(rangeEnd)}` : ''}</span></div>
              <div className="price-row"><span style={{ color: 'var(--muted)' }}>Charter</span><span>{CHARTER_TYPES.find(t=>t.key===form.charter_type)?.label}</span></div>
              <div className="price-row"><span style={{ color: 'var(--muted)' }}>Guests</span><span>{form.num_guests}</span></div>
              <div className="price-row"><span style={{ color: 'var(--muted)' }}>Base Price</span><span>${basePrice().toLocaleString()}</span></div>
              {form.extras.map(id => {
                const e = extras.find(x => x.key === id);
                return e ? <div key={id} className="price-row"><span style={{ color: 'var(--muted)' }}>{e.name}</span><span>${e.price.toLocaleString()}</span></div> : null;
              })}
              <div className="price-row" style={{ borderTop: '1px solid var(--gold)', marginTop: 8, paddingTop: 16 }}>
                <span style={{ color: 'var(--gold)', fontSize: 11, letterSpacing: 2, textTransform: 'uppercase' }}>Estimated Total</span>
                <span className="price-total">${grandTotal.toLocaleString()}</span>
              </div>
              <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 12 }}>*Payment arranged directly with owner after confirmation. No charge made now.</p>
            </div>

            <div className="flex justify-between mt-32">
              <button className="btn-outline" onClick={() => setStep(3)}>← Back</button>
              <button className="btn-gold" onClick={submit} disabled={loading}>
                {loading ? 'Submitting…' : 'Submit Booking Request →'}
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Confirmation */}
        {step === 5 && confirmed && (
          <div className="confirm-box">
            <div style={{ fontSize: 48, marginBottom: 16 }}>⚓</div>
            <p style={{ fontSize: 10, letterSpacing: 4, color: 'var(--gold)', textTransform: 'uppercase' }}>Request Received</p>
            <div className="confirm-ref">{confirmed.reference}</div>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 32 }}>
              The owner will contact you within 24 hours to confirm your charter and arrange payment details.
            </p>
            <div>
              {[
                ['Guest', confirmed.guest_name],
                ['Charter', CHARTER_TYPES.find(t=>t.key===confirmed.charter_type)?.label],
                ['Date', fmtDate(confirmed.start_date)],
                ...(confirmed.end_date ? [['Return', fmtDate(confirmed.end_date)]] : []),
                ['Guests', confirmed.num_guests],
                ['Estimated Total', `$${confirmed.total_price?.toLocaleString()}`],
                ['Status', confirmed.status],
              ].map(([k, v]) => (
                <div key={k} className="confirm-row">
                  <span style={{ color: 'var(--muted)' }}>{k}</span>
                  <span style={{ color: k === 'Estimated Total' ? 'var(--gold2)' : 'var(--cream)' }}>{v}</span>
                </div>
              ))}
            </div>
            <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 20 }}>A confirmation email has been sent to {confirmed.guest_email}</p>
            <div className="flex gap-12 justify-center mt-32">
              <button className="btn-outline" onClick={() => navigate('/my-bookings')}>View My Bookings</button>
              <button className="btn-gold" onClick={() => navigate('/')}>Back to Home</button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
