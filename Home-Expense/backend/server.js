const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET;

const USERS = [
  {
    username: process.env.ADMIN_USERNAME,
    password: process.env.ADMIN_PASSWORD,
    role: 'admin',
    name: 'Admin'
  },
  {
    username: process.env.MOM_USERNAME,
    password: process.env.MOM_PASSWORD,
    role: 'mom',
    name: 'Damayanty'
  }
];

app.use(helmet({ contentSecurityPolicy: false }));

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: 'Too many requests'
});
app.use('/api/', apiLimiter);

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: '❌ Too many login attempts! Try again in 15 minutes'
});

app.use(cors());
app.use(bodyParser.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  const user = USERS.find(u => 
    u.username === username && u.password === password
  );

  if (user) {
    const token = jwt.sign(
      { username: user.username, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );
    res.json({
      success: true,
      token,
      user: {
        username: user.username,
        role: user.role,
        name: user.name
      },
      message: `✅ Welcome ${user.name} to Home Expense!`
    });
  } else {
    res.status(401).json({
      success: false,
      message: '❌ Wrong username or password'
    });
  }
});

app.get('/api/verify', (req, res) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ valid: false });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ valid: true, user: decoded });
  } catch {
    res.status(401).json({ valid: false });
  }
});

const { authMiddleware } = require('./middleware/auth');
const expenseRoutes = require('./routes/expenses');
app.use('/api/expenses', authMiddleware, expenseRoutes);

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('🏠 ================================');
  console.log('🏠  Home Expense is running!');
  console.log(`🏠  Open: http://localhost:${PORT}`);
  console.log('🏠 ================================');
});