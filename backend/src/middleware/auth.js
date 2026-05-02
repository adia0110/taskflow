const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const authenticate = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Attach project membership role to req.projectRole
const loadProjectRole = async (req, res, next) => {
  const { id } = req.params;
  try {
    const result = await pool.query(
      'SELECT role FROM project_members WHERE project_id = $1 AND user_id = $2',
      [id, req.user.id]
    );
    if (result.rows.length === 0) {
      return res.status(403).json({ error: 'You are not a member of this project' });
    }
    req.projectRole = result.rows[0].role;
    next();
  } catch (err) {
    next(err);
  }
};

const requireAdmin = (req, res, next) => {
  if (req.projectRole !== 'Admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

module.exports = { authenticate, loadProjectRole, requireAdmin };
