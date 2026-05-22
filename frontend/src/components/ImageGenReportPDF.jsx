import { useState } from 'react';

function ImageGenReportPDF() {
  const [status, setStatus] = useState('');

  const download = async () => {
    setStatus('Generating PDF…');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/custom-views/image-gen-report.pdf', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const txt = await res.text();
        setStatus('Error: ' + txt.slice(0, 120));
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'image-gen-report.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setStatus('Downloaded image-gen-report.pdf');
    } catch (e) {
      setStatus('Error: ' + String(e));
    }
  };

  return (
    <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: 16, color: '#e5e7eb' }}>
      <div style={{ marginBottom: 8 }}>
        <strong>Image Generation Report</strong>
        <div style={{ fontSize: 12, color: '#9ca3af' }}>Aggregated stats: generations, gallery, prompts, style mix</div>
      </div>
      <button
        onClick={download}
        style={{ background: '#7c3aed', color: '#fff', border: 'none', padding: '10px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: 600 }}
      >
        Download PDF
      </button>
      {status && <div style={{ marginTop: 10, fontSize: 12, color: '#a78bfa' }}>{status}</div>}
    </div>
  );
}

export default ImageGenReportPDF;
