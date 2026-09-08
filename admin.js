'use strict';
const cache={users:[],plans:[],tickets:[]};
const $=id=>document.getElementById(id);
const esc=(s='')=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
async function api(path,opts={}){const r=await fetch(path,{credentials:'same-origin',...opts,headers:{'Content-Type':'application/json',...(opts.headers||{})}});const j=await r.json().catch(()=>({}));if(!r.ok)throw new Error(j.error||'Request failed');return j}
function showLogin(message=''){ $('app').classList.add('hidden');$('loginView').classList.remove('hidden');$('loginMsg').textContent=message; }
function showAdmin(){ $('loginView').classList.add('hidden');$('app').classList.remove('hidden'); }
function modal(html) {
  $('modalRoot').innerHTML = `<div class="modal" id="adminModal"><div class="modalbox">${html}</div></div>`;
  $('adminModal').onclick = e => { if (e.target.id === 'adminModal') closeModal(); };
}
function closeModal() { $('modalRoot').innerHTML = ''; }
window.closeModal = closeModal;

function go(id) {
  document.querySelectorAll('.section').forEach(x => x.classList.toggle('active', x.id === id));
  document.querySelectorAll('.nav[data-page]').forEach(x => x.classList.toggle('active', x.dataset.page === id));
  const fn = { overview: renderOverview, users: renderUsers, plans: renderPlans, tickets: renderTickets }[id];
  if (fn) fn();
}

document.querySelectorAll('.nav[data-page]').forEach(b => b.onclick = () => go(b.dataset.page));

