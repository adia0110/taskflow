const router = require('express').Router({ mergeParams: true });
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authenticate, loadProjectRole, requireAdmin } = require('../middleware/auth');

router.use(authenticate);
router.use(loadProjectRole);

// GET /projects/:id/tasks
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT t.*, u.name AS assigned_to_name, u.email AS assigned_to_email,
             cu.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users cu ON cu.id = t.created_by
      WHERE t.project_id = $1
      ORDER BY
        CASE t.priority WHEN 'High' THEN 1 WHEN 'Medium' THEN 2 ELSE 3 END,
        t.due_date NULLS LAST, t.created_at DESC
    `, [req.params.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /projects/:id/tasks — Admin only creates tasks
router.post('/', requireAdmin, [
  body('title').trim().notEmpty().withMessage('Title is required'),
  body('description').optional().trim(),
  body('due_date').optional().isDate().withMessage('Invalid date'),
  body('priority').optional().isIn(['Low', 'Medium', 'High']),
  body('assigned_to').optional().isUUID(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { title, description, due_date, priority = 'Medium', assigned_to } = req.body;

  // Validate assignee is a member
  if (assigned_to) {
    const check = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.id, assigned_to]
    );
    if (check.rows.length === 0) {
      return res.status(400).json({ error: 'Assignee must be a project member' });
    }
  }

  try {
    const result = await pool.query(`
      INSERT INTO tasks (project_id, title, description, due_date, priority, assigned_to, created_by)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [req.params.id, title, description || null, due_date || null, priority, assigned_to || null, req.user.id]);

    const task = result.rows[0];
    const enriched = await pool.query(`
      SELECT t.*, u.name AS assigned_to_name, cu.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users cu ON cu.id = t.created_by
      WHERE t.id = $1
    `, [task.id]);
    res.status(201).json(enriched.rows[0]);
  } catch (err) { next(err); }
});

// PATCH /projects/:id/tasks/:taskId — update task
router.patch('/:taskId', async (req, res, next) => {
  const { taskId } = req.params;
  try {
    const taskRes = await pool.query('SELECT * FROM tasks WHERE id = $1 AND project_id = $2', [taskId, req.params.id]);
    if (taskRes.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    const task = taskRes.rows[0];

    // Members can only update tasks assigned to them
    if (req.projectRole === 'Member' && task.assigned_to !== req.user.id) {
      return res.status(403).json({ error: 'You can only update tasks assigned to you' });
    }

    const allowed = req.projectRole === 'Admin'
      ? ['title', 'description', 'due_date', 'priority', 'status', 'assigned_to']
      : ['status'];

    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    if (updates.status && !['To Do', 'In Progress', 'Done'].includes(updates.status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    if (updates.assigned_to) {
      const memberCheck = await pool.query(
        'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
        [req.params.id, updates.assigned_to]
      );
      if (memberCheck.rows.length === 0) {
        return res.status(400).json({ error: 'Assignee must be a project member' });
      }
    }

    const keys = Object.keys(updates);
    const values = Object.values(updates);
    const setClause = keys.map((k, i) => `${k} = $${i + 1}`).join(', ');
    values.push(new Date(), taskId);

    await pool.query(
      `UPDATE tasks SET ${setClause}, updated_at = $${values.length - 1} WHERE id = $${values.length} RETURNING *`,
      values
    );

    const enriched = await pool.query(`
      SELECT t.*, u.name AS assigned_to_name, cu.name AS created_by_name
      FROM tasks t
      LEFT JOIN users u ON u.id = t.assigned_to
      LEFT JOIN users cu ON cu.id = t.created_by
      WHERE t.id = $1
    `, [taskId]);
    res.json(enriched.rows[0]);
  } catch (err) { next(err); }
});

// DELETE /projects/:id/tasks/:taskId — Admin only
router.delete('/:taskId', requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(
      'DELETE FROM tasks WHERE id = $1 AND project_id = $2 RETURNING id',
      [req.params.taskId, req.params.id]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Task not found' });
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
