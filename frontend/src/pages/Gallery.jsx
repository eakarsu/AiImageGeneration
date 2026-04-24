import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { exportToCSV, exportToPDF } from '../utils/export';

const SORT_OPTIONS = [
  { value: 'created_at:DESC', label: 'Newest First' },
  { value: 'created_at:ASC', label: 'Oldest First' },
  { value: 'title:ASC', label: 'Title A-Z' },
  { value: 'title:DESC', label: 'Title Z-A' },
];

const EXPORT_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'prompt', label: 'Prompt' },
  { key: 'style', label: 'Style' },
  { label: 'Created', accessor: (r) => new Date(r.created_at).toLocaleDateString() },
];

function Gallery() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', prompt: '', style: '' });
  const [search, setSearch] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [sortBy, setSortBy] = useState('created_at:DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [styles, setStyles] = useState([]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const debounceRef = useRef(null);
  const toast = useToast();

  useEffect(() => {
    fetch('/api/styles', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setStyles(data.items || data))
      .catch(console.error);
  }, []);

  const fetchItems = (currentPage, currentSearch, currentStyle, currentSort) => {
    const [sort, order] = (currentSort || sortBy).split(':');
    const params = new URLSearchParams({ page: currentPage, limit: 12, sort, order });
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
    fetchItems(page, search, styleFilter, sortBy);
  }, [page, sortBy]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchItems(1, value, styleFilter, sortBy);
    }, 300);
  };

  const handleStyleChange = (value) => {
    setStyleFilter(value);
    setPage(1);
    fetchItems(1, search, value, sortBy);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/gallery', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      toast.success('Gallery item created');
    }
    setShowModal(false);
    setForm({ title: '', description: '', prompt: '', style: '' });
    fetchItems(page, search, styleFilter, sortBy);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await toast.confirm(`Delete ${selectedIds.size} selected item(s)?`);
    if (!confirmed) return;
    const res = await fetch('/api/gallery/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} item(s)`);
    }
    setSelectedIds(new Set());
    setSelectMode(false);
    fetchItems(page, search, styleFilter, sortBy);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Gallery</h1>
        <div className="page-header-actions">
          <button className="btn-export" onClick={() => exportToCSV(items, EXPORT_COLUMNS, 'gallery.csv')}>CSV</button>
          <button className="btn-export" onClick={() => exportToPDF(items, EXPORT_COLUMNS, 'Gallery')}>PDF</button>
          <button className={`btn-select-toggle${selectMode ? ' active' : ''}`} onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>Select</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>New Item</button>
        </div>
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
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {selectMode && (
        <div className="bulk-toolbar">
          <button className="btn-secondary" onClick={handleSelectAll}>
            {selectedIds.size === items.length ? 'Deselect All' : 'Select All'}
          </button>
          <span>{selectedIds.size} selected</span>
          <button className="btn-danger" onClick={handleBulkDelete} disabled={selectedIds.size === 0}>Delete Selected</button>
          <button className="btn-secondary" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>Cancel</button>
        </div>
      )}

      <div className="cards-grid">
        {items.map(item => (
          <Card
            key={item.id}
            title={item.title}
            text={item.description}
            badge={item.style}
            imageUrl={item.image_url}
            selectable={selectMode}
            selected={selectedIds.has(item.id)}
            onSelect={() => toggleSelect(item.id)}
            onClick={() => !selectMode && navigate(`/gallery/${item.id}`)}
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
