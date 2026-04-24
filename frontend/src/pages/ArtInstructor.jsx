import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';
import { exportToCSV, exportToPDF } from '../utils/export';

const SORT_OPTIONS = [
  { value: 'created_at:DESC', label: 'Newest First' },
  { value: 'created_at:ASC', label: 'Oldest First' },
  { value: 'topic:ASC', label: 'Topic A-Z' },
  { value: 'skill_level:ASC', label: 'Skill Level A-Z' },
];

const EXPORT_COLUMNS = [
  { key: 'topic', label: 'Topic' },
  { key: 'skill_level', label: 'Skill Level' },
  { key: 'art_form', label: 'Art Form' },
  { label: 'Created', accessor: (r) => new Date(r.created_at).toLocaleDateString() },
];

function ArtInstructor() {
  const [items, setItems] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ topic: '', skill_level: 'beginner', art_form: 'digital' });
  const [search, setSearch] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
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

  const fetchItems = (currentPage, currentSearch, currentSkill, currentSort) => {
    const [sort, order] = (currentSort || sortBy).split(':');
    const params = new URLSearchParams({ page: currentPage, limit: 12, sort, order });
    if (currentSearch) params.set('search', currentSearch);
    if (currentSkill) params.set('skill_level', currentSkill);

    fetch(`/api/art-instructor?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItems(data.items || []);
        setTotalPages(data.totalPages || 1);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchItems(page, search, skillFilter, sortBy);
  }, [page, sortBy]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchItems(1, value, skillFilter, sortBy);
    }, 300);
  };

  const handleSkillChange = (value) => {
    setSkillFilter(value);
    setPage(1);
    fetchItems(1, search, value, sortBy);
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/art-instructor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Failed to create lesson');
        return;
      }
      setShowModal(false);
      setLatestResult(data);
      setForm({ topic: '', skill_level: 'beginner', art_form: 'digital' });
      fetchItems(1, search, skillFilter, sortBy);
      toast.success('Lesson created successfully');
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
    const res = await fetch('/api/art-instructor/bulk', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ ids: Array.from(selectedIds) }),
    });
    if (res.ok) { const data = await res.json(); toast.success(`Deleted ${data.deleted} item(s)`); }
    setSelectedIds(new Set()); setSelectMode(false);
    fetchItems(page, search, skillFilter, sortBy);
  };

  const aiResponse = latestResult?.ai_response || {};
  const skillLevelColors = { beginner: '#10b981', intermediate: '#f59e0b', advanced: '#ef4444' };
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
        <h1>Art Instructor</h1>
        <div className="page-header-actions">
          <button className="btn-export" onClick={() => exportToCSV(items, EXPORT_COLUMNS, 'art-instructor.csv')}>CSV</button>
          <button className="btn-export" onClick={() => exportToPDF(items, EXPORT_COLUMNS, 'Art Instructor')}>PDF</button>
          <button className={`btn-select-toggle${selectMode ? ' active' : ''}`} onClick={() => { setSelectMode(!selectMode); setSelectedIds(new Set()); }}>Select</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>New Lesson</button>
        </div>
      </div>
      <p className="feature-description">Learn art techniques and improve your skills with AI-generated lessons tailored to your level.</p>

      {latestResult && (
        <div className="ai-inline-result" ref={resultRef}>
          <div className="ai-inline-header">
            <h2>AI Lesson: {latestResult.topic}</h2>
            <button className="btn-close" onClick={() => setLatestResult(null)}>Dismiss</button>
          </div>
          <div className="ai-result-grid">
            <div className="ai-result-card"><h4>Skill Level</h4><p>{latestResult.skill_level}</p></div>
            <div className="ai-result-card"><h4>Art Form</h4><p>{latestResult.art_form}</p></div>
            <div className="ai-result-card"><h4>Difficulty</h4><p>{aiResponse.difficulty || latestResult.skill_level}</p></div>
          </div>
          {aiResponse.lesson && (
            <div className="ai-result-section"><h3>Lesson Content</h3><div className="ai-result-box"><p>{aiResponse.lesson}</p></div></div>
          )}
          {aiResponse.keyPoints && (
            <div className="ai-result-section"><h3>Key Points</h3><ul className="ai-result-list">{(Array.isArray(aiResponse.keyPoints) ? aiResponse.keyPoints : []).map((p, i) => <li key={i}>{safeText(p)}</li>)}</ul></div>
          )}
          {aiResponse.techniques && (
            <div className="ai-result-section"><h3>Techniques</h3><ul className="ai-result-list">{(Array.isArray(aiResponse.techniques) ? aiResponse.techniques : []).map((t, i) => <li key={i}>{safeText(t)}</li>)}</ul></div>
          )}
          {aiResponse.exercises && (
            <div className="ai-result-section"><h3>Practice Exercises</h3><ul className="ai-result-list tips">{(Array.isArray(aiResponse.exercises) ? aiResponse.exercises : []).map((e, i) => <li key={i}>{typeof e === 'object' ? <><strong>{e.name || e.title}</strong>{e.duration && ` (${e.duration})`} — {e.description}</> : safeText(e)}</li>)}</ul></div>
          )}
          {aiResponse.nextSteps && (
            <div className="ai-result-section"><h3>Next Steps</h3><ul className="ai-result-list">{(Array.isArray(aiResponse.nextSteps) ? aiResponse.nextSteps : []).map((s, i) => <li key={i}>{safeText(s)}</li>)}</ul></div>
          )}
        </div>
      )}

      <div className="filter-bar">
        <input type="text" placeholder="Search topics..." value={search} onChange={e => handleSearchChange(e.target.value)} className="filter-input" />
        <select value={skillFilter} onChange={e => handleSkillChange(e.target.value)} className="filter-select">
          <option value="">All Levels</option>
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
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
          <div key={item.id} className="list-item" onClick={() => !selectMode && navigate(`/art-instructor/${item.id}`)}>
            {selectMode && <input type="checkbox" className="list-item-checkbox" checked={selectedIds.has(item.id)} onChange={() => toggleSelect(item.id)} onClick={e => e.stopPropagation()} />}
            <div className="list-item-content">
              <h3 className="list-item-title">{item.topic}</h3>
              <p className="list-item-subtitle">{item.art_form} art | {item.skill_level}</p>
              <p className="list-item-date">{new Date(item.created_at).toLocaleDateString()}</p>
            </div>
            <span className="list-item-badge" style={{ backgroundColor: skillLevelColors[item.skill_level] || '#7c3aed' }}>{item.skill_level}</span>
          </div>
        ))}
      </div>
      {items.length === 0 && !latestResult && <p className="empty-state">No lessons yet. Start learning with your first AI lesson!</p>}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
          <span className="page-indicator">Page {page} of {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
        </div>
      )}
      {showModal && (
        <Modal title="Create New Lesson" onClose={() => setShowModal(false)}>
          <div className="sample-data-buttons">
            <span>Load Sample:</span>
            <button type="button" className="btn-sample" onClick={() => setForm({ topic: 'Color Theory and Color Mixing', skill_level: 'beginner', art_form: 'digital' })}>Color Theory</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ topic: 'Portrait Drawing - Facial Proportions', skill_level: 'intermediate', art_form: 'traditional' })}>Portrait</button>
            <button type="button" className="btn-sample" onClick={() => setForm({ topic: 'Advanced Lighting and Shadow Techniques', skill_level: 'advanced', art_form: 'digital' })}>Lighting</button>
          </div>
          <form onSubmit={handleCreate}>
            {error && <div className="error-msg">{error}</div>}
            <div className="form-group">
              <label>Topic *</label>
              <input value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} placeholder="e.g., Color Theory, Portrait Drawing, Digital Brushwork" required />
            </div>
            <div className="form-group">
              <label>Skill Level</label>
              <select value={form.skill_level} onChange={e => setForm({...form, skill_level: e.target.value})}>
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
            <div className="form-group">
              <label>Art Form</label>
              <select value={form.art_form} onChange={e => setForm({...form, art_form: e.target.value})}>
                <option value="digital">Digital</option>
                <option value="traditional">Traditional</option>
                <option value="mixed">Mixed Media</option>
              </select>
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Creating Lesson...' : 'Create Lesson'}</button>
              <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default ArtInstructor;
