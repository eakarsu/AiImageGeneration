import { useState } from 'react';
import { Link } from 'react-router-dom';
import useFormValidation, { validators } from '../hooks/useFormValidation';

const rules = {
  email: [validators.required, validators.email],
};

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const { getFieldError, handleBlur, validateAll } = useFormValidation(rules);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateAll({ email })) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSent(true);
      if (data.resetToken) setResetToken(data.resetToken);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>Reset Password</h1>
        <p>Enter your email to receive a reset token</p>
        {error && <div className="error-msg">{error}</div>}

        {!sent ? (
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={() => handleBlur('email', email, { email })}
                className={getFieldError('email') ? 'input-error' : ''}
                placeholder="Enter your email"
              />
              {getFieldError('email') && <div className="field-error">{getFieldError('email')}</div>}
            </div>
            <button type="submit" className="btn-login" disabled={loading}>
              {loading ? 'Sending...' : 'Send Reset Token'}
            </button>
          </form>
        ) : (
          <div>
            <div className="success-msg">Reset token generated. In production, this would be emailed to you.</div>
            {resetToken && (
              <div className="detail-info" style={{ marginTop: '1rem' }}>
                <label>Your Reset Token (demo only)</label>
                <p style={{ wordBreak: 'break-all', fontSize: '0.82rem', fontFamily: 'monospace' }}>{resetToken}</p>
              </div>
            )}
            <div style={{ marginTop: '1rem' }}>
              <Link to="/reset-password" className="btn-login" style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>
                Go to Reset Password
              </Link>
            </div>
          </div>
        )}

        <p className="auth-link">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default ForgotPassword;
