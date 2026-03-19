import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/client';
import toast from 'react-hot-toast';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [status, setStatus] = useState('loading'); // loading | ok | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!token) { setStatus('error'); setMessage('Missing verification token'); return; }
    authApi.verifyEmail(token)
      .then(r => { setStatus('ok'); setMessage(r.data?.message || 'Email verified'); toast.success('Email verified'); })
      .catch(err => { setStatus('error'); setMessage(err.response?.data?.detail || 'Verification failed'); });
  }, [token]);

  return (
    <div className="page-wrap">
      <div className="page-header">
        <h1 className="page-title">Verify <em>Email</em></h1>
        <div className="gold-line" />
      </div>

      {status === 'loading' && <p className="text-muted">Verifying…</p>}

      {status !== 'loading' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <p style={{ fontSize: 13, color: status === 'ok' ? 'var(--green)' : 'var(--red)' }}>{message}</p>
          <div className="mt-24 flex gap-12">
            <Link to="/login"><button className="btn-gold">Go to Login</button></Link>
            <Link to="/"><button className="btn-outline">Home</button></Link>
          </div>
        </div>
      )}
    </div>
  );
}

