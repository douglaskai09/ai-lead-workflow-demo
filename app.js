const STORAGE_KEY = 'ai-lead-workflow-demo-v1';

const state = {
  leads: loadLeads(),
  currentLeadId: null,
};

const els = {
  form: document.getElementById('leadForm'),
  sampleBtn: document.getElementById('sampleBtn'),
  notice: document.getElementById('formNotice'),
  empty: document.getElementById('emptyState'),
  result: document.getElementById('result'),
  score: document.getElementById('score'),
  category: document.getElementById('category'),
  reasons: document.getElementById('reasons'),
  draft: document.getElementById('draft'),
  priorityBadge: document.getElementById('priorityBadge'),
  approvalState: document.getElementById('approvalState'),
  approveBtn: document.getElementById('approveBtn'),
  resetBtn: document.getElementById('resetBtn'),
  totalLeads: document.getElementById('totalLeads'),
  highLeads: document.getElementById('highLeads'),
  pendingLeads: document.getElementById('pendingLeads'),
  approvedLeads: document.getElementById('approvedLeads'),
  leadRows: document.getElementById('leadRows'),
  activityLog: document.getElementById('activityLog'),
};

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function normalizePhone(value) {
  return String(value || '').replace(/\D/g, '');
}

function loadLeads() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLeads() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.leads));
}

function getFormLead() {
  return {
    name: document.getElementById('name').value.trim(),
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    service: document.getElementById('service').value,
    budget: document.getElementById('budget').value,
    timeline: document.getElementById('timeline').value,
    message: document.getElementById('message').value.trim(),
  };
}

function findDuplicate(lead) {
  const email = normalize(lead.email);
  const phone = normalizePhone(lead.phone);
  return state.leads.find((item) => {
    const emailMatch = email && normalize(item.email) === email;
    const phoneMatch = phone && normalizePhone(item.phone) === phone;
    return emailMatch || phoneMatch;
  });
}

function qualifyLead(lead) {
  let score = 25;
  const reasons = [];
  const text = normalize(lead.message);

  if (lead.timeline === 'urgent') {
    score += 24;
    reasons.push('Urgent timeline indicates strong buying intent.');
  } else if (lead.timeline === 'week') {
    score += 18;
    reasons.push('Near-term timeline suggests an active project.');
  } else if (lead.timeline === 'month') {
    score += 10;
    reasons.push('Defined monthly timeline adds qualification confidence.');
  } else {
    reasons.push('Research-stage timeline lowers immediate sales priority.');
  }

  if (lead.budget === 'high') {
    score += 22;
    reasons.push('Budget is aligned with a substantial implementation.');
  } else if (lead.budget === 'mid') {
    score += 14;
    reasons.push('Mid-range budget supports a focused implementation.');
  } else if (lead.budget === 'low') {
    score += 4;
    reasons.push('Budget may require a tightly scoped first phase.');
  } else {
    reasons.push('Budget is unknown and should be clarified.');
  }

  const intentTerms = ['need', 'build', 'automate', 'fix', 'launch', 'ready', 'urgent', 'asap', 'crm', 'lead'];
  const matchedTerms = intentTerms.filter((term) => text.includes(term));
  if (matchedTerms.length >= 3) {
    score += 16;
    reasons.push('Message contains multiple implementation-intent signals.');
  } else if (matchedTerms.length > 0) {
    score += 8;
    reasons.push('Message contains direct implementation language.');
  }

  if (text.length > 140) {
    score += 8;
    reasons.push('Detailed request provides enough context for a useful first response.');
  }

  score = Math.max(0, Math.min(100, score));

  let priority = 'Low';
  let category = 'Nurture';
  if (score >= 75) {
    priority = 'High';
    category = 'Sales-ready';
  } else if (score >= 55) {
    priority = 'Medium';
    category = 'Qualified';
  }

  return { score, priority, category, reasons: reasons.slice(0, 4) };
}

function buildFollowUp(lead, qualification) {
  const firstName = lead.name.split(/\s+/)[0] || 'there';
  const urgencyLine = qualification.priority === 'High'
    ? 'Based on the timeline you shared, I’d prioritize confirming scope and access first so implementation can start quickly.'
    : 'The next useful step is to confirm scope, current tools, and the exact outcome you want the workflow to produce.';

  return `Hi ${firstName} — thanks for the details on your ${lead.service.toLowerCase()} project. ${urgencyLine} I can map the current process, identify the smallest reliable build, and define a clear handoff before we add anything unnecessary. If you send the tools you use today and one example of the current workflow, I can outline the next step.`;
}

function addActivity(message) {
  const li = document.createElement('li');
  li.textContent = `${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} — ${message}`;
  els.activityLog.prepend(li);
}

