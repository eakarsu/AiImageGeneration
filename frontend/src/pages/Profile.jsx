import { useState, useEffect } from 'react';
import { useToast } from '../components/ToastContext';
import useFormValidation, { validators } from '../hooks/useFormValidation';

const rules = {
  currentPassword: [validators.required],
  newPassword: [validators.required, validators.minLength(6)],
  confirmPassword: [validators.required, validators.match('newPassword', 'New Password')],
};

function Profile() {
  const [profile, setProfile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');
  const toast = useToast();
  const { getFieldError, handleBlur, validateAll, clearErrors } = useFormValidation(rules);

  useEffect(() => {
    fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setProfile)
      .catch(console.error);
  }, []);

  const values = { currentPassword, newPassword, confirmPassword };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    if (!validateAll(values)) return;

    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      clearErrors();
    } catch (err) {
      setError(err.message);
    }
  };

  if (!profile) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  return (
    <div className="detail-container">
      <h1 className="detail-title">Profile</h1>
      <div className="detail-info" style={{ marginBottom: '2rem' }}>
        <div><label>Email</label><p>{profile.email}</p></div>
        <div><label>Member Since</label><p>{new Date(profile.created_at).toLocaleDateString()}</p></div>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Change Password</h2>
      <div className="detail-info">
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} onBlur={() => handleBlur('currentPassword', currentPassword, values)} className={getFieldError('currentPassword') ? 'input-error' : ''} />
            {getFieldError('currentPassword') && <div className="field-error">{getFieldError('currentPassword')}</div>}
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} onBlur={() => handleBlur('newPassword', newPassword, values)} className={getFieldError('newPassword') ? 'input-error' : ''} />
            {getFieldError('newPassword') && <div className="field-error">{getFieldError('newPassword')}</div>}
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onBlur={() => handleBlur('confirmPassword', confirmPassword, values)} className={getFieldError('confirmPassword') ? 'input-error' : ''} />
            {getFieldError('confirmPassword') && <div className="field-error">{getFieldError('confirmPassword')}</div>}
          </div>
          <button type="submit" className="btn-primary">Update Password</button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
