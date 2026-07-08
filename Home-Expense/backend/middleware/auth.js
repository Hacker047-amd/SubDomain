const jwt = require('jsonwebtoken');
require('dotenv').config();

// Check if user is logged in
function authMiddleware(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Please login to Home Expense' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: 'Session expired, please login again' });
  }
}

// Check if user is admin only
function adminOnly(req, res, next) {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ 
      error: '❌ Only admin can do this action' 
    });
  }
  next();
}

module.exports = { authMiddleware, adminOnly };