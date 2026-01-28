import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';

function History() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState('');
  const [styleFilter, setStyleFilter] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [styles, setStyles] = useState([]);
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const debounceRef = useRef(null);

  useEffect(() => {
    fetch('/api/styles', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(setStyles)
      .catch(console.error);
  }, []);

  const fetchItems = (currentPage, currentSearch, currentStyle) => {
    const params = new URLSearchParams({ page: currentPage, limit: 12 });
    if (currentSearch) params.set('search', currentSearch);
    if (currentStyle) params.set('style', currentStyle);

    fetch(`/api/history?${params}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => {
        setItems(data.items);
        setTotalPages(data.totalPages);
      })
      .catch(console.error);
  };

  useEffect(() => {
    fetchItems(page, search, styleFilter);
  }, [page]);

  const handleSearchChange = (value) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchItems(1, value, styleFilter);
    }, 300);
  };

  const handleStyleChange = (value) => {
    setStyleFilter(value);
    setPage(1);
    fetchItems(1, search, value);
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Generation History</h1>
      </div>
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search by prompt..."
          value={search}
          onChange={e => handleSearchChange(e.target.value)}
          className="filter-input"
        />
        <select value={styleFilter} onChange={e => handleStyleChange(e.target.value)} className="filter-select">
          <option value="">All Styles</option>
          {styles.map(s => (
            <option key={s.id} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>
      <div className="cards-grid">
        {items.map(item => (
          <Card
            key={item.id}
            title={item.prompt && item.prompt.substring(0, 40) + '...'}
            text={`Style: ${item.style || 'N/A'}`}
            badge={item.status}
            imageUrl={item.image_url}
            onClick={() => navigate(`/history/${item.id}`)}
          />
        ))}
      </div>
      {items.length === 0 && <p className="empty-state">No items found.</p>}
      {totalPages > 1 && (
        <div className="pagination">
          <button className="btn-secondary" onClick={() => setPage(p => p - 1)} disabled={page <= 1}>Previous</button>
          <span className="page-indicator">Page {page} of {totalPages}</span>
          <button className="btn-secondary" onClick={() => setPage(p => p + 1)} disabled={page >= totalPages}>Next</button>
        </div>
      )}
    </div>
  );
}

export default History;
