import { useEffect, useState } from 'react';
import { api } from './api';

function CreateProjectModal({ onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const proj = await api.post('/projects', form);
      onCreated(proj);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">New Project</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label>Project Name</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Website Redesign" required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="What is this project about?" rows={3} style={{ resize: 'vertical' }} />
          </div>
          {error && <div className="form-error">⚠ {error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating…' : 'Create Project →'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ProjectsPage({ onOpenProject }) {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.get('/projects').then(setProjects).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="text-muted">Loading projects…</div></div>;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-header-row">
          <div>
            <div className="page-title">Projects</div>
            <div className="page-subtitle">{projects.length} project{projects.length !== 1 ? 's' : ''} — click to manage</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ New Project</button>
        </div>
      </div>

      {projects.length === 0 ? (
        <div className="empty">
          <div className="empty-icon">⬡</div>
          <div className="empty-title">No projects yet</div>
          <div className="empty-sub">Create your first project and start managing tasks</div>
          <button className="btn btn-primary" onClick={() => setShowCreate(true)}>+ Create Project</button>
        </div>
      ) : (
        <div className="project-grid">
          {projects.map(p => (
            <div key={p.id} className="project-card" onClick={() => onOpenProject(p.id)}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`badge ${p.role === 'Admin' ? 'badge-admin' : 'badge-member'}`}>{p.role}</span>
              </div>
              <div className="project-card-name">{p.name}</div>
              <div className="project-card-desc">{p.description || 'No description'}</div>
              <div className="project-card-meta">
                <span className="text-xs text-muted">{p.member_count} member{p.member_count !== 1 ? 's' : ''}</span>
                <span className="text-xs text-muted">{p.task_count} task{p.task_count !== 1 ? 's' : ''}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={p => setProjects(ps => [p, ...ps])}
        />
      )}
    </div>
  );
}
