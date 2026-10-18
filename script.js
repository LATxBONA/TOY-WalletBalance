let expenses = [];

function applyTheme(isDark) {
  document.body.classList.toggle('dark-mode', isDark);
  document.getElementById('theme-icon').textContent = isDark ? '☀️' : '🌙';
  document.getElementById('theme-label').textContent = isDark ? 'Chế độ sáng' : 'Chế độ tối';
  localStorage.setItem('wallet-theme', isDark ? 'dark' : 'light');
}

function toggleTheme() {
  applyTheme(!document.body.classList.contains('dark-mode'));
}

function toggleSplitType() {
  const type = document.getElementById('split-type').value;
  document.getElementById('equal-section').classList.toggle('hidden', type !== 'equal');
  document.getElementById('individual-section').classList.toggle('hidden', type !== 'individual');
}

function addIndividualRow(name = '', amount = '', itemName = '') {
  const list = document.getElementById('individual-list');
  const div = document.createElement('div');
  div.className = 'ind-row';
  div.innerHTML = `
    <input type="text" class="ind-item" placeholder="Tên món" value="${escapeHtml(itemName)}">
    <input type="text" class="ind-person" placeholder="Người gọi" value="${escapeHtml(name)}">
    <input type="number" class="ind-amount" placeholder="Tiền (đ)" value="${amount === '' ? '' : Number(amount)}">
    <button type="button" class="remove-btn small remove" onclick="this.parentElement.remove()">✕</button>
  `;
  list.appendChild(div);
}

function addExpense() {
  const date = document.getElementById('date').value;
  const title = document.getElementById('title').value.trim();
  const payer = document.getElementById('payer').value.trim();
  const type = document.getElementById('split-type').value;

  if (!date || !title || !payer) {
    alert('Vui lòng điền ngày, tên và người trả.');
    return;
  }

  const expense = { date, title, payer, type, details: [], amount: 0 };

  if (type === 'equal') {
    const amount = parseFloat(document.getElementById('amount').value);
    const participants = document.getElementById('participants').value.split(',').map(n => n.trim()).filter(n => n);

    if (!amount || amount <= 0 || participants.length === 0) {
      alert('Vui lòng nhập tổng tiền và người tham gia hợp lệ.');
      return;
    }

    const perPerson = amount / participants.length;
    participants.forEach(name => expense.details.push({ name, owe: perPerson }));
    expense.amount = amount;
  } else {
    const rows = document.querySelectorAll('#individual-list .ind-row');
    if (rows.length === 0) {
      alert('Vui lòng thêm ít nhất 1 dòng món.');
      return;
    }

    let total = 0;
    rows.forEach(row => {
      const itemName = row.querySelector('.ind-item').value.trim();
      const names = row.querySelector('.ind-person').value.split(',').map(n => n.trim()).filter(n => n);
      const amount = parseFloat(row.querySelector('.ind-amount').value);

      if (names.length === 0 || !amount || amount <= 0) return;

      names.forEach(name => expense.details.push({ name, owe: amount, itemName }));
      total += amount * names.length;
    });

    if (expense.details.length === 0) {
      alert('Vui lòng điền đầy đủ thông tin món.');
      return;
    }
    expense.amount = total;
  }

  expenses.push(expense);
  saveExpenses();
  renderTable();
  updateSummary();

  document.getElementById('title').value = '';
  document.getElementById('payer').value = '';
  document.getElementById('amount').value = '';
  document.getElementById('participants').value = '';
  document.getElementById('individual-list').innerHTML = '';
  addIndividualRow();
}

function saveExpenses() {
  localStorage.setItem('expenses', JSON.stringify(expenses));
}

