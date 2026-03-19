import { useEffect, useState } from 'react';
import { bookingApi } from '../api/client';
import toast from 'react-hot-toast';

const CHARTER_LABELS = { full_day:'Full-Day Charter', half_day:'Half-Day Charter', hourly:'Hourly Rental', multi_day:'Multi-Day Trip' };
function fmtDate(s) {
  if (!s) return '—';
  const [y,m,d] = s.split('-');
  return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}`;
}

export default function OwnerBookings() {
  const [bookings, setBookings] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [ownerNote, setOwnerNote] = useState('');
  const [actioning, setActioning] = useState(null);

  const load = () => {
    setLoading(true);
    bookingApi.list(filter === 'all' ? null : filter)
      .then(r => setBookings(r.data))
      .catch(() => toast.error('Failed to load bookings'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter]);

  const updateStatus = async (id, status) => {
    setActioning(id + status);
    try {
      await bookingApi.updateStatus(id, { status, owner_notes: ownerNote });
      toast.success(status === 'confirmed' ? 'Booking confirmed ✓' : 'Booking cancelled');
      setExpanded(null);
      setOwnerNote('');
      load();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    } finally {
      setActioning(null);
    }
  };

  const deleteBooking = async (id) => {
    if (!confirm('Delete this booking permanently?')) return;
    try {
      await bookingApi.delete(id);
      toast.success('Booking deleted');
      load();
    } catch { toast.error('Delete failed'); }
  };

  const filters = ['all','pending','confirmed','cancelled'];

  return (
    <>
      <style>{`
        .filter-row { display: flex; gap: 8px; margin-bottom: 24px; flex-wrap: wrap; }
        .filter-btn { padding: 8px 20px; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; background: none; border: 1px solid var(--border); color: var(--muted); transition: all .2s; }
        .filter-btn.active { border-color: var(--gold); color: var(--gold); background: rgba(201,168,76,.07); }
        .filter-btn:hover:not(.active) { border-color: rgba(201,168,76,.3); color: var(--cream); }
        .expand-panel { padding: 20px; border-top: 1px solid var(--border); background: rgba(0,0,0,.2); }
        .expand-actions { display: flex; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
      `}</style>
      <div className="page-wrap">
        <div className="page-header">
          <h1 className="page-title">All <em>Bookings</em></h1>
          <p className="page-sub">{bookings.length} booking{bookings.length !== 1 ? 's' : ''} · Rock The Yatch</p>
          <div className="gold-line" />
        </div>

        <div className="filter-row">
          {filters.map(f => (
            <button key={f} className={`filter-btn${filter === f ? ' active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {loading && <p className="text-muted">Loading…</p>}
        {!loading && bookings.length === 0 && <p className="text-muted">No bookings found.</p>}

        {bookings.map(b => (
          <div key={b.id} style={{ border: '1px solid var(--border)', marginBottom: 12, background: 'var(--glass)' }}>
            <div className="bk-row" style={{ border: 'none', marginBottom: 0, cursor: 'pointer' }} onClick={() => setExpanded(expanded === b.id ? null : b.id)}>
              <div style={{ flex: 1 }}>
                <div className="bk-ref">{b.reference}</div>
                <div className="bk-name">{b.guest_name}</div>
                <div className="bk-meta">{b.guest_email} · {b.guest_phone || '—'}</div>
                <div className="bk-meta mt-8">
                  {CHARTER_LABELS[b.charter_type]} · {fmtDate(b.start_date)}{b.end_date ? ` → ${fmtDate(b.end_date)}` : ''} · {b.num_guests} guests
                </div>
                {b.extras?.length > 0 && <div className="bk-meta" style={{ fontSize: 11 }}>Add-ons: {b.extras.join(', ')}</div>}
                {b.notes && <div className="bk-meta" style={{ fontStyle:'italic', fontSize:11 }}>"{b.notes}"</div>}
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize: 24, color:'var(--gold2)' }}>${b.total_price?.toLocaleString()}</div>
                <div className="mt-8"><span className={`badge badge-${b.status}`}>{b.status}</span></div>
                <div style={{ fontSize: 11, color:'var(--muted)', marginTop: 8 }}>
                  {new Date(b.created_at).toLocaleDateString()}
                </div>
                <div style={{ color:'var(--muted)', marginTop:8 }}>{expanded === b.id ? '▲' : '▼'}</div>
              </div>
            </div>

            {expanded === b.id && (
              <div className="expand-panel">
                {b.owner_notes && (
                  <p style={{ fontSize: 12, color:'var(--muted)', marginBottom: 12 }}>Previous note: "{b.owner_notes}"</p>
                )}
                <div className="field" style={{ maxWidth: 480 }}>
                  <label>Owner Note to Guest (optional)</label>
                  <textarea placeholder="Add a personal note to the guest…" value={ownerNote} onChange={e => setOwnerNote(e.target.value)} style={{ minHeight: 60 }} />
                </div>
                <div className="expand-actions">
                  {b.status === 'pending' && (
                    <>
                      <button className="btn-gold btn-sm" disabled={!!actioning} onClick={() => updateStatus(b.id, 'confirmed')}>
                        {actioning === b.id+'confirmed' ? 'Confirming…' : '✓ Confirm'}
                      </button>
                      <button className="btn-danger btn-sm" disabled={!!actioning} onClick={() => updateStatus(b.id, 'cancelled')}>
                        {actioning === b.id+'cancelled' ? 'Cancelling…' : '✗ Cancel'}
                      </button>
                    </>
                  )}
                  {b.status === 'confirmed' && (
                    <button className="btn-danger btn-sm" disabled={!!actioning} onClick={() => updateStatus(b.id, 'cancelled')}>Cancel Booking</button>
                  )}
                  {b.status === 'cancelled' && (
                    <button className="btn-outline btn-sm" disabled={!!actioning} onClick={() => updateStatus(b.id, 'confirmed')}>Reinstate</button>
                  )}
                  <button className="btn-ghost btn-sm" onClick={() => deleteBooking(b.id)} style={{ color:'var(--red)' }}>Delete</button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
