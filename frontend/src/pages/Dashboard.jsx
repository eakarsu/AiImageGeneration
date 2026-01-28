import { Link } from 'react-router-dom';

const features = [
  { path: '/gallery', icon: '\u{1F5BC}', title: 'Gallery', desc: 'View and manage your generated images' },
  { path: '/prompts', icon: '\u{1F4DD}', title: 'Prompts', desc: 'Browse and create text prompts' },
  { path: '/styles', icon: '\u{1F3A8}', title: 'Art Styles', desc: 'Explore different artistic styles' },
  { path: '/history', icon: '\u{1F4C3}', title: 'History', desc: 'View your generation history' },
  { path: '/generate', icon: '\u{2728}', title: 'Generate', desc: 'Create new AI-generated images' },
];

function Dashboard() {
  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>
      <div className="dashboard-grid">
        {features.map((f) => (
          <Link key={f.path} to={f.path} className="dashboard-card">
            <div className="dashboard-card-icon">{f.icon}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
