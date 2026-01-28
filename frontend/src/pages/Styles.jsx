import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Modal from '../components/Modal';

function Styles() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', example_prompt: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/styles', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setItems)
      .catch(console.error);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/styles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const item = await res.json();
    setItems([item, ...items]);
    setShowModal(false);
    setForm({ name: '', description: '', example_prompt: '' });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Art Styles</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>New Style</button>
      </div>
      <div className="cards-grid">
        {items.map(item => (
          <Card
            key={item.id}
            title={item.name}
            text={item.description && item.description.substring(0, 80) + '...'}
            imageUrl={item.preview_url}
            onClick={() => navigate(`/styles/${item.id}`)}
          />
        ))}
      </div>
      {showModal && (
        <Modal title="New Style" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
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
              <button type="submit" className="btn-primary">Create</button>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Styles;
