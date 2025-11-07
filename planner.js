/* planner.js — vendors + budget logic, tabs, chart */
(function () {
  // DOM refs
  const totalBudgetInput = document.getElementById('totalBudget');
  const saveBudgetBtn = document.getElementById('saveBudget');
  const budgetSavedMsg = document.getElementById('budgetSavedMsg');
  const plannerTools = document.getElementById('plannerTools');

  const tabs = Array.from(document.querySelectorAll('.tab'));
  const views = Array.from(document.querySelectorAll('.view'));

  const vendorTableBody = document.querySelector('#vendorTable tbody');
  const addVendorBtn = document.getElementById('addVendor');

  const expenseCategory = document.getElementById('expenseCategory');
  const expenseItem = document.getElementById('expenseItem');
  const expenseEst = document.getElementById('expenseEst');
  const expenseAct = document.getElementById('expenseAct');
  const addExpenseBtn = document.getElementById('addExpense');
  const budgetTableBody = document.querySelector('#budgetTable tbody');

  const estTotalEl = document.getElementById('estTotal');
  const actTotalEl = document.getElementById('actTotal');
  const budgetProgressEl = document.getElementById('budgetProgress');
  const spentLbl = document.getElementById('spentLbl');
  const remainLbl = document.getElementById('remainLbl');

  // chart
  const chartCanvas = document.getElementById('budgetChart');
  const chartCtx = chartCanvas.getContext('2d');
  const chartLegend = document.getElementById('chartLegend');

  // Data
  let totalBudget = 0;
  let vendors = JSON.parse(localStorage.getItem('wj.vendors') || '[]');
  let expenses = JSON.parse(localStorage.getItem('wj.expenses') || '[]');

  // Utilities
  const uid = ()=>Math.random().toString(36).slice(2,9);
  const currency = n => '₹' + (Number(n) || 0).toLocaleString('en-IN');

  // Tab switching
  tabs.forEach(t => t.addEventListener('click', () => {
    tabs.forEach(x => x.classList.remove('active'));
    t.classList.add('active');
    const target = t.dataset.target;
    views.forEach(v => v.id === target ? v.classList.add('active') : v.classList.remove('active'));
  }));

  // Save budget
  saveBudgetBtn?.addEventListener('click', ()=> {
    const val = Number(totalBudgetInput.value || 0);
    if (!val || val <= 0) { alert('Enter a valid positive budget'); return; }
    totalBudget = val;
    localStorage.setItem('wj.totalBudget', totalBudget);
    budgetSavedMsg.textContent = `✅ Budget: ${currency(totalBudget)}`;
    plannerTools.classList.remove('is-hidden');
    renderAll();
  });

  // Add vendor (simple inline prompt — can be replaced with modal)
  addVendorBtn.addEventListener('click', ()=> {
    const name = prompt('Vendor name (e.g., Royal Palace)');
    if (!name) return;
    const category = prompt('Category (Venue / Catering / Photography / etc.)') || '';
    const city = prompt('City') || '';
    const phone = prompt('Phone') || '';
    const notes = prompt('Notes') || '';
    vendors.unshift({ id: uid(), name, category, city, phone, notes });
    localStorage.setItem('wj.vendors', JSON.stringify(vendors));
    renderVendors();
  });

  function renderVendors() {
    if (!vendorTableBody) return;
    vendorTableBody.innerHTML = vendors.map((v, i) => `
      <tr>
        <td style="padding:8px;border:1px solid var(--border)">${v.name}</td>
        <td style="padding:8px;border:1px solid var(--border)">${v.category || ''}</td>
        <td style="padding:8px;border:1px solid var(--border)">${v.city || ''}</td>
        <td style="padding:8px;border:1px solid var(--border)">${v.phone || ''}</td>
        <td style="padding:8px;border:1px solid var(--border)">${v.notes || ''}</td>
        <td style="padding:8px;border:1px solid var(--border)"><button data-i="${i}" class="rm-vendor">❌</button></td>
      </tr>
    `).join('');
    // attach remove handlers
    document.querySelectorAll('.rm-vendor').forEach(b => b.addEventListener('click', (e)=> {
      const i = Number(e.currentTarget.dataset.i);
      if (!confirm('Remove vendor?')) return;
      vendors.splice(i,1); localStorage.setItem('wj.vendors', JSON.stringify(vendors)); renderVendors();
    }));
  }

  // Expenses
  addExpenseBtn.addEventListener('click', ()=> {
    const cat = (expenseCategory.value || '').trim();
    const item = (expenseItem.value || '').trim();
    const est = Number(expenseEst.value || 0);
    const act = Number(expenseAct.value || 0);
    if (!cat || !item) { alert('Category and Item are required'); return; }
    expenses.unshift({ id: uid(), cat, item, est, act });
    localStorage.setItem('wj.expenses', JSON.stringify(expenses));
    expenseCategory.value = expenseItem.value = expenseEst.value = expenseAct.value = '';
    renderExpenses();
  });

  function renderExpenses() {
    budgetTableBody.innerHTML = expenses.map((e,i)=>`
      <tr>
        <td style="padding:8px;border:1px solid var(--border)">${e.cat}</td>
        <td style="padding:8px;border:1px solid var(--border)">${e.item}</td>
        <td style="padding:8px;border:1px solid var(--border)">${e.est}</td>
        <td style="padding:8px;border:1px solid var(--border)">${e.act}</td>
        <td style="padding:8px;border:1px solid var(--border)"><button data-i="${i}" class="rm-exp">❌</button></td>
      </tr>
    `).join('');

    document.querySelectorAll('.rm-exp').forEach(b => b.addEventListener('click', (e)=> {
      const i = Number(e.currentTarget.dataset.i);
      if (!confirm('Remove expense?')) return;
      expenses.splice(i,1); localStorage.setItem('wj.expenses', JSON.stringify(expenses)); renderExpenses();
    }));

    // totals
    const estTotal = expenses.reduce((s,x)=>s + (Number(x.est)||0),0);
    const actTotal = expenses.reduce((s,x)=>s + (Number(x.act)||0),0);
    estTotalEl.textContent = estTotal;
    actTotalEl.textContent = actTotal;
    updateDashboard(estTotal, actTotal);
  }

  function updateDashboard(estTotal, actTotal) {
    const spent = actTotal;
    const remain = (Number(totalBudget) || 0) - spent;
    const pct = totalBudget ? Math.min(100, Math.round((spent / totalBudget) * 100)) : 0;
    budgetProgressEl.style.width = pct + '%';
    spentLbl.textContent = currency(spent);
    remainLbl.textContent = currency(remain);
    drawChart(); // refresh chart
  }

  // Simple donut chart by category (using canvas)
  function drawChart() {
    const byCat = {};
    for (const e of expenses) {
      const v = (Number(e.act) || Number(e.est) || 0);
      if (!v) continue;
      byCat[e.cat] = (byCat[e.cat] || 0) + v;
    }
    const entries = Object.entries(byCat);
    const total = entries.reduce((s,[,v])=>s+v,0);
    const colors = ['#ff4d9d','#ffb86b','#00d2d3','#7c4dff','#29cc7a','#ff7aa2','#ffd166'];
    const w = chartCanvas.width, h = chartCanvas.height;
    const cx = w/2, cy = h/2, R = Math.min(cx,cy)-8;
    chartCtx.clearRect(0,0,w,h);
    let a0 = -Math.PI/2;
    entries.forEach(([k,v],i) => {
      const ang = total ? (v/total) * Math.PI*2 : 0;
      chartCtx.beginPath();
      chartCtx.moveTo(cx,cy);
      chartCtx.fillStyle = colors[i % colors.length];
      chartCtx.arc(cx,cy,R,a0,a0+ang);
      chartCtx.closePath(); chartCtx.fill();
      a0 += ang;
    });
    // hole
    chartCtx.globalCompositeOperation = 'destination-out';
    chartCtx.beginPath(); chartCtx.arc(cx,cy,R*0.55,0,Math.PI*2); chartCtx.fill();
    chartCtx.globalCompositeOperation = 'source-over';
    // label
    chartCtx.fillStyle = '#2b1a1a'; chartCtx.textAlign='center'; chartCtx.textBaseline='middle'; chartCtx.font = '14px ui-sans-serif';
    chartCtx.fillText(total ? 'Spend Split' : 'No data', cx, cy);

    // legend
    chartLegend.innerHTML = entries.map(([k,v],i)=>`
      <span style="display:inline-flex;align-items:center;gap:6px;padding:6px;background:#fff;border-radius:999px;border:1px solid var(--border)">
        <i style="width:12px;height:12px;background:${colors[i%colors.length]};display:inline-block;border-radius:50%"></i>
        ${k} — ${currency(v)}
      </span>
    `).join('');
  }

  // render all
  function renderAll() {
    renderVendors(); renderExpenses();
  }

  // On load: restore from localStorage
  window.addEventListener('DOMContentLoaded', ()=> {
    totalBudget = Number(localStorage.getItem('wj.totalBudget') || 0);
    if (totalBudget && totalBudget > 0) {
      totalBudgetInput.value = totalBudget;
      budgetSavedMsg.textContent = `Saved Budget: ${currency(totalBudget)}`;
      plannerTools.classList.remove('is-hidden');
    } else {
      plannerTools.classList.add('is-hidden');
    }
    renderAll();
  });

  // expose small helpers (optional)
  window._plannerDebug = { vendors, expenses, reload: renderAll };
})();