function renderCurrent(lead) {
  els.empty.hidden = true;
  els.result.hidden = false;
  els.score.textContent = lead.qualification.score;
  els.category.textContent = lead.qualification.category;
  els.reasons.innerHTML = '';
  lead.qualification.reasons.forEach((reason) => {
    const li = document.createElement('li');
    li.textContent = reason;
    els.reasons.appendChild(li);
  });
  els.draft.textContent = lead.followUp;
  els.priorityBadge.textContent = `${lead.qualification.priority} priority`;
  els.priorityBadge.className = `badge ${lead.qualification.priority.toLowerCase()}`;
  updateApprovalUI(lead);
}

function updateApprovalUI(lead) {
  const approved = lead.status === 'Approved';
  els.approvalState.textContent = approved ? 'Approved' : 'Needs approval';
  els.approvalState.className = `badge ${approved ? 'success' : 'warning'}`;
  els.approveBtn.disabled = approved;
  els.approveBtn.textContent = approved ? 'Follow-up approved' : 'Approve follow-up';
}

function renderDashboard() {
  els.totalLeads.textContent = state.leads.length;
  els.highLeads.textContent = state.leads.filter((lead) => lead.qualification.priority === 'High').length;
  els.pendingLeads.textContent = state.leads.filter((lead) => lead.status === 'Needs approval').length;
  els.approvedLeads.textContent = state.leads.filter((lead) => lead.status === 'Approved').length;

  if (!state.leads.length) {
    els.leadRows.innerHTML = '<tr><td colspan="5" class="empty-row">No leads yet.</td></tr>';
    return;
  }

  els.leadRows.innerHTML = state.leads.map((lead) => `
    <tr>
      <td><strong>${escapeHtml(lead.name)}</strong><br><span class="small">${escapeHtml(lead.email)}</span></td>
      <td>${escapeHtml(lead.service)}</td>
      <td>${lead.qualification.score}</td>
      <td><span class="badge ${lead.qualification.priority.toLowerCase()}">${lead.qualification.priority}</span></td>
      <td><span class="badge ${lead.status === 'Approved' ? 'success' : 'warning'}">${lead.status}</span></td>
    </tr>
  `).join('');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

els.form.addEventListener('submit', (event) => {
  event.preventDefault();
  els.notice.textContent = '';
  const input = getFormLead();
  const duplicate = findDuplicate(input);

  if (duplicate) {
    state.currentLeadId = duplicate.id;
    els.notice.textContent = 'Duplicate prevented: this email or phone already exists in the demo pipeline.';
    renderCurrent(duplicate);
    addActivity(`Duplicate blocked for ${input.email}.`);
    return;
  }

  const qualification = qualifyLead(input);
  const lead = {
    ...input,
    id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
    qualification,
    followUp: buildFollowUp(input, qualification),
    status: 'Needs approval',
    createdAt: new Date().toISOString(),
  };

  state.leads.unshift(lead);
  state.currentLeadId = lead.id;
  saveLeads();
  renderCurrent(lead);
  renderDashboard();
  addActivity(`${lead.name} qualified at ${qualification.score}/100 (${qualification.priority}).`);
  els.notice.textContent = 'Lead analyzed and added to the approval queue.';
});

els.approveBtn.addEventListener('click', () => {
  const lead = state.leads.find((item) => item.id === state.currentLeadId);
  if (!lead || lead.status === 'Approved') return;
  lead.status = 'Approved';
  lead.approvedAt = new Date().toISOString();
  saveLeads();
  updateApprovalUI(lead);
  renderDashboard();
  addActivity(`Human approval recorded for ${lead.name}'s follow-up.`);
});

els.sampleBtn.addEventListener('click', () => {
  document.getElementById('name').value = 'Jordan Lee';
  document.getElementById('email').value = `jordan.${Date.now().toString().slice(-5)}@example.com`;
  document.getElementById('phone').value = '404-555-0101';
  document.getElementById('service').value = 'Lead follow-up system';
  document.getElementById('budget').value = 'mid';
  document.getElementById('timeline').value = 'week';
  document.getElementById('message').value = 'We need to automate new website leads into our CRM, tag them, send a fast first response, and stop follow-ups when they reply. We want to launch this within a week.';
  els.notice.textContent = 'Sample loaded. Change anything you want, then analyze it.';
});

els.resetBtn.addEventListener('click', () => {
  localStorage.removeItem(STORAGE_KEY);
  state.leads = [];
  state.currentLeadId = null;
  els.form.reset();
  els.result.hidden = true;
  els.empty.hidden = false;
  els.priorityBadge.textContent = 'Waiting';
  els.priorityBadge.className = 'badge muted';
  els.notice.textContent = 'Demo reset.';
  els.activityLog.innerHTML = '<li>Demo initialized.</li>';
  renderDashboard();
});

renderDashboard();