function renderTable() {
  const body = document.querySelector('#expense-grid-table .grid-body');
  body.innerHTML = '';

  if (expenses.length === 0) {
    body.innerHTML = `<div class="empty-state">Chưa có khoản chi nào. Hãy thêm khoản chi đầu tiên ở trên nhé! ✨</div>`;
    return;
  }

  expenses.forEach((expense, index) => {
    const detailsHtml = `
      <div class="details-list">
        ${expense.details.map(d => `
          <div class="detail-pill">
            ${d.itemName ? `<span class="detail-tag">${escapeHtml(d.itemName)}</span>` : ''}
            <span class="detail-name">${escapeHtml(d.name)}</span>
            <span class="detail-sep">—</span>
            <span class="detail-owe">${numberFormat(d.owe)} đ</span>
          </div>
        `).join('')}
      </div>
    `;

    const row = document.createElement('div');
    row.className = 'grid-row';
    row.innerHTML = `
      <div>${formatDate(expense.date)}</div>
      <div style="font-weight:600;">${escapeHtml(expense.title)}</div>
      <div><strong>${escapeHtml(expense.payer)}</strong></div>
      <div class="details-cell">${detailsHtml}</div>
      <div style="font-weight:700; color:var(--primary);">${numberFormat(expense.amount)} đ</div>
      <div>
        <button class="small" onclick="editExpense(${index})">Sửa</button>
        <button class="small remove" onclick="deleteExpense(${index})" style="margin-left:6px">Xóa</button>
      </div>
    `;
    body.appendChild(row);
  });
}

function deleteExpense(index) {
  if (!confirm('Xóa khoản này?')) return;
  expenses.splice(index, 1);
  saveExpenses();
  renderTable();
  updateSummary();
}

function editExpense(index) {
  const expense = expenses[index];
  document.getElementById('date').value = expense.date;
  document.getElementById('title').value = expense.title;
  document.getElementById('payer').value = expense.payer;
  document.getElementById('split-type').value = expense.type;
  toggleSplitType();

  if (expense.type === 'equal') {
    document.getElementById('amount').value = expense.amount;
    document.getElementById('participants').value = expense.details.map(d => d.name).join(', ');
  } else {
    const list = document.getElementById('individual-list');
    list.innerHTML = '';
    expense.details.forEach(d => addIndividualRow(d.name, d.owe, d.itemName || ''));
  }

  expenses.splice(index, 1);
  saveExpenses();
  renderTable();
  updateSummary();
}

function updateSummary() {
  const summary = {};
  expenses.forEach(expense => {
    summary[expense.payer] = summary[expense.payer] || { paid: 0, owe: 0 };
    summary[expense.payer].paid += expense.amount;
    expense.details.forEach(detail => {
      summary[detail.name] = summary[detail.name] || { paid: 0, owe: 0 };
      summary[detail.name].owe += detail.owe;
    });
  });

  const body = document.querySelector('#summary-grid-table .summary-body');
  body.innerHTML = '';

  const names = Object.keys(summary).sort();
  if (names.length === 0) {
    body.innerHTML = `<div class="empty-state">Bảng tổng kết sẽ tự động cập nhật khi có dữ liệu 📊</div>`;
    return;
  }

  names.forEach(name => {
    const { paid, owe } = summary[name];
    const balance = paid - owe;
    const badgeClass = balance >= 0 ? 'badge-pos' : 'badge-neg';
    const row = document.createElement('div');
    row.className = 'summary-row';
    row.innerHTML = `
      <div style="font-weight:600;">${escapeHtml(name)}</div>
      <div>${numberFormat(paid)} đ</div>
      <div>${numberFormat(owe)} đ</div>
      <div>
        <span class="badge-balance ${badgeClass}">
          ${balance >= 0 ? '+' : ''}${numberFormat(balance)} đ
        </span>
      </div>
    `;
    body.appendChild(row);
  });
}

function formatDate(date) {
  if (!date) return '';
  const [y, m, d] = date.split('-');
  return `${d}/${m}/${y}`;
}

function numberFormat(num) {
  return Number(Math.round(num)).toLocaleString('vi-VN');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function clearHistory() {
  if (confirm('Xóa toàn bộ lịch sử?')) {
    expenses = [];
    localStorage.removeItem('expenses');
    renderTable();
    updateSummary();
  }
}

window.onload = function() {
  const dateInput = document.getElementById('date');
  if (!dateInput.value) {
    dateInput.valueAsDate = new Date();
  }

  applyTheme(localStorage.getItem('wallet-theme') === 'dark');
  const saved = localStorage.getItem('expenses');
  if (saved) {
    try { expenses = JSON.parse(saved); } catch (e) { expenses = []; }
  }
  renderTable();
  updateSummary();
  addIndividualRow();
};