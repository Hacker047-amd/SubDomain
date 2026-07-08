const API = '/api/expenses';
const TOKEN_KEY = 'home_expense_token';
const USER_KEY = 'home_expense_user';

let allExpenses = [];
let currentUser = null;

const COLORS = [
  '#667eea','#f093fb','#4facfe','#43e97b',
  '#fa709a','#fee140','#a18cd1','#fccb90',
  '#84fab0','#8fd3f4','#d4fc79','#96fbc4'
];

const CAT_ICONS = {
  'Groceries':'🛒','Vegetables':'🥦','Fruits':'🍎',
  'Milk & Dairy':'🥛','Medical':'💊','Electricity':'💡',
  'Water':'💧','School':'🏫','Transport':'🚗',
  'Clothes':'👗','Kitchen':'🍳','Entertainment':'🎬',
  'Religious':'🙏','Gifts':'🎁','Other':'📦'
};

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const user = localStorage.getItem(USER_KEY);
  return user ? JSON.parse(user) : null;
}

function isLoggedIn() {
  return !!getToken();
}

async function doLogin() {
  const password = document.getElementById('loginPassword').value;
  const userType = document.querySelector('input[name="userType"]:checked').value;
  const errorEl = document.getElementById('loginError');
  const btn = document.getElementById('loginBtn');

  if (!password) {
    errorEl.textContent = '⚠️ Please enter password';
    return;
  }

  btn.disabled = true;
  btn.textContent = '⏳ Logging in...';
  errorEl.textContent = '';

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: userType, password })
    });
    const data = await res.json();

    if (data.success) {
      localStorage.setItem(TOKEN_KEY, data.token);
      localStorage.setItem(USER_KEY, JSON.stringify(data.user));
      location.reload();
    } else {
      errorEl.textContent = data.message;
      btn.disabled = false;
      btn.textContent = '🔓 Login to Home Expense';
    }
  } catch {
    errorEl.textContent = '❌ Cannot connect to server';
    btn.disabled = false;
    btn.textContent = '🔓 Login to Home Expense';
  }
}

function doLogout() {
  if (!confirm('Are you sure you want to logout from Home Expense?')) return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  location.reload();
}

const originalFetch = window.fetch;
window.fetch = function(url, options = {}) {
  const token = getToken();
  if (token && typeof url === 'string' && url.includes('/api/')) {
    options.headers = {
      ...options.headers,
      'Authorization': `Bearer ${token}`
    };
  }
  return originalFetch(url, options).then(res => {
    if (res.status === 401 && !url.includes('/login')) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      location.reload();
    }
    return res;
  });
};

window.addEventListener('load', () => {
  if (!isLoggedIn()) {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('loginPassword')?.focus();
    
    document.getElementById('loginPassword')?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') doLogin();
    });
    return;
  }

  currentUser = getUser();

  setTimeout(() => {
    document.getElementById('loadingScreen').style.display = 'none';
    document.getElementById('app').style.display = 'flex';
    document.getElementById('loginScreen').style.display = 'none';
    init();
  }, 1500);
});

async function init() {
  document.body.classList.add(`role-${currentUser.role}`);
  document.getElementById('userAvatar').textContent = 
    currentUser.role === 'admin' ? '👨‍💻' : '👩';
  document.getElementById('userFullname').textContent = currentUser.name;
  document.getElementById('userRole').textContent = 
    currentUser.role === 'admin' ? 'Administrator' : 'Family Member';

  document.getElementById('date').valueAsDate = new Date();
  updateDateTime();
  setInterval(updateDateTime, 1000);
  populateMonthFilters();
  await loadExpenses();
}

function updateDateTime() {
  const el = document.getElementById('currentDateTime');
  if (el) {
    el.textContent = new Date().toLocaleString('en-IN', {
      weekday:'short', day:'numeric',
      month:'short', year:'numeric',
      hour:'2-digit', minute:'2-digit'
    });
  }
}

