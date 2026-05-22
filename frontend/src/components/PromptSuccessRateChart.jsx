import { useEffect, useState } from 'react';

function PromptSuccessRateChart() {
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch('/api/custom-views/prompt-success-rate', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((d) => (d.error ? setErr(d.error) : setData(d)))
      .catch((e) => setErr(String(e)));
  }, []);

  if (err) return <div style={{ color: '#ef4444', padding: 12 }}>Error: {err}</div>;
  if (!data) return <div style={{ padding: 12 }}>Loading prompt success rate…</div>;

  const max = Math.max(...data.series.map((s) => s.successRate), 100);

  return (
    <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: 16, color: '#e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>{data.title}</strong>
        <span style={{ fontSize: 12, color: '#9ca3af' }}>
          Overall: {data.overall.successRate}% ({data.overall.completed}/{data.overall.total})
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 180, padding: '8px 0', borderBottom: '1px solid #374151' }}>
        {data.series.map((s) => {
          const h = Math.max(6, (s.successRate / max) * 160);
          return (
            <div key={s.label} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
              <div style={{ fontSize: 10, color: '#a78bfa', marginBottom: 2 }}>{s.successRate}%</div>
              <div
                title={`${s.label}: ${s.completed}/${s.total}`}
                style={{ width: '100%', maxWidth: 32, height: h, background: 'linear-gradient(180deg,#7c3aed,#4c1d95)', borderRadius: '4px 4px 0 0' }}
              />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
        {data.series.map((s) => (
          <div key={s.label} style={{ flex: 1, fontSize: 10, color: '#9ca3af', textAlign: 'center', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {s.label}
          </div>
        ))}
      </div>
    </div>
  );
}

export default PromptSuccessRateChart;
