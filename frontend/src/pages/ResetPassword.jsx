import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!token) { toast.error('Missing reset token'); return; }
    if (form.password.length < 8) { toast.error('Password must be at least 8 characters'); return; }
    if (form.password !== form.confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const { data } = await authApi.resetPassword(token, form.password);
      setDone(true);
      toast.success(data?.message || 'Password updated');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Reset <em>Password</em></h1>
        <div className="gold-line" />
      </div>

      <div className="card" style={{ maxWidth: 560 }}>
        {done ? (
          <>
            <p style={{ fontSize: 13, color: 'var(--green)' }}>Your password has been updated.</p>
            <div className="mt-24 flex gap-12">
              <Link to="/login"><button className="btn-gold">Sign in</button></Link>
              <Link to="/"><button className="btn-outline">Home</button></Link>
            </div>
          </>
        ) : (
          <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div className="field">
              <label>New password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="Min 8 characters" required />
            </div>
            <div className="field">
              <label>Confirm password</label>
              <input type="password" value={form.confirm} onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))} placeholder="Repeat new password" required />
            </div>
            <button className="btn-gold" type="submit" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
            <div className="text-muted" style={{ fontSize: 12 }}>
              If your link expired, request a new one on <Link to="/forgot-password" style={{ color: 'var(--gold)' }}>Forgot Password</Link>.
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

