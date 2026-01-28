import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';

function GalleryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', prompt: '', style: '' });
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch(`/api/gallery/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItem(data);
        setForm({ title: data.title || '', description: data.description || '', prompt: data.prompt || '', style: data.style || '' });
      })
      .catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this gallery item?')) return;
    await fetch(`/api/gallery/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    navigate('/gallery');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/gallery/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setItem(updated);
    setShowEdit(false);
  };

  const handleDownload = async () => {
    const res = await fetch(item.image_url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${item.title || 'image'}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!item) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  return (
    <div className="detail-container">
      <Link to="/gallery" className="detail-back">&larr; Back to Gallery</Link>
      {item.image_url && <img className="detail-image" src={item.image_url} alt={item.title} />}
      <h1 className="detail-title">{item.title}</h1>
      <div className="detail-actions">
        <button className="btn-primary" onClick={() => setShowEdit(true)}>Edit</button>
        {item.image_url && <button className="btn-secondary" onClick={handleDownload}>Download</button>}
        <button className="btn-danger" onClick={handleDelete}>Delete</button>
      </div>
      <div className="detail-info">
        <div>
          <label>Description</label>
          <p>{item.description || 'No description'}</p>
        </div>
        <div>
          <label>Prompt</label>
          <p>{item.prompt || 'N/A'}</p>
        </div>
        <div>
          <label>Style</label>
          <p>{item.style || 'N/A'}</p>
        </div>
        <div>
          <label>Created</label>
          <p>{new Date(item.created_at).toLocaleString()}</p>
        </div>
      </div>

      {showEdit && (
        <Modal title="Edit Gallery Item" onClose={() => setShowEdit(false)}>
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
              <label>Prompt</label>
              <input value={form.prompt} onChange={e => setForm({...form, prompt: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Style</label>
              <input value={form.style} onChange={e => setForm({...form, style: e.target.value})} />
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

export default GalleryDetail;
