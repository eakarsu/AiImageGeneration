import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

function PromptOptimizerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ original_prompt: '', optimized_prompt: '', style: '', target_quality: '' });
  const token = localStorage.getItem('token');
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/prompt-optimizer/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItem(data);
        setForm({ original_prompt: data.original_prompt || '', optimized_prompt: data.optimized_prompt || '', style: data.style || '', target_quality: data.target_quality || '' });
      })
      .catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    const confirmed = await toast.confirm('Are you sure you want to delete this optimization?');
    if (!confirmed) return;
    await fetch(`/api/prompt-optimizer/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('Optimization deleted');
    navigate('/prompt-optimizer');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/prompt-optimizer/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setItem(updated);
    setShowEdit(false);
    toast.success('Optimization updated');
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
      <Link to="/prompt-optimizer" className="detail-back">&larr; Back to Prompt Optimizer</Link>
      <h1 className="detail-title">Prompt Optimization</h1>
      <div className="detail-actions">
        <button className="btn-primary" onClick={() => setShowEdit(true)}>Edit</button>
        <button className="btn-danger" onClick={handleDelete}>Delete</button>
      </div>

      <div className="ai-result-container">
        <div className="ai-result-section"><h3>Original Prompt</h3><div className="ai-result-box"><p>{item.original_prompt}</p><button className="btn-copy" onClick={() => copyToClipboard(item.original_prompt)}>Copy</button></div></div>
        <div className="ai-result-section highlight"><h3>Optimized Prompt</h3><div className="ai-result-box optimized"><p>{item.optimized_prompt}</p><button className="btn-copy" onClick={() => copyToClipboard(item.optimized_prompt)}>Copy</button></div></div>
        <div className="ai-result-grid">
          <div className="ai-result-card"><h4>Style</h4><p>{item.style || 'General'}</p></div>
          <div className="ai-result-card"><h4>Quality Target</h4><p>{item.target_quality}</p></div>
          <div className="ai-result-card"><h4>Quality Score</h4><p className="score">{aiResponse.qualityScore || 'N/A'}/10</p></div>
        </div>
        {aiResponse.improvements && <div className="ai-result-section"><h3>Improvements Made</h3><ul className="ai-result-list">{safeArray(aiResponse.improvements).map((imp, i) => <li key={i}>{safeText(imp)}</li>)}</ul></div>}
        {aiResponse.tips && <div className="ai-result-section"><h3>Tips for Better Results</h3><ul className="ai-result-list tips">{safeArray(aiResponse.tips).map((tip, i) => <li key={i}>{safeText(tip)}</li>)}</ul></div>}
        {aiResponse.negativePrompt && <div className="ai-result-section"><h3>Suggested Negative Prompt</h3><div className="ai-result-box negative"><p>{aiResponse.negativePrompt}</p><button className="btn-copy" onClick={() => copyToClipboard(aiResponse.negativePrompt)}>Copy</button></div></div>}
        <div className="detail-info"><label>Created</label><p>{new Date(item.created_at).toLocaleString()}</p></div>
      </div>

      {showEdit && (
        <Modal title="Edit Optimization" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEdit}>
            <div className="form-group"><label>Original Prompt</label><textarea value={form.original_prompt} onChange={e => setForm({...form, original_prompt: e.target.value})} required /></div>
            <div className="form-group"><label>Optimized Prompt</label><textarea value={form.optimized_prompt} onChange={e => setForm({...form, optimized_prompt: e.target.value})} /></div>
            <div className="form-group"><label>Style</label><input value={form.style} onChange={e => setForm({...form, style: e.target.value})} /></div>
            <div className="form-group"><label>Target Quality</label><input value={form.target_quality} onChange={e => setForm({...form, target_quality: e.target.value})} /></div>
            <div className="modal-actions"><button type="submit" className="btn-primary">Save</button><button type="button" className="btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button></div>
          </form>
        </Modal>
      )}
    </div>
  );
}

export default PromptOptimizerDetail;
