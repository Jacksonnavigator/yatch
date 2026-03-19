import { useEffect, useMemo, useState } from 'react';
import { yachtApi } from '../api/client';
import Calendar from '../components/Calendar';
import toast from 'react-hot-toast';

export default function OwnerCalendar() {
  const [reason, setReason] = useState('');
  const [lastToggled, setLastToggled] = useState(null);
  const [refresh, setRefresh] = useState(0);
  const [blocked, setBlocked] = useState([]);
  const [loadingList, setLoadingList] = useState(true);

  const handleBlock = async (ds) => {
    try {
      const { data } = await yachtApi.blockDate({ date: ds, reason: reason || null });
      setLastToggled({ date: ds, blocked: data.blocked });
      toast.success(data.blocked ? `${ds} blocked` : `${ds} unblocked`);
      setRefresh(r => r + 1);
      setReason('');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Action failed');
    }
  };

  useEffect(() => {
    setLoadingList(true);
    yachtApi.listBlockedDates()
      .then(r => setBlocked(r.data || []))
      .catch(() => setBlocked([]))
      .finally(() => setLoadingList(false));
  }, [refresh]);

  const blockedCount = blocked?.length || 0;
  const blockedByDate = useMemo(() => new Map((blocked || []).map(b => [b.date, b])), [blocked]);

  return (
    <>
      <style>{`
        .cal-info { background: var(--glass); border: 1px solid var(--border); padding: 20px; margin-bottom: 24px; font-size: 13px; color: var(--muted); line-height: 1.7; }
        .cal-info strong { color: var(--cream); }
        .blk-wrap { display: grid; grid-template-columns: 520px 1fr; gap: 22px; align-items: start; }
        @media(max-width: 980px) { .blk-wrap { grid-template-columns: 1fr; } }
        .blk-list { border: 1px solid var(--border); background: var(--glass); padding: 18px; }
        .blk-row { display: flex; justify-content: space-between; gap: 14px; padding: 12px 0; border-bottom: 1px solid var(--border); }
        .blk-row:last-child { border-bottom: none; }
        .blk-date { font-size: 12px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold); }
        .blk-reason { font-size: 12px; color: var(--muted); margin-top: 6px; }
      `}</style>
      <div className="page-wrap">
        <div className="page-header">
          <h1 className="page-title">Availability <em>Calendar</em></h1>
          <p className="page-sub">Block or unblock dates for maintenance, personal use, or other reasons</p>
          <div className="gold-line" />
        </div>

        <div className="cal-info">
          <strong>Owner Mode:</strong> Click any available date to <strong>block</strong> it. Click a blocked date to <strong>unblock</strong> it. Booked dates cannot be modified from this view — cancel the booking first.
        </div>

        <div className="blk-wrap">
          <div style={{ maxWidth: 520 }}>
            <div className="field mb-16" style={{ marginBottom: 16 }}>
              <label>Block Reason (optional)</label>
              <input placeholder="e.g. Maintenance, Personal use…" value={reason} onChange={e => setReason(e.target.value)} />
            </div>

            <Calendar key={refresh} ownerMode onBlockToggle={(ds) => {
              // Helpful: if they click a blocked date in the calendar, prefill the saved reason.
              const existing = blockedByDate.get(ds);
              if (existing?.reason) setReason(existing.reason);
              handleBlock(ds);
            }} />
          </div>

          <div className="blk-list">
            <div className="flex justify-between items-center mb-12">
              <div style={{ fontFamily: 'Cormorant Garamond,serif', fontSize: 22, fontWeight: 300 }}>
                Blocked Dates
              </div>
              <div className="text-muted" style={{ fontSize: 12 }}>{blockedCount} total</div>
            </div>

            {loadingList && <p className="text-muted" style={{ fontSize: 12 }}>Loading…</p>}

            {!loadingList && blockedCount === 0 && (
              <p className="text-muted" style={{ fontSize: 12, lineHeight: 1.7 }}>
                No blocked dates yet. Click a date on the calendar to block it.
              </p>
            )}

            {!loadingList && blockedCount > 0 && blocked.map(b => (
              <div key={b.date} className="blk-row">
                <div>
                  <div className="blk-date">{b.date}</div>
                  {b.reason && <div className="blk-reason">{b.reason}</div>}
                </div>
                <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <button className="btn-outline" onClick={() => handleBlock(b.date)}>Unblock</button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {lastToggled && (
          <div className="mt-24" style={{ padding: '14px 20px', border: `1px solid ${lastToggled.blocked ? 'var(--red)' : 'var(--green)'}`, background: lastToggled.blocked ? 'rgba(192,57,43,.08)' : 'rgba(39,174,96,.08)', fontSize: 13 }}>
            {lastToggled.date} has been <strong>{lastToggled.blocked ? 'blocked' : 'unblocked'}</strong>.
          </div>
        )}
      </div>
    </>
  );
}
