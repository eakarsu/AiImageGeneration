import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { exportToCSV, exportToPDF } from '../utils/export';

const SORT_OPTIONS = [
  { value: 'created_at:DESC', label: 'Newest First' },
  { value: 'created_at:ASC', label: 'Oldest First' },
  { value: 'style:ASC', label: 'Style A-Z' },
  { value: 'target_quality:ASC', label: 'Quality A-Z' },
];

const EXPORT_COLUMNS = [
  { label: 'Original Prompt', accessor: (r) => r.original_prompt?.substring(0, 80) },
  { label: 'Optimized', accessor: (r) => r.optimized_prompt?.substring(0, 80) },
  { key: 'style', label: 'Style' },
  { key: 'target_quality', label: 'Quality' },
  { label: 'Created', accessor: (r) => new Date(r.created_at).toLocaleDateString() },
];

function PromptOptimizer() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ original_prompt: '', style: '', target_quality: 'high' });
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

    fetch(`/api/prompt-optimizer?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error);
  };

  useEffect(() => { fetchItems(page, search, sortBy); }, [page, sortBy]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => { setPage(1); fetchItems(1, value, sortBy); }, 300);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/prompt-optimizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to optimize prompt'); return; }
      setShowModal(false);
      setLatestResult(data);
      setForm({ original_prompt: '', style: '', target_quality: 'high' });
      fetchItems(1, search, sortBy);
      toast.success('Prompt optimized successfully');
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } catch (err) {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
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
    const res = await fetch('/api/prompt-optimizer/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (res.ok) { const data = await res.json(); toast.success(`Deleted ${data.deleted} item(s)`); }
    setSelectedIds(new Set()); setSelectMode(false);
    fetchItems(page, search, sortBy);
  };

  const aiResponse = latestResult?.ai_response || {};
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
        <h1>Prompt Optimizer</h1>
        <div className="page-header-actions">
          <button className="btn-export" onClick={() => exportToCSV(items, EXPORT_COLUMNS, 'prompt-optimizer.csv')}>CSV</button>
          <button className="btn-export" onClick={() => exportToPDF(items, EXPORT_COLUMNS, 'Prompt Optimizer')}>PDF</button>
          <button className={`btn-select-toggle${selectMode ? ' active' : ''}`} onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>Select</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Optimize New Prompt</button>
        </div>
      </div>
      <p className="feature-description">Enhance your prompts with AI-powered optimization for better image generation results.</p>

      {latestResult && (
        <div className="ai-inline-result" ref={resultRef}>
          <div className="ai-inline-header">
            <h2>AI Optimization Result</h2>
            <button className="btn-close" onClick={() => setLatestResult(null)}>Dismiss</button>
          </div>
          <div className="ai-result-section">
            <h3>Original Prompt</h3>
            <div className="ai-result-box">
              <p>{latestResult.original_prompt}</p>
              <button className="btn-copy" onClick={() => copyToClipboard(latestResult.original_prompt)}>Copy</button>
            </div>
          </div>
          <div className="ai-result-section highlight">
            <h3>Optimized Prompt</h3>
            <div className="ai-result-box optimized">
              <p>{latestResult.optimized_prompt}</p>
              <button className="btn-copy" onClick={() => copyToClipboard(latestResult.optimized_prompt)}>Copy</button>
            </div>
          </div>
          <div className="ai-result-grid">
            <div className="ai-result-card"><h4>Style</h4><p>{latestResult.style || 'General'}</p></div>
            <div className="ai-result-card"><h4>Quality Target</h4><p>{latestResult.target_quality}</p></div>
            <div className="ai-result-card"><h4>Quality Score</h4><p className="score">{aiResponse.qualityScore || 'N/A'}/10</p></div>
          </div>
          {aiResponse.improvements && (
            <div className="ai-result-section"><h3>Improvements Made</h3>
              <ul className="ai-result-list">{(Array.isArray(aiResponse.improvements) ? aiResponse.improvements : []).map((imp, i) => <li key={i}>{safeText(imp)}</li>)}</ul>
            </div>
          )}
          {aiResponse.tips && (
            <div className="ai-result-section"><h3>Tips for Better Results</h3>
              <ul className="ai-result-list tips">{(Array.isArray(aiResponse.tips) ? aiResponse.tips : []).map((tip, i) => <li key={i}>{safeText(tip)}</li>)}</ul>
            </div>
          )}
          {aiResponse.negativePrompt && (
            <div className="ai-result-section"><h3>Suggested Negative Prompt</h3>
              <div className="ai-result-box negative"><p>{aiResponse.negativePrompt}</p><button className="btn-copy" onClick={() => copyToClipboard(aiResponse.negativePrompt)}>Copy</button></div>
            </div>
          )}
        </div>
      )}

      <div className="filter-bar">
        <input type="text" placeholder="Search prompts..." value={search} onChange={e => handleSearchChange(e.target.value)} className="filter-input" />
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
          <div key={item.id} className="list-item" onClick={() => !selectMode && navigate(`/prompt-optimizer/${item.id}`)}>
            {selectMode && <input type="checkbox" className="list-item-checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} onClick={e => e.stopPropagation()} />}
            <div className="list-item-content">
              <h3 className="list-item-title">{item.original_prompt?.substring(0, 60)}...</h3>
              <p className="list-item-subtitle">Style: {item.style || 'General'} | Quality: {item.target_quality}</p>
              <p className="list-item-date">{new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            <span className="list-item-badge">{item.target_quality}</span>
          </div>
        ))}
      </div>
      {items.length === 0 && !latestResult && <p className="empty-state">No optimized prompts yet. Create your first one!</p>}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
          <span className="page-indicator">Page {page} of {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
        </div>
      )}
      {showModal && (
        <Modal title="Optimize Prompt" onClose={() => setShowModal(false)}>
          <div className="sample-data-buttons">
            <span>Load Sample:</span>
            <button type="button" className="btn-sample" onClick={() => setForm({ original_prompt: 'A beautiful sunset over the ocean with dramatic clouds', style: 'Photorealistic', target_quality: 'high' })}>Sunset</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ original_prompt: 'A mystical forest with glowing mushrooms and fairy lights', style: 'Fantasy', target_quality: 'ultra' })}>Fantasy Forest</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ original_prompt: 'A futuristic city skyline at night with neon lights', style: 'Sci-Fi', target_quality: 'high' })}>Sci-Fi City</button>
          </div>
          <form onSubmit={handleCreate}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group"><label>Original Prompt *</label><textarea value={form.original_prompt} onChange={e => setForm({...form, original_prompt: e.target.value})} placeholder="Enter your basic prompt to optimize..." required /></div>
            <div className="form-group"><label>Style (optional)</label>
              <select value={form.style} onChange={e => setForm({...form, style: e.target.value})}>
                <option value="">General</option><option value="Photorealistic">Photorealistic</option><option value="Fantasy">Fantasy</option><option value="Sci-Fi">Sci-Fi</option><option value="Portrait">Portrait</option><option value="Landscape">Landscape</option><option value="Abstract">Abstract</option>
              </select>
            </div>
            <div className="form-group"><label>Target Quality</label>
              <select value={form.target_quality} onChange={e => setForm({...form, target_quality: e.target.value})}>
                <option value="standard">Standard</option><option value="high">High</option><option value="ultra">Ultra</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Optimizing...' : 'Optimize Prompt'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default PromptOptimizer;
