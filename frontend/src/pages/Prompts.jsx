import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Modal from '../components/Modal';

function Prompts() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', prompt_text: '', category: '' });
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/prompts', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setItems)
      .catch(console.error);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/prompts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const item = await res.json();
    setItems([item, ...items]);
    setShowModal(false);
    setForm({ title: '', description: '', prompt_text: '', category: '' });
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Prompts Library</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>New Prompt</button>
      </div>
      <div className="cards-grid">
        {items.map(item => (
          <Card
            key={item.id}
            title={item.title}
            text={item.prompt_text && item.prompt_text.substring(0, 80) + '...'}
            badge={item.category}
            onClick={() => navigate(`/prompts/${item.id}`)}
          />
        ))}
      </div>
      {showModal && (
        <Modal title="New Prompt" onClose={() => setShowModal(false)}>
          <form onSubmit={handleCreate}>
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
              <button type="submit" className="btn-primary">Create</button>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Prompts;