async function loadAll() {
  const [u, p, t] = await Promise.all([api('/api/admin-users'), api('/api/admin-plans'), api('/api/admin-tickets')]);
  cache.users = u.users || [];
  cache.plans = p.plans || [];
  cache.tickets = t.tickets || [];
  renderOverview();
}
function renderOverview() {
  const active = cache.users.filter(u => u.account_status !== 'suspended').length;
  const suspended = cache.users.filter(u => u.account_status === 'suspended').length;
  const open = cache.tickets.filter(t => t.status !== 'resolved').length;
  $('overview').innerHTML = `
    <div class="grid4">
      <div class="card"><div class="muted small">Total Users</div><div class="stat">${cache.users.length}</div></div>
      <div class="card"><div class="muted small">Active</div><div class="stat">${active}</div></div>
      <div class="card"><div class="muted small">Suspended</div><div class="stat">${suspended}</div></div>
      <div class="card"><div class="muted small">Open Queries</div><div class="stat">${open}</div></div>
    </div>
    <div class="grid2" style="margin-top:14px">
      <div class="card"><h3>Plan Mix</h3><p>Free: <b>${cache.users.filter(u=>u.plan_id==='free').length}</b> · Pro: <b>${cache.users.filter(u=>u.plan_id==='pro').length}</b> · Premium: <b>${cache.users.filter(u=>u.plan_id==='premium').length}</b></p></div>
      <div class="card"><h3>Admin Controls</h3><p class="muted small">Plan changes, +500 bill packs, expiry, suspension, account deletion and ticket replies execute through server-side Vercel functions.</p></div>
    </div>`;
}
function renderUsers() {
  $('users').innerHTML = `<div class="card"><div class="row"><h3>Users</h3><input id="userSearch" class="input right" style="max-width:300px" placeholder="Search name / email"></div><div id="userTable"></div></div>`;
  $('userSearch').oninput = filterUsers;
  filterUsers();
}
function filterUsers() {
  const q = ($('userSearch')?.value || '').toLowerCase();
  const rows = cache.users
    .filter(u => `${u.email || ''} ${u.full_name || ''}`.toLowerCase().includes(q))
    .map(u => `<tr>
      <td><b>${esc(u.full_name || '-')}</b><div class="small muted">${esc(u.email || '')}</div></td>
      <td>${esc(u.role || '')}</td><td>${esc(u.plan_id || 'free')}</td>
      <td>${u.expires_at ? new Date(u.expires_at).toLocaleDateString() : '-'}</td>
      <td>${Number(u.bills_used || 0)}</td><td>${Number(u.extra_bill_balance || 0)}</td>
      <td><span class="badge ${u.account_status === 'suspended' ? 'danger' : 'ok'}">${esc(u.account_status || 'active')}</span></td>
      <td><button class="btn" data-user-manage="${u.id}">Manage</button></td>
    </tr>`).join('');
  $('userTable').innerHTML = `<div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Role</th><th>Plan</th><th>Expiry</th><th>Bills Used</th><th>Extra</th><th>Status</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="8">No users</td></tr>'}</tbody></table></div>`;
  document.querySelectorAll('[data-user-manage]').forEach(b => b.onclick = () => userActions(b.dataset.userManage));
}
function userActions(id) {
  const u = cache.users.find(x => x.id === id); if (!u) return;
  modal(`<div class="row"><h3>${esc(u.full_name || u.email)}</h3><button class="btn ghost right" onclick="closeModal()">Close</button></div>
    <p class="small muted">${esc(u.email || '')} · ${esc(u.business_type || '-')} · ${esc(u.gst_scheme || '-')}</p>
    <div class="grid2"><div><label>Plan</label><select id="managePlan" class="select">${cache.plans.map(p => `<option value="${p.id}" ${p.id === u.plan_id ? 'selected' : ''}>${esc(p.display_name)}</option>`).join('')}</select></div>
    <div><label>Expiry date</label><input id="manageExpiry" class="input" type="date" value="${u.expires_at ? String(u.expires_at).slice(0,10) : ''}"></div></div>
    <div class="row" style="margin-top:14px;flex-wrap:wrap"><button class="btn primary" data-action="set_plan">Save Plan + 1 Year</button><button class="btn" data-action="set_expiry">Save Expiry</button><button class="btn ok" data-action="grant_pack">+500 Bills</button>${u.account_status === 'suspended' ? '<button class="btn ok" data-action="activate">Activate</button>' : '<button class="btn danger" data-action="suspend">Suspend</button>'}<button class="btn danger" data-action="delete">Delete Account</button></div>`);
  document.querySelectorAll('[data-action]').forEach(b => b.onclick = () => userAction(id, b.dataset.action));
}
async function userAction(id, action) {
  if (action === 'delete' && !confirm('Permanently delete this account? This cannot be undone.')) return;
  const body = { action, userId: id };
  if (action === 'set_plan') body.planId = $('managePlan').value;
  if (action === 'set_expiry') body.expiresAt = $('manageExpiry').value;
  await api('/api/admin-users', { method: 'POST', body: JSON.stringify(body) });
  closeModal(); await loadAll(); go('users');
}
function renderPlans() {
  $('plans').innerHTML = `<div class="grid3">${cache.plans.map(p => `<div class="card"><h3>${esc(p.display_name)}</h3>
    <label>Annual price ₹</label><input class="input" id="price_${p.id}" type="number" value="${Number(p.price_annual || 0)}">
    <label>Validity days</label><input class="input" id="valid_${p.id}" type="number" value="${Number(p.validity_days || 365)}">
    <label>Included bills</label><input class="input" id="bills_${p.id}" type="number" value="${p.included_bills ?? 0}" ${p.unlimited_bills ? 'disabled' : ''}>
    <label class="row"><input id="unlim_${p.id}" type="checkbox" ${p.unlimited_bills ? 'checked' : ''}> Unlimited bills</label>
    <button class="btn primary" style="margin-top:12px" data-save-plan="${p.id}">Save Plan</button></div>`).join('')}</div>
    <div class="card" style="margin-top:14px"><p class="muted small">Keep validity at 365 days for strict one-year plans. Free included bills can be changed here; +500 packs are granted per user.</p></div>`;
  document.querySelectorAll('[data-save-plan]').forEach(b => b.onclick = () => savePlan(b.dataset.savePlan));
}
async function savePlan(id) {
  await api('/api/admin-plans', { method: 'POST', body: JSON.stringify({ id, priceAnnual: Number($('price_'+id).value), validityDays: Number($('valid_'+id).value), includedBills: Number($('bills_'+id)?.value || 0), unlimitedBills: $('unlim_'+id).checked }) });
  await loadAll(); go('plans');
}
function renderTickets() {
  const rows = cache.tickets.map(t => {
    const reply = t.admin_reply ? `<div class="small" style="margin-top:5px;color:#1e40af">Reply: ${esc(t.admin_reply)}</div>` : '';
    return `<tr><td>${esc(t.email || '-')}</td><td><b>${esc(t.subject)}</b><div class="small muted">${esc(t.message)}</div>${reply}</td><td><span class="badge ${t.status === 'resolved' ? 'ok' : ''}">${esc(t.status)}</span></td><td>${new Date(t.created_at).toLocaleString()}</td><td><button class="btn" data-ticket="${t.id}">Reply</button></td></tr>`;
  }).join('');
  $('tickets').innerHTML = `<div class="card"><h3>Support Queries</h3><div class="table-wrap"><table class="table"><thead><tr><th>User</th><th>Query</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>${rows || '<tr><td colspan="5">No queries</td></tr>'}</tbody></table></div></div>`;
  document.querySelectorAll('[data-ticket]').forEach(b => b.onclick = () => replyTicket(b.dataset.ticket));
}
function replyTicket(id) {
  const t = cache.tickets.find(x => x.id === id); if (!t) return;
  modal(`<h3>${esc(t.subject)}</h3><p>${esc(t.message)}</p><label>Admin reply</label><textarea id="ticketReply" class="textarea">${esc(t.admin_reply || '')}</textarea><label>Status</label><select id="ticketStatus" class="select"><option value="open" ${t.status === 'open' ? 'selected' : ''}>Open</option><option value="in_progress" ${t.status === 'in_progress' ? 'selected' : ''}>In progress</option><option value="resolved" ${t.status === 'resolved' ? 'selected' : ''}>Resolved</option></select><div class="row" style="margin-top:14px"><button class="btn primary" id="saveTicketBtn">Save Reply</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div>`);
  $('saveTicketBtn').onclick = () => saveTicket(id);
}
async function saveTicket(id) {
  await api('/api/admin-tickets', { method: 'POST', body: JSON.stringify({ id, adminReply: $('ticketReply').value, status: $('ticketStatus').value }) });
  closeModal(); await loadAll(); go('tickets');
}


async function start(){
 $('adminLogin').onsubmit=async e=>{e.preventDefault();$('loginMsg').textContent='Checking…';try{await api('/api/admin-login',{method:'POST',body:JSON.stringify({email:$('email').value.trim().toLowerCase(),password:$('password').value})});showAdmin();await loadAll();go('overview')}catch(err){showLogin(err.message)}};
 $('logout').onclick=async()=>{try{await api('/api/admin-logout',{method:'POST',body:'{}'})}finally{location.replace('/admin')}};
 try{const s=await api('/api/admin-session');if(s.authenticated){showAdmin();await loadAll();go('overview')}else showLogin()}catch(e){showLogin(e.message)}
}
start();
