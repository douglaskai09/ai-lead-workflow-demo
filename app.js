const STORAGE_KEY = 'ai-lead-workflow-demo-v2';

const state = { leads: loadLeads(), currentLeadId: null };
const els = {
  form: document.getElementById('leadForm'), sampleBtn: document.getElementById('sampleBtn'), notice: document.getElementById('formNotice'),
  empty: document.getElementById('emptyState'), result: document.getElementById('result'), score: document.getElementById('score'),
  category: document.getElementById('category'), reasons: document.getElementById('reasons'), draft: document.getElementById('draft'),
  priorityBadge: document.getElementById('priorityBadge'), approvalState: document.getElementById('approvalState'), approveBtn: document.getElementById('approveBtn'),
  resetBtn: document.getElementById('resetBtn'), totalLeads: document.getElementById('totalLeads'), highLeads: document.getElementById('highLeads'),
  pendingLeads: document.getElementById('pendingLeads'), approvedLeads: document.getElementById('approvedLeads'), leadRows: document.getElementById('leadRows'),
  activityLog: document.getElementById('activityLog'), gateDecision: document.getElementById('gateDecision'), gateReason: document.getElementById('gateReason'),
  nextAction: document.getElementById('nextAction'), auditId: document.getElementById('auditId')
};

function normalize(v){return String(v||'').trim().toLowerCase()}
function normalizePhone(v){return String(v||'').replace(/\D/g,'')}
function loadLeads(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||[]}catch{return[]}}
function saveLeads(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state.leads))}
function makeAuditId(){return `DL-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`}

function getFormLead(){return {
  name:document.getElementById('name').value.trim(), email:document.getElementById('email').value.trim(), phone:document.getElementById('phone').value.trim(),
  service:document.getElementById('service').value, budget:document.getElementById('budget').value, timeline:document.getElementById('timeline').value,
  message:document.getElementById('message').value.trim()
}}

function findDuplicate(lead){const email=normalize(lead.email), phone=normalizePhone(lead.phone);return state.leads.find(item=>(email&&normalize(item.email)===email)||(phone&&normalizePhone(item.phone)===phone))}

function qualifyLead(lead){
  let score=25; const reasons=[]; const text=normalize(lead.message);
  const timelinePoints={urgent:24,week:18,month:10,researching:0}; score+=timelinePoints[lead.timeline]||0;
  reasons.push(lead.timeline==='urgent'?'Urgent timeline indicates strong buying intent.':lead.timeline==='week'?'Near-term timeline suggests an active project.':lead.timeline==='month'?'Defined timeline adds qualification confidence.':'Research-stage timing lowers immediate sales priority.');
  const budgetPoints={high:22,mid:14,low:4,unknown:0}; score+=budgetPoints[lead.budget]||0;
  reasons.push(lead.budget==='high'?'Budget supports a substantial implementation.':lead.budget==='mid'?'Budget supports a focused implementation.':lead.budget==='low'?'Budget likely requires a narrow first phase.':'Budget is unknown and should be clarified.');
  const terms=['need','build','automate','fix','launch','ready','urgent','asap','crm','lead']; const matched=terms.filter(t=>text.includes(t));
  if(matched.length>=3){score+=16;reasons.push('Multiple implementation-intent signals detected.')} else if(matched.length){score+=8;reasons.push('Direct implementation language detected.')}
  if(text.length>140){score+=8;reasons.push('Detailed request provides enough context for a useful first response.')}
  score=Math.max(0,Math.min(100,score));
  const priority=score>=75?'High':score>=55?'Medium':'Low'; const category=score>=75?'Sales-ready':score>=55?'Qualified':'Nurture';
  return {score,priority,category,reasons:reasons.slice(0,4)}
}

function evaluateGate(lead,q){
  if(!lead.email && !lead.phone) return {decision:'BLOCK',reason:'No reliable contact path is available.',nextAction:'Collect a valid email or phone number before any outreach.'};
  if(q.score<55) return {decision:'NURTURE',reason:'Qualification confidence is below the active-sales threshold.',nextAction:'Send a low-pressure clarification message and defer sales escalation.'};
  if(lead.budget==='unknown') return {decision:'CLARIFY',reason:'Budget uncertainty creates scope risk.',nextAction:'Confirm budget range before proposing implementation scope.'};
  if(q.priority==='High') return {decision:'REVIEW NOW',reason:'Intent, timing, and budget justify fast human review.',nextAction:'Approve or edit the drafted response, then schedule a scope call.'};
  return {decision:'REVIEW',reason:'Lead meets qualification threshold but does not require emergency handling.',nextAction:'Review the draft and confirm current tools, owner, and desired outcome.'};
}

function buildFollowUp(lead,q,gate){
  const first=lead.name.split(/\s+/)[0]||'there';
  const opener=gate.decision==='REVIEW NOW'?'Your timing makes this worth moving on quickly.':'The next useful step is to tighten the scope before building.';
  return `Hi ${first} — thanks for the details on your ${lead.service.toLowerCase()} project. ${opener} I’d map the current process, identify the smallest reliable implementation, and confirm the handoff before adding complexity. If you send the tools you use today and one example of the current workflow, I can outline the next step.`;
}

