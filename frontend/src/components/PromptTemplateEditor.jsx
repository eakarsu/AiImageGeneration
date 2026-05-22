import { useEffect, useState } from 'react';

const inputStyle = { width: '100%', padding: '8px 10px', background: '#111827', border: '1px solid #374151', color: '#e5e7eb', borderRadius: 6, marginBottom: 8, fontSize: 13 };
const btn = { background: '#7c3aed', color: '#fff', border: 'none', padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13 };
const btnGhost = { ...btn, background: '#374151' };
const btnDanger = { ...btn, background: '#b91c1c' };

function PromptTemplateEditor() {
  const [items, setItems] = useState([]);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: '', body: '', style: '', tags: '' });
  const [msg, setMsg] = useState('');

  const headers = () => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  });

  const load = async () => {
    try {
      const r = await fetch('/api/custom-views/prompt-templates', { headers: headers() });
      const d = await r.json();
      if (d.error) { setMsg('Error: ' + d.error); return; }
      setItems(d.items || []);
    } catch (e) {
      setMsg('Error: ' + String(e));
    }
  };

  useEffect(() => { load(); }, []);

  const startCreate = () => {
    setEditing('new');
    setForm({ name: '', body: '', style: '', tags: '' });
  };

  const startEdit = (it) => {
    setEditing(it.id);
    setForm({ name: it.name || '', body: it.body || '', style: it.style || '', tags: it.tags || '' });
  };

  const cancel = () => { setEditing(null); setForm({ name: '', body: '', style: '', tags: '' }); };

  const save = async () => {
    setMsg('Saving…');
    try {
      let r, d;
      if (editing === 'new') {
        r = await fetch('/api/custom-views/prompt-templates', { method: 'POST', headers: headers(), body: JSON.stringify(form) });
      } else {
        r = await fetch(`/api/custom-views/prompt-templates/${editing}`, { method: 'PUT', headers: headers(), body: JSON.stringify(form) });
      }
      d = await r.json();
      if (d.error) { setMsg('Error: ' + d.error); return; }
      setMsg('Saved');
      cancel();
      load();
    } catch (e) {
      setMsg('Error: ' + String(e));
    }
  };

  const del = async (id) => {
    if (!confirm('Delete template?')) return;
    try {
      const r = await fetch(`/api/custom-views/prompt-templates/${id}`, { method: 'DELETE', headers: headers() });
      const d = await r.json();
      if (d.error) { setMsg('Error: ' + d.error); return; }
      setMsg('Deleted');
      load();
    } catch (e) {
      setMsg('Error: ' + String(e));
    }
  };

  return (
    <div style={{ background: '#1f2937', border: '1px solid #374151', borderRadius: 8, padding: 16, color: '#e5e7eb' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <strong>Prompt Templates (CRUD)</strong>
        <button onClick={startCreate} style={btn}>+ New Template</button>
      </div>

      {editing !== null && (
        <div style={{ background: '#111827', border: '1px solid #374151', borderRadius: 6, padding: 12, marginBottom: 12 }}>
          <input style={inputStyle} placeholder="Name"
                 value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <textarea style={{ ...inputStyle, minHeight: 80 }} placeholder="Body / Prompt"
                    value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
          <input style={inputStyle} placeholder="Style (optional)"
                 value={form.style} onChange={(e) => setForm({ ...form, style: e.target.value })} />
          <input style={inputStyle} placeholder="Tags (comma separated)"
                 value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} />
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={save} style={btn}>Save</button>
            <button onClick={cancel} style={btnGhost}>Cancel</button>
          </div>
        </div>
      )}

      <div>
        {items.length === 0 && <div style={{ fontSize: 12, color: '#9ca3af' }}>No templates yet.</div>}
        {items.map((it) => (
          <div key={it.id} style={{ borderTop: '1px solid #374151', padding: '8px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600 }}>{it.name}</div>
                <div style={{ fontSize: 11, color: '#9ca3af' }}>{it.style || 'no style'} · {it.tags || 'no tags'}</div>
                <div style={{ fontSize: 12, color: '#d1d5db', marginTop: 4 }}>{it.body}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button onClick={() => startEdit(it)} style={btnGhost}>Edit</button>
                <button onClick={() => del(it.id)} style={btnDanger}>Delete</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {msg && <div style={{ marginTop: 8, fontSize: 12, color: '#a78bfa' }}>{msg}</div>}
    </div>
  );
}

export default PromptTemplateEditor;
