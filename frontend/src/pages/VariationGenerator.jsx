import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { exportToCSV, exportToPDF } from '../utils/export';

const SORT_OPTIONS = [
  { value: 'created_at:DESC', label: 'Newest First' },
  { value: 'created_at:ASC', label: 'Oldest First' },
  { value: 'variation_type:ASC', label: 'Type A-Z' },
  { value: 'num_variations:DESC', label: 'Most Variations' },
];

const EXPORT_COLUMNS = [
  { label: 'Original Prompt', accessor: (r) => r.original_prompt?.substring(0, 60) },
  { key: 'num_variations', label: 'Variations' },
  { key: 'variation_type', label: 'Type' },
  { label: 'Created', accessor: (r) => new Date(r.created_at).toLocaleDateString() },
];

function VariationGenerator() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ original_prompt: '', num_variations: 5, variation_type: 'creative' });
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

    fetch(`/api/variation-generator?${params}`, { headers: { Authorization: `Bearer ${token}` } })
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
      const res = await fetch('/api/variation-generator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to generate variations');
        return;
      }
      setShowModal(false);
      setLatestResult(data);
      setForm({ original_prompt: '', num_variations: 5, variation_type: 'creative' });
      fetchItems(1, search, sortBy);
      toast.success('Variations generated successfully');
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
    const res = await fetch('/api/variation-generator/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (res.ok) { const data = await res.json(); toast.success(`Deleted ${data.deleted} item(s)`); }
    setSelectedIds(new Set()); setSelectMode(false);
    fetchItems(page, search, sortBy);
  };

  const aiResponse = latestResult?.ai_response || {};
  const rawVars = aiResponse.variations || latestResult?.variations || [];
  const variations = Array.isArray(rawVars) ? rawVars : [];
  const safeText = (val) => {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'number' || typeof val === 'boolean') return String(val);
    if (typeof val === 'object') return val.title || val.name || val.description || JSON.stringify(val);
    return String(val);
  };
  const variationTypeColors = { creative: '#7c3aed', style: '#ec4899', mood: '#f59e0b', lighting: '#10b981', time: '#3b82f6', perspective: '#8b5cf6' };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Variation Generator</h1>
        <div className="page-header-actions">
          <button className="btn-export" onClick={() => exportToCSV(items, EXPORT_COLUMNS, 'variation-generator.csv')}>CSV</button>
          <button className="btn-export" onClick={() => exportToPDF(items, EXPORT_COLUMNS, 'Variation Generator')}>PDF</button>
          <button className={`btn-select-toggle${selectMode ? ' active' : ''}`} onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>Select</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>Generate Variations</button>
        </div>
      </div>
      <p className="feature-description">Create multiple creative variations of your prompts to explore different artistic directions.</p>

      {latestResult && (
        <div className="ai-inline-result" ref={resultRef}>
          <div className="ai-inline-header">
            <h2>Generated Variations ({latestResult.num_variations})</h2>
            <button className="btn-close" onClick={() => setLatestResult(null)}>Dismiss</button>
          </div>
          <div className="ai-result-section">
            <h3>Original Prompt</h3>
            <div className="ai-result-box"><p>{latestResult.original_prompt}</p></div>
          </div>
          {aiResponse.originalAnalysis && (
            <div className="ai-result-section"><h3>Analysis</h3><div className="ai-result-box">
              {typeof aiResponse.originalAnalysis === 'object'
                ? <ul className="ai-result-list">{Object.entries(aiResponse.originalAnalysis).map(([k, v]) => (
                    <li key={k}><strong>{k}:</strong> {Array.isArray(v) ? v.join(', ') : safeText(v)}</li>
                  ))}</ul>
                : <p>{safeText(aiResponse.originalAnalysis)}</p>
              }
            </div></div>
          )}
          {Array.isArray(variations) && variations.length > 0 && (
            <div className="ai-result-section">
              <h3>Variations</h3>
              {variations.map((v, i) => (
                <div key={i} className="ai-result-box" style={{ marginBottom: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                    <div style={{ flex: 1 }}>
                      <strong>#{i + 1} {typeof v === 'object' ? (v.description || '') : ''}</strong>
                      <p style={{ marginTop: '4px' }}>{typeof v === 'object' ? v.prompt : safeText(v)}</p>
                      {typeof v === 'object' && v.style && <small style={{ color: '#a78bfa' }}>Style: {v.style}</small>}
                      {typeof v === 'object' && v.mood && <small style={{ color: '#94a3b8', marginLeft: '12px' }}>Mood: {v.mood}</small>}
                    </div>
                    <button className="btn-copy" onClick={() => copyToClipboard(typeof v === 'object' ? v.prompt : safeText(v))}>Copy</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="filter-bar">
        <input type="text" placeholder="Search variations..." value={search} onChange={e => handleSearchChange(e.target.value)} className="filter-input" />
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
          <div key={item.id} className="list-item" onClick={() => !selectMode && navigate(`/variation-generator/${item.id}`)}>
            {selectMode && <input type="checkbox" className="list-item-checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} onClick={e => e.stopPropagation()} />}
            <div className="list-item-content">
              <h3 className="list-item-title">{item.original_prompt?.substring(0, 50)}...</h3>
              <p className="list-item-subtitle">{item.num_variations} variations | Type: {item.variation_type}</p>
              <p className="list-item-date">{new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            <span className="list-item-badge" style={{ backgroundColor: variationTypeColors[item.variation_type] || '#7c3aed' }}>{item.num_variations} vars</span>
          </div>
        ))}
      </div>
      {items.length === 0 && !latestResult && <p className="empty-state">No variations yet. Generate your first set of creative variations!</p>}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
          <span className="page-indicator">Page {page} of {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
        </div>
      )}
      {showModal && (
        <Modal title="Generate Variations" onClose={() => setShowModal(false)}>
          <div className="sample-data-buttons">
            <span>Load Sample:</span>
            <button type="button" className="btn-sample" onClick={() => setForm({ original_prompt: 'A majestic dragon flying over a medieval castle at dawn', num_variations: 5, variation_type: 'creative' })}>Dragon</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ original_prompt: 'A cozy coffee shop interior with warm lighting and books', num_variations: 4, variation_type: 'mood' })}>Coffee Shop</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ original_prompt: 'An astronaut exploring an alien planet with strange vegetation', num_variations: 6, variation_type: 'style' })}>Astronaut</button>
          </div>
          <form onSubmit={handleCreate}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label>Original Prompt *</label>
              <textarea value={form.original_prompt} onChange={e => setForm({...form, original_prompt: e.target.value})} placeholder="Enter your base prompt to create variations from..." required />
            </div>
            <div className="form-group">
              <label>Number of Variations</label>
              <select value={form.num_variations} onChange={e => setForm({...form, num_variations: parseInt(e.target.value)})}>
                <option value={3}>3 variations</option>
                <option value={4}>4 variations</option>
                <option value={5}>5 variations</option>
                <option value={6}>6 variations</option>
                <option value={8}>8 variations</option>
              </select>
            </div>
            <div className="form-group">
              <label>Variation Type</label>
              <select value={form.variation_type} onChange={e => setForm({...form, variation_type: e.target.value})}>
                <option value="creative">Creative - Explore different interpretations</option>
                <option value="style">Style - Different artistic styles</option>
                <option value="mood">Mood - Different emotional tones</option>
                <option value="lighting">Lighting - Different lighting conditions</option>
                <option value="time">Time - Different times of day/seasons</option>
                <option value="perspective">Perspective - Different viewpoints</option>
                <option value="color">Color - Different color schemes</option>
                <option value="detail">Detail - Different levels of detail</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Generating...' : 'Generate Variations'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default VariationGenerator;