function addActivity(msg){const li=document.createElement('li');li.textContent=`${new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})} — ${msg}`;els.activityLog.prepend(li)}

function renderCurrent(lead){
  els.empty.hidden=true; els.result.hidden=false; els.score.textContent=lead.qualification.score; els.category.textContent=lead.qualification.category;
  els.reasons.innerHTML=''; lead.qualification.reasons.forEach(r=>{const li=document.createElement('li');li.textContent=r;els.reasons.appendChild(li)});
  els.draft.textContent=lead.followUp; els.priorityBadge.textContent=`${lead.qualification.priority} priority`; els.priorityBadge.className=`badge ${lead.qualification.priority.toLowerCase()}`;
  els.gateDecision.textContent=lead.gate.decision; els.gateReason.textContent=lead.gate.reason; els.nextAction.textContent=lead.gate.nextAction; els.auditId.textContent=lead.auditId;
  updateApprovalUI(lead)
}

function updateApprovalUI(lead){
  const approved=lead.status==='Approved', blocked=lead.gate.decision==='BLOCK';
  els.approvalState.textContent=approved?'Approved':blocked?'Blocked':'Needs approval'; els.approvalState.className=`badge ${approved?'success':blocked?'high':'warning'}`;
  els.approveBtn.disabled=approved||blocked; els.approveBtn.textContent=approved?'Follow-up approved':blocked?'Action blocked':'Approve follow-up'
}

function renderDashboard(){
  els.totalLeads.textContent=state.leads.length; els.highLeads.textContent=state.leads.filter(l=>l.qualification.priority==='High').length;
  els.pendingLeads.textContent=state.leads.filter(l=>l.status==='Needs approval').length; els.approvedLeads.textContent=state.leads.filter(l=>l.status==='Approved').length;
  if(!state.leads.length){els.leadRows.innerHTML='<tr><td colspan="5" class="empty-row">No leads yet.</td></tr>';return}
  els.leadRows.innerHTML=state.leads.map(lead=>`<tr><td><strong>${escapeHtml(lead.name)}</strong><br><span class="small">${escapeHtml(lead.email)}</span></td><td>${escapeHtml(lead.service)}</td><td>${lead.qualification.score}</td><td><span class="badge ${lead.gate.decision==='BLOCK'?'high':lead.gate.decision==='REVIEW NOW'?'success':'muted'}">${escapeHtml(lead.gate.decision)}</span></td><td><span class="badge ${lead.status==='Approved'?'success':'warning'}">${lead.status}</span></td></tr>`).join('')
}

function escapeHtml(v){return String(v).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;')}

els.form.addEventListener('submit',event=>{
  event.preventDefault(); els.notice.textContent=''; const input=getFormLead(); const duplicate=findDuplicate(input);
  if(duplicate){state.currentLeadId=duplicate.id;els.notice.textContent='Gate stopped a duplicate: this email or phone already exists in the pipeline.';renderCurrent(duplicate);addActivity(`GATE BLOCK — duplicate prevented for ${input.email}.`);return}
  const qualification=qualifyLead(input); const gate=evaluateGate(input,qualification);
  const lead={...input,id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),qualification,gate,auditId:makeAuditId(),status:gate.decision==='BLOCK'?'Blocked':'Needs approval',createdAt:new Date().toISOString()};
  lead.followUp=buildFollowUp(input,qualification,gate); state.leads.unshift(lead); state.currentLeadId=lead.id; saveLeads(); renderCurrent(lead); renderDashboard();
  addActivity(`${lead.auditId} — SCORE ${qualification.score}/100 → GATE ${gate.decision}.`); els.notice.textContent='Decision workflow completed and recorded.'
});

els.approveBtn.addEventListener('click',()=>{const lead=state.leads.find(i=>i.id===state.currentLeadId);if(!lead||lead.status==='Approved'||lead.gate.decision==='BLOCK')return;lead.status='Approved';lead.approvedAt=new Date().toISOString();saveLeads();updateApprovalUI(lead);renderDashboard();addActivity(`${lead.auditId} — VERIFY human approval recorded for ${lead.name}.`) });

els.sampleBtn.addEventListener('click',()=>{document.getElementById('name').value='Jordan Lee';document.getElementById('email').value=`jordan.${Date.now().toString().slice(-5)}@example.com`;document.getElementById('phone').value='404-555-0101';document.getElementById('service').value='Lead follow-up system';document.getElementById('budget').value='mid';document.getElementById('timeline').value='week';document.getElementById('message').value='We need to automate new website leads into our CRM, tag them, send a fast first response, and stop follow-ups when they reply. We want to launch this within a week.';els.notice.textContent='Sample loaded. Change anything you want, then run the workflow.'});

els.resetBtn.addEventListener('click',()=>{localStorage.removeItem(STORAGE_KEY);state.leads=[];state.currentLeadId=null;els.form.reset();els.result.hidden=true;els.empty.hidden=false;els.priorityBadge.textContent='Waiting';els.priorityBadge.className='badge muted';els.notice.textContent='Demo reset.';els.activityLog.innerHTML='<li>Demo initialized.</li>';renderDashboard()});

renderDashboard();