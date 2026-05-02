import { useEffect, useState } from 'react';
import { api } from './api';
import { useAuth } from './AuthContext';

// ── Helpers ──────────────────────────────────────────────────────────────────
const isOverdue = t => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'Done';
const fmtDate = d => d ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

function statusBadge(s) {
  const cls = s === 'Done' ? 'badge-done' : s === 'In Progress' ? 'badge-inprogress' : 'badge-todo';
  return <span className={`badge ${cls}`}>{s}</span>;
}
function priorityBadge(p) {
  const cls = p === 'High' ? 'badge-high' : p === 'Low' ? 'badge-low' : 'badge-medium';
  return <span className={`badge ${cls}`}>{p}</span>;
}

// ── Create Task Modal ─────────────────────────────────────────────────────────
function CreateTaskModal({ projectId, members, onClose, onCreated }) {
  const [form, setForm] = useState({ title: '', description: '', due_date: '', priority: 'Medium', assigned_to: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const submit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const body = { ...form };
      if (!body.due_date) delete body.due_date;
      if (!body.assigned_to) delete body.assigned_to;
      const task = await api.post(`/projects/${projectId}/tasks`, body);
      onCreated(task);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Create Task</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Title</label>
            <input value={form.title} onChange={set('title')} placeholder="Task title" required />
          </div>
          <div className="form-group">
            <label>Description</label>
            <textarea value={form.description} onChange={set('description')} placeholder="What needs to be done?" rows={2} style={{ resize: 'vertical' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div className="form-group">
              <label>Due Date</label>
              <input type="date" value={form.due_date} onChange={set('due_date')} />
            </div>
            <div className="form-group">
              <label>Priority</label>
              <select value={form.priority} onChange={set('priority')}>
                <option>Low</option><option>Medium</option><option>High</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Assign To</label>
            <select value={form.assigned_to} onChange={set('assigned_to')}>
              <option value="">Unassigned</option>
              {members.map(m => <option key={m.id} value={m.id}>{m.name} ({m.role})</option>)}
            </select>
          </div>
          {error && <div className="form-error">⚠ {error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Creating…' : 'Create Task →'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Add Member Modal ──────────────────────────────────────────────────────────
function AddMemberModal({ projectId, onClose, onAdded }) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('Member');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await api.post(`/projects/${projectId}/members`, { email, role });
      onAdded(res.user, role);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-title">Add Member</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-group">
            <label>Email Address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="member@example.com" required />
          </div>
          <div className="form-group">
            <label>Role</label>
            <select value={role} onChange={e => setRole(e.target.value)}>
              <option>Member</option><option>Admin</option>
            </select>
          </div>
          {error && <div className="form-error">⚠ {error}</div>}
          <div className="modal-actions">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>{loading ? 'Adding…' : 'Add Member →'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Task Item ─────────────────────────────────────────────────────────────────
function TaskItem({ task, myRole, currentUserId, onUpdate, onDelete }) {
  const [status, setStatus] = useState(task.status);
  const [saving, setSaving] = useState(false);

  const canEdit = myRole === 'Admin' || task.assigned_to === currentUserId;

  const changeStatus = async (newStatus) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      const updated = await api.patch(`/projects/${task.project_id}/tasks/${task.id}`, { status: newStatus });
      setStatus(newStatus);
      onUpdate(updated);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this task?')) return;
    await api.delete(`/projects/${task.project_id}/tasks/${task.id}`);
    onDelete(task.id);
  };

  return (
    <div className="task-item">
      <div
        className={`task-check ${status === 'Done' ? 'done' : ''}`}
        onClick={() => canEdit && changeStatus(status === 'Done' ? 'To Do' : 'Done')}
        title={canEdit ? 'Toggle done' : 'No permission'}
        style={{ cursor: canEdit ? 'pointer' : 'default' }}
      >
        {status === 'Done' && <span style={{ color: '#0c0c0e', fontSize: 11, fontWeight: 800 }}>✓</span>}
      </div>
      <div className="task-body">
        <div className={`task-title ${status === 'Done' ? 'done' : ''}`}>{task.title}</div>
        {task.description && <div className="text-sm text-muted mt-1">{task.description}</div>}
        <div className="task-meta mt-1">
          {statusBadge(status)}
          {priorityBadge(task.priority)}
          {task.assigned_to_name && <span className="task-meta-item">👤 {task.assigned_to_name}</span>}
          {task.due_date && <span className="task-meta-item" style={{ color: isOverdue(task) ? 'var(--danger)' : undefined }}>
            📅 {fmtDate(task.due_date)} {isOverdue(task) && <span className="overdue-tag">overdue</span>}
          </span>}
        </div>
        {canEdit && myRole === 'Admin' && (
          <div className="flex gap-2 mt-2">
            {['To Do', 'In Progress', 'Done'].map(s => (
              <button key={s} className={`btn btn-sm ${status === s ? 'btn-primary' : ''}`} onClick={() => changeStatus(s)} disabled={saving}>
                {s}
              </button>
            ))}
          </div>
        )}
        {canEdit && myRole === 'Member' && status !== 'Done' && (
          <div className="flex gap-2 mt-2">
            {['To Do', 'In Progress', 'Done'].filter(s => s !== status).map(s => (
              <button key={s} className="btn btn-sm" onClick={() => changeStatus(s)} disabled={saving}>→ {s}</button>
            ))}
          </div>
        )}
      </div>
      {myRole === 'Admin' && (
        <div className="task-actions">
          <button className="btn btn-sm btn-danger" onClick={handleDelete}>✕</button>
        </div>
      )}
    </div>
  );
}

// ── Main Project Detail ───────────────────────────────────────────────────────
export default function ProjectDetail({ projectId, onBack }) {
  const { user } = useAuth();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('tasks');
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [filter, setFilter] = useState('All');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get(`/projects/${projectId}`),
      api.get(`/projects/${projectId}/tasks`),
    ]).then(([proj, taskList]) => {
      setProject(proj);
      setTasks(taskList);
    }).catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, [projectId]);

  const removeMember = async (uid) => {
    if (!confirm('Remove this member?')) return;
    await api.delete(`/projects/${projectId}/members/${uid}`);
    setProject(p => ({ ...p, members: p.members.filter(m => m.id !== uid) }));
  };

  const myRole = project?.role;
  const filteredTasks = filter === 'All' ? tasks : tasks.filter(t => t.status === filter);

  if (loading) return <div className="page"><div className="text-muted">Loading project…</div></div>;
  if (error) return <div className="page"><div className="text-danger">Error: {error}</div><button className="btn mt-3" onClick={onBack}>← Back</button></div>;

  return (
    <div className="page">
      {/* Header */}
      <div className="page-header">
        <button className="btn btn-ghost btn-sm mb-3" onClick={onBack}>← Back to Projects</button>
        <div className="page-header-row">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="page-title">{project.name}</div>
              <span className={`badge ${myRole === 'Admin' ? 'badge-admin' : 'badge-member'}`}>{myRole}</span>
            </div>
            {project.description && <div className="page-subtitle">{project.description}</div>}
          </div>
          {myRole === 'Admin' && tab === 'tasks' && (
            <button className="btn btn-primary" onClick={() => setShowCreateTask(true)}>+ New Task</button>
          )}
          {myRole === 'Admin' && tab === 'members' && (
            <button className="btn btn-primary" onClick={() => setShowAddMember(true)}>+ Add Member</button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid var(--border)', paddingBottom: 0 }}>
        {['tasks', 'members'].map(t => (
          <button key={t} className="btn btn-ghost" onClick={() => setTab(t)}
            style={{ borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', borderRadius: 0, color: tab === t ? 'var(--accent)' : 'var(--text2)', paddingBottom: 12 }}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
            {t === 'tasks' && <span className="text-xs ml-1" style={{ color: 'var(--text3)' }}>({tasks.length})</span>}
            {t === 'members' && <span className="text-xs ml-1" style={{ color: 'var(--text3)' }}>({project.members?.length || 0})</span>}
          </button>
        ))}
      </div>

      {/* Tasks tab */}
      {tab === 'tasks' && (
        <>
          <div className="flex gap-2 mb-4">
            {['All', 'To Do', 'In Progress', 'Done'].map(f => (
              <button key={f} className={`btn btn-sm ${filter === f ? 'btn-primary' : ''}`} onClick={() => setFilter(f)}>{f}</button>
            ))}
          </div>
          <div className="card">
            {filteredTasks.length === 0 ? (
              <div className="empty">
                <div className="empty-icon">◎</div>
                <div className="empty-title">No tasks {filter !== 'All' ? `with status "${filter}"` : 'yet'}</div>
                {myRole === 'Admin' && <button className="btn btn-primary mt-2" onClick={() => setShowCreateTask(true)}>+ Create first task</button>}
              </div>
            ) : filteredTasks.map(t => (
              <TaskItem
                key={t.id}
                task={t}
                myRole={myRole}
                currentUserId={user.id}
                onUpdate={updated => setTasks(ts => ts.map(x => x.id === updated.id ? updated : x))}
                onDelete={id => setTasks(ts => ts.filter(x => x.id !== id))}
              />
            ))}
          </div>
        </>
      )}

      {/* Members tab */}
      {tab === 'members' && (
        <div className="card">
          {(project.members || []).map(m => (
            <div key={m.id} className="flex items-center gap-3 py-3" style={{ borderBottom: '1px solid var(--border)' }}>
              <div className="user-avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
                {m.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>{m.name}</div>
                <div className="text-xs text-muted">{m.email}</div>
              </div>
              <span className={`badge ${m.role === 'Admin' ? 'badge-admin' : 'badge-member'}`}>{m.role}</span>
              {myRole === 'Admin' && m.id !== user.id && (
                <button className="btn btn-sm btn-danger" onClick={() => removeMember(m.id)}>Remove</button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateTask && (
        <CreateTaskModal
          projectId={projectId}
          members={project.members || []}
          onClose={() => setShowCreateTask(false)}
          onCreated={t => setTasks(ts => [t, ...ts])}
        />
      )}
      {showAddMember && (
        <AddMemberModal
          projectId={projectId}
          onClose={() => setShowAddMember(false)}
          onAdded={(u, role) => setProject(p => ({ ...p, members: [...p.members, { ...u, role }] }))}
        />
      )}
    </div>
  );
}