function populateMonthFilters() {
  const months = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      value: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`,
      label: d.toLocaleString('en-IN', { month:'long', year:'numeric' })
    });
  }
  ['filterMonth','reportMonth'].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    months.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.label;
      el.appendChild(opt);
    });
  });
}

async function loadExpenses() {
  try {
    const res = await fetch(API);
    allExpenses = await res.json();
    renderDashboard();
    renderHistory();
    generateReport();
  } catch {
    showToast('❌ Cannot connect to Home Expense server');
  }
}

function showPage(pageName) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById(`page-${pageName}`).classList.add('active');
  document.querySelector(`[data-page="${pageName}"]`).classList.add('active');

  const titles = {
    dashboard: ['Dashboard', `Welcome ${currentUser?.name || ''} to Home Expense`],
    add:       ['Add Expense', 'Record a new Home Expense entry'],
    history:   ['History', 'All your Home Expense records'],
    reports:   ['Reports', 'Home Expense spending analysis']
  };

  document.getElementById('pageTitle').textContent = titles[pageName][0];
  document.getElementById('pageSubtitle').textContent = titles[pageName][1];
  document.getElementById('sidebar').classList.remove('open');
  return false;
}

function toggleSidebar() {
  document.getElementById('sidebar').classList.toggle('open');
}

function renderDashboard() {
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const total = allExpenses.reduce((s,e) => s + e.amount, 0);
  const monthExpenses = allExpenses.filter(e => e.date && e.date.startsWith(thisMonth));
  const monthTotal = monthExpenses.reduce((s,e) => s + e.amount, 0);
  const highest = allExpenses.length ? Math.max(...allExpenses.map(e => e.amount)) : 0;

  document.getElementById('dash-total').textContent = formatMoney(total);
  document.getElementById('dash-count').textContent = allExpenses.length;
  document.getElementById('dash-month').textContent = formatMoney(monthTotal);
  document.getElementById('dash-highest').textContent = formatMoney(highest);
  document.getElementById('dash-month-name').textContent =
    now.toLocaleString('en-IN', { month:'long', year:'numeric' });

  renderRecentExpenses();
  renderCategoryBreakdown();
}

function renderRecentExpenses() {
  const container = document.getElementById('recentExpenses');
  const recent = [...allExpenses].sort((a,b) => b.id - a.id).slice(0,5);

  if (recent.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <p>🏠</p>
        <h3>No expenses yet</h3>
        <p>Start adding expenses to Home Expense!</p>
        <button class="btn-primary" onclick="showPage('add')">➕ Add First Expense</button>
      </div>`;
    return;
  }

  container.innerHTML = recent.map(e => `
    <div class="recent-item">
      <div class="recent-cat-icon">${CAT_ICONS[e.category] || '📦'}</div>
      <div class="recent-info">
        <h4>${e.title}</h4>
        <p>${e.category} • ${formatDate(e.date)} ${e.addedBy ? '• by ' + e.addedBy : ''}</p>
      </div>
      <div class="recent-amount">₹${e.amount}</div>
    </div>
  `).join('');
}

function renderCategoryBreakdown() {
  const container = document.getElementById('categoryBreakdown');
  const byCategory = {};
  allExpenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });
  const sorted = Object.entries(byCategory).sort((a,b) => b[1]-a[1]);

  if (sorted.length === 0) {
    container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">No data yet</p>';
    return;
  }

  const max = sorted[0][1];
  container.innerHTML = sorted.map(([cat, amt], i) => `
    <div class="cat-bar-item">
      <div class="cat-bar-header">
        <span>${CAT_ICONS[cat] || '📦'} ${cat}</span>
        <span>${formatMoney(amt)}</span>
      </div>
      <div class="cat-bar-track">
        <div class="cat-bar-fill" style="width:${(amt/max*100).toFixed(1)}%;background:${COLORS[i%COLORS.length]}"></div>
      </div>
    </div>
  `).join('');
}

