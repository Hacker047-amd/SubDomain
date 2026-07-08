const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data/expenses.json');

// Helper to read data
function readData() {
  const raw = fs.readFileSync(dataFile);
  return JSON.parse(raw);
}

// Helper to write data
function writeData(data) {
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2));
}

// GET all expenses
router.get('/', (req, res) => {
  const expenses = readData();
  res.json(expenses);
});

// POST add new expense
router.post('/', (req, res) => {
  const expenses = readData();
  const newExpense = {
    id: Date.now(),
    title: req.body.title,
    amount: req.body.amount,
    category: req.body.category,
    date: req.body.date,
    note: req.body.note || ''
  };
  expenses.push(newExpense);
  writeData(expenses);
  res.json({ message: 'Expense added to Home Expense!', expense: newExpense });
});

// DELETE expense
router.delete('/:id', (req, res) => {
  let expenses = readData();
  expenses = expenses.filter(e => e.id !== parseInt(req.params.id));
  writeData(expenses);
  res.json({ message: 'Expense deleted from Home Expense!' });
});

module.exports = router;