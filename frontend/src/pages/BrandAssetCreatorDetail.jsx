import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

function BrandAssetCreatorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({
    brand_name: '',
    brand_values: '',
    asset_type: '',
    color_preferences: '',
    generation_prompt: ''
  });
  const token = localStorage.getItem('token');
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/brand-asset-creator/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItem(data);
        setForm({
          brand_name: data.brand_name || '',
          brand_values: data.brand_values || '',
          asset_type: data.asset_type || '',
          color_preferences: data.color_preferences || '',
          generation_prompt: data.generation_prompt || ''
        });
      })
      .catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    const confirmed = await toast.confirm('Are you sure you want to delete this brand asset?');
    if (!confirmed) return;
    await fetch(`/api/brand-asset-creator/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('Brand asset deleted');
    navigate('/brand-asset-creator');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/brand-asset-creator/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setItem(updated);
    setShowEdit(false);
    toast.success('Brand asset updated');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (!item) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  const aiResponse = item.ai_response || {};
  const colorScheme = typeof aiResponse.colorScheme === 'object' && !Array.isArray(aiResponse.colorScheme) ? aiResponse.colorScheme : {};
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
    <div className="detail-container">
      <Link to="/brand-asset-creator" className="detail-back">&larr; Back to Brand Asset Creator</Link>
      <h1 className="detail-title">{item.brand_name}</h1>
      <div className="detail-actions">
        <button className="btn-primary" onClick={() => setShowEdit(true)}>Edit</button>
        <button className="btn-danger" onClick={handleDelete}>Delete</button>
      </div>

      <div className="ai-result-container">
        <div className="brand-header">
          <div className="brand-info-card">
            <h4>Asset Type</h4>
            <p>{item.asset_type}</p>
          </div>
          <div className="brand-info-card">
            <h4>Brand Values</h4>
            <p>{item.brand_values}</p>
          </div>
        </div>

        <div className="ai-result-section highlight">
          <h3>Generation Prompt</h3>
          <div className="ai-result-box optimized">
            <p>{item.generation_prompt || aiResponse.generationPrompt}</p>
            <button className="btn-copy" onClick={() => copyToClipboard(item.generation_prompt || aiResponse.generationPrompt)}>Copy</button>
          </div>
        </div>

        {aiResponse.designConcept && (
          <div className="ai-result-section">
            <h3>Design Concept</h3>
            <div className="ai-result-box">
              <p>{safeText(aiResponse.designConcept)}</p>
            </div>
          </div>
        )}

        {Object.keys(colorScheme).length > 0 && (
          <div className="ai-result-section">
            <h3>Color Scheme</h3>
            <div className="color-scheme-display">
              {Object.entries(colorScheme).map(([key, val]) => {
                const colorVal = typeof val === 'string' ? val : typeof val === 'object' ? Object.values(val).find(v => typeof v === 'string' && v.startsWith('#')) || '#7c3aed' : '#7c3aed';
                const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
                const displayText = typeof val === 'string' ? val : typeof val === 'object' ? Object.entries(val).map(([k,v]) => `${k}: ${v}`).join(', ') : String(val);
                return (
                  <div key={key} className="color-scheme-item">
                    <div className="color-swatch" style={{ backgroundColor: colorVal }}></div>
                    <span>{label}</span>
                    <code>{displayText}</code>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {aiResponse.typography && (
          <div className="ai-result-section">
            <h3>Typography</h3>
            <div className="typography-display">
              {typeof aiResponse.typography === 'object' && !Array.isArray(aiResponse.typography)
                ? Object.entries(aiResponse.typography).map(([key, val]) => (
                    <div key={key} className="typography-item">
                      <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                      <p>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</p>
                    </div>
                  ))
                : <p>{safeText(aiResponse.typography)}</p>
              }
            </div>
          </div>
        )}

        {aiResponse.styleGuide && (
          <div className="ai-result-section">
            <h3>Style Guide</h3>
            <div className="ai-result-box">
              {typeof aiResponse.styleGuide === 'object'
                ? <ul className="ai-result-list">{Object.entries(aiResponse.styleGuide).map(([k, v]) => (
                    <li key={k}><strong>{k.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}:</strong> {Array.isArray(v) ? v.join(', ') : typeof v === 'object' ? JSON.stringify(v) : String(v)}</li>
                  ))}</ul>
                : <p>{String(aiResponse.styleGuide)}</p>
              }
            </div>
          </div>
        )}

        {aiResponse.variations && (
          <div className="ai-result-section">
            <h3>Suggested Variations</h3>
            <div className="variation-tags">
              {safeArray(aiResponse.variations).map((variation, i) => (
                <span key={i} className="variation-tag">{safeText(variation)}</span>
              ))}
            </div>
          </div>
        )}

        {aiResponse.usageGuidelines && (
          <div className="ai-result-section">
            <h3>Usage Guidelines</h3>
            <ul className="ai-result-list">
              {safeArray(aiResponse.usageGuidelines).map((guide, i) => <li key={i}>{safeText(guide)}</li>)}
            </ul>
          </div>
        )}

        {aiResponse.technicalSpecs && (
          <div className="ai-result-section">
            <h3>Technical Specifications</h3>
            <div className="specs-grid">
              {typeof aiResponse.technicalSpecs === 'object' && !Array.isArray(aiResponse.technicalSpecs)
                ? Object.entries(aiResponse.technicalSpecs).map(([key, val]) => (
                    <div key={key} className="spec-item">
                      <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                      <span>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))
                : <p>{safeText(aiResponse.technicalSpecs)}</p>
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
        <Modal title="Edit Brand Asset" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label>Brand Name</label>
              <input value={form.brand_name} onChange={e => setForm({...form, brand_name: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Brand Values</label>
              <textarea value={form.brand_values} onChange={e => setForm({...form, brand_values: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Asset Type</label>
              <input value={form.asset_type} onChange={e => setForm({...form, asset_type: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Color Preferences</label>
              <input value={form.color_preferences} onChange={e => setForm({...form, color_preferences: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Generation Prompt</label>
              <textarea value={form.generation_prompt} onChange={e => setForm({...form, generation_prompt: e.target.value})} />
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

export default BrandAssetCreatorDetail;
