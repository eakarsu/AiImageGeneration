import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

function PromptDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', prompt_text: '', category: '' });
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch(`/api/prompts/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItem(data);
        setForm({ title: data.title || '', description: data.description || '', prompt_text: data.prompt_text || '', category: data.category || '' });
      })
      .catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this prompt?')) return;
    await fetch(`/api/prompts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    navigate('/prompts');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/prompts/${id}`, {
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
      <Link to="/prompts" className="detail-back">&larr; Back to Prompts</Link>
      <h1 className="detail-title">{item.title}</h1>
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
          <label>Prompt Text</label>
          <p>{item.prompt_text}</p>
        </div>
        <div>
          <label>Category</label>
          <p>{item.category || 'Uncategorized'}</p>
        </div>
        <div>
          <label>Created</label>
          <p>{new Date(item.created_at).toLocaleString()}</p>
        </div>
      </div>

      {showEdit && (
        <Modal title="Edit Prompt" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label>Title</label>
              <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Description</label>
              <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Prompt Text</label>
              <textarea value={form.prompt_text} onChange={e => setForm({...form, prompt_text: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Category</label>
              <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
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

export default PromptDetail;
