import { Link } from 'react-router-dom';

const features = [
  { path: '/generate', icon: 'generate', title: 'Generate', desc: 'Create new AI-generated images' },
  { path: '/gallery', icon: 'gallery', title: 'Gallery', desc: 'View and manage your generated images' },
  { path: '/prompts', icon: 'prompts', title: 'Prompts', desc: 'Browse and create text prompts' },
  { path: '/styles', icon: 'styles', title: 'Art Styles', desc: 'Explore different artistic styles' },
  { path: '/history', icon: 'history', title: 'History', desc: 'View your generation history' },
  { path: '/prompt-optimizer', icon: 'optimizer', title: 'Prompt Optimizer', desc: 'AI-powered prompt enhancement' },
  { path: '/art-instructor', icon: 'instructor', title: 'Art Instructor', desc: 'Learn art techniques with AI' },
  { path: '/style-transfer', icon: 'transfer', title: 'Style Transfer', desc: 'Transform images between styles' },
  { path: '/upscaler', icon: 'upscaler', title: 'AI Upscaler', desc: 'Enhance image resolution with AI' },
  { path: '/variation-generator', icon: 'variation', title: 'Variation Generator', desc: 'Create prompt variations' },
  { path: '/brand-asset-creator', icon: 'brand', title: 'Brand Asset Creator', desc: 'Design professional brand assets' },
];

const dashIcons = {
  generate: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  gallery: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  prompts: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  ),
  styles: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="10.5" r="2.5" />
      <circle cx="8.5" cy="7.5" r="2.5" />
      <circle cx="6.5" cy="12.5" r="2.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.5-9-10-9z" />
    </svg>
  ),
  history: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  ),
  optimizer: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
    </svg>
  ),
  instructor: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  ),
  transfer: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17,1 21,5 17,9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7,23 3,19 7,15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  ),
  upscaler: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,3 21,3 21,9" />
      <polyline points="9,21 3,21 3,15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  variation: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="6" height="10" rx="1" />
      <rect x="9" y="5" width="6" height="14" rx="1" />
      <rect x="16" y="7" width="6" height="10" rx="1" />
    </svg>
  ),
  brand: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  ),
};

function Dashboard() {
  return (
    <div className="page-container">
      <div className="dashboard-welcome">
        <h1>Welcome back</h1>
        <p>Create, explore, and manage your AI-generated artwork.</p>
      </div>
      <div className="dashboard-grid">
        {features.map((f) => (
          <Link key={f.path} to={f.path} className="dashboard-card">
            <div className="dashboard-card-icon">{dashIcons[f.icon]}</div>
            <h3>{f.title}</h3>
            <p>{f.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
