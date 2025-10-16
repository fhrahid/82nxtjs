"use client";
import { useState, useRef, useEffect } from 'react';

export default function AdminLoginPage() {
  const [u,setU]=useState('');
  const [p,setP]=useState('');
  const [msg,setMsg]=useState('');
  const [loading,setLoading]=useState(false);
  const formRef = useRef<HTMLFormElement|null>(null);

  async function submit(e:React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true); 
    setMsg('');
    const res = await fetch('/api/admin/login',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({username:u.trim(),password:p})
    });
    const j = await res.json();
    setLoading(false);
    if (j.success) {
      window.location.href='/admin/dashboard';
    } else {
      setMsg(j.error || 'Invalid credentials');
      // trigger a shake animation
      if (formRef.current) {
        formRef.current.classList.remove('shake');
        // force reflow
        void formRef.current.offsetWidth;
        formRef.current.classList.add('shake');
      }
    }
  }

  // Allow Enter on both inputs
  useEffect(()=>{
    const handler = (e:KeyboardEvent)=>{
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        formRef.current?.dispatchEvent(new Event('submit', {cancelable:true,bubbles:true}));
      }
    };
    window.addEventListener('keydown', handler);
    return ()=> window.removeEventListener('keydown', handler);
  },[]);

  return (
    <div className="admin-auth-shell">
      <div className="admin-auth-gradient" />
      <div className="admin-auth-backdrop" />
      <div className="admin-auth-wrapper">
        <div className="admin-auth-header">
          <div className="brand-icon">🛒</div>
          <div className="brand-text">
            <h1>Cartup CxP <span>Admin</span></h1>
            <p className="tagline">Team Lead & Administrator Access</p>
          </div>
        </div>

        <form ref={formRef} onSubmit={submit} className="admin-auth-form">
          <div className="form-field">
            <label htmlFor="admin-username">Username</label>
            <div className="input-wrapper">
              <span className="input-icon">👤</span>
              <input
                id="admin-username"
                autoComplete="username"
                placeholder="Enter your username"
                value={u}
                onChange={e=>setU(e.target.value)}
                required
              />
            </div>
          </div>

            <div className="form-field">
              <label htmlFor="admin-password">Password</label>
              <div className="input-wrapper">
                <span className="input-icon">🔒</span>
                <input
                  id="admin-password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  value={p}
                  onChange={e=>setP(e.target.value)}
                  required
                />
              </div>
            </div>

          {msg && (
            <div className="auth-message error">
              <span>⚠</span> {msg}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit-btn"
            disabled={loading || !u || !p}
          >
            {loading ? 'Authenticating…' : 'Login to Admin Panel'}
          </button>

          <div className="auth-footer-links">
            <a href="/" className="back-link">← Return to Main Roster Viewer</a>
          </div>
        </form>

        <div className="admin-auth-footer">
          <div className="foot-col">
            <h4>Security Notice</h4>
            <p>Authorized personnel only. Activity is monitored and logged.</p>
          </div>
          <div className="foot-col">
            <h4>Shortcuts</h4>
            <p><kbd>Ctrl</kbd>/<kbd>⌘</kbd> + <kbd>Enter</kbd> to submit</p>
          </div>
        </div>
      </div>
    </div>
  );
}