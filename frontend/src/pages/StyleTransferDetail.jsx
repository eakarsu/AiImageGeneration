import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

function StyleTransferDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ source_style: '', target_style: '', content_description: '', analysis_prompt: '' });
  const token = localStorage.getItem('token');
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/style-transfer/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItem(data);
        setForm({
          source_style: data.source_style || '',
          target_style: data.target_style || '',
          content_description: data.content_description || '',
          analysis_prompt: data.analysis_prompt || ''
        });
      })
      .catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    const confirmed = await toast.confirm('Are you sure you want to delete this style transfer?');
    if (!confirmed) return;
    await fetch(`/api/style-transfer/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('Style transfer deleted');
    navigate('/style-transfer');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/style-transfer/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setItem(updated);
    setShowEdit(false);
    toast.success('Style transfer updated');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  if (!item) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  const aiResponse = item.ai_response || {};
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
      <Link to="/style-transfer" className="detail-back">&larr; Back to Style Transfer</Link>
      <h1 className="detail-title">Style Transfer Analysis</h1>
      <div className="detail-actions">
        <button className="btn-primary" onClick={() => setShowEdit(true)}>Edit</button>
        <button className="btn-danger" onClick={handleDelete}>Delete</button>
      </div>

      <div className="ai-result-container">
        <div className="style-transfer-header">
          <div className="style-box source">
            <h4>Source Style</h4>
            <p>{item.source_style}</p>
          </div>
          <div className="style-arrow-large">→</div>
          <div className="style-box target">
            <h4>Target Style</h4>
            <p>{item.target_style}</p>
          </div>
        </div>

        <div className="ai-result-section">
          <h3>Content Description</h3>
          <div className="ai-result-box">
            <p>{item.content_description}</p>
          </div>
        </div>

        <div className="ai-result-section highlight">
          <h3>Optimized Transfer Prompt</h3>
          <div className="ai-result-box optimized">
            <p>{item.analysis_prompt || aiResponse.analysisPrompt}</p>
            <button className="btn-copy" onClick={() => copyToClipboard(item.analysis_prompt || aiResponse.analysisPrompt)}>Copy</button>
          </div>
        </div>

        {aiResponse.styleElements && (
          <div className="ai-result-section">
            <h3>Key Style Elements</h3>
            <div className="style-elements-grid">
              {safeArray(aiResponse.styleElements).map((elem, i) => (
                <div key={i} className="style-element">{safeText(elem)}</div>
              ))}
            </div>
          </div>
        )}

        {aiResponse.technicalSettings && (
          <div className="ai-result-section">
            <h3>Recommended Settings</h3>
            <div className="settings-grid">
              {typeof aiResponse.technicalSettings === 'object' && !Array.isArray(aiResponse.technicalSettings)
                ? Object.entries(aiResponse.technicalSettings).map(([key, val]) => (
                    <div key={key} className="setting-item">
                      <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                      <span>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))
                : <p>{safeText(aiResponse.technicalSettings)}</p>
              }
            </div>
          </div>
        )}

        {aiResponse.colorPalette && (
          <div className="ai-result-section">
            <h3>Suggested Color Palette</h3>
            <div className="color-palette">
              {Array.isArray(aiResponse.colorPalette)
                ? aiResponse.colorPalette.map((color, i) => (
                    <div key={i} className="color-chip">{typeof color === 'object' ? (color.title || color.name || color.description || JSON.stringify(color)) : color}</div>
                  ))
                : typeof aiResponse.colorPalette === 'object'
                  ? Object.entries(aiResponse.colorPalette).map(([key, val]) => (
                      <div key={key} className="color-chip"><strong>{key}:</strong> {typeof val === 'object' ? JSON.stringify(val) : val}</div>
                    ))
                  : <div className="color-chip">{String(aiResponse.colorPalette)}</div>
              }
            </div>
          </div>
        )}

        {aiResponse.compositionTips && (
          <div className="ai-result-section">
            <h3>Composition Tips</h3>
            <ul className="ai-result-list">
              {safeArray(aiResponse.compositionTips).map((tip, i) => <li key={i}>{safeText(tip)}</li>)}
            </ul>
          </div>
        )}

        {aiResponse.expectedResult && (
          <div className="ai-result-section">
            <h3>Expected Result</h3>
            <div className="ai-result-box">
              <p>{aiResponse.expectedResult}</p>
            </div>
          </div>
        )}

        {aiResponse.warnings && safeArray(aiResponse.warnings).length > 0 && (
          <div className="ai-result-section">
            <h3>Warnings</h3>
            <ul className="ai-result-list warnings">
              {safeArray(aiResponse.warnings).map((warning, i) => <li key={i}>{safeText(warning)}</li>)}
            </ul>
          </div>
        )}

        <div className="detail-info">
          <label>Created</label>
          <p>{new Date(item.created_at).toLocaleString()}</p>
        </div>
      </div>

      {showEdit && (
        <Modal title="Edit Style Transfer" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label>Source Style</label>
              <input value={form.source_style} onChange={e => setForm({...form, source_style: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Target Style</label>
              <input value={form.target_style} onChange={e => setForm({...form, target_style: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Content Description</label>
              <textarea value={form.content_description} onChange={e => setForm({...form, content_description: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Analysis Prompt</label>
              <textarea value={form.analysis_prompt} onChange={e => setForm({...form, analysis_prompt: e.target.value})} />
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

export default StyleTransferDetail;
