import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { exportToCSV, exportToPDF } from '../utils/export';

const SORT_OPTIONS = [
  { value: 'created_at:DESC', label: 'Newest First' },
  { value: 'created_at:ASC', label: 'Oldest First' },
  { value: 'name:ASC', label: 'Name A-Z' },
  { value: 'name:DESC', label: 'Name Z-A' },
];

const EXPORT_COLUMNS = [
  { key: 'name', label: 'Name' },
  { key: 'description', label: 'Description' },
  { key: 'example_prompt', label: 'Example Prompt' },
  { label: 'Created', accessor: (r) => new Date(r.created_at).toLocaleDateString() },
];

function Styles() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', example_prompt: '' });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at:DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const debounceRef = useRef(null);
  const toast = useToast();

  const fetchItems = (currentPage, currentSearch, currentSort) => {
    const [sort, order] = (currentSort || sortBy).split(':');
    const params = new URLSearchParams({ page: currentPage, limit: 20, sort, order });
    if (currentSearch) params.set('search', currentSearch);

    fetch(`/api/styles?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchItems(page, search, sortBy);
  }, [page, sortBy]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchItems(1, value, sortBy);
    }, 300);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await fetch('/api/styles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    if (res.ok) toast.success('Style created');
    setShowModal(false);
    setForm({ name: '', description: '', example_prompt: '' });
    fetchItems(1, search, sortBy);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(i => i.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await toast.confirm(`Delete ${selectedIds.size} selected style(s)?`);
    if (!confirmed) return;
    const res = await fetch('/api/styles/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Deleted ${data.deleted} style(s)`);
    }
    setSelectedIds(new Set());
    setSelectMode(false);
    fetchItems(page, search, sortBy);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Art Styles</h1>
        <div className="page-header-actions">
          <button className="btn-export" onClick={() => exportToCSV(items, EXPORT_COLUMNS, 'styles.csv')}>CSV</button>
          <button className="btn-export" onClick={() => exportToPDF(items, EXPORT_COLUMNS, 'Art Styles')}>PDF</button>
          <button className={`btn-select-toggle${selectMode ? ' active' : ''}`} onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>Select</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>New Style</button>
        </div>
      </div>
      <div className="filter-bar">
        <input type="text" placeholder="Search styles..." value={search} onChange={e => handleSearchChange(e.target.value)} className="filter-input" />
        <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {selectMode && (
        <div className="bulk-toolbar">
          <button className="btn-secondary" onClick={handleSelectAll}>{selectedIds.size === items.length ? 'Deselect All' : 'Select All'}</button>
          <span>{selectedIds.size} selected</span>
          <button className="btn-danger" onClick={handleBulkDelete} disabled={selectedIds.size === 0}>Delete Selected</button>
          <button className="btn-secondary" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>Cancel</button>
        </div>
      )}

      <div className="cards-grid">
        {items.map(item => (
          <Card
            key={item.id}
            title={item.name}
            text={item.description && item.description.substring(0, 80) + '...'}
            imageUrl={item.preview_url}
            selectable={selectMode}
            selected={selectedIds.has(item.id)}
            onSelect={() => toggleSelect(item.id)}
            onClick={() => !selectMode && navigate(`/styles/${item.id}`)}
          />
        ))}
      </div>
      {items.length === 0 && <p className="empty-state">No styles found.</p>}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
          <span className="page-indicator">Page {page} of {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
        </div>
      )}
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
