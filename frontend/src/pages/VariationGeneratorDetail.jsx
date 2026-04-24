import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

function VariationGeneratorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({
    original_prompt: '',
    num_variations: 5,
    variation_type: ''
  });
  const token = localStorage.getItem('token');
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/variation-generator/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItem(data);
        setForm({
          original_prompt: data.original_prompt || '',
          num_variations: data.num_variations || 5,
          variation_type: data.variation_type || ''
        });
      })
      .catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    const confirmed = await toast.confirm('Are you sure you want to delete these variations?');
    if (!confirmed) return;
    await fetch(`/api/variation-generator/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('Variations deleted');
    navigate('/variation-generator');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/variation-generator/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setItem(updated);
    setShowEdit(false);
    toast.success('Variations updated');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (!item) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  const aiResponse = item.ai_response || {};
  const rawVariations = item.variations || aiResponse.variations || [];
  const variations = Array.isArray(rawVariations) ? rawVariations : typeof rawVariations === 'string' ? JSON.parse(rawVariations) : [];
  const safeText = (val) => {
    if (val == null) return '';
    if (typeof val === 'string') return val;
    if (typeof val === 'object') return val.title || val.name || val.description || JSON.stringify(val);
    return String(val);
  };

  const moodColors = {
    'Peaceful': '#10b981',
    'Energetic': '#f59e0b',
    'Mysterious': '#8b5cf6',
    'Joyful': '#ec4899',
    'Melancholic': '#6366f1'
  };

  return (
    <div className="detail-container">
      <Link to="/variation-generator" className="detail-back">&larr; Back to Variation Generator</Link>
      <h1 className="detail-title">Prompt Variations</h1>
      <div className="detail-actions">
        <button className="btn-primary" onClick={() => setShowEdit(true)}>Edit</button>
        <button className="btn-danger" onClick={handleDelete}>Delete</button>
      </div>

      <div className="ai-result-container">
        <div className="ai-result-section">
          <h3>Original Prompt</h3>
          <div className="ai-result-box">
            <p>{item.original_prompt}</p>
            <button className="btn-copy" onClick={() => copyToClipboard(item.original_prompt)}>Copy</button>
          </div>
        </div>

        <div className="ai-result-grid">
          <div className="ai-result-card">
            <h4>Variation Type</h4>
            <p>{item.variation_type}</p>
          </div>
          <div className="ai-result-card">
            <h4>Number of Variations</h4>
            <p>{item.num_variations}</p>
          </div>
        </div>

        {aiResponse.originalAnalysis && (
          <div className="ai-result-section">
            <h3>Original Analysis</h3>
            <div className="ai-result-box">
              {typeof aiResponse.originalAnalysis === 'object'
                ? <ul className="ai-result-list">{Object.entries(aiResponse.originalAnalysis).map(([k, v]) => (
                    <li key={k}><strong>{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}:</strong> {Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}</li>
                  ))}</ul>
                : <p>{String(aiResponse.originalAnalysis)}</p>
              }
            </div>
          </div>
        )}

        <div className="ai-result-section highlight">
          <h3>Generated Variations</h3>
          <div className="variations-list">
            {variations.map((variation, i) => {
              const v = typeof variation === 'object' ? variation : { prompt: String(variation) };
              return (
                <div key={i} className="variation-card">
                  <div className="variation-header">
                    <span className="variation-number">#{i + 1}</span>
                    {v.mood && (
                      <span
                        className="variation-mood"
                        style={{ backgroundColor: moodColors[v.mood] || '#7c3aed' }}
                      >
                        {v.mood}
                      </span>
                    )}
                    {v.style && (
                      <span className="variation-style">{v.style}</span>
                    )}
                  </div>
                  <p className="variation-prompt">{v.prompt || safeText(variation)}</p>
                  {v.description && (
                    <p className="variation-description">{v.description}</p>
                  )}
                  <button className="btn-copy small" onClick={() => copyToClipboard(v.prompt || safeText(variation))}>Copy Prompt</button>
                </div>
              );
            })}
          </div>
        </div>

        {aiResponse.variationStrategy && (
          <div className="ai-result-section">
            <h3>Variation Strategy</h3>
            <div className="ai-result-box">
              {typeof aiResponse.variationStrategy === 'object'
                ? <ul className="ai-result-list">{Object.entries(aiResponse.variationStrategy).map(([k, v]) => (
                    <li key={k}><strong>{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}:</strong> {Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}</li>
                  ))}</ul>
                : <p>{String(aiResponse.variationStrategy)}</p>
              }
            </div>
          </div>
        )}

        <div className="detail-info">
          <label>Created</label>
          <p>{new Date(item.created_at).toLocaleString()}</p>
        </div>
      </div>

      {showEdit && (
        <Modal title="Edit Variations" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label>Original Prompt</label>
              <textarea value={form.original_prompt} onChange={e => setForm({...form, original_prompt: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Number of Variations</label>
              <input
                type="number"
                value={form.num_variations}
                onChange={e => setForm({...form, num_variations: parseInt(e.target.value)})}
                min={1}
                max={10}
              />
            </div>
            <div className="form-group">
              <label>Variation Type</label>
              <input value={form.variation_type} onChange={e => setForm({...form, variation_type: e.target.value})} />
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn-primary">Save</button>
              <button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default VariationGeneratorDetail;
