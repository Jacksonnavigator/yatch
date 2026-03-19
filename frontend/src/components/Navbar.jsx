import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);

  const handleLogout = () => { logout(); navigate('/'); setOpen(false); };

  const navLinks = user?.role === 'owner'
    ? [{ to: '/owner', label: 'Dashboard' }, { to: '/owner/bookings', label: 'Bookings' }, { to: '/owner/calendar', label: 'Calendar' }, { to: '/owner/yacht', label: 'Yacht' }]
    : user
    ? [{ to: '/book', label: 'Book Charter' }, { to: '/my-bookings', label: 'My Bookings' }]
    : [{ to: '/book', label: 'Book Charter' }];

  return (
    <>
      <style>{`
        .nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 200;
          display: flex; align-items: center; justify-content: space-between;
          padding: 18px 40px;
          background: rgba(6,11,22,0.92);
          backdrop-filter: blur(14px);
          border-bottom: 1px solid var(--border);
        }
        .nav-logo { font-family:'Cormorant Garamond',serif; font-size: 20px; letter-spacing: 2px; cursor: pointer; }
        .nav-logo span { color: var(--gold); }
        .nav-center { display: flex; gap: 28px; align-items: center; }
        .nav-link { font-size: 10px; letter-spacing: 2.5px; text-transform: uppercase; color: var(--muted); background: none; border: none; transition: color .2s; padding: 4px 0; }
        .nav-link:hover, .nav-link.active { color: var(--gold); }
        .nav-right { display: flex; gap: 12px; align-items: center; }
        .nav-user { font-size: 11px; color: var(--muted); letter-spacing: 1px; }
        .hamburger { display: none; background: none; border: 1px solid var(--border); color: var(--cream); width: 36px; height: 36px; font-size: 18px; align-items: center; justify-content: center; }
        @media(max-width:768px) {
          .nav { padding: 16px 20px; }
          .nav-center { display: none; }
          .hamburger { display: flex; }
          .mobile-menu { position: fixed; top: 62px; left: 0; right: 0; background: var(--panel); border-bottom: 1px solid var(--border); padding: 20px; z-index: 199; display: flex; flex-direction: column; gap: 16px; }
        }
      `}</style>
      <nav className="nav" role="navigation" aria-label="Main">
        <Link to="/" className="nav-logo">Rock The <span>Yatch</span></Link>
        <div className="nav-center">
          {navLinks.map(l => (
            <Link
              key={l.to}
              to={l.to}
              className={`nav-link${pathname === l.to ? ' active' : ''}`}
              aria-current={pathname === l.to ? 'page' : undefined}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="nav-right">
          {user ? (
            <>
              <span className="nav-user" style={{ display: 'none' }}>{user.name}</span>
              <button className="btn-outline btn-sm" onClick={handleLogout}>Sign Out</button>
            </>
          ) : (
            <>
              <Link to="/login"><button className="btn-ghost">Sign In</button></Link>
              <Link to="/register"><button className="btn-gold btn-sm">Join</button></Link>
            </>
          )}
          <button className="hamburger" onClick={() => setOpen(o => !o)}>☰</button>
        </div>
      </nav>
      {open && (
        <div className="mobile-menu">
          {navLinks.map(l => (
            <Link key={l.to} to={l.to} onClick={() => setOpen(false)}>
              <button className="nav-link">{l.label}</button>
            </Link>
          ))}
          {user
            ? <button className="btn-outline btn-sm" onClick={handleLogout}>Sign Out</button>
            : <><Link to="/login" onClick={() => setOpen(false)}><button className="btn-gold w-full">Sign In</button></Link></>
          }
        </div>
      )}
    </>
  );
}
