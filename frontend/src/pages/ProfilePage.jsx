import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';

export default function ProfilePage() {
  const { user, reload } = useAuth();
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '', password: '', confirmPassword: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async e => {
    e.preventDefault();
    if (form.password && form.password !== form.confirmPassword) {
      toast.error('Passwords do not match'); return;
    }
    if (form.password && form.password.length < 8) {
      toast.error('Password must be at least 8 characters'); return;
    }
    setSaving(true);
    try {
      const payload = { name: form.name, phone: form.phone };
      if (form.password) payload.password = form.password;
      await authApi.updateMe(payload);
      await reload();
      toast.success('Profile updated ✓');
      setForm(f => ({ ...f, password: '', confirmPassword: '' }));
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Update failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        .profile-card { max-width: 560px; background: var(--glass); border: 1px solid var(--border); padding: 40px; }
        .profile-avatar { width: 64px; height: 64px; border: 1px solid var(--border); display: flex; align-items: center; justify-content: center; font-family:'Cormorant Garamond',serif; font-size: 24px; color: var(--gold2); margin-bottom: 24px; background: rgba(201,168,76,0.07); }
        .profile-role { display: inline-block; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; padding: 4px 12px; border: 1px solid var(--border); color: var(--gold); margin-bottom: 32px; }
        .section-heading { font-family:'Cormorant Garamond',serif; font-size: 20px; font-weight: 300; margin: 32px 0 20px; padding-top: 32px; border-top: 1px solid var(--border); }
        .section-heading em { font-style: italic; color: var(--gold2); }
      `}</style>
      <div className="page-wrap">
        <div className="page-header">
          <h1 className="page-title">My <em>Profile</em></h1>
          <p className="page-sub">Manage your account details</p>
          <div className="gold-line" />
        </div>

        <div className="profile-card">
          <div className="profile-avatar">
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div className="profile-role">{user?.role}</div>

          <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="form-grid">
              <div className="field">
                <label>Full Name</label>
                <input value={form.name} onChange={e => set('name', e.target.value)} required />
              </div>
              <div className="field">
                <label>Email Address</label>
                <input value={user?.email} disabled style={{ opacity: 0.5 }} />
              </div>
              <div className="field full-col">
                <label>Phone Number</label>
                <input placeholder="+1 555 000 0000" value={form.phone} onChange={e => set('phone', e.target.value)} />
              </div>
            </div>

            <h3 className="section-heading">Change <em>Password</em></h3>
            <div className="form-grid">
              <div className="field">
                <label>New Password</label>
                <input type="password" placeholder="Leave blank to keep current" value={form.password} onChange={e => set('password', e.target.value)} />
              </div>
              <div className="field">
                <label>Confirm Password</label>
                <input type="password" placeholder="Repeat new password" value={form.confirmPassword} onChange={e => set('confirmPassword', e.target.value)} />
              </div>
            </div>

            <button className="btn-gold mt-8" type="submit" disabled={saving}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
