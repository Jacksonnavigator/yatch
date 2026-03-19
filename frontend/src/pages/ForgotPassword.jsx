import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await authApi.forgotPassword(email);
      setSent(true);
      toast.success(data?.message || 'If that email exists, a reset link has been sent');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Forgot <em>Password</em></h1>
        <p className="page-sub">We’ll email you a reset link</p>
        <div className="gold-line" />
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        {sent ? (
          <>
            <p className="text-muted" style={{ fontSize: 13, lineHeight: 1.8 }}>
              If an account exists for <strong>{email}</strong>, you’ll receive a reset link shortly.
            </p>
            <div className="mt-24 flex gap-12">
              <Link to="/login"><button className="btn-gold">Back to Login</button></Link>
              <Link to="/"><button className="btn-outline">Home</button></Link>
            </div>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field">
              <label>Email</label>
              <input type="email" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <button className="btn-gold" type="submit" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </button>
            <div className="text-muted" style={{ fontSize: 12 }}>
              Remembered it? <Link to="/login" style={{ color: 'var(--gold)' }}>Sign in</Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

