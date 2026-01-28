import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';

function HistoryDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch(`/api/history/${id}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setItem)
      .catch(console.error);
  }, [id]);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this history entry?')) return;
    await fetch(`/api/history/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
    navigate('/history');
  };

  const handleDownload = async () => {
    const res = await fetch(item.image_url);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generation_${item.id}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!item) return <div className="loading"><div className="spinner"></div>Loading...</div>;

  return (
    <div className="detail-container">
      <Link to="/history" className="detail-back">&larr; Back to History</Link>
      {item.image_url && <img className="detail-image" src={item.image_url} alt="Generated" />}
      <h1 className="detail-title">Generation Details</h1>
      <div className="detail-actions">
        {item.image_url && <button className="btn-secondary" onClick={handleDownload}>Download</button>}
        <button className="btn-danger" onClick={handleDelete}>Delete</button>
      </div>
      <div className="detail-info">
        <div>
          <label>Prompt</label>
          <p>{item.prompt}</p>
        </div>
        {item.negative_prompt && (
          <div>
            <label>Negative Prompt</label>
            <p>{item.negative_prompt}</p>
          </div>
        )}
        <div>
          <label>Style</label>
          <p>{item.style || 'N/A'}</p>
        </div>
        {item.seed && (
          <div>
            <label>Seed</label>
            <p>{item.seed}</p>
          </div>
        )}
        <div>
          <label>Status</label>
          <p>{item.status}</p>
        </div>
        <div>
          <label>Created</label>
          <p>{new Date(item.created_at).toLocaleString()}</p>
        </div>
      </div>
    </div>
  );
}

export default HistoryDetail;
