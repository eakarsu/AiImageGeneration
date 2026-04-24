import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import useFormValidation, { validators } from '../hooks/useFormValidation';

const rules = {
  token: [validators.required],
  newPassword: [validators.required, validators.minLength(6)],
  confirmPassword: [validators.required, validators.match('newPassword', 'New Password')],
};

function ResetPassword() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const toast = useToast();
  const { getFieldError, handleBlur, validateAll } = useFormValidation(rules);

  const values = { token, newPassword, confirmPassword };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateAll(values)) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Password reset successfully! Please sign in.');
      navigate('/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>New Password</h1>
        <p>Enter your reset token and new password</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Reset Token</label>
            <input
              type="text"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onBlur={() => handleBlur('token', token, values)}
              className={getFieldError('token') ? 'input-error' : ''}
              placeholder="Paste your reset token"
            />
            {getFieldError('token') && <div className="field-error">{getFieldError('token')}</div>}
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onBlur={() => handleBlur('newPassword', newPassword, values)}
              className={getFieldError('newPassword') ? 'input-error' : ''}
              placeholder="At least 6 characters"
            />
            {getFieldError('newPassword') && <div className="field-error">{getFieldError('newPassword')}</div>}
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => handleBlur('confirmPassword', confirmPassword, values)}
              className={getFieldError('confirmPassword') ? 'input-error' : ''}
              placeholder="Confirm new password"
            />
            {getFieldError('confirmPassword') && <div className="field-error">{getFieldError('confirmPassword')}</div>}
          </div>
          <button type="submit" className="btn-login" disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
        <p className="auth-link">
          <Link to="/login">Back to Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default ResetPassword;
