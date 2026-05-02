const router = require('express').Router();
const pool = require('../db/pool');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

// GET /dashboard — stats for all projects the user belongs to
router.get('/', async (req, res, next) => {
  try {
    const userId = req.user.id;

    const projectsRes = await pool.query(`
      SELECT p.id, p.name, pm.role
      FROM projects p
      JOIN project_members pm ON pm.project_id = p.id
      WHERE pm.user_id = $1
    `, [userId]);
    const projectIds = projectsRes.rows.map(r => r.id);

    if (projectIds.length === 0) {
      return res.json({
        total_tasks: 0,
        by_status: { 'To Do': 0, 'In Progress': 0, 'Done': 0 },
        by_user: [],
        overdue: [],
        projects: []
      });
    }

    const statusRes = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM tasks
      WHERE project_id = ANY($1::uuid[])
      GROUP BY status
    `, [projectIds]);

    const by_status = { 'To Do': 0, 'In Progress': 0, 'Done': 0 };
    let total_tasks = 0;
    for (const row of statusRes.rows) {
      by_status[row.status] = Number(row.count);
      total_tasks += Number(row.count);
    }

    const byUserRes = await pool.query(`
      WITH project_memberships AS (
        SELECT DISTINCT u.id, u.name, u.email
        FROM project_members pm
        JOIN users u ON u.id = pm.user_id
        WHERE pm.project_id = ANY($1::uuid[])
      )
      SELECT pm.id, pm.name, pm.email,
        COUNT(t.id) AS total,
        COUNT(t.id) FILTER (WHERE t.status = 'Done') AS done,
        COUNT(t.id) FILTER (WHERE t.status = 'In Progress') AS in_progress,
        COUNT(t.id) FILTER (WHERE t.status = 'To Do') AS todo
      FROM project_memberships pm
      LEFT JOIN tasks t ON t.assigned_to = pm.id AND t.project_id = ANY($1::uuid[])
      GROUP BY pm.id, pm.name, pm.email
      ORDER BY total DESC, pm.name ASC
    `, [projectIds]);

    const overdueRes = await pool.query(`
      SELECT t.id, t.title, t.due_date, t.status, t.priority,
             p.name AS project_name, u.name AS assigned_to_name
      FROM tasks t
      JOIN projects p ON p.id = t.project_id
      LEFT JOIN users u ON u.id = t.assigned_to
      WHERE t.project_id = ANY($1::uuid[])
        AND t.due_date < CURRENT_DATE
        AND t.status != 'Done'
      ORDER BY t.due_date ASC
    `, [projectIds]);

    res.json({
      total_tasks,
      by_status,
      by_user: byUserRes.rows,
      overdue: overdueRes.rows,
      projects: projectsRes.rows,
    });
  } catch (err) { next(err); }
});

module.exports = router;
