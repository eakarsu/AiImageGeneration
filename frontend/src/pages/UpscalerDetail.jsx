import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

function UpscalerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({
    image_description: '',
    current_resolution: '',
    target_resolution: '',
    use_case: '',
    enhancement_prompt: ''
  });
  const token = localStorage.getItem('token');
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/upscaler/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItem(data);
        setForm({
          image_description: data.image_description || '',
          current_resolution: data.current_resolution || '',
          target_resolution: data.target_resolution || '',
          use_case: data.use_case || '',
          enhancement_prompt: data.enhancement_prompt || ''
        });
      })
      .catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    const confirmed = await toast.confirm('Are you sure you want to delete this upscale request?');
    if (!confirmed) return;
    await fetch(`/api/upscaler/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('Upscale request deleted');
    navigate('/upscaler');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/upscaler/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setItem(updated);
    setShowEdit(false);
    toast.success('Upscale request updated');
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
    if (typeof val === 'object') return val.title || val.name || val.description || val.step || val.method || JSON.stringify(val);
    return String(val);
  };

  return (
    <div className="detail-container">
      <Link to="/upscaler" className="detail-back">&larr; Back to AI Upscaler</Link>
      <h1 className="detail-title">Upscale Recommendations</h1>
      <div className="detail-actions">
        <button className="btn-primary" onClick={() => setShowEdit(true)}>Edit</button>
        <button className="btn-danger" onClick={handleDelete}>Delete</button>
      </div>

      <div className="ai-result-container">
        <div className="resolution-header">
          <div className="resolution-box current">
            <h4>Current</h4>
            <p className="resolution-value">{item.current_resolution}</p>
          </div>
          <div className="resolution-arrow">→</div>
          <div className="resolution-box target">
            <h4>Target</h4>
            <p className="resolution-value">{item.target_resolution}</p>
          </div>
        </div>

        <div className="ai-result-grid">
          <div className="ai-result-card">
            <h4>Image Type</h4>
            <p>{item.image_description}</p>
          </div>
          <div className="ai-result-card">
            <h4>Use Case</h4>
            <p>{item.use_case}</p>
          </div>
        </div>

        <div className="ai-result-section highlight">
          <h3>Enhancement Prompt</h3>
          <div className="ai-result-box optimized">
            <p>{item.enhancement_prompt || aiResponse.enhancementPrompt}</p>
            <button className="btn-copy" onClick={() => copyToClipboard(item.enhancement_prompt || aiResponse.enhancementPrompt)}>Copy</button>
          </div>
        </div>

        {aiResponse.recommendations && (
          <div className="ai-result-section">
            <h3>Recommendations</h3>
            <ul className="ai-result-list recommendations">
              {safeArray(aiResponse.recommendations).map((rec, i) => <li key={i}>{safeText(rec)}</li>)}
            </ul>
          </div>
        )}

        {aiResponse.qualitySettings && (
          <div className="ai-result-section">
            <h3>Quality Settings</h3>
            <div className="settings-grid">
              {typeof aiResponse.qualitySettings === 'object' && !Array.isArray(aiResponse.qualitySettings)
                ? Object.entries(aiResponse.qualitySettings).map(([key, val]) => (
                    <div key={key} className="setting-item">
                      <label>{key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase())}</label>
                      <span>{typeof val === 'object' ? JSON.stringify(val) : String(val)}</span>
                    </div>
                  ))
                : <p>{safeText(aiResponse.qualitySettings)}</p>
              }
            </div>
          </div>
        )}

        {aiResponse.expectedImprovements && (
          <div className="ai-result-section">
            <h3>Expected Improvements</h3>
            <div className="improvement-tags">
              {safeArray(aiResponse.expectedImprovements).map((imp, i) => (
                <span key={i} className="improvement-tag">{safeText(imp)}</span>
              ))}
            </div>
          </div>
        )}

        {aiResponse.processingTips && (
          <div className="ai-result-section">
            <h3>Processing Tips</h3>
            <ul className="ai-result-list tips">
              {safeArray(aiResponse.processingTips).map((tip, i) => <li key={i}>{safeText(tip)}</li>)}
            </ul>
          </div>
        )}

        {aiResponse.postProcessing && (
          <div className="ai-result-section">
            <h3>Post-Processing Steps</h3>
            <ol className="ai-result-list numbered">
              {safeArray(aiResponse.postProcessing).map((step, i) => <li key={i}>{safeText(step)}</li>)}
            </ol>
          </div>
        )}

        {aiResponse.alternativeMethods && (
          <div className="ai-result-section">
            <h3>Alternative Methods</h3>
            <div className="method-tags">
              {safeArray(aiResponse.alternativeMethods).map((method, i) => (
                <span key={i} className="method-tag">{safeText(method)}</span>
              ))}
            </div>
          </div>
        )}

        <div className="detail-info">
          <label>Created</label>
          <p>{new Date(item.created_at).toLocaleString()}</p>
        </div>
      </div>

      {showEdit && (
        <Modal title="Edit Upscale Request" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label>Image Description</label>
              <textarea value={form.image_description} onChange={e => setForm({...form, image_description: e.target.value})} required />
            </div>
            <div className="form-group">
              <label>Current Resolution</label>
              <input value={form.current_resolution} onChange={e => setForm({...form, current_resolution: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Target Resolution</label>
              <input value={form.target_resolution} onChange={e => setForm({...form, target_resolution: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Use Case</label>
              <input value={form.use_case} onChange={e => setForm({...form, use_case: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Enhancement Prompt</label>
              <textarea value={form.enhancement_prompt} onChange={e => setForm({...form, enhancement_prompt: e.target.value})} />
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

export default UpscalerDetail;
