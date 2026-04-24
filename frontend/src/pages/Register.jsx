import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import useFormValidation, { validators } from '../hooks/useFormValidation';

const rules = {
  email: [validators.required, validators.email],
  password: [validators.required, validators.minLength(6)],
  confirmPassword: [validators.required, validators.match('password', 'Password')],
};

function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const { getFieldError, handleBlur, validateAll } = useFormValidation(rules);

  const values = { email, password, confirmPassword };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateAll(values)) return;

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('token', data.token);
      toast.success('Account created successfully!');
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>AI Image Gen</h1>
        <p>Create a new account</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => handleBlur('email', email, values)}
              className={getFieldError('email') ? 'input-error' : ''}
              placeholder="Enter your email"
            />
            {getFieldError('email') && <div className="field-error">{getFieldError('email')}</div>}
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onBlur={() => handleBlur('password', password, values)}
              className={getFieldError('password') ? 'input-error' : ''}
              placeholder="At least 6 characters"
            />
            {getFieldError('password') && <div className="field-error">{getFieldError('password')}</div>}
          </div>
          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => handleBlur('confirmPassword', confirmPassword, values)}
              className={getFieldError('confirmPassword') ? 'input-error' : ''}
              placeholder="Confirm your password"
            />
            {getFieldError('confirmPassword') && <div className="field-error">{getFieldError('confirmPassword')}</div>}
          </div>
          <button type="submit" className="btn-login">Create Account</button>
        </form>
        <p className="auth-link">Already have an account? <Link to="/login">Sign In</Link></p>
      </div>
    </div>
  );
}

export default Register;