function renderHistory() {
  const search = (document.getElementById('searchBox')?.value || '').toLowerCase();
  const filterCat = document.getElementById('filterCategory')?.value || 'All';
  const filterMonth = document.getElementById('filterMonth')?.value || 'All';
  const sortBy = document.getElementById('sortBy')?.value || 'newest';

  let filtered = allExpenses.filter(e => {
    const matchSearch =
      e.title.toLowerCase().includes(search) ||
      e.category.toLowerCase().includes(search) ||
      (e.note || '').toLowerCase().includes(search);
    const matchCat = filterCat === 'All' || e.category === filterCat;
    const matchMonth = filterMonth === 'All' || (e.date && e.date.startsWith(filterMonth));
    return matchSearch && matchCat && matchMonth;
  });

  filtered.sort((a,b) => {
    if (sortBy === 'newest')  return b.id - a.id;
    if (sortBy === 'oldest')  return a.id - b.id;
    if (sortBy === 'highest') return b.amount - a.amount;
    if (sortBy === 'lowest')  return a.amount - b.amount;
    return 0;
  });

  const filteredTotal = filtered.reduce((s,e) => s + e.amount, 0);
  document.getElementById('filteredCount').textContent = filtered.length;
  document.getElementById('filteredTotal').textContent = formatMoney(filteredTotal);

  const body = document.getElementById('expenseBody');
  const noData = document.getElementById('noData');

  if (filtered.length === 0) {
    body.innerHTML = '';
    noData.style.display = 'block';
    return;
  }

  noData.style.display = 'none';
  body.innerHTML = filtered.map(e => `
    <tr>
      <td>${formatDate(e.date)}</td>
      <td>
        <strong>${e.title}</strong>
        ${e.addedBy ? `<br><small style="color:#999">by ${e.addedBy}</small>` : ''}
      </td>
      <td><span class="category-badge">${CAT_ICONS[e.category] || '📦'} ${e.category}</span></td>
      <td><span class="payment-badge">${e.payment || 'Cash'}</span></td>
      <td class="amount-cell">₹${e.amount}</td>
      <td style="color:#718096">${e.note || '-'}</td>
      <td>
        <button class="btn-edit" onclick="openEdit(${e.id})">✏️ Edit</button>
        <button class="btn-delete" onclick="deleteExpense(${e.id})">🗑️</button>
      </td>
    </tr>
  `).join('');
}

document.getElementById('expenseForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = e.target.querySelector('button[type="submit"]');
  btn.textContent = '⏳ Saving...';
  btn.disabled = true;

  const payment = document.querySelector('input[name="payment"]:checked')?.value || 'Cash';
  const expense = {
    title:    document.getElementById('title').value.trim(),
    amount:   parseFloat(document.getElementById('amount').value),
    category: document.getElementById('category').value,
    date:     document.getElementById('date').value,
    note:     document.getElementById('note').value.trim(),
    payment
  };

  try {
    const res = await fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    const data = await res.json();
    if (data.success) {
      document.getElementById('expenseForm').reset();
      document.getElementById('date').valueAsDate = new Date();
      const msg = document.getElementById('successMsg');
      msg.style.display = 'block';
      setTimeout(() => { msg.style.display = 'none'; }, 3000);
      showToast(`✅ ${currentUser.name} saved to Home Expense!`);
      await loadExpenses();
    }
  } catch {
    showToast('❌ Failed to save');
  }

  btn.textContent = '💾 Save to Home Expense';
  btn.disabled = false;
});

async function deleteExpense(id) {
  if (currentUser.role !== 'admin') {
    showToast('❌ Only admin can delete');
    return;
  }
  if (!confirm('🗑️ Delete this expense from Home Expense?')) return;
  
  try {
    const res = await fetch(`${API}/${id}`, { method: 'DELETE' });
    if (res.ok) {
      showToast('🗑️ Deleted from Home Expense!');
      await loadExpenses();
    } else {
      const data = await res.json();
      showToast(data.error || '❌ Delete failed');
    }
  } catch {
    showToast('❌ Delete failed');
  }
}

