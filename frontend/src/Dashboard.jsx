import { useEffect, useState } from 'react';
import { api } from './api';

function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card" style={accent ? { borderColor: accent + '33' } : {}}>
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={accent ? { color: accent } : {}}>{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/dashboard')
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page"><div className="text-muted">Loading dashboard…</div></div>;
  if (error) return <div className="page"><div className="text-danger">Error: {error}</div></div>;

  const { total_tasks, by_status, by_user, overdue, projects } = data;

  return (
    <div className="page">
      <div className="page-header">
        <div className="page-title">Dashboard</div>
        <div className="page-subtitle">Overview across all your projects</div>
      </div>

      <div className="stats-grid">
        <StatCard label="Total tasks" value={total_tasks} sub={`across ${projects.length} project${projects.length !== 1 ? 's' : ''}`} />
        <StatCard label="To Do" value={by_status['To Do'] || 0} accent="#8888cc" />
        <StatCard label="In Progress" value={by_status['In Progress'] || 0} accent="#5b9ef7" />
        <StatCard label="Done" value={by_status['Done'] || 0} accent="#4ade80" />
        <StatCard label="Overdue" value={overdue.length} accent={overdue.length > 0 ? '#f87171' : undefined} sub="not done past due date" />
      </div>

      {overdue.length > 0 && (
        <div className="card mb-4" style={{ borderColor: '#3a1515' }}>
          <div className="flex items-center gap-2 mb-3">
            <span style={{ color: 'var(--danger)', fontWeight: 700 }}>⚠ Overdue Tasks</span>
            <span className="badge badge-high">{overdue.length}</span>
          </div>
          {overdue.map(t => (
            <div key={t.id} className="task-item">
              <div className="task-body">
                <div className="task-title">{t.title}</div>
                <div className="task-meta">
                  <span className="task-meta-item">📁 {t.project_name}</span>
                  {t.assigned_to_name && <span className="task-meta-item">👤 {t.assigned_to_name}</span>}
                  <span className="overdue-tag">due {t.due_date?.slice(0, 10)}</span>
                  <span className={`badge badge-${t.priority.toLowerCase()}`}>{t.priority}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {by_user.length > 0 && (
        <div className="card">
          <div style={{ fontWeight: 700, marginBottom: 16 }}>Tasks per member</div>
          {by_user.map(u => (
            <div key={u.id} style={{ marginBottom: 14 }}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <div className="user-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>
                    {u.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-sm">{u.name}</span>
                </div>
                <span className="text-xs text-muted">{u.total} tasks</span>
              </div>
              <div style={{ height: 4, background: 'var(--bg4)', borderRadius: 2, overflow: 'hidden' }}>
                <div style={{
                  height: '100%',
                  background: 'var(--accent)',
                  width: total_tasks ? `${Math.round((u.total / total_tasks) * 100)}%` : '0%',
                  borderRadius: 2,
                  transition: 'width 0.5s ease',
                }} />
              </div>
              <div className="flex gap-3 mt-1">
                <span className="text-xs" style={{ color: '#8888cc' }}>{u.todo} todo</span>
                <span className="text-xs" style={{ color: 'var(--info)' }}>{u.in_progress} in progress</span>
                <span className="text-xs" style={{ color: 'var(--success)' }}>{u.done} done</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {projects.length === 0 && (
        <div className="empty">
          <div className="empty-icon">◈</div>
          <div className="empty-title">No projects yet</div>
          <div className="empty-sub">Create a project to start tracking tasks</div>
        </div>
      )}
    </div>
  );
}
