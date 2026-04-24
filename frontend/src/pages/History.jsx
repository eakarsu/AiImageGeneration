import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import { useToast } from '../components/ToastContext';
import { exportToCSV, exportToPDF } from '../utils/export';

const featureLabels = {
  'prompt-optimizer': 'Prompt Optimizer',
  'art-instructor': 'Art Instructor',
  'style-transfer': 'Style Transfer',
  'upscaler': 'AI Upscaler',
  'variation-generator': 'Variation Generator',
  'brand-asset-creator': 'Brand Asset Creator',
};

const featureColors = {
  'prompt-optimizer': '#7c3aed',
  'art-instructor': '#10b981',
  'style-transfer': '#8b5cf6',
  'upscaler': '#3b82f6',
  'variation-generator': '#f59e0b',
  'brand-asset-creator': '#ec4899',
};

const GEN_SORT_OPTIONS = [
  { value: 'created_at:DESC', label: 'Newest First' },
  { value: 'created_at:ASC', label: 'Oldest First' },
  { value: 'prompt:ASC', label: 'Prompt A-Z' },
  { value: 'style:ASC', label: 'Style A-Z' },
];

const AI_SORT_OPTIONS = [
  { value: 'created_at:DESC', label: 'Newest First' },
  { value: 'created_at:ASC', label: 'Oldest First' },
  { value: 'title:ASC', label: 'Title A-Z' },
  { value: 'feature:ASC', label: 'Feature A-Z' },
];

const GEN_EXPORT_COLUMNS = [
  { key: 'prompt', label: 'Prompt' },
  { key: 'style', label: 'Style' },
  { key: 'status', label: 'Status' },
  { label: 'Created', accessor: (r) => new Date(r.created_at).toLocaleDateString() },
];

const AI_EXPORT_COLUMNS = [
  { key: 'title', label: 'Title' },
  { key: 'feature', label: 'Feature' },
  { label: 'Created', accessor: (r) => new Date(r.created_at).toLocaleDateString() },
];

