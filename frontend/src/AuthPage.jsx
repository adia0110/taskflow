import { useState } from 'react';
import { api } from './api';
import { useAuth } from './AuthContext';

export default function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await api.post(`/auth/${mode}`, form);
      login(data.token, data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">TaskFlow</div>
        <div className="auth-tagline">// collaborative project management</div>

        <form className="auth-form" onSubmit={submit}>
          {mode === 'signup' && (
            <div className="form-group">
              <label>Full Name</label>
              <input value={form.name} onChange={set('name')} placeholder="Ada Lovelace" required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@example.com" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" value={form.password} onChange={set('password')} placeholder="••••••••" required minLength={6} />
          </div>

          {error && <div className="form-error">⚠ {error}</div>}

          <button type="submit" className="btn btn-primary w-full" disabled={loading}>
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in →' : 'Create account →'}
          </button>
        </form>

        <div className="auth-switch">
          {mode === 'login' ? (
            <>Don't have an account? <span onClick={() => { setMode('signup'); setError(''); }}>Sign up</span></>
          ) : (
            <>Already have an account? <span onClick={() => { setMode('login'); setError(''); }}>Sign in</span></>
          )}
        </div>
      </div>
    </div>
  );
}
