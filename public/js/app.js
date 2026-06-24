// ── Utility ──────────────────────────────────────────────────────────────────
const $ = id => document.getElementById(id);
const api = async (method, path, body) => {
  const res = await fetch('/api' + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined
  });
  if (!res.ok) throw await res.json();
  return res.json();
};

let toastTimer;
function toast(msg, type = 'success') {
  const el = $('toast');
  el.textContent = msg;
  el.className = 'show' + (type === 'error' ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.className = '', 3000);
}

function fmtCurrency(n) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(n || 0);
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function badge(val) {
  if (!val) return '';
  return `<span class="badge badge-${val}">${val.replace(/_/g, ' ')}</span>`;
}

// ── Router ───────────────────────────────────────────────────────────────────
const routes = {};
let currentPage = '';

function navigate(page) {
  document.querySelectorAll('#sidebar nav a').forEach(a => {
    a.classList.toggle('active', a.dataset.page === page);
  });
  currentPage = page;
  const fn = routes[page];
  if (fn) fn();
}

document.querySelectorAll('#sidebar nav a').forEach(a => {
  a.addEventListener('click', e => { e.preventDefault(); navigate(a.dataset.page); });
});

// ── Dashboard ─────────────────────────────────────────────────────────────────
routes.dashboard = async () => {
  const content = $('content');
  content.innerHTML = '<div class="empty"><div class="empty-icon">⏳</div>Loading…</div>';
  const d = await api('GET', '/dashboard');
  content.innerHTML = `
    <div class="grid grid-4" style="margin-bottom:20px">
      <div class="card stat-card">
        <div class="value">${d.contacts.total}</div>
        <div class="label">Total Contacts</div>
        <div class="sub">+${d.contacts.new_30d} this month</div>
      </div>
      <div class="card stat-card">
        <div class="value">${fmtCurrency(d.deals.pipeline_value)}</div>
        <div class="label">Pipeline Value</div>
        <div class="sub">${d.deals.open} open deals</div>
      </div>
      <div class="card stat-card">
        <div class="value">${d.contacts.from_meta}</div>
        <div class="label">Meta Leads</div>
        <div class="sub">${fmtCurrency(d.meta.total_spend)} ad spend</div>
      </div>
      <div class="card stat-card">
        <div class="value">${d.whatsapp.total_messages}</div>
        <div class="label">WhatsApp Messages</div>
        <div class="sub">${d.contacts.from_whatsapp} contacts</div>
      </div>
    </div>
    <div class="grid grid-3">
      <div class="card">
        <div class="card-title">Recent Contacts</div>
        ${d.recent_contacts.map(c => `
          <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #f1f5f9">
            <div style="width:34px;height:34px;border-radius:50%;background:#e0e7ff;display:flex;align-items:center;justify-content:center;font-weight:700;color:#4f46e5;font-size:.8rem;flex-shrink:0">
              ${(c.first_name || '?')[0].toUpperCase()}
            </div>
            <div>
              <div style="font-weight:600;font-size:.875rem">${c.first_name} ${c.last_name || ''}</div>
              <div style="font-size:.75rem;color:#64748b">${c.email || c.phone || '—'}</div>
            </div>
            ${badge(c.source)}
          </div>
        `).join('')}
      </div>
      <div class="card">
        <div class="card-title">Recent Deals</div>
        ${d.recent_deals.map(d => `
          <div style="padding:8px 0;border-bottom:1px solid #f1f5f9">
            <div style="display:flex;justify-content:space-between">
              <span style="font-weight:600;font-size:.875rem">${d.title}</span>
              <span style="font-weight:700;color:#4f46e5">${fmtCurrency(d.value)}</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-top:4px">
              <span style="font-size:.75rem;color:#64748b">${d.contact_name.trim() || '—'}</span>
              ${badge(d.stage)}
            </div>
          </div>
        `).join('')}
      </div>
      <div class="card">
        <div class="card-title">Upcoming Tasks <span class="badge badge-pending" style="margin-left:6px">${d.tasks.overdue} overdue</span></div>
        ${d.upcoming_tasks.map(t => `
          <div style="padding:8px 0;border-bottom:1px solid #f1f5f9">
            <div style="display:flex;justify-content:space-between">
              <span style="font-weight:600;font-size:.875rem">${t.title}</span>
              ${badge(t.priority)}
            </div>
            <div style="font-size:.75rem;color:#64748b;margin-top:3px">${t.contact_name?.trim() || '—'} · Due ${fmtDate(t.due_date)}</div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  $('topbar-title').textContent = 'Dashboard';
};

