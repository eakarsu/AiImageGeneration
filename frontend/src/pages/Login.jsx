import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useToast } from '../components/ToastContext';
import useFormValidation, { validators } from '../hooks/useFormValidation';

const rules = {
  email: [validators.required, validators.email],
  password: [validators.required],
};

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const toast = useToast();
  const { getFieldError, handleBlur, validateAll } = useFormValidation(rules);

  const handleAutofill = () => {
    setEmail('demo@example.com');
    setPassword('password123');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateAll({ email, password })) return;
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      localStorage.setItem('token', data.token);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  const values = { email, password };

  return (
    <div className="login-container">
      <div className="login-box">
        <h1>AI Image Gen</h1>
        <p>Sign in to start generating images</p>
        {error && <div className="error-msg">{error}</div>}
        <button className="btn-autofill" onClick={handleAutofill}>
          Auto-fill Demo Credentials
        </button>
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
              placeholder="Enter your password"
            />
            {getFieldError('password') && <div className="field-error">{getFieldError('password')}</div>}
          </div>
          <div className="forgot-link">
            <Link to="/forgot-password">Forgot Password?</Link>
          </div>
          <button type="submit" className="btn-login">Sign In</button>
        </form>
        <p className="auth-link">Don't have an account? <Link to="/register">Sign Up</Link></p>
      </div>
    </div>
  );
}

export default Login;
