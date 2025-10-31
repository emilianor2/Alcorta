// backend/middleware/auth.js
import jwt from 'jsonwebtoken';

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ ok:false, error:'NO_TOKEN' });

  const token = header.split(' ')[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = payload; // { id, email, name, role }
    next();
  } catch (e) {
    return res.status(401).json({ ok:false, error:'BAD_TOKEN' });
  }
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ ok:false, error:'NO_AUTH' });
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ ok:false, error:'FORBIDDEN_ROLE' });
    }
    next();
  };
}

