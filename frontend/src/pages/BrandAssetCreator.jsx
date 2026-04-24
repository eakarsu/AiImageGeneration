import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { exportToCSV, exportToPDF } from '../utils/export';

const SORT_OPTIONS = [
  { value: 'created_at:DESC', label: 'Newest First' },
  { value: 'created_at:ASC', label: 'Oldest First' },
  { value: 'brand_name:ASC', label: 'Brand A-Z' },
  { value: 'asset_type:ASC', label: 'Type A-Z' },
];

const EXPORT_COLUMNS = [
  { key: 'brand_name', label: 'Brand Name' },
  { key: 'asset_type', label: 'Asset Type' },
  { key: 'color_preferences', label: 'Colors' },
  { label: 'Created', accessor: (r) => new Date(r.created_at).toLocaleDateString() },
];

function BrandAssetCreator() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ brand_name: '', brand_values: '', asset_type: 'Logo', color_preferences: '' });
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
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

  const fetchItems = (currentPage, currentSearch, currentType, currentSort) => {
    const [sort, order] = (currentSort || sortBy).split(':');
    const params = new URLSearchParams({ page: currentPage, limit: 12, sort, order });
    if (currentSearch) params.set('search', currentSearch);
    if (currentType) params.set('asset_type', currentType);

    fetch(`/api/brand-asset-creator?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchItems(page, search, typeFilter, sortBy);
  }, [page, sortBy]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchItems(1, value, typeFilter, sortBy);
    }, 300);
  };

  const handleTypeChange = (value) => {
    setTypeFilter(value);
    setPage(1);
    fetchItems(1, search, value, sortBy);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/brand-asset-creator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create brand asset');
        return;
      }
      setShowModal(false);
      setLatestResult(data);
      setForm({ brand_name: '', brand_values: '', asset_type: 'Logo', color_preferences: '' });
      fetchItems(1, search, typeFilter, sortBy);
      toast.success('Brand asset created successfully');
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
    const res = await fetch('/api/brand-asset-creator/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (res.ok) { const data = await res.json(); toast.success(`Deleted ${data.deleted} item(s)`); }
    setSelectedIds(new Set()); setSelectMode(false);
    fetchItems(page, search, typeFilter, sortBy);
  };

  const aiResponse = latestResult?.ai_response || {};
  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };
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

  const assetTypeIcons = { 'Logo': '🎨', 'Icon Set': '🔲', 'Social Media Kit': '📱', 'App Icon': '📲', 'Brand Kit': '📦', 'Packaging': '📦', 'Presentation': '📊', 'Album Art': '🎵' };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Brand Asset Creator</h1>
        <div className="page-header-actions">
          <button className="btn-export" onClick={() => exportToCSV(items, EXPORT_COLUMNS, 'brand-assets.csv')}>CSV</button>
          <button className="btn-export" onClick={() => exportToPDF(items, EXPORT_COLUMNS, 'Brand Asset Creator')}>PDF</button>
          <button className={`btn-select-toggle${selectMode ? ' active' : ''}`} onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>Select</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>New Brand Asset</button>
        </div>
      </div>
      <p className="feature-description">Create professional brand assets with AI-powered design recommendations and generation prompts.</p>

      {latestResult && (
        <div className="ai-inline-result" ref={resultRef}>
          <div className="ai-inline-header">
            <h2>Brand: {latestResult.brand_name} - {latestResult.asset_type}</h2>
            <button className="btn-close" onClick={() => setLatestResult(null)}>Dismiss</button>
          </div>
          {aiResponse.generationPrompt && (
            <div className="ai-result-section highlight">
              <h3>Generation Prompt</h3>
              <div className="ai-result-box optimized">
                <p>{aiResponse.generationPrompt}</p>
                <button className="btn-copy" onClick={() => copyToClipboard(aiResponse.generationPrompt)}>Copy</button>
              </div>
            </div>
          )}
          {aiResponse.designConcept && (
            <div className="ai-result-section"><h3>Design Concept</h3><div className="ai-result-box"><p>{safeText(aiResponse.designConcept)}</p></div></div>
          )}
          {aiResponse.colorScheme && (
            <div className="ai-result-section">
              <h3>Color Scheme</h3>
              <div className="ai-result-box">
                {typeof aiResponse.colorScheme === 'object' ? (
                  <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    {Object.entries(aiResponse.colorScheme).map(([key, val]) => (
                      <span key={key} style={{ padding: '4px 12px', borderRadius: '6px', background: typeof val === 'string' && val.startsWith('#') ? val : '#2a2a3e', color: '#fff', fontSize: '13px' }}>
                        {key}: {typeof val === 'object' ? Object.entries(val).map(([k,v]) => `${k}: ${v}`).join(', ') : String(val)}
                      </span>
                    ))}
                  </div>
                ) : <p>{safeText(aiResponse.colorScheme)}</p>}
              </div>
            </div>
          )}
          {aiResponse.typography && (
            <div className="ai-result-section">
              <h3>Typography</h3>
              <div className="ai-result-box">
                {typeof aiResponse.typography === 'object' ? (
                  <ul className="ai-result-list">{Object.entries(aiResponse.typography).map(([k, v]) => <li key={k}><strong>{k}:</strong> {safeText(v)}</li>)}</ul>
                ) : <p>{safeText(aiResponse.typography)}</p>}
              </div>
            </div>
          )}
          {aiResponse.styleGuide && (
            <div className="ai-result-section"><h3>Style Guide</h3><div className="ai-result-box">
              {typeof aiResponse.styleGuide === 'object'
                ? <ul className="ai-result-list">{Object.entries(aiResponse.styleGuide).map(([k, v]) => <li key={k}><strong>{k}:</strong> {safeText(v)}</li>)}</ul>
                : <p>{safeText(aiResponse.styleGuide)}</p>}
            </div></div>
          )}
          {aiResponse.variations && (
            <div className="ai-result-section"><h3>Suggested Variations</h3><ul className="ai-result-list tips">{safeArray(aiResponse.variations).map((v, i) => <li key={i}>{safeText(v)}</li>)}</ul></div>
          )}
          {aiResponse.usageGuidelines && (
            <div className="ai-result-section"><h3>Usage Guidelines</h3><ul className="ai-result-list">{safeArray(aiResponse.usageGuidelines).map((u, i) => <li key={i}>{safeText(u)}</li>)}</ul></div>
          )}
        </div>
      )}

      <div className="filter-bar">
        <input type="text" placeholder="Search brands..." value={search} onChange={e => handleSearchChange(e.target.value)} className="filter-input" />
        <select value={typeFilter} onChange={e => handleTypeChange(e.target.value)} className="filter-select">
          <option value="">All Types</option>
          <option value="Logo">Logo</option>
          <option value="Icon Set">Icon Set</option>
          <option value="Social Media Kit">Social Media Kit</option>
          <option value="App Icon">App Icon</option>
          <option value="Brand Kit">Brand Kit</option>
          <option value="Packaging">Packaging</option>
        </select>
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
          <div key={item.id} className="list-item brand-item" onClick={() => !selectMode && navigate(`/brand-asset-creator/${item.id}`)}>
            {selectMode && <input type="checkbox" className="list-item-checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} onClick={e => e.stopPropagation()} />}
            <div className="list-item-icon">{assetTypeIcons[item.asset_type] || '🎨'}</div>
            <div className="list-item-content">
              <h3 className="list-item-title">{item.brand_name}</h3>
              <p className="list-item-subtitle">{item.asset_type} | {item.color_preferences}</p>
              <p className="list-item-date">{new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            <span className="list-item-badge brand">{item.asset_type}</span>
          </div>
        ))}
      </div>
      {items.length === 0 && !latestResult && <p className="empty-state">No brand assets yet. Create your first professional brand design!</p>}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
          <span className="page-indicator">Page {page} of {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
        </div>
      )}
      {showModal && (
        <Modal title="Create Brand Asset" onClose={() => setShowModal(false)}>
          <div className="sample-data-buttons">
            <span>Load Sample:</span>
            <button type="button" className="btn-sample" onClick={() => setForm({ brand_name: 'TechNova', brand_values: 'Innovation, cutting-edge technology, reliability, modern', asset_type: 'Logo', color_preferences: 'Blue, silver, white' })}>Tech Brand</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ brand_name: 'Green Earth Organics', brand_values: 'Sustainability, natural, healthy, eco-friendly', asset_type: 'Brand Kit', color_preferences: 'Forest green, earth brown, cream' })}>Organic Brand</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ brand_name: 'Luxe Studio', brand_values: 'Luxury, elegance, exclusivity, premium quality', asset_type: 'Social Media Kit', color_preferences: 'Gold, black, ivory' })}>Luxury Brand</button>
          </div>
          <form onSubmit={handleCreate}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label>Brand Name *</label>
              <input value={form.brand_name} onChange={e => setForm({...form, brand_name: e.target.value})} placeholder="Enter your brand name..." required />
            </div>
            <div className="form-group">
              <label>Brand Values</label>
              <textarea value={form.brand_values} onChange={e => setForm({...form, brand_values: e.target.value})} placeholder="e.g., Innovation, sustainability, trustworthy, modern..." />
            </div>
            <div className="form-group">
              <label>Asset Type *</label>
              <select value={form.asset_type} onChange={e => setForm({...form, asset_type: e.target.value})} required>
                <option value="Logo">Logo</option>
                <option value="Icon Set">Icon Set</option>
                <option value="Social Media Kit">Social Media Kit</option>
                <option value="App Icon">App Icon</option>
                <option value="Brand Kit">Full Brand Kit</option>
                <option value="Packaging">Packaging Design</option>
                <option value="Presentation">Presentation Template</option>
                <option value="Album Art">Album Art</option>
              </select>
            </div>
            <div className="form-group">
              <label>Color Preferences</label>
              <input value={form.color_preferences} onChange={e => setForm({...form, color_preferences: e.target.value})} placeholder="e.g., Blue, silver, white or #3B82F6, #E5E7EB..." />
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating Asset...' : 'Create Brand Asset'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default BrandAssetCreator;
