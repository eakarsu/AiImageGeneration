import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { exportToCSV, exportToPDF } from '../utils/export';

const SORT_OPTIONS = [
  { value: 'created_at:DESC', label: 'Newest First' },
  { value: 'created_at:ASC', label: 'Oldest First' },
  { value: 'use_case:ASC', label: 'Use Case A-Z' },
  { value: 'target_resolution:ASC', label: 'Resolution A-Z' },
];

const EXPORT_COLUMNS = [
  { label: 'Description', accessor: (r) => r.image_description?.substring(0, 60) },
  { key: 'current_resolution', label: 'Current' },
  { key: 'target_resolution', label: 'Target' },
  { key: 'use_case', label: 'Use Case' },
  { label: 'Created', accessor: (r) => new Date(r.created_at).toLocaleDateString() },
];

function Upscaler() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ image_description: '', current_resolution: '512x512', target_resolution: '2048x2048', use_case: 'print' });
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

    fetch(`/api/upscaler?${params}`, { headers: { Authorization: `Bearer ${token}` } })
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
      const res = await fetch('/api/upscaler', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to get recommendations');
        return;
      }
      setShowModal(false);
      setLatestResult(data);
      setForm({ image_description: '', current_resolution: '512x512', target_resolution: '2048x2048', use_case: 'print' });
      fetchItems(1, search, sortBy);
      toast.success('Upscale recommendations generated');
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
    const res = await fetch('/api/upscaler/bulk', {
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
        <h1>AI Upscaler</h1>
        <div className="page-header-actions">
          <button className="btn-export" onClick={() => exportToCSV(items, EXPORT_COLUMNS, 'upscaler.csv')}>CSV</button>
          <button className="btn-export" onClick={() => exportToPDF(items, EXPORT_COLUMNS, 'AI Upscaler')}>PDF</button>
          <button className={`btn-select-toggle${selectMode ? ' active' : ''}`} onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>Select</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>New Upscale</button>
        </div>
      </div>
      <p className="feature-description">Get AI-powered recommendations for upscaling your images to higher resolutions with optimal quality.</p>

      {latestResult && (
        <div className="ai-inline-result" ref={resultRef}>
          <div className="ai-inline-header">
            <h2>Upscale: {latestResult.current_resolution} → {latestResult.target_resolution}</h2>
            <button className="btn-close" onClick={() => setLatestResult(null)}>Dismiss</button>
          </div>
          <div className="ai-result-grid">
            <div className="ai-result-card"><h4>Current</h4><p>{latestResult.current_resolution}</p></div>
            <div className="ai-result-card"><h4>Target</h4><p>{latestResult.target_resolution}</p></div>
            <div className="ai-result-card"><h4>Use Case</h4><p>{latestResult.use_case}</p></div>
          </div>
          {aiResponse.enhancementPrompt && (
            <div className="ai-result-section highlight"><h3>Enhancement Prompt</h3><div className="ai-result-box optimized"><p>{aiResponse.enhancementPrompt}</p></div></div>
          )}
          {aiResponse.recommendations && (
            <div className="ai-result-section"><h3>Recommendations</h3><ul className="ai-result-list">{safeArray(aiResponse.recommendations).map((r, i) => <li key={i}>{safeText(r)}</li>)}</ul></div>
          )}
          {aiResponse.expectedImprovements && (
            <div className="ai-result-section"><h3>Expected Improvements</h3><ul className="ai-result-list tips">{safeArray(aiResponse.expectedImprovements).map((e, i) => <li key={i}>{safeText(e)}</li>)}</ul></div>
          )}
          {aiResponse.processingTips && (
            <div className="ai-result-section"><h3>Processing Tips</h3><ul className="ai-result-list">{safeArray(aiResponse.processingTips).map((t, i) => <li key={i}>{safeText(t)}</li>)}</ul></div>
          )}
          {aiResponse.postProcessing && (
            <div className="ai-result-section"><h3>Post-Processing</h3><ul className="ai-result-list">{safeArray(aiResponse.postProcessing).map((p, i) => <li key={i}>{safeText(p)}</li>)}</ul></div>
          )}
        </div>
      )}

      <div className="filter-bar">
        <input type="text" placeholder="Search upscale requests..." value={search} onChange={e => handleSearchChange(e.target.value)} className="filter-input" />
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
          <div key={item.id} className="list-item" onClick={() => !selectMode && navigate(`/upscaler/${item.id}`)}>
            {selectMode && <input type="checkbox" className="list-item-checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} onClick={e => e.stopPropagation()} />}
            <div className="list-item-content">
              <h3 className="list-item-title">{item.image_description?.substring(0, 50)}...</h3>
              <p className="list-item-subtitle">{item.current_resolution} → {item.target_resolution}</p>
              <p className="list-item-date">Use case: {item.use_case} | {new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            <span className="list-item-badge upscale">{item.target_resolution}</span>
          </div>
        ))}
      </div>
      {items.length === 0 && !latestResult && <p className="empty-state">No upscale requests yet. Get AI recommendations for your first image!</p>}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
          <span className="page-indicator">Page {page} of {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
        </div>
      )}
      {showModal && (
        <Modal title="New Upscale Request" onClose={() => setShowModal(false)}>
          <div className="sample-data-buttons">
            <span>Load Sample:</span>
            <button type="button" className="btn-sample" onClick={() => setForm({ image_description: 'High-detail portrait photograph with bokeh background', current_resolution: '512x512', target_resolution: '4096x4096', use_case: 'print' })}>Portrait</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ image_description: 'Landscape digital painting of mountain scenery', current_resolution: '1024x1024', target_resolution: '4096x3072', use_case: 'large_format' })}>Landscape</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ image_description: 'Vintage family photo from the 1960s with slight damage', current_resolution: '256x256', target_resolution: '2048x2048', use_case: 'restoration' })}>Restoration</button>
          </div>
          <form onSubmit={handleCreate}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label>Image Description *</label>
              <textarea value={form.image_description} onChange={e => setForm({...form, image_description: e.target.value})} placeholder="Describe your image (e.g., portrait photograph, landscape digital art)..." required />
            </div>
            <div className="form-group">
              <label>Current Resolution</label>
              <select value={form.current_resolution} onChange={e => setForm({...form, current_resolution: e.target.value})}>
                <option value="256x256">256x256</option>
                <option value="512x512">512x512</option>
                <option value="768x768">768x768</option>
                <option value="1024x1024">1024x1024</option>
                <option value="1024x768">1024x768</option>
                <option value="1920x1080">1920x1080</option>
              </select>
            </div>
            <div className="form-group">
              <label>Target Resolution</label>
              <select value={form.target_resolution} onChange={e => setForm({...form, target_resolution: e.target.value})}>
                <option value="1024x1024">1024x1024</option>
                <option value="2048x2048">2048x2048</option>
                <option value="3072x3072">3072x3072</option>
                <option value="4096x4096">4096x4096</option>
                <option value="4096x3072">4096x3072 (4K)</option>
                <option value="5120x2880">5120x2880 (5K)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Use Case</label>
              <select value={form.use_case} onChange={e => setForm({...form, use_case: e.target.value})}>
                <option value="print">Print</option>
                <option value="web">Web/Digital</option>
                <option value="large_format">Large Format Print</option>
                <option value="poster">Poster</option>
                <option value="billboard">Billboard</option>
                <option value="restoration">Photo Restoration</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Getting Recommendations...' : 'Get Recommendations'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default Upscaler;
