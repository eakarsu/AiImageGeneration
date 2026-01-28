import { useState, useEffect } from 'react';

function Profile() {
  const [profile, setProfile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/auth/profile', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setProfile)
      .catch(console.error);
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    try {
      const res = await fetch('/api/auth/password', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setSuccess('Password changed successfully');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!profile) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  return (
    <div className="detail-container">
      <h1 className="detail-title">Profile</h1>
      <div className="detail-info" style={{ marginBottom: '2rem' }}>
        <div>
          <label>Email</label>
          <p>{profile.email}</p>
        </div>
        <div>
          <label>Member Since</label>
          <p>{new Date(profile.created_at).toLocaleDateString()}</p>
        </div>
      </div>

      <h2 style={{ marginBottom: '1rem' }}>Change Password</h2>
      <div className="detail-info">
        {error && <div className="error-msg">{error}</div>}
        {success && <div className="success-msg">{success}</div>}
        <form onSubmit={handleChangePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <input type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>New Password</label>
            <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Confirm New Password</label>
            <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn-primary">Update Password</button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
