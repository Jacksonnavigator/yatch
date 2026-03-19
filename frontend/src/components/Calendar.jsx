import { useState, useEffect } from 'react';
import { yachtApi } from '../api/client';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS = ['Su','Mo','Tu','We','Th','Fr','Sa'];

export default function Calendar({ selected, onSelect, rangeEnd, onRangeEnd, ownerMode, onBlockToggle, multiDay }) {
  const today = new Date();
  const [view, setView] = useState({ y: today.getFullYear(), m: today.getMonth() });
  const [availability, setAvailability] = useState({ blocked: [], booked: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    yachtApi.getAvailability(view.y, view.m + 1)
      .then(r => setAvailability(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [view.y, view.m]);

  const firstDay = new Date(view.y, view.m, 1).getDay();
  const daysInMonth = new Date(view.y, view.m + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const toStr = d => `${view.y}-${String(view.m + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  const isInRange = ds => {
    if (!selected || !rangeEnd) return false;
    const a = selected < rangeEnd ? selected : rangeEnd;
    const b = selected < rangeEnd ? rangeEnd : selected;
    return ds > a && ds < b;
  };

  const prev = () => setView(v => {
    const m = v.m - 1 < 0 ? 11 : v.m - 1;
    return { y: m === 11 ? v.y - 1 : v.y, m };
  });
  const next = () => setView(v => {
    const m = v.m + 1 > 11 ? 0 : v.m + 1;
    return { y: m === 0 ? v.y + 1 : v.y, m };
  });

  const handleClick = (ds) => {
    if (ownerMode) { onBlockToggle && onBlockToggle(ds); return; }
    if (multiDay) {
      if (!selected || rangeEnd) { onSelect(ds); onRangeEnd && onRangeEnd(null); }
      else if (ds > selected) { onRangeEnd && onRangeEnd(ds); }
      else { onSelect(ds); onRangeEnd && onRangeEnd(null); }
    } else {
      onSelect(ds);
    }
  };

  return (
    <div className="cal">
      <div className="cal-hdr" aria-live="polite">
        <button className="cal-nav-btn" onClick={prev} aria-label="Previous month">‹</button>
        <h3>{MONTHS[view.m]} {view.y}</h3>
        <button className="cal-nav-btn" onClick={next} aria-label="Next month">›</button>
      </div>
      <div className="cal-dow" aria-hidden="true">{DAYS.map(d => <span key={d}>{d}</span>)}</div>
      <div className="cal-grid" role="grid" aria-label="Charter availability calendar">
        {cells.map((day, i) => {
          if (!day) return <div key={i} />;
          const ds = toStr(day);
          const isBlocked = availability.blocked.includes(ds);
          const isBooked = availability.booked.includes(ds);
          const isSel = selected === ds || rangeEnd === ds;
          const inRange = isInRange(ds);
          const isPast = ds < todayStr;
          const isToday = ds === todayStr;
          let cls = 'cal-cell';
          if (isPast && !ownerMode) cls += ' past';
          else if (isBlocked) cls += ' blocked';
          else if (isBooked) cls += ' booked';
          else if (isSel) cls += ' selected';
          else if (inRange) cls += ' in-range';
          else cls += ' clickable';
          if (isToday && !isSel) cls += ' today';
          return (
            <div key={i} className={cls}
              role="button"
              aria-pressed={isSel}
              aria-label={`${ds}${isBlocked ? ' blocked by owner' : isBooked ? ' booked' : ''}`}
              aria-disabled={isPast && !ownerMode}
              onClick={() => { if (!isPast || ownerMode) if (!isBooked) handleClick(ds); }}>
              {day}
            </div>
          );
        })}
      </div>
      {loading && <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 10 }}>Loading availability…</p>}
      <div className="cal-legend">
        <div className="cal-legend-item"><div className="cal-dot" style={{ background: 'var(--gold)' }} />Selected</div>
        <div className="cal-legend-item"><div className="cal-dot" style={{ background: 'var(--green)' }} />Booked</div>
        <div className="cal-legend-item"><div className="cal-dot" style={{ background: 'var(--red)' }} />Blocked</div>
      </div>
    </div>
  );
}