function openEdit(id) {
  const expense = allExpenses.find(e => e.id === id);
  if (!expense) return;
  document.getElementById('edit-id').value = expense.id;
  document.getElementById('edit-title').value = expense.title;
  document.getElementById('edit-amount').value = expense.amount;
  document.getElementById('edit-category').value = expense.category;
  document.getElementById('edit-date').value = expense.date;
  document.getElementById('edit-note').value = expense.note || '';
  document.getElementById('editModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('editModal').style.display = 'none';
}

document.getElementById('editForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('edit-id').value;
  const updated = {
    title:    document.getElementById('edit-title').value.trim(),
    amount:   parseFloat(document.getElementById('edit-amount').value),
    category: document.getElementById('edit-category').value,
    date:     document.getElementById('edit-date').value,
    note:     document.getElementById('edit-note').value.trim()
  };
  try {
    await fetch(`${API}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    showToast('✅ Updated in Home Expense!');
    closeModal();
    await loadExpenses();
  } catch {
    showToast('❌ Update failed');
  }
});

document.getElementById('editModal').addEventListener('click', (e) => {
  if (e.target === document.getElementById('editModal')) closeModal();
});

function generateReport() {
  const month = document.getElementById('reportMonth')?.value || 'All';
  let data = month === 'All'
    ? allExpenses
    : allExpenses.filter(e => e.date && e.date.startsWith(month));

  const total = data.reduce((s,e) => s + e.amount, 0);
  const days = new Set(data.map(e => e.date)).size || 1;
  const avg = total / days;

  const byCategory = {};
  data.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + e.amount;
  });

  const topCat = Object.entries(byCategory).sort((a,b) => b[1]-a[1])[0];

  document.getElementById('report-total').textContent = formatMoney(total);
  document.getElementById('report-count').textContent = data.length;
  document.getElementById('report-avg').textContent = formatMoney(avg);
  document.getElementById('report-top').textContent = topCat
    ? `${CAT_ICONS[topCat[0]] || '📦'} ${topCat[0]}` : '-';

  renderReportChart(byCategory);
  renderDailyBreakdown(data);
}

function renderReportChart(byCategory) {
  const container = document.getElementById('reportChart');
  const sorted = Object.entries(byCategory).sort((a,b) => b[1]-a[1]);

  if (sorted.length === 0) {
    container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">No data</p>';
    return;
  }

  const max = sorted[0][1];
  container.innerHTML = sorted.map(([cat, amt], i) => `
    <div class="chart-bar-item">
      <div class="chart-bar-label">
        <span>${CAT_ICONS[cat] || '📦'} ${cat}</span>
        <span><strong>${formatMoney(amt)}</strong></span>
      </div>
      <div class="chart-bar-track">
        <div class="chart-bar-fill" style="width:${(amt/max*100).toFixed(1)}%;background:${COLORS[i%COLORS.length]}"></div>
      </div>
    </div>
  `).join('');
}

function renderDailyBreakdown(data) {
  const container = document.getElementById('dailyBreakdown');
  const byDay = {};
  data.forEach(e => {
    if (!e.date) return;
    if (!byDay[e.date]) byDay[e.date] = { total:0, count:0 };
    byDay[e.date].total += e.amount;
    byDay[e.date].count++;
  });

  const sorted = Object.entries(byDay).sort((a,b) => b[0].localeCompare(a[0]));

  if (sorted.length === 0) {
    container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">No data</p>';
    return;
  }

  container.innerHTML = sorted.map(([date, info]) => `
    <div class="daily-item">
      <div>
        <div class="daily-date">${formatDate(date)}</div>
        <div class="daily-count">${info.count} expense${info.count > 1 ? 's' : ''}</div>
      </div>
      <div class="daily-amount">${formatMoney(info.total)}</div>
    </div>
  `).join('');
}

function printReport() { window.print(); }

document.getElementById('searchBox')?.addEventListener('input', renderHistory);
document.getElementById('filterCategory')?.addEventListener('change', renderHistory);
document.getElementById('filterMonth')?.addEventListener('change', renderHistory);
document.getElementById('sortBy')?.addEventListener('change', renderHistory);
document.getElementById('reportMonth')?.addEventListener('change', generateReport);

function formatMoney(amount) {
  return '₹' + (parseFloat(amount) || 0).toLocaleString('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2
  });
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
    day:'2-digit', month:'short', year:'numeric'
  });
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.display = 'block';
  setTimeout(() => { toast.style.display = 'none'; }, 3000);
}

// PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js')
      .then(registration => console.log('🏠 SW registered'))
      .catch(err => console.log('🏠 SW failed:', err));
  });
}

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  if (!localStorage.getItem('installDismissed')) {
    setTimeout(() => {
      const banner = document.getElementById('installBanner');
      if (banner) banner.style.display = 'block';
    }, 3000);
  }
});

document.getElementById('installBtn')?.addEventListener('click', async () => {
  if (!deferredPrompt) {
    showToast('📱 Add to home screen from browser menu');
    return;
  }
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  if (outcome === 'accepted') {
    showToast('🎉 Home Expense installed!');
  }
  deferredPrompt = null;
  document.getElementById('installBanner').style.display = 'none';
});

function dismissInstall() {
  document.getElementById('installBanner').style.display = 'none';
  localStorage.setItem('installDismissed', 'true');
  setTimeout(() => {
    localStorage.removeItem('installDismissed');
  }, 7 * 24 * 60 * 60 * 1000);
}

window.addEventListener('appinstalled', () => {
  console.log('🏠 Home Expense installed!');
  showToast('🎉 Welcome to Home Expense App!');
});

if (window.matchMedia('(display-mode: standalone)').matches) {
  document.body.classList.add('installed-app');
}