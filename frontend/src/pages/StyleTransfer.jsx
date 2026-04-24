import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { exportToCSV, exportToPDF } from '../utils/export';

const SORT_OPTIONS = [
  { value: 'created_at:DESC', label: 'Newest First' },
  { value: 'created_at:ASC', label: 'Oldest First' },
  { value: 'source_style:ASC', label: 'Source Style A-Z' },
  { value: 'target_style:ASC', label: 'Target Style A-Z' },
];

const EXPORT_COLUMNS = [
  { key: 'source_style', label: 'Source Style' },
  { key: 'target_style', label: 'Target Style' },
  { label: 'Content', accessor: (r) => r.content_description?.substring(0, 60) },
  { label: 'Created', accessor: (r) => new Date(r.created_at).toLocaleDateString() },
];

function StyleTransfer() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ source_style: '', target_style: '', content_description: '' });
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('created_at:DESC');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [latestResult, setLatestResult] = useState(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const debounceRef = useRef(null);
  const resultRef = useRef(null);
  const toast = useToast();

  const fetchItems = (currentPage, currentSearch, currentSort) => {
    const [sort, order] = (currentSort || sortBy).split(':');
    const params = new URLSearchParams({ page: currentPage, limit: 12, sort, order });
    if (currentSearch) params.set('search', currentSearch);

    fetch(`/api/style-transfer?${params}`, { headers: { Authorization: `Bearer ${token}` } })
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
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/style-transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to analyze transfer');
        return;
      }
      setShowModal(false);
      setLatestResult(data);
      setForm({ source_style: '', target_style: '', content_description: '' });
      fetchItems(1, search, sortBy);
      toast.success('Style transfer analyzed successfully');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const next = new Set(prev); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const handleSelectAll = () => {
    if (selectedIds.size === items.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(items.map(i => i.id)));
  };
  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await toast.confirm(`Delete ${selectedIds.size} selected item(s)?`);
    if (!confirmed) return;
    const res = await fetch('/api/style-transfer/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (res.ok) { const data = await res.json(); toast.success(`Deleted ${data.deleted} item(s)`); }
    setSelectedIds(new Set()); setSelectMode(false);
    fetchItems(page, search, sortBy);
  };

  const aiResponse = latestResult?.ai_response || {};
  const safeArray = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'object' && val !== null) return Object.entries(val).map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`);
    return val ? [String(val)] : [];
  };
  const safeText = (val) => {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') return val.title || val.name || val.description || JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Style Transfer</h1>
        <div className="page-header-actions">
          <button className="btn-export" onClick={() => exportToCSV(items, EXPORT_COLUMNS, 'style-transfer.csv')}>CSV</button>
          <button className="btn-export" onClick={() => exportToPDF(items, EXPORT_COLUMNS, 'Style Transfer')}>PDF</button>
          <button className={`btn-select-toggle${selectMode ? ' active' : ''}`} onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>Select</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>New Transfer</button>
        </div>
      </div>
      <p className="feature-description">Transform your images from one artistic style to another with AI-powered analysis and recommendations.</p>

      {latestResult && (
        <div className="ai-inline-result" ref={resultRef}>
          <div className="ai-inline-header">
            <h2>{latestResult.source_style} → {latestResult.target_style}</h2>
            <button className="btn-close" onClick={() => setLatestResult(null)}>Dismiss</button>
          </div>
          {aiResponse.analysisPrompt && (
            <div className="ai-result-section highlight"><h3>Transfer Prompt</h3><div className="ai-result-box optimized"><p>{aiResponse.analysisPrompt}</p></div></div>
          )}
          {aiResponse.styleElements && (
            <div className="ai-result-section"><h3>Style Elements</h3><ul className="ai-result-list">{safeArray(aiResponse.styleElements).map((e, i) => <li key={i}>{safeText(e)}</li>)}</ul></div>
          )}
          {aiResponse.colorPalette && (
            <div className="ai-result-section"><h3>Color Palette</h3><ul className="ai-result-list tips">{safeArray(aiResponse.colorPalette).map((c, i) => <li key={i}>{safeText(c)}</li>)}</ul></div>
          )}
          {aiResponse.compositionTips && (
            <div className="ai-result-section"><h3>Composition Tips</h3><ul className="ai-result-list">{safeArray(aiResponse.compositionTips).map((t, i) => <li key={i}>{safeText(t)}</li>)}</ul></div>
          )}
          {aiResponse.expectedResult && (
            <div className="ai-result-section"><h3>Expected Result</h3><div className="ai-result-box"><p>{safeText(aiResponse.expectedResult)}</p></div></div>
          )}
          {aiResponse.warnings && (
            <div className="ai-result-section"><h3>Warnings</h3><ul className="ai-result-list">{safeArray(aiResponse.warnings).map((w, i) => <li key={i}>{safeText(w)}</li>)}</ul></div>
          )}
        </div>
      )}

      <div className="filter-bar">
        <input type="text" placeholder="Search style transfers..." value={search} onChange={e => handleSearchChange(e.target.value)} className="filter-input" />
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

      <div className="list-container">
        {items.map(item => (
          <div key={item.id} className="list-item style-transfer-item" onClick={() => !selectMode && navigate(`/style-transfer/${item.id}`)}>
            {selectMode && <input type="checkbox" className="list-item-checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} onClick={e => e.stopPropagation()} />}
            <div className="list-item-content">
              <h3 className="list-item-title">{item.content_description?.substring(0, 50)}...</h3>
              <p className="list-item-subtitle">
                <span className="style-from">{item.source_style}</span>
                <span className="style-arrow"> → </span>
                <span className="style-to">{item.target_style}</span>
              </p>
              <p className="list-item-date">{new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            <span className="list-item-badge transfer">{item.target_style}</span>
          </div>
        ))}
      </div>
      {items.length === 0 && !latestResult && <p className="empty-state">No style transfers yet. Create your first transformation!</p>}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
          <span className="page-indicator">Page {page} of {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
        </div>
      )}
      {showModal && (
        <Modal title="New Style Transfer" onClose={() => setShowModal(false)}>
          <div className="sample-data-buttons">
            <span>Load Sample:</span>
            <button type="button" className="btn-sample" onClick={() => setForm({ source_style: 'Photograph', target_style: 'Van Gogh Starry Night', content_description: 'A peaceful countryside with rolling hills and a small village' })}>Van Gogh</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ source_style: 'Digital Art', target_style: 'Anime', content_description: 'A warrior standing on a cliff overlooking a vast ocean' })}>Anime</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ source_style: 'Realistic', target_style: 'Cyberpunk', content_description: 'A busy city street with tall buildings and crowds of people' })}>Cyberpunk</button>
          </div>
          <form onSubmit={handleCreate}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label>Source Style *</label>
              <select value={form.source_style} onChange={e => setForm({...form, source_style: e.target.value})} required>
                <option value="">Select source style...</option>
                <option value="Photograph">Photograph</option>
                <option value="Digital Art">Digital Art</option>
                <option value="Sketch">Sketch</option>
                <option value="Oil Painting">Oil Painting</option>
                <option value="Realistic">Realistic</option>
              </select>
            </div>
            <div className="form-group">
              <label>Target Style *</label>
              <select value={form.target_style} onChange={e => setForm({...form, target_style: e.target.value})} required>
                <option value="">Select target style...</option>
                <option value="Van Gogh Starry Night">Van Gogh Starry Night</option>
                <option value="Impressionist">Impressionist</option>
                <option value="Anime">Anime</option>
                <option value="Watercolor">Watercolor</option>
                <option value="Pop Art">Pop Art</option>
                <option value="Cyberpunk">Cyberpunk</option>
                <option value="Art Nouveau">Art Nouveau</option>
                <option value="Ukiyo-e">Ukiyo-e</option>
                <option value="Pixel Art">Pixel Art</option>
                <option value="Studio Ghibli">Studio Ghibli</option>
              </select>
            </div>
            <div className="form-group">
              <label>Content Description *</label>
              <textarea value={form.content_description} onChange={e => setForm({...form, content_description: e.target.value})} placeholder="Describe the content/subject of your image..." required />
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Analyzing...' : 'Analyze Transfer'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default StyleTransfer;
