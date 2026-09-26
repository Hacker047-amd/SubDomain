const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { adminOnly } = require('../middleware/auth');

const dataFile = path.join(__dirname, '../data/expenses.json');

function readData() {
  try {
    const raw = fs.readFileSync(dataFile, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

router.get('/', (req, res) => {
  res.json(readData());
});

router.post('/', (req, res) => {
  const expenses = readData();
  const newExpense = {
    id: Date.now(),
    title: req.body.title,
    amount: parseFloat(req.body.amount),
    category: req.body.category,
    date: req.body.date,
    note: req.body.note || '',
    payment: req.body.payment || 'Cash',
    addedBy: req.user.name,
    addedByRole: req.user.role,
    createdAt: new Date().toISOString()
  };
  expenses.push(newExpense);
  writeData(expenses);
  res.json({
    success: true,
    message: `✅ ${req.user.name} added to Home Expense!`,
    expense: newExpense
  });
});

router.put('/:id', (req, res) => {
  let expenses = readData();
  const index = expenses.findIndex(e => e.id === parseInt(req.params.id));
  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Not found' });
  }
  expenses[index] = {
    ...expenses[index],
    ...req.body,
    lastEditedBy: req.user.name,
    lastEditedAt: new Date().toISOString()
  };
  writeData(expenses);
  res.json({
    success: true,
    message: `✅ ${req.user.name} updated in Home Expense!`,
    expense: expenses[index]
  });
});

router.delete('/:id', adminOnly, (req, res) => {
  let expenses = readData();
  expenses = expenses.filter(e => e.id !== parseInt(req.params.id));
  writeData(expenses);
  res.json({
    success: true,
    message: '🗑️ Admin deleted from Home Expense!'
  });
});

module.exports = router;