import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi } from '../api/client';

const CHARTER_LABELS = { full_day:'Full-Day Charter', half_day:'Half-Day Charter', hourly:'Hourly Rental', multi_day:'Multi-Day Trip' };

function fmtDate(s) {
  if (!s) return '—';
  const [y,m,d] = s.split('-');
  return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}`;
}

export default function MyBookings() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    bookingApi.myBookings()
      .then(r => setBookings(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <style>{`
        .empty-state { text-align: center; padding: 80px 20px; }
        .empty-state h3 { font-family:'Cormorant Garamond',serif; font-size: 28px; font-weight: 300; margin-bottom: 12px; }
        .bk-detail { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px,1fr)); gap: 12px; margin-top: 12px; }
        .bk-d-item { }
        .bk-d-lbl { font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--muted); }
        .bk-d-val { font-size: 13px; margin-top: 3px; }
      `}</style>
      <div className="page-wrap">
        <div className="page-header">
          <h1 className="page-title">My <em>Bookings</em></h1>
          <p className="page-sub">Your charter history</p>
          <div className="gold-line" />
        </div>

        {loading && <p className="text-muted">Loading…</p>}

        {!loading && bookings.length === 0 && (
          <div className="empty-state">
            <div style={{ fontSize: 60, marginBottom: 20 }}>⚓</div>
            <h3>No bookings yet</h3>
            <p className="text-muted" style={{ fontSize: 13, marginBottom: 32 }}>Your charter history will appear here</p>
            <Link to="/book"><button className="btn-gold">Book Your First Charter</button></Link>
          </div>
        )}

        {bookings.map(b => (
          <div key={b.id} className="bk-row">
            <div style={{ minWidth: 200 }}>
              <div className="bk-ref">{b.reference}</div>
              <div className="bk-name">{CHARTER_LABELS[b.charter_type] || b.charter_type}</div>
              <div className="bk-detail mt-8">
                <div className="bk-d-item"><div className="bk-d-lbl">Date</div><div className="bk-d-val">{fmtDate(b.start_date)}</div></div>
                {b.end_date && <div className="bk-d-item"><div className="bk-d-lbl">Return</div><div className="bk-d-val">{fmtDate(b.end_date)}</div></div>}
                <div className="bk-d-item"><div className="bk-d-lbl">Guests</div><div className="bk-d-val">{b.num_guests}</div></div>
              </div>
              {b.extras?.length > 0 && (
                <p className="text-muted mt-8" style={{ fontSize: 11 }}>Add-ons: {b.extras.join(', ')}</p>
              )}
              {b.notes && <p className="text-muted mt-8" style={{ fontSize: 11, fontStyle: 'italic' }}>"{b.notes}"</p>}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div className="bk-price">${b.total_price?.toLocaleString()}</div>
              <div className="mt-8"><span className={`badge badge-${b.status}`}>{b.status}</span></div>
              {b.owner_notes && (
                <p className="text-muted mt-8" style={{ fontSize: 11 }}>Owner: "{b.owner_notes}"</p>
              )}
              {b.status === 'confirmed' && (
                <p style={{ fontSize: 10, color: 'var(--green)', letterSpacing: 1, marginTop: 8 }}>Owner will contact you for payment</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
