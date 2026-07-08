// ===== HOME EXPENSE - FRONTEND LOGIC =====

const API = 'http://localhost:3000/api/expenses';

// Set today's date automatically
document.getElementById('date').valueAsDate = new Date();

// ===== LOAD ALL EXPENSES =====
async function loadExpenses() {
  const res = await fetch(API);
  const expenses = await res.json();
  displayExpenses(expenses);
  updateSummary(expenses);
}

// ===== DISPLAY EXPENSES IN TABLE =====
function displayExpenses(expenses) {
  const body = document.getElementById('expenseBody');
  const noData = document.getElementById('noData');
  const search = document.getElementById('searchBox').value.toLowerCase();
  const filterCat = document.getElementById('filterCategory').value;

  // Filter
  let filtered = expenses.filter(e => {
    const matchSearch = e.title.toLowerCase().includes(search) ||
                        e.category.toLowerCase().includes(search);
    const matchCat = filterCat === 'All' || e.category === filterCat;
    return matchSearch && matchCat;
  });

  body.innerHTML = '';

  if (filtered.length === 0) {
    noData.style.display = 'block';
    return;
  }

  noData.style.display = 'none';

  // Sort by newest first
  filtered.sort((a, b) => b.id - a.id);

  filtered.forEach(expense => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${formatDate(expense.date)}</td>
      <td><strong>${expense.title}</strong></td>
      <td>${expense.category}</td>
      <td style="color:#e74c3c; font-weight:bold;">₹${expense.amount}</td>
      <td>${expense.note || '-'}</td>
      <td>
        <button class="btn-delete" onclick="deleteExpense(${expense.id})">
          🗑️ Delete
        </button>
      </td>
    `;
    body.appendChild(row);
  });
}

// ===== UPDATE SUMMARY CARDS =====
function updateSummary(expenses) {
  const total = expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0);
  const highest = expenses.length > 0
    ? Math.max(...expenses.map(e => parseFloat(e.amount)))
    : 0;

  document.getElementById('totalAmount').textContent = `₹${total.toFixed(2)}`;
  document.getElementById('totalCount').textContent = expenses.length;
  document.getElementById('highestAmount').textContent = `₹${highest.toFixed(2)}`;
}

// ===== ADD EXPENSE =====
document.getElementById('expenseForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const expense = {
    title: document.getElementById('title').value,
    amount: document.getElementById('amount').value,
    category: document.getElementById('category').value,
    date: document.getElementById('date').value,
    note: document.getElementById('note').value
  };

  await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense)
  });

  // Reset form
  document.getElementById('expenseForm').reset();
  document.getElementById('date').valueAsDate = new Date();

  alert('✅ Expense saved to Home Expense!');
  loadExpenses();
});

// ===== DELETE EXPENSE =====
async function deleteExpense(id) {
  if (!confirm('Are you sure you want to delete this from Home Expense?')) return;

  await fetch(`${API}/${id}`, { method: 'DELETE' });
  loadExpenses();
}

// ===== FORMAT DATE =====
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });
}

// ===== SEARCH & FILTER LISTENERS =====
document.getElementById('searchBox').addEventListener('input', loadExpenses);
document.getElementById('filterCategory').addEventListener('change', loadExpenses);

// ===== INITIAL LOAD =====
loadExpenses();