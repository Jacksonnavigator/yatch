import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { bookingApi, yachtApi } from '../api/client';
import { useAuth } from '../context/AuthContext';

function fmtDate(s) {
  if (!s) return '—';
  const [y,m,d] = s.split('-');
  return `${d} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m-1]} ${y}`;
}
const CHARTER_LABELS = { full_day:'Full-Day', half_day:'Half-Day', hourly:'Hourly', multi_day:'Multi-Day' };

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([bookingApi.stats(), bookingApi.list()])
      .then(([s, b]) => {
        setStats(s.data);
        setRecent(b.data.slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <style>{`
        .owner-header { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 16px; margin-bottom: 40px; }
        .quick-actions { display: flex; gap: 12px; flex-wrap: wrap; }
        .revenue-card { background: linear-gradient(135deg,rgba(201,168,76,.12),rgba(232,201,122,.06)); border: 1px solid var(--gold); padding: 32px; margin-bottom: 24px; }
        .rev-val { font-family:'Cormorant Garamond',serif; font-size: 52px; color: var(--gold2); line-height: 1; }
        .rev-lbl { font-size: 10px; letter-spacing: 3px; text-transform: uppercase; color: var(--muted); margin-top: 8px; }
      `}</style>
      <div className="page-wrap">
        <div className="owner-header">
          <div>
            <h1 className="page-title">Good {new Date().getHours() < 12 ? 'Morning' : 'Afternoon'}, <em>{user?.name?.split(' ')[0]}</em></h1>
            <p className="page-sub">Rock The Yatch · Owner Dashboard</p>
            <div className="gold-line" />
          </div>
          <div className="quick-actions">
            <Link to="/owner/bookings"><button className="btn-outline btn-sm">All Bookings</button></Link>
            <Link to="/owner/calendar"><button className="btn-outline btn-sm">Calendar</button></Link>
            <Link to="/owner/yacht"><button className="btn-gold btn-sm">Manage Yacht</button></Link>
          </div>
        </div>

        {loading && (
          <div>
            <div className="revenue-card">
              <div className="rev-val" style={{ opacity: 0.3 }}>Loading…</div>
              <div className="rev-lbl">Confirmed Revenue</div>
            </div>
            <div className="stats-row">
              {['Total Bookings','Confirmed','Pending Review','Cancelled'].map(lbl => (
                <div key={lbl} className="stat-card">
                  <div className="stat-val" style={{ opacity: 0.3 }}>—</div>
                  <div className="stat-lbl">{lbl}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {stats && (
          <>
            {/* Revenue hero */}
            <div className="revenue-card">
              <div className="rev-val">${stats.total_revenue?.toLocaleString()}</div>
              <div className="rev-lbl">Confirmed Revenue</div>
              {stats.pending_revenue > 0 && (
                <p className="text-muted mt-8" style={{ fontSize: 12 }}>+ ${stats.pending_revenue?.toLocaleString()} pending confirmation</p>
              )}
            </div>

            {/* Stats grid */}
            <div className="stats-row">
              {[
                { val: stats.total, lbl: 'Total Bookings' },
                { val: stats.confirmed, lbl: 'Confirmed' },
                { val: stats.pending, lbl: 'Pending Review' },
                { val: stats.cancelled, lbl: 'Cancelled' },
              ].map(s => (
                <div key={s.lbl} className="stat-card">
                  <div className="stat-val">{s.val}</div>
                  <div className="stat-lbl">{s.lbl}</div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Recent bookings */}
        {recent.length > 0 && (
          <div className="mt-40">
            <div className="flex justify-between items-center mb-16">
              <h2 style={{ fontFamily:'Cormorant Garamond,serif', fontSize: 24, fontWeight: 300 }}>Recent <em style={{ fontStyle:'italic', color:'var(--gold2)' }}>Bookings</em></h2>
              <Link to="/owner/bookings"><button className="btn-ghost">View All →</button></Link>
            </div>
            {recent.map(b => (
              <div key={b.id} className="bk-row">
                <div>
                  <div className="bk-ref">{b.reference}</div>
                  <div className="bk-name">{b.guest_name}</div>
                  <div className="bk-meta">{b.guest_email} · {CHARTER_LABELS[b.charter_type]} · {fmtDate(b.start_date)}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontFamily:'Cormorant Garamond,serif', fontSize: 22, color:'var(--gold2)' }}>${b.total_price?.toLocaleString()}</div>
                  <div className="mt-8"><span className={`badge badge-${b.status}`}>{b.status}</span></div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
