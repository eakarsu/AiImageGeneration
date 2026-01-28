import { Link, useNavigate } from 'react-router-dom';

function Navbar() {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">AI Image Gen</Link>
      <div className="navbar-links">
        <Link to="/">Dashboard</Link>
        <Link to="/gallery">Gallery</Link>
        <Link to="/prompts">Prompts</Link>
        <Link to="/styles">Styles</Link>
        <Link to="/history">History</Link>
        <Link to="/generate">Generate</Link>
        <Link to="/profile">Profile</Link>
        <button className="logout-btn" onClick={handleLogout}>Logout</button>
      </div>
    </nav>
  );
}

export default Navbar;
