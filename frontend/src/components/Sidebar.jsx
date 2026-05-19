import { NavLink, useNavigate } from 'react-router-dom';
import { useState } from 'react';

const navSections = [
  {
    label: 'MAIN',
    items: [
      { path: '/', icon: 'dashboard', title: 'Dashboard' },
      { path: '/generate', icon: 'generate', title: 'Generate' },
    ],
  },
  {
    label: 'LIBRARY',
    items: [
      { path: '/gallery', icon: 'gallery', title: 'Gallery' },
      { path: '/prompts', icon: 'prompts', title: 'Prompts' },
      { path: '/styles', icon: 'styles', title: 'Styles' },
      { path: '/history', icon: 'history', title: 'History' },
    ],
  },
  {
    label: 'AI TOOLS',
    items: [
      { path: '/prompt-optimizer', icon: 'optimizer', title: 'Prompt Optimizer' },
      { path: '/art-instructor', icon: 'instructor', title: 'Art Instructor' },
      { path: '/style-transfer', icon: 'transfer', title: 'Style Transfer' },
      { path: '/upscaler', icon: 'upscaler', title: 'AI Upscaler' },
      { path: '/variation-generator', icon: 'variation', title: 'Variation Generator' },
      { path: '/brand-asset-creator', icon: 'brand', title: 'Brand Asset Creator' },
      { path: '/custom-views', icon: 'gallery', title: 'Image Views' },
    ],
  },
  {
    label: 'ACCOUNT',
    items: [
      { path: '/profile', icon: 'profile', title: 'Profile' },
    ],
  },
];

const icons = {
  dashboard: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
  ),
  generate: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
    </svg>
  ),
  gallery: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <path d="M21 15l-5-5L5 21" />
    </svg>
  ),
  prompts: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
      <path d="M14 2v6h6" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </svg>
  ),
  styles: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="13.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="10.5" r="2.5" />
      <circle cx="8.5" cy="7.5" r="2.5" />
      <circle cx="6.5" cy="12.5" r="2.5" />
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.93 0 1.5-.67 1.5-1.5 0-.39-.15-.74-.39-1.04-.23-.29-.38-.63-.38-1.04 0-.83.67-1.5 1.5-1.5H16c3.31 0 6-2.69 6-6 0-5.17-4.5-9-10-9z" />
    </svg>
  ),
  history: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12,6 12,12 16,14" />
    </svg>
  ),
  optimizer: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
    </svg>
  ),
  instructor: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  ),
  transfer: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="17,1 21,5 17,9" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <polyline points="7,23 3,19 7,15" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  ),
  upscaler: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,3 21,3 21,9" />
      <polyline points="9,21 3,21 3,15" />
      <line x1="21" y1="3" x2="14" y2="10" />
      <line x1="3" y1="21" x2="10" y2="14" />
    </svg>
  ),
  variation: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="7" width="6" height="10" rx="1" />
      <rect x="9" y="5" width="6" height="14" rx="1" />
      <rect x="16" y="7" width="6" height="10" rx="1" />
    </svg>
  ),
  brand: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  ),
  profile: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  ),
};

function Sidebar() {
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem('token');
    navigate('/login');
  };

  const closeMobile = () => setMobileOpen(false);

  return (
    <>
      <button
        className="sidebar-hamburger"
        onClick={() => setMobileOpen(!mobileOpen)}
        aria-label="Toggle navigation"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {mobileOpen ? (
            <>
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </>
          ) : (
            <>
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </>
          )}
        </svg>
      </button>

      {mobileOpen && <div className="sidebar-overlay" onClick={closeMobile} />}

      <aside className={`sidebar ${mobileOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-logo">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="13,2 3,14 12,14 11,22 21,10 12,10" />
          </svg>
          <span>AI Image Gen</span>
        </div>

        <nav className="sidebar-nav">
          {navSections.map((section) => (
            <div key={section.label} className="sidebar-section">
              <div className="sidebar-section-label">{section.label}</div>
              {section.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? 'sidebar-link--active' : ''}`
                  }
                  onClick={closeMobile}
                >
                  <span className="sidebar-link-icon">{icons[item.icon]}</span>
                  <span className="sidebar-link-text">{item.title}</span>
                </NavLink>
              ))}
            </div>
          ))}
        
        {/* // === Batch 04 Gaps & Frontend Mounts === */}
        <div style={{ borderTop: '1px solid #eee', marginTop: '0.5rem', paddingTop: '0.5rem' }}>
        <a href="/cf-agentic-creative-assistant-auto-generati" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Agentic creative assistant auto-generati</a>
        <a href="/cf-batch-generation-scheduling-for-weekly-s" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Batch generation + scheduling for weekly</a>
        <a href="/cf-prompt-learning-from-user-history-with" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Prompt learning from user history with a</a>
        <a href="/cf-image-marketplace-licensing-with-drm-and" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Image marketplace + licensing with DRM a</a>
        <a href="/cf-brand-consistency-guardrails-enforcing-u" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Brand consistency guardrails enforcing u</a>
        <a href="/cf-multimodal-refinement-combining-referenc" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>Multimodal refinement combining referenc</a>
        <a href="/gap-no-live-generate-image-endpoint-only" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No live /generate-image endpoint (only r</a>
        <a href="/gap-no-active-prompt-improvement-ai-only" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No active prompt-improvement AI (only st</a>
        <a href="/gap-no-real-style-transfer-execution" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No real style-transfer execution</a>
        <a href="/gap-no-upscaling-execution" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No upscaling execution</a>
        <a href="/gap-no-variation-execution" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No variation execution</a>
        <a href="/gap-no-payment-processing-surface-beyond-str" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No payment processing surface beyond Str</a>
        <a href="/gap-no-image-marketplace-royalty-tracking" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No image marketplace / royalty tracking</a>
        <a href="/gap-no-collaboration-shared-workspaces" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No collaboration / shared workspaces</a>
        <a href="/gap-no-public-profileportfolio-pages" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No public profile/portfolio pages</a>
        <a href="/gap-no-webhook-surface" style={{ display: "block", padding: "0.4rem 0.6rem", fontSize: "0.85rem" }}>No webhook surface</a>
        </div>
</nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" onClick={handleLogout}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
              <polyline points="16,17 21,12 16,7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            <span>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
