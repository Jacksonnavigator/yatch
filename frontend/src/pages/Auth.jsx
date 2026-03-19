import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';

const S = `
  .auth-wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 100px 20px 40px; background: radial-gradient(ellipse 60% 50% at 50% 40%, rgba(201,168,76,0.07) 0%, transparent 60%); }
  .auth-box { width: 100%; max-width: 460px; border: 1px solid var(--border); background: var(--glass); padding: 48px 40px; }
  @media(max-width:480px) { .auth-box { padding: 32px 24px; } }
  .auth-logo { font-family:'Cormorant Garamond',serif; font-size: 22px; text-align: center; letter-spacing: 2px; margin-bottom: 32px; }
  .auth-logo span { color: var(--gold); }
  .auth-title { font-family:'Cormorant Garamond',serif; font-size: 28px; font-weight: 300; margin-bottom: 6px; }
  .auth-sub { font-size: 11px; color: var(--muted); letter-spacing: 2px; text-transform: uppercase; margin-bottom: 36px; }
  .auth-footer { text-align: center; margin-top: 28px; font-size: 12px; color: var(--muted); }
  .auth-footer a { color: var(--gold); }
`;

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from || '/';
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate(user.role === 'owner' ? '/owner' : from, { replace: true });
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{S}</style>
      <div className="auth-wrap">
        <div className="auth-box">
          <div className="auth-logo">Rock The <span>Yatch</span></div>
          <h2 className="auth-title">Welcome back</h2>
          <p className="auth-sub">Sign in to your account</p>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="field">
              <label htmlFor="login-email">Email</label>
              <input id="login-email" type="email" autoComplete="email" placeholder="your@email.com" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} required />
            </div>
            <div className="field">
              <label htmlFor="login-password">Password</label>
              <input id="login-password" type="password" autoComplete="current-password" placeholder="••••••••" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} required />
            </div>
            <button className="btn-gold w-full mt-8" type="submit" disabled={loading}>
              {loading ? 'Signing In…' : 'Sign In'}
            </button>
          </form>
          <div className="auth-footer" style={{ marginTop: 18 }}>
            <Link to="/forgot-password">Forgot password?</Link>
          </div>
          <div className="auth-footer">
            Don't have an account? <Link to="/register">Create one</Link>
          </div>
        </div>
      </div>
    </>
  );
}

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submit = async e => {
    e.preventDefault();
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    setLoading(true);
    try {
      await register(form.name, form.email, form.password, form.phone);
      toast.success('Account created!');
      navigate('/book');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <style>{S}</style>
      <div className="auth-wrap">
        <div className="auth-box">
          <div className="auth-logo">Rock The <span>Yatch</span></div>
          <h2 className="auth-title">Create account</h2>
          <p className="auth-sub">Book your first charter</p>
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field">
              <label htmlFor="reg-name">Full Name</label>
              <input id="reg-name" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="reg-email">Email</label>
              <input id="reg-email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={e => set('email', e.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor="reg-phone">Phone</label>
              <input id="reg-phone" placeholder="+1 555 000 0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="reg-password">Password</label>
              <input id="reg-password" type="password" autoComplete="new-password" placeholder="Min 8 characters" value={form.password} onChange={e => set('password', e.target.value)} required />
            </div>
            <button className="btn-gold w-full mt-8" type="submit" disabled={loading}>
              {loading ? 'Creating Account…' : 'Create Account'}
            </button>
          </form>
          <div className="auth-footer">
            Already have an account? <Link to="/login">Sign in</Link>
          </div>
        </div>
      </div>
    </>
  );
}
