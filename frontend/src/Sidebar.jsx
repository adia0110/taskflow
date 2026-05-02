import { useAuth } from './AuthContext';

const ICONS = {
  dashboard: '◈',
  projects: '⬡',
  logout: '→',
};

export default function Sidebar({ page, setPage }) {
  const { user, logout } = useAuth();
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || '??';

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-text">TaskFlow</div>
        <div className="logo-sub">// task manager</div>
      </div>

      <nav className="sidebar-nav">
        <div className="nav-section">Navigation</div>
        <div
          className={`nav-item ${page === 'dashboard' ? 'active' : ''}`}
          onClick={() => setPage('dashboard')}
        >
          <span>{ICONS.dashboard}</span> Dashboard
        </div>
        <div
          className={`nav-item ${page === 'projects' || page === 'project-detail' ? 'active' : ''}`}
          onClick={() => setPage('projects')}
        >
          <span>{ICONS.projects}</span> Projects
        </div>
      </nav>

      <div className="sidebar-user">
        <div className="user-avatar">{initials}</div>
        <div className="user-info">
          <div className="user-name truncate">{user?.name}</div>
          <div className="user-email truncate">{user?.email}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout} title="Sign out">→</button>
      </div>
    </div>
  );
}
