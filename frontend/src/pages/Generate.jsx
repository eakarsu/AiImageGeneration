import { useState, useEffect } from 'react';

function Generate() {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('');
  const [title, setTitle] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState('');
  const [steps, setSteps] = useState(25);
  const [guidanceScale, setGuidanceScale] = useState(7.5);
  const [styles, setStyles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetch('/api/styles', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setStyles)
      .catch(console.error);
  }, []);

  const handleGenerate = async (e) => {
    e.preventDefault();
    if (!prompt) return;
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const body = {
        prompt,
        style: style || 'Digital Art',
        title,
        num_inference_steps: steps,
        guidance_scale: guidanceScale,
      };
      if (negativePrompt) body.negative_prompt = negativePrompt;
      if (seed) body.seed = parseInt(seed);

      const res = await fetch('/api/generations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="generate-container">
      <div className="page-header">
        <h1>Generate Image</h1>
      </div>
      <div className="generate-form">
        <form onSubmit={handleGenerate}>
          <div className="form-group">
            <label>Title (optional)</label>
            <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Name your creation" />
          </div>
          <div className="form-group">
            <label>Prompt</label>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              placeholder="Describe the image you want to generate..."
              required
              rows={4}
            />
          </div>
          <div className="form-group">
            <label>Negative Prompt (optional)</label>
            <textarea
              value={negativePrompt}
              onChange={e => setNegativePrompt(e.target.value)}
              placeholder="What to avoid in the image (e.g. blurry, low quality, text)..."
              rows={2}
            />
          </div>
          <div className="form-group">
            <label>Style</label>
            <select value={style} onChange={e => setStyle(e.target.value)}>
              <option value="">Select a style...</option>
              {styles.map(s => (
                <option key={s.id} value={s.name}>{s.name}</option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Seed (optional)</label>
              <input
                type="number"
                value={seed}
                onChange={e => setSeed(e.target.value)}
                placeholder="Random"
              />
            </div>
            <div className="form-group">
              <label>Steps: {steps}</label>
              <input
                type="range"
                min="10"
                max="50"
                value={steps}
                onChange={e => setSteps(parseInt(e.target.value))}
                className="range-input"
              />
            </div>
            <div className="form-group">
              <label>Guidance Scale: {guidanceScale}</label>
              <input
                type="range"
                min="1"
                max="20"
                step="0.5"
                value={guidanceScale}
                onChange={e => setGuidanceScale(parseFloat(e.target.value))}
                className="range-input"
              />
            </div>
          </div>
          <button type="submit" className="btn-primary" disabled={loading || !prompt}>
            {loading ? 'Generating...' : 'Generate Image'}
          </button>
        </form>
      </div>

      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          Generating your image...
        </div>
      )}

      {error && <div className="error-msg">{error}</div>}

      {result && (
        <div className="generate-result">
          <h2>{result.title}</h2>
          <img src={result.image_url} alt={result.title} />
          <div className="detail-info" style={{ marginTop: '1rem', textAlign: 'left' }}>
            <div>
              <label>Prompt</label>
              <p>{result.prompt}</p>
            </div>
            <div>
              <label>Style</label>
              <p>{result.style}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Generate;