// ── Contacts ──────────────────────────────────────────────────────────────────
routes.contacts = async () => {
  $('topbar-title').textContent = 'Contacts';
  const content = $('content');
  content.innerHTML = `
    <div class="section-header">
      <h2>Contacts</h2>
      <button class="btn btn-primary" onclick="openContactModal()">+ Add Contact</button>
    </div>
    <div class="search-bar">
      <input type="text" id="contact-search" placeholder="Search by name, email, company…" oninput="loadContacts()">
      <select id="contact-status" onchange="loadContacts()">
        <option value="">All Statuses</option>
        <option>lead</option><option>prospect</option><option>customer</option><option>churned</option>
      </select>
      <select id="contact-source" onchange="loadContacts()">
        <option value="">All Sources</option>
        <option>manual</option><option>meta_lead</option><option>whatsapp</option>
      </select>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr>
            <th>Name</th><th>Email</th><th>Phone</th><th>Company</th>
            <th>Status</th><th>Source</th><th>Created</th><th>Actions</th>
          </tr></thead>
          <tbody id="contacts-table"></tbody>
        </table>
      </div>
    </div>
  `;
  loadContacts();
};

async function loadContacts() {
  const search = $('contact-search')?.value || '';
  const status = $('contact-status')?.value || '';
  const source = $('contact-source')?.value || '';
  const params = new URLSearchParams({ search, status, source, limit: 100 });
  const { contacts } = await api('GET', `/contacts?${params}`);
  const tbody = $('contacts-table');
  if (!tbody) return;
  tbody.innerHTML = contacts.map(c => `
    <tr>
      <td><strong>${c.first_name} ${c.last_name || ''}</strong></td>
      <td>${c.email || '—'}</td>
      <td>${c.phone || '—'}</td>
      <td>${c.company || '—'}</td>
      <td>${badge(c.status)}</td>
      <td>${badge(c.source)}</td>
      <td style="color:#64748b;font-size:.8rem">${fmtDate(c.created_at)}</td>
      <td>
        <button class="btn btn-outline btn-sm" onclick="editContact(${c.id})">Edit</button>
        <button class="btn btn-danger btn-sm" onclick="deleteContact(${c.id})">Del</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="8" class="empty">No contacts found</td></tr>';
}

window.openContactModal = (data = {}) => {
  showModal(`
    <h2>${data.id ? 'Edit' : 'Add'} Contact</h2>
    <div class="form-row"><label>First Name *</label><input id="f-first_name" value="${data.first_name || ''}"></div>
    <div class="form-row"><label>Last Name</label><input id="f-last_name" value="${data.last_name || ''}"></div>
    <div class="form-row"><label>Email</label><input id="f-email" type="email" value="${data.email || ''}"></div>
    <div class="form-row"><label>Phone</label><input id="f-phone" value="${data.phone || ''}"></div>
    <div class="form-row"><label>Company</label><input id="f-company" value="${data.company || ''}"></div>
    <div class="form-row"><label>Job Title</label><input id="f-job_title" value="${data.job_title || ''}"></div>
    <div class="form-row"><label>Status</label>
      <select id="f-status">
        ${['lead','prospect','customer','churned'].map(s => `<option ${data.status===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveContact(${data.id || ''})">Save</button>
    </div>
  `);
};

window.editContact = async (id) => {
  const data = await api('GET', `/contacts/${id}`);
  openContactModal(data);
};

window.saveContact = async (id) => {
  const body = {
    first_name: $('f-first_name').value,
    last_name: $('f-last_name').value,
    email: $('f-email').value,
    phone: $('f-phone').value,
    company: $('f-company').value,
    job_title: $('f-job_title').value,
    status: $('f-status').value
  };
  try {
    if (id) await api('PUT', `/contacts/${id}`, body);
    else await api('POST', '/contacts', body);
    closeModal();
    toast(id ? 'Contact updated' : 'Contact created');
    if (currentPage === 'contacts') loadContacts();
  } catch (e) { toast(e.error || 'Error', 'error'); }
};

window.deleteContact = async (id) => {
  if (!confirm('Delete this contact?')) return;
  await api('DELETE', `/contacts/${id}`);
  toast('Contact deleted');
  loadContacts();
};

// ── Deals (Pipeline) ──────────────────────────────────────────────────────────
routes.deals = async () => {
  $('topbar-title').textContent = 'Deals Pipeline';
  const content = $('content');
  content.innerHTML = `
    <div class="section-header">
      <h2>Pipeline</h2>
      <button class="btn btn-primary" onclick="openDealModal()">+ Add Deal</button>
    </div>
    <div id="pipeline-board" class="pipeline"></div>
  `;
  loadPipeline();
};

async function loadPipeline() {
  const { pipeline } = await api('GET', '/deals');
  const board = $('pipeline-board');
  if (!board) return;
  board.innerHTML = pipeline.map(col => `
    <div class="pipeline-col">
      <h3>${col.stage.replace(/_/g,' ')}</h3>
      <div class="stage-total">${col.deals.length} deals · ${fmtCurrency(col.total)}</div>
      ${col.deals.map(d => `
        <div class="deal-card" onclick="openDealModal(${JSON.stringify(d).replace(/"/g,'&quot;')})">
          <div class="deal-title">${d.title}</div>
          <div class="deal-contact">${d.contact_name?.trim() || '—'}</div>
          <div class="deal-value">${fmtCurrency(d.value)}</div>
        </div>
      `).join('')}
    </div>
  `).join('');
}

