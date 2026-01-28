import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

function StyleDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', example_prompt: '' });
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch(`/api/styles/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItem(data);
        setForm({ name: data.name || '', description: data.description || '', example_prompt: data.example_prompt || '' });
      })
      .catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this style?')) return;
    await fetch(`/api/styles/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    navigate('/styles');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/styles/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setItem(updated);
    setShowEdit(false);
  };

  if (!item) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  return (
    <div className="detail-container">
      <Link to="/styles" className="detail-back">&larr; Back to Styles</Link>
      {item.preview_url && <img className="detail-image" src={item.preview_url} alt={item.name} />}
      <h1 className="detail-title">{item.name}</h1>
      <div className="detail-actions">
        <button className="btn-primary" onClick={() => setShowEdit(true)}>Edit</button>
        <button className="btn-danger" onClick={handleDelete}>Delete</button>
      </div>
      <div className="detail-info">
        <div>
          <label>Description</label>
          <p>{item.description || 'No description'}</p>
        </div>
        <div>
          <label>Example Prompt</label>
          <p>{item.example_prompt || 'N/A'}</p>
        </div>
        <div>
          <label>Created</label>
          <p>{new Date(item.created_at).toLocaleString()}</p>
        </div>
      </div>

      {showEdit && (
        <Modal title="Edit Style" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label>Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Example Prompt</label>
              <textarea value={form.example_prompt} onChange={e => setForm({...form, example_prompt: e.target.value})} />
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default StyleDetail;
