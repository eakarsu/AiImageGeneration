import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Modal from '../components/Modal';
import { useToast } from '../components/ToastContext';

function ArtInstructorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState({ topic: '', skill_level: '', art_form: '', lesson_content: '' });
  const token = localStorage.getItem('token');
  const toast = useToast();

  useEffect(() => {
    fetch(`/api/art-instructor/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItem(data);
        setForm({
          topic: data.topic || '',
          skill_level: data.skill_level || '',
          art_form: data.art_form || '',
          lesson_content: data.lesson_content || ''
        });
      })
      .catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    const confirmed = await toast.confirm('Are you sure you want to delete this lesson?');
    if (!confirmed) return;
    await fetch(`/api/art-instructor/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    toast.success('Lesson deleted');
    navigate('/art-instructor');
  };

  const handleEdit = async (e) => {
    e.preventDefault();
    const res = await fetch(`/api/art-instructor/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(form),
    });
    const updated = await res.json();
    setItem(updated);
    setShowEdit(false);
    toast.success('Lesson updated');
  };

  if (!item) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  const aiResponse = item.ai_response || {};
  const skillColors = { beginner: '#10b981', intermediate: '#f59e0b', advanced: '#ef4444' };
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
      <Link to="/art-instructor" className="detail-back">&larr; Back to Art Instructor</Link>
      <h1 className="detail-title">{item.topic}</h1>
      <div className="detail-actions">
        <button className="btn-primary" onClick={() => setShowEdit(true)}>Edit</button>
        <button className="btn-danger" onClick={handleDelete}>Delete</button>
      </div>

      <div className="ai-result-container">
        <div className="ai-result-grid">
          <div className="ai-result-card">
            <h4>Skill Level</h4>
            <p style={{ color: skillColors[item.skill_level] }}>{item.skill_level}</p>
          </div>
          <div className="ai-result-card">
            <h4>Art Form</h4>
            <p>{item.art_form}</p>
          </div>
          <div className="ai-result-card">
            <h4>Difficulty</h4>
            <p>{aiResponse.difficulty || item.skill_level}</p>
          </div>
        </div>

        <div className="ai-result-section highlight">
          <h3>Lesson Content</h3>
          <div className="ai-result-box lesson">
            <p>{item.lesson_content || aiResponse.lesson}</p>
          </div>
        </div>

        {aiResponse.keyPoints && (
          <div className="ai-result-section">
            <h3>Key Learning Points</h3>
            <ul className="ai-result-list key-points">
              {safeArray(aiResponse.keyPoints).map((point, i) => <li key={i}>{safeText(point)}</li>)}
            </ul>
          </div>
        )}

        {aiResponse.techniques && (
          <div className="ai-result-section">
            <h3>Techniques to Practice</h3>
            <div className="technique-grid">
              {safeArray(aiResponse.techniques).map((tech, i) => (
                <div key={i} className="technique-card">{safeText(tech)}</div>
              ))}
            </div>
          </div>
        )}

        {aiResponse.exercises && (
          <div className="ai-result-section">
            <h3>Practice Exercises</h3>
            <ul className="ai-result-list exercises">
              {safeArray(aiResponse.exercises).map((ex, i) => (
                <li key={i}>
                  {typeof ex === 'object'
                    ? <><strong>{ex.name || ex.title}</strong>{ex.duration && ` (${ex.duration})`} — {ex.description}</>
                    : ex}
                </li>
              ))}
            </ul>
          </div>
        )}

        {aiResponse.resources && (
          <div className="ai-result-section">
            <h3>Recommended Resources</h3>
            <ul className="ai-result-list resources">
              {safeArray(aiResponse.resources).map((res, i) => (
                <li key={i}>
                  {typeof res === 'object'
                    ? <><strong>{res.title || res.name}</strong>{res.type && ` [${res.type}]`} — {res.description}</>
                    : res}
                </li>
              ))}
            </ul>
          </div>
        )}

        {aiResponse.nextSteps && (
          <div className="ai-result-section">
            <h3>Next Steps</h3>
            <div className="next-steps">
              {safeArray(aiResponse.nextSteps).map((step, i) => (
                <span key={i} className="next-step-tag">{safeText(step)}</span>
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
        <Modal title="Edit Lesson" onClose={() => setShowEdit(false)}>
          <form onSubmit={handleEdit}>
            <div className="form-group">
              <label>Topic</label>
              <input value={form.topic} onChange={e => setForm({...form, topic: e.target.value})} required />
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
            <div className="form-group">
              <label>Lesson Content</label>
              <textarea value={form.lesson_content} onChange={e => setForm({...form, lesson_content: e.target.value})} rows={6} />
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

export default ArtInstructorDetail;
