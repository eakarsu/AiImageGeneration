import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Modal from '../components/Modal';

function Gallery() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', prompt: '', style: '' });
  const [search, setSearch] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [styles, setStyles] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const debounceRef = useRef(null);

  useEffect(() => {
    fetch('/api/styles', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setStyles)
      .catch(console.error);
  }, []);

  const fetchItems = (currentPage, currentSearch, currentStyle) => {
    const params = new URLSearchParams({ page: currentPage, limit: 12 });
    if (currentSearch) params.set('search', currentSearch);
    if (currentStyle) params.set('style', currentStyle);

    fetch(`/api/gallery?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItems(data.items);
        setTotalPages(data.totalPages);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchItems(page, search, styleFilter);
  }, [page]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchItems(1, value, styleFilter);
    }, 300);
  };

  const handleStyleChange = (value) => {
    setStyleFilter(value);
    setPage(1);
    fetchItems(1, search, value);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    await res.json();
    setShowModal(false);
    setForm({ title: '', description: '', prompt: '', style: '' });
    fetchItems(page, search, styleFilter);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gallery</h1>
        <button className="btn-primary" onClick={() => setShowModal(true)}>New Item</button>
      </div>
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by title, description, or prompt..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="filter-input"
        />
        <select value={styleFilter} onChange={e => handleStyleChange(e.target.value)} className="filter-select">
          <option value="">All Styles</option>
          {styles.map(s => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="cards-grid">
        {items.map(item => (
          <Card
            key={item.id}
            title={item.title}
            text={item.description}
            badge={item.style}
            imageUrl={item.image_url}
            onClick={() => navigate(`/gallery/${item.id}`)}
          />
        ))}
      </div>
      {items.length === 0 && <p className="empty-state">No items found.</p>}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
          <span className="page-indicator">Page {page} of {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
        </div>
      )}
      {showModal && (
        <Modal title="New Gallery Item" onClose={() => setShowModal(false)}>
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
              <label>Prompt</label>
              <input value={form.prompt} onChange={e => setForm({...form, prompt: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Style</label>
              <input value={form.style} onChange={e => setForm({...form, style: e.target.value})} />
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

export default Gallery;
