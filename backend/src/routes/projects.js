const router = require('express').Router();
const { body, validationResult } = require('express-validator');
const pool = require('../db/pool');
const { authenticate, loadProjectRole, requireAdmin } = require('../middleware/auth');

// All project routes require authentication
router.use(authenticate);

// GET /projects — list projects the user belongs to
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query(`
      SELECT p.*, pm.role, u.name AS created_by_name,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) AS task_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      LEFT JOIN users u ON u.id = p.created_by
      ORDER BY p.created_at DESC
    `, [req.user.id]);
    res.json(result.rows);
  } catch (err) { next(err); }
});

// POST /projects — create project, creator becomes Admin
router.post('/', [
  body('name').trim().notEmpty().withMessage('Project name is required'),
  body('description').optional().trim(),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { name, description } = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const proj = await client.query(
      'INSERT INTO projects (name, description, created_by) VALUES ($1, $2, $3) RETURNING *',
      [name, description || null, req.user.id]
    );
    await client.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [proj.rows[0].id, req.user.id, 'Admin']
    );
    await client.query('COMMIT');

    const enriched = await pool.query(`
      SELECT p.*, pm.role, u.name AS created_by_name,
        (SELECT COUNT(*) FROM project_members WHERE project_id = p.id) AS member_count,
        (SELECT COUNT(*) FROM tasks WHERE project_id = p.id) AS task_count
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id AND pm.user_id = $1
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.id = $2
    `, [req.user.id, proj.rows[0].id]);

    res.status(201).json(enriched.rows[0]);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// GET /projects/:id — project details + members
router.get('/:id', loadProjectRole, async (req, res, next) => {
  try {
    const proj = await pool.query(`
      SELECT p.*, u.name AS created_by_name
      FROM projects p LEFT JOIN users u ON u.id = p.created_by
      WHERE p.id = $1
    `, [req.params.id]);
    if (proj.rows.length === 0) return res.status(404).json({ error: 'Project not found' });

    const members = await pool.query(`
      SELECT pm.role, pm.joined_at, u.id, u.name, u.email
      FROM project_members pm JOIN users u ON u.id = pm.user_id
      WHERE pm.project_id = $1 ORDER BY pm.joined_at
    `, [req.params.id]);

    res.json({ ...proj.rows[0], role: req.projectRole, members: members.rows });
  } catch (err) { next(err); }
});

// POST /projects/:id/members — Admin adds member by email
router.post('/:id/members', loadProjectRole, requireAdmin, [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('role').optional().isIn(['Admin', 'Member']),
], async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { email, role = 'Member' } = req.body;
  try {
    const userRes = await pool.query('SELECT id, name, email FROM users WHERE email = $1', [email]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];

    const already = await pool.query(
      'SELECT id FROM project_members WHERE project_id = $1 AND user_id = $2',
      [req.params.id, user.id]
    );
    if (already.rows.length > 0) return res.status(400).json({ error: 'User is already a member' });

    await pool.query(
      'INSERT INTO project_members (project_id, user_id, role) VALUES ($1, $2, $3)',
      [req.params.id, user.id, role]
    );
    res.status(201).json({ message: 'Member added', user, role });
  } catch (err) { next(err); }
});

// DELETE /projects/:id/members/:uid — Admin removes member
router.delete('/:id/members/:uid', loadProjectRole, requireAdmin, async (req, res, next) => {
  const { id, uid } = req.params;
  if (uid === req.user.id) return res.status(400).json({ error: 'You cannot remove yourself' });
  try {
    const result = await pool.query(
      'DELETE FROM project_members WHERE project_id = $1 AND user_id = $2 RETURNING id',
      [id, uid]
    );
    if (result.rows.length === 0) return res.status(404).json({ error: 'Member not found' });
    res.json({ message: 'Member removed' });
  } catch (err) { next(err); }
});

// DELETE /projects/:id — Admin deletes project
router.delete('/:id', loadProjectRole, requireAdmin, async (req, res, next) => {
  try {
    await pool.query('DELETE FROM projects WHERE id = $1', [req.params.id]);
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
});

module.exports = router;
