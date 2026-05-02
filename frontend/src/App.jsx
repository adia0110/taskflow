import { useState } from 'react';
import { useAuth } from './AuthContext';
import AuthPage from './AuthPage';
import Sidebar from './Sidebar';
import Dashboard from './Dashboard';
import ProjectsPage from './ProjectsPage';
import ProjectDetail from './ProjectDetail';

export default function App() {
  const { user, loading } = useAuth();
  const [page, setPage] = useState('dashboard');
  const [projectId, setProjectId] = useState(null);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div style={{ color: 'var(--accent)', fontFamily: 'var(--mono)', fontSize: 13 }}>Loading…</div>
      </div>
    );
  }

  if (!user) return <AuthPage />;

  const openProject = (id) => {
    setProjectId(id);
    setPage('project-detail');
  };

  return (
    <div className="layout">
      <Sidebar page={page} setPage={p => { setPage(p); setProjectId(null); }} />
      <div className="main">
        {page === 'dashboard' && <Dashboard />}
        {page === 'projects' && <ProjectsPage onOpenProject={openProject} />}
        {page === 'project-detail' && projectId && (
          <ProjectDetail projectId={projectId} onBack={() => setPage('projects')} />
        )}
      </div>
    </div>
  );
}