function History() {
  const [tab, setTab] = useState('generations');
  const [items, setItems] = useState([]);
  const [aiItems, setAiItems] = useState([]);
  const [search, setSearch] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [featureFilter, setFeatureFilter] = useState('');
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

  const fetchGenerations = (currentPage, currentSearch, currentStyle, currentSort) => {
    const [sort, order] = (currentSort || sortBy).split(':');
    const params = new URLSearchParams({ page: currentPage, limit: 12, sort, order });
    if (currentSearch) params.set('search', currentSearch);
    if (currentStyle) params.set('style', currentStyle);

    fetch(`/api/history?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error);
  };

  const fetchAiHistory = (currentPage, currentSearch, currentFeature, currentSort) => {
    const [sort, order] = (currentSort || sortBy).split(':');
    const params = new URLSearchParams({ page: currentPage, limit: 20, sort, order });
    if (currentSearch) params.set('search', currentSearch);
    if (currentFeature) params.set('feature', currentFeature);

    fetch(`/api/ai-history?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setAiItems(data.items || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error);
  };

  useEffect(() => {
    setPage(1);
    setSearch('');
    setStyleFilter('');
    setFeatureFilter('');
    setSortBy('created_at:DESC');
    setSelectMode(false);
    setSelectedIds(new Set());
    if (tab === 'generations') {
      fetchGenerations(1, '', '', 'created_at:DESC');
    } else {
      fetchAiHistory(1, '', '', 'created_at:DESC');
    }
  }, [tab]);

  useEffect(() => {
    if (tab === 'generations') {
      fetchGenerations(page, search, styleFilter, sortBy);
    } else {
      fetchAiHistory(page, search, featureFilter, sortBy);
    }
  }, [page, sortBy]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      if (tab === 'generations') {
        fetchGenerations(1, value, styleFilter, sortBy);
      } else {
        fetchAiHistory(1, value, featureFilter, sortBy);
      }
    }, 300);
  };

  const handleStyleChange = (value) => {
    setStyleFilter(value);
    setPage(1);
    fetchGenerations(1, search, value, sortBy);
  };

  const handleFeatureChange = (value) => {
    setFeatureFilter(value);
    setPage(1);
    fetchAiHistory(1, search, value, sortBy);
  };

  const handleDeleteAiHistory = async (id, e) => {
    e.stopPropagation();
    const confirmed = await toast.confirm('Delete this history entry?');
    if (!confirmed) return;
    await fetch(`/api/ai-history/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('Entry deleted');
    fetchAiHistory(page, search, featureFilter, sortBy);
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const currentItems = tab === 'generations' ? items : aiItems;
  const handleSelectAll = () => {
    if (selectedIds.size === currentItems.length) setSelectedIds(new Set());
    else setSelectedIds(new Set(currentItems.map(i => i.id)));
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    const confirmed = await toast.confirm(`Delete ${selectedIds.size} selected item(s)?`);
    if (!confirmed) return;
    const endpoint = tab === 'generations' ? '/api/history/bulk' : '/api/ai-history/bulk';
    const res = await fetch(endpoint, {
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
    if (tab === 'generations') fetchGenerations(page, search, styleFilter, sortBy);
    else fetchAiHistory(page, search, featureFilter, sortBy);
  };

  const exportColumns = tab === 'generations' ? GEN_EXPORT_COLUMNS : AI_EXPORT_COLUMNS;
  const exportData = tab === 'generations' ? items : aiItems;

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>History</h1>
        <div className="page-header-actions">
          <button className="btn-export" onClick={() => exportToCSV(exportData, exportColumns, 'history.csv')}>CSV</button>
          <button className="btn-export" onClick={() => exportToPDF(exportData, exportColumns, 'History')}>PDF</button>
          <button className={`btn-select-toggle${selectMode ? ' active' : ''}`} onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>Select</button>
        </div>
      </div>

      <div className="history-tabs">
        <button className={`history-tab ${tab === 'generations' ? 'history-tab--active' : ''}`} onClick={() => setTab('generations')}>
          Image Generations
        </button>
        <button className={`history-tab ${tab === 'ai' ? 'history-tab--active' : ''}`} onClick={() => setTab('ai')}>
          AI Activity
        </button>
      </div>

      {selectMode && (
        <div className="bulk-toolbar">
          <button className="btn-secondary" onClick={handleSelectAll}>{selectedIds.size === currentItems.length ? 'Deselect All' : 'Select All'}</button>
          <span>{selectedIds.size} selected</span>
          <button className="btn-danger" onClick={handleBulkDelete} disabled={selectedIds.size === 0}>Delete Selected</button>
          <button className="btn-secondary" onClick={() => { setSelectMode(false); setSelectedIds(new Set()); }}>Cancel</button>
        </div>
      )}

      {tab === 'generations' && (
        <>
          <div className="filter-bar">
            <input type="text" placeholder="Search by prompt..." value={search} onChange={e => handleSearchChange(e.target.value)} className="filter-input" />
            <select value={styleFilter} onChange={e => handleStyleChange(e.target.value)} className="filter-select">
              <option value="">All Styles</option>
              {styles.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
              {GEN_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="cards-grid">
            {items.map(item => (
              <Card
                key={item.id}
                title={item.prompt && item.prompt.substring(0, 40) + '...'}
                text={`Style: ${item.style || 'N/A'}`}
                badge={item.status}
                imageUrl={item.image_url}
                selectable={selectMode}
                selected={selectedIds.has(item.id)}
                onSelect={() => toggleSelect(item.id)}
                onClick={() => !selectMode && navigate(`/history/${item.id}`)}
              />
            ))}
          </div>
          {items.length === 0 && <p className="empty-state">No generation history yet.</p>}
        </>
      )}

      {tab === 'ai' && (
        <>
          <div className="filter-bar">
            <input type="text" placeholder="Search AI activity..." value={search} onChange={e => handleSearchChange(e.target.value)} className="filter-input" />
            <select value={featureFilter} onChange={e => handleFeatureChange(e.target.value)} className="filter-select">
              <option value="">All Features</option>
              {Object.entries(featureLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
            </select>
            <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="sort-select">
              {AI_SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
          <div className="list-container">
            {aiItems.map(item => (
              <div key={item.id} className="list-item ai-history-item" onClick={() => !selectMode && navigate(`/${item.feature}`)}>
                {selectMode && (
                  <input type="checkbox" className="list-item-checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} onClick={e => e.stopPropagation()} />
                )}
                <div className="list-item-content">
                  <h3 className="list-item-title">{item.title}</h3>
                  <p className="list-item-subtitle">{featureLabels[item.feature] || item.feature}</p>
                  <p className="list-item-date">{new Date(item.created_at).toLocaleString()}</p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="list-item-badge" style={{ backgroundColor: featureColors[item.feature] || '#7c3aed' }}>
                    {featureLabels[item.feature] || item.feature}
                  </span>
                  {!selectMode && (
                    <button className="btn-danger" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }} onClick={(e) => handleDeleteAiHistory(item.id, e)}>Delete</button>
                  )}
                </div>
              </div>
            ))}
          </div>
          {aiItems.length === 0 && <p className="empty-state">No AI activity yet. Use any AI feature to see history here.</p>}
        </>
      )}

      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
          <span className="page-indicator">Page {page} of {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
        </div>
      )}
    </div>
  );
}

export default History;
