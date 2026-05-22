import { useEffect, useState } from 'react';

function colorForScore(score) {
  // 0..100 -> green-violet gradient
  const t = Math.max(0, Math.min(100, score)) / 100;
  const r = Math.round(76 + (124 - 76) * t);
  const g = Math.round(29 + (58 - 29) * t);
  const b = Math.round(149 + (237 - 149) * t);
  return `rgb(${r},${g},${b})`;
}

function StyleConsistencyHeatmap() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/style-consistency-heatmap', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setData(d)))
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) return <div style={{ color: '#ef4444', padding: 12 }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 12 }}>Loading heatmap…</div>;

  return (
    <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: 16, color: '#e5e7eb' }}>
      <div style={{ marginBottom: 8 }}>
        <strong>{data.title}</strong>
        <span style={{ fontSize: 12, color: '#9ca3af', marginLeft: 8 }}>(0 = inconsistent, 100 = consistent)</span>
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 12 }}>
        <thead>
          <tr>
            <th style={{ textAlign: 'left', padding: 6, color: '#9ca3af' }}>Style \\ Model</th>
            {data.models.map((m) => (
              <th key={m} style={{ padding: 6, color: '#9ca3af', textAlign: 'center' }}>{m}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.matrix.map((row) => (
            <tr key={row.style}>
              <td style={{ padding: 6, color: '#e5e7eb' }}>{row.style}</td>
              {row.cells.map((c) => (
                <td key={c.model} title={`${row.style} x ${c.model}: ${c.score}`}
                    style={{ padding: 0, border: '1px solid #111827' }}>
                  <div style={{ background: colorForScore(c.score), color: '#fff', textAlign: 'center', padding: '10px 0', fontWeight: 600 }}>
                    {c.score}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StyleConsistencyHeatmap;