window.openDealModal = async (data = {}) => {
  const { contacts } = await api('GET', '/contacts?limit=200');
  showModal(`
    <h2>${data.id ? 'Edit' : 'Add'} Deal</h2>
    <div class="form-row"><label>Title *</label><input id="d-title" value="${data.title || ''}"></div>
    <div class="form-row"><label>Contact</label>
      <select id="d-contact_id">
        <option value="">— None —</option>
        ${contacts.map(c => `<option value="${c.id}" ${data.contact_id==c.id?'selected':''}>${c.first_name} ${c.last_name||''}</option>`).join('')}
      </select>
    </div>
    <div class="form-row"><label>Value ($)</label><input id="d-value" type="number" value="${data.value || 0}"></div>
    <div class="form-row"><label>Stage</label>
      <select id="d-stage">
        ${['prospecting','qualification','proposal','negotiation','closed_won','closed_lost']
          .map(s => `<option ${data.stage===s?'selected':''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="form-row"><label>Expected Close</label><input id="d-expected_close" type="date" value="${data.expected_close || ''}"></div>
    <div class="form-row"><label>Notes</label><textarea id="d-notes">${data.notes || ''}</textarea></div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      ${data.id ? `<button class="btn btn-danger" onclick="deleteDeal(${data.id})">Delete</button>` : ''}
      <button class="btn btn-primary" onclick="saveDeal(${data.id || ''})">Save</button>
    </div>
  `);
};

window.saveDeal = async (id) => {
  const body = {
    title: $('d-title').value,
    contact_id: $('d-contact_id').value || null,
    value: Number($('d-value').value),
    stage: $('d-stage').value,
    expected_close: $('d-expected_close').value || null,
    notes: $('d-notes').value
  };
  try {
    if (id) await api('PUT', `/deals/${id}`, body);
    else await api('POST', '/deals', body);
    closeModal();
    toast(id ? 'Deal updated' : 'Deal created');
    if (currentPage === 'deals') loadPipeline();
  } catch (e) { toast(e.error || 'Error', 'error'); }
};

window.deleteDeal = async (id) => {
  if (!confirm('Delete this deal?')) return;
  await api('DELETE', `/deals/${id}`);
  closeModal();
  toast('Deal deleted');
  loadPipeline();
};

// ── Tasks ─────────────────────────────────────────────────────────────────────
routes.tasks = async () => {
  $('topbar-title').textContent = 'Tasks';
  $('content').innerHTML = `
    <div class="section-header">
      <h2>Tasks</h2>
      <button class="btn btn-primary" onclick="openTaskModal()">+ Add Task</button>
    </div>
    <div class="search-bar">
      <select id="task-status" onchange="loadTasks()">
        <option value="">All Statuses</option>
        <option>pending</option><option>completed</option>
      </select>
      <select id="task-priority" onchange="loadTasks()">
        <option value="">All Priorities</option>
        <option>high</option><option>medium</option><option>low</option>
      </select>
    </div>
    <div class="card">
      <div class="table-wrap">
        <table>
          <thead><tr><th>Task</th><th>Contact</th><th>Due Date</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody id="tasks-table"></tbody>
        </table>
      </div>
    </div>
  `;
  loadTasks();
};

async function loadTasks() {
  const status = $('task-status')?.value || '';
  const priority = $('task-priority')?.value || '';
  const tasks = await api('GET', `/tasks?status=${status}&priority=${priority}`);
  const tbody = $('tasks-table');
  if (!tbody) return;
  tbody.innerHTML = tasks.map(t => `
    <tr>
      <td><strong>${t.title}</strong>${t.description ? `<div style="font-size:.75rem;color:#64748b">${t.description}</div>` : ''}</td>
      <td>${t.contact_name?.trim() || '—'}</td>
      <td style="${t.status==='pending'&&t.due_date&&new Date(t.due_date)<new Date()?'color:#ef4444;font-weight:600':''}">${fmtDate(t.due_date)}</td>
      <td>${badge(t.priority)}</td>
      <td>${badge(t.status)}</td>
      <td>
        ${t.status === 'pending' ? `<button class="btn btn-success btn-sm" onclick="completeTask(${t.id})">✓</button>` : ''}
        <button class="btn btn-danger btn-sm" onclick="deleteTask(${t.id})">Del</button>
      </td>
    </tr>
  `).join('') || '<tr><td colspan="6" class="empty">No tasks</td></tr>';
}

window.openTaskModal = async () => {
  const { contacts } = await api('GET', '/contacts?limit=200');
  showModal(`
    <h2>Add Task</h2>
    <div class="form-row"><label>Title *</label><input id="t-title"></div>
    <div class="form-row"><label>Description</label><textarea id="t-description"></textarea></div>
    <div class="form-row"><label>Contact</label>
      <select id="t-contact_id">
        <option value="">— None —</option>
        ${contacts.map(c => `<option value="${c.id}">${c.first_name} ${c.last_name||''}</option>`).join('')}
      </select>
    </div>
    <div class="form-row"><label>Due Date</label><input id="t-due_date" type="datetime-local"></div>
    <div class="form-row"><label>Priority</label>
      <select id="t-priority">
        <option>high</option><option selected>medium</option><option>low</option>
      </select>
    </div>
    <div class="modal-actions">
      <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
      <button class="btn btn-primary" onclick="saveTask()">Save</button>
    </div>
  `);
};

window.saveTask = async () => {
  try {
    await api('POST', '/tasks', {
      title: $('t-title').value,
      description: $('t-description').value,
      contact_id: $('t-contact_id').value || null,
      due_date: $('t-due_date').value || null,
      priority: $('t-priority').value
    });
    closeModal(); toast('Task created'); loadTasks();
  } catch (e) { toast(e.error || 'Error', 'error'); }
};

window.completeTask = async (id) => {
  await api('PUT', `/tasks/${id}`, { status: 'completed' });
  toast('Task completed'); loadTasks();
};

window.deleteTask = async (id) => {
  if (!confirm('Delete task?')) return;
  await api('DELETE', `/tasks/${id}`);
  toast('Task deleted'); loadTasks();
};

// ── WhatsApp ──────────────────────────────────────────────────────────────────
let currentChatContactId = null;

routes.whatsapp = async () => {
  $('topbar-title').textContent = 'WhatsApp';
  $('content').innerHTML = `
    <div class="chat-wrap card" style="padding:0">
      <div class="chat-list" id="chat-list"></div>
      <div class="chat-window" id="chat-window">
        <div class="empty" style="margin:auto"><div class="empty-icon">💬</div>Select a conversation</div>
      </div>
    </div>
  `;
  loadConversations();
};

async function loadConversations() {
  const convs = await api('GET', '/whatsapp/conversations');
  const list = $('chat-list');
  if (!list) return;
  list.innerHTML = convs.map(c => `
    <div class="chat-item" onclick="openChat(${c.id}, '${(c.first_name+' '+(c.last_name||'')).trim()}')" data-cid="${c.id}">
      <div class="chat-name">${c.first_name} ${c.last_name || ''}</div>
      <div class="chat-preview">${c.last_message || 'No messages yet'}</div>
    </div>
  `).join('') || '<div class="empty" style="padding:20px">No conversations</div>';
}

window.openChat = async (contactId, name) => {
  currentChatContactId = contactId;
  document.querySelectorAll('.chat-item').forEach(el => el.classList.toggle('active', el.dataset.cid == contactId));
  const msgs = await api('GET', `/whatsapp/messages/${contactId}`);
  const win = $('chat-window');
  win.innerHTML = `
    <div style="padding:12px 16px;border-bottom:1px solid #e2e8f0;font-weight:600">${name}</div>
    <div class="chat-messages" id="chat-msgs">
      ${msgs.map(m => `
        <div class="msg ${m.direction}">
          ${m.body}
          <div class="msg-time">${fmtDate(m.timestamp)}</div>
        </div>
      `).join('') || '<div class="empty">No messages yet</div>'}
    </div>
    <div class="chat-input">
      <input type="text" id="chat-text" placeholder="Type a message…" onkeydown="if(event.key==='Enter')sendWA()">
      <button class="btn btn-primary" onclick="sendWA()">Send</button>
    </div>
  `;
  const msgs_el = $('chat-msgs');
  if (msgs_el) msgs_el.scrollTop = msgs_el.scrollHeight;
};

window.sendWA = async () => {
  const msg = $('chat-text')?.value?.trim();
  if (!msg || !currentChatContactId) return;
  try {
    await api('POST', '/whatsapp/send', { contact_id: currentChatContactId, message: msg });
    $('chat-text').value = '';
    openChat(currentChatContactId, '');
    toast('Message sent');
  } catch (e) { toast(e.error?.error?.message || 'Send failed', 'error'); }
};

// ── Meta Ads ──────────────────────────────────────────────────────────────────
routes.meta = async () => {
  $('topbar-title').textContent = 'Meta Ads & Leads';
  $('content').innerHTML = `
    <div class="section-header">
      <h2>Meta Ads Overview</h2>
      <div style="display:flex;gap:8px">
        <button class="btn btn-outline" onclick="syncLeadForms()">Sync Lead Forms</button>
        <button class="btn btn-primary" onclick="syncAds()">↻ Sync Ads</button>
      </div>
    </div>
    <div id="meta-content"><div class="empty"><div class="empty-icon">📊</div>Loading…</div></div>
  `;
  loadMetaAds();
};

async function loadMetaAds() {
  const { ads, summary } = await api('GET', '/meta/ads');
  const leads = await api('GET', '/meta/leads');
  const el = $('meta-content');
  if (!el) return;
  el.innerHTML = `
    <div class="ads-summary">
      <div class="ads-kpi"><div class="kpi-val">${fmtCurrency(summary.total_spend)}</div><div class="kpi-label">Total Spend</div></div>
      <div class="ads-kpi"><div class="kpi-val">${(summary.total_impressions||0).toLocaleString()}</div><div class="kpi-label">Impressions</div></div>
      <div class="ads-kpi"><div class="kpi-val">${(summary.total_clicks||0).toLocaleString()}</div><div class="kpi-label">Clicks</div></div>
      <div class="ads-kpi"><div class="kpi-val">${(summary.total_leads||0).toLocaleString()}</div><div class="kpi-label">Leads</div></div>
    </div>
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">Ad Performance</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Ad Name</th><th>Campaign</th><th>Spend</th><th>Clicks</th><th>CPL</th></tr></thead>
            <tbody>
              ${ads.map(a => `
                <tr>
                  <td>${a.ad_name || '—'}</td>
                  <td style="font-size:.78rem;color:#64748b">${a.campaign_name || '—'}</td>
                  <td>${fmtCurrency(a.spend)}</td>
                  <td>${(a.clicks||0).toLocaleString()}</td>
                  <td>${fmtCurrency(a.cost_per_lead)}</td>
                </tr>
              `).join('') || '<tr><td colspan="5" class="empty">No ads synced yet. Click "Sync Ads".</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
      <div class="card">
        <div class="card-title">Recent Leads from Meta</div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Email</th><th>Campaign</th><th>Date</th></tr></thead>
            <tbody>
              ${leads.slice(0,20).map(l => `
                <tr>
                  <td>${l.first_name || '—'} ${l.last_name || ''}</td>
                  <td style="font-size:.78rem">${l.email || '—'}</td>
                  <td style="font-size:.78rem;color:#64748b">${l.campaign_name || '—'}</td>
                  <td style="font-size:.78rem;color:#64748b">${fmtDate(l.created_at)}</td>
                </tr>
              `).join('') || '<tr><td colspan="4" class="empty">No leads yet. Set up webhook or sync a form.</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

window.syncAds = async () => {
  toast('Syncing ads…');
  try {
    const r = await api('POST', '/meta/sync-ads', { date_preset: 'last_30d' });
    toast(`Synced ${r.synced} ads`);
    loadMetaAds();
  } catch (e) { toast(e.error?.message || JSON.stringify(e.error) || 'Sync failed — check META_ACCESS_TOKEN', 'error'); }
};

window.syncLeadForms = async () => {
  toast('Fetching forms…');
  try {
    const forms = await api('GET', '/meta/forms');
    if (!forms.length) return toast('No lead forms found', 'error');
    showModal(`
      <h2>Sync Lead Form</h2>
      <p style="margin-bottom:16px;color:#64748b;font-size:.875rem">Select a form to import leads from:</p>
      ${forms.map(f => `
        <div style="padding:10px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:8px;cursor:pointer;display:flex;justify-content:space-between;align-items:center"
             onclick="importLeadForm('${f.id}')">
          <div><strong>${f.name}</strong><div style="font-size:.75rem;color:#64748b">${f.leads_count||0} leads · ${f.status}</div></div>
          <button class="btn btn-primary btn-sm">Import</button>
        </div>
      `).join('')}
      <div class="modal-actions"><button class="btn btn-outline" onclick="closeModal()">Close</button></div>
    `);
  } catch (e) { toast('Could not load forms — check META_AD_ACCOUNT_ID', 'error'); }
};

window.importLeadForm = async (formId) => {
  closeModal(); toast('Importing leads…');
  try {
    const r = await api('POST', '/meta/sync-leads', { form_id: formId });
    toast(`Imported ${r.imported} leads`);
    loadMetaAds();
  } catch (e) { toast('Import failed', 'error'); }
};

// ── Settings ──────────────────────────────────────────────────────────────────
routes.settings = () => {
  $('topbar-title').textContent = 'Settings & Integrations';
  $('content').innerHTML = `
    <div class="grid grid-2">
      <div class="card">
        <div class="card-title">Meta / Facebook Integration</div>
        <p style="font-size:.875rem;color:#64748b;margin-bottom:16px">Connect your Meta Business account to sync ads and collect leads automatically.</p>
        <div class="form-row"><label>App ID</label><input placeholder="META_APP_ID" disabled value="Set via .env"></div>
        <div class="form-row"><label>Ad Account ID</label><input placeholder="act_XXXXXXXXXX" disabled value="Set via .env"></div>
        <div class="form-row"><label>Webhook URL for Leads</label>
          <input readonly value="${location.origin}/api/meta/webhook" onclick="this.select()">
        </div>
        <div class="form-row"><label>Verify Token</label><input readonly value="Set META_VERIFY_TOKEN in .env" onclick="this.select()"></div>
        <p style="font-size:.78rem;color:#64748b">Configure these values in your <code>.env</code> file and restart the server.</p>
      </div>
      <div class="card">
        <div class="card-title">WhatsApp Business Integration</div>
        <p style="font-size:.875rem;color:#64748b;margin-bottom:16px">Connect WhatsApp Business via Meta Cloud API to send and receive messages.</p>
        <div class="form-row"><label>Phone Number ID</label><input disabled value="Set via .env"></div>
        <div class="form-row"><label>Business Account ID</label><input disabled value="Set via .env"></div>
        <div class="form-row"><label>Webhook URL</label>
          <input readonly value="${location.origin}/api/whatsapp/webhook" onclick="this.select()">
        </div>
        <div class="form-row"><label>Verify Token</label><input readonly value="Set WHATSAPP_VERIFY_TOKEN in .env" onclick="this.select()"></div>
        <p style="font-size:.78rem;color:#64748b">Configure these values in your <code>.env</code> file and restart the server.</p>
      </div>
    </div>
    <div class="card" style="margin-top:16px">
      <div class="card-title">Setup Guide</div>
      <ol style="padding-left:20px;font-size:.875rem;line-height:2">
        <li>Copy <code>.env.example</code> to <code>.env</code> and fill in your Meta credentials.</li>
        <li>In <a href="https://developers.facebook.com" target="_blank">Meta Developers</a>, create an App with Lead Ads &amp; WhatsApp products.</li>
        <li>Set the webhook URLs above in your Meta App dashboard.</li>
        <li>Subscribe to <code>leadgen</code> events for Meta and <code>messages</code> for WhatsApp.</li>
        <li>Use "Sync Ads" on the Meta page after setting up your access token.</li>
      </ol>
    </div>
  `;
};

// ── Modal helpers ─────────────────────────────────────────────────────────────
function showModal(html) {
  let backdrop = document.querySelector('.modal-backdrop');
  if (!backdrop) {
    backdrop = document.createElement('div');
    backdrop.className = 'modal-backdrop';
    backdrop.addEventListener('click', e => { if (e.target === backdrop) closeModal(); });
    document.body.appendChild(backdrop);
  }
  backdrop.innerHTML = `<div class="modal">${html}</div>`;
  backdrop.style.display = 'flex';
}

window.closeModal = () => {
  const b = document.querySelector('.modal-backdrop');
  if (b) b.style.display = 'none';
};

// ── Boot ──────────────────────────────────────────────────────────────────────
navigate('dashboard');
