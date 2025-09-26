/* MedicaMate - app.js
   Single-file app logic:
   - Demo users & sample prescriptions (updated dates for 2025 testing)
   - Login + role-based UI control (fixed redirection with debug alert)
   - Doctor CRUD for prescriptions (create/edit/add medicines)
   - Reminder generation for today and browser notifications
   - Persistence via localStorage
   - Extra: Modal for viewing prescriptions (better UX for patients)
   - Extra: Patient selector dropdown in form (matches demo patients)
   - Extra: Badge for 'taken' status with styling
   - Extra: Improved next reminder display with patient name
   - Fix: Robust login with Enter key support, better error messages, and temp debug alert
*/
/* ---------- Demo data & storage ---------- */
const DEMO_USERS = {
  patients: [
    { id: 1, username: 'patient1', password: 'pass123', name: 'John Doe', type: 'patient' },
    { id: 2, username: 'patient2', password: 'pass123', name: 'Jane Smith', type: 'patient' },
  ],
  doctors: [
    { id: 1, username: 'doctor1', password: 'doc123', name: 'Dr. Williams', type: 'doctor' },
    { id: 2, username: 'admin', password: 'admin123', name: 'Admin User', type: 'doctor' },
  ]
};
const SAMPLE_PRESCRIPTIONS = [
  {
    id: 1,
    patientId: 1,
    patientName: 'John Doe',
    doctorId: 1,
    doctorName: 'Dr. Williams',
    medicines: [
      { id: 11, name: 'Paracetamol', dosage: '500mg', frequency: 'Twice daily', times: ['09:00','21:00'] },
      { id: 12, name: 'Vitamin D', dosage: '1000IU', frequency: 'Once daily', times: ['08:00'] }
    ],
    notes: 'Take with food.',
    date: '2025-09-25'
  },
  {
    id: 2,
    patientId: 2,
    patientName: 'Jane Smith',
    doctorId: 1,
    doctorName: 'Dr. Williams',
    medicines: [{ id: 21, name: 'Metformin', dosage: '850mg', frequency: 'Twice daily', times: ['08:00','20:00'] }],
    notes: 'Monitor blood sugar.',
    date: '2025-09-25'
  }
];
const STORAGE_KEYS = { PRESC: 'mm_prescriptions_v1' };
/* ---------- State ---------- */
let appState = {
  currentUser: null,
  prescriptions: loadPrescriptions(),
  editingPrescriptionId: null
};
/* ---------- initialization ---------- */
document.addEventListener('DOMContentLoaded', () => {
  wireAuth();
  wireAppUI();
  wireModal();
  showOnlyLogin();
  requestNotificationPermission();
  startReminderTicker();
  populatePatientSelect();
});
/* ---------- storage helpers ---------- */
function loadPrescriptions() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.PRESC);
    if (raw) return JSON.parse(raw);
  } catch (e) { console.warn(e); }
  // first-time fallback
  localStorage.setItem(STORAGE_KEYS.PRESC, JSON.stringify(SAMPLE_PRESCRIPTIONS));
  return JSON.parse(localStorage.getItem(STORAGE_KEYS.PRESC));
}
function savePrescriptions() {
  localStorage.setItem(STORAGE_KEYS.PRESC, JSON.stringify(appState.prescriptions));
}
/* ---------- AUTH UI ---------- */
function wireAuth() {
  const loginBtn = document.getElementById('login-btn');
  const togglePw = document.getElementById('toggle-pw');
  const pwInput = document.getElementById('login-password');
  loginBtn.addEventListener('click', handleLogin);
  togglePw.addEventListener('click', () => {
    pwInput.type = (pwInput.type === 'password') ? 'text' : 'password';
  });
  // Allow Enter key to login
  pwInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleLogin();
  });
}
/* login */
function handleLogin() {
  const type = document.getElementById('login-type').value;
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  if (!username || !password) {
    alert('Please enter both username and password.');
    return;
  }
  if (!type) {
    alert('Please select a user type (Patient or Doctor).');
    return;
  }
  const list = (type === 'patient') ? DEMO_USERS.patients : DEMO_USERS.doctors;
  const user = list.find(u => u.username === username && u.password === password);
  if (!user) {
    alert('Invalid username or password. Try: patient1/pass123 or doctor1/doc123');
    return;
  }
  appState.currentUser = user;
  // Temp debug: Confirm login before UI switch
  alert(`Login successful for ${user.name}! Redirecting to dashboard...`);
  showAppForUser();
}
/* logout */
document.addEventListener('click', (e) => {
  if (e.target && e.target.id === 'logout-btn') {
    appState.currentUser = null;
    showOnlyLogin();
  }
});
/* ---------- APP UI wiring ---------- */
function wireAppUI() {
  // nav
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.view;
      switchView(view);
    });
  });
  // open reminders from dashboard
  document.getElementById('open-reminders').addEventListener('click', ()=> switchView('reminders'));
  document.getElementById('mark-all-taken').addEventListener('click', markAllTaken);
  // prescriptions actions
  document.getElementById('search-presc').addEventListener('input', renderPrescriptionsList);
  // new prescription controls
  document.getElementById('add-medicine-btn').addEventListener('click', addMedicineRow);
  document.getElementById('save-prescription').addEventListener('click', savePrescriptionFromForm);
  document.getElementById('cancel-prescription').addEventListener('click', () => switchView('prescriptions'));
}
/* Populate patient select dropdown */
function populatePatientSelect() {
  const select = document.getElementById('presc-patient');
  select.innerHTML = '<option value="">Select a patient</option>' + DEMO_USERS.patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
}
/* ---------- Views ---------- */
function showOnlyLogin(){
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('login-screen').classList.remove('hidden'); // Ensure visible
  document.getElementById('app-screen').classList.add('hidden');
  const modal = document.getElementById('modal');
  modal.classList.add('hidden');
  modal.style.display = 'none';
}
function showAppForUser(){
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('login-screen').classList.add('hidden'); // Extra hide
  document.getElementById('app-screen').classList.remove('hidden');
  document.getElementById('app-screen').style.display = 'flex'; // Force flex
  const u = appState.currentUser;
  document.getElementById('sidebar-role').textContent = u.type === 'doctor' ? 'Doctor / Admin' : 'Patient';
  document.getElementById('user-name').textContent = u.name;
  document.getElementById('user-username').textContent = u.username;
  document.getElementById('welcome-name').textContent = u.name.split(' ')[0];
  document.getElementById('welcome-role').textContent = u.type === 'doctor' ? 'You can manage prescriptions & notes' : 'View your active reminders & prescriptions';
  document.getElementById('welcome-summary').textContent = 'MedicaMate helps you remember medicines — on time.';
  // doctor-only nav
  document.getElementById('nav-new-presc').style.display = (u.type==='doctor') ? 'block' : 'none';
  // default view
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  document.querySelector('.nav-btn[data-view="home"]').classList.add('active');
  switchView('home');
}
/* switch main views */
function switchView(viewName) {
  document.querySelectorAll('.view').forEach(v=>v.classList.add('hidden'));
  const el = document.getElementById('view-' + viewName);
  if (el) el.classList.remove('hidden');
  // render content for each view
  if (viewName === 'home') renderHome();
  if (viewName === 'prescriptions') renderPrescriptionsList();
  if (viewName === 'reminders') renderReminders();
  if (viewName === 'new-prescription') openNewPrescriptionForm();
}
/* ---------- Home render ---------- */
function renderHome() {
  // show next upcoming reminder
  const next = getTodaysReminders().filter(r=>!r.taken).sort((a,b)=>a.time.localeCompare(b.time))[0];
  const nr = document.getElementById('next-reminder');
  if (next) {
    const statusText = next.status.charAt(0).toUpperCase() + next.status.slice(1);
    nr.innerHTML = `<strong>${next.time}</strong> • ${next.medicine} — ${next.dosage}<br><span class="tiny">${next.patientName} • ${statusText}</span>`;
  } else nr.textContent = 'No reminders today';
  // quick prescriptions preview (3)
  const wrap = document.getElementById('quick-prescriptions'); wrap.innerHTML = '';
  const visible = appState.prescriptions.filter(p => {
    return (appState.currentUser.type === 'doctor') || p.patientId === appState.currentUser.id;
  }).slice(0,3);
  if (visible.length===0) {
    wrap.innerHTML = `<div class="card">No prescriptions available</div>`;
    return;
  }
  visible.forEach(p=>{
    const div = document.createElement('div'); div.className='card';
    div.style.minWidth='220px';
    const medsPreview = p.medicines.slice(0,2).map(m => `<div><strong>${m.name}</strong> ${m.dosage}<div class="tiny">${m.times.join(', ')}</div></div>`).join('');
    const more = p.medicines.length > 2 ? `+${p.medicines.length - 2} more` : '';
    div.innerHTML = `<h4>${p.patientName}</h4><div class="tiny">Dr. ${p.doctorName} • ${p.date}</div>
      <div class="presc-meds">${medsPreview}${more ? `<div class="tiny">${more}</div>` : ''}</div>`;
    wrap.appendChild(div);
  });
}
/* ---------- Prescriptions list ---------- */
function renderPrescriptionsList(){
  const list = document.getElementById('prescriptions-list'); list.innerHTML = '';
  const q = document.getElementById('search-presc').value.trim().toLowerCase();
  const visible = appState.prescriptions.filter(p=>{
    if (appState.currentUser.type === 'doctor') return true;
    return p.patientId === appState.currentUser.id;
  }).filter(p => {
    if (!q) return true;
    if (p.patientName.toLowerCase().includes(q)) return true;
    if (p.medicines.some(m=>m.name.toLowerCase().includes(q))) return true;
    return false;
  });
  if (visible.length===0) {
    list.innerHTML = `<div class="card">No prescriptions found</div>`; return;
  }
  visible.forEach(p=>{
    const card = document.createElement('div');
    card.className='card prescription-card';
    const medsHtml = p.medicines.map(m=>
      `<div><strong>${m.name}</strong> — ${m.dosage} <div class="tiny">${m.frequency} • ${m.times.join(', ')}</div></div>`
    ).join('');
    const notesHtml = p.notes ? `<div style="margin-top:8px;"><strong>Notes:</strong><div class="tiny">${p.notes}</div></div>` : '';
    const editBtn = appState.currentUser.type==='doctor' ? `<button class="btn small" data-edit="${p.id}">Edit</button>` : '';
    const deleteBtn = appState.currentUser.type==='doctor' ? `<button class="btn danger small" data-delete="${p.id}">Delete</button>` : '';
    card.innerHTML = `
      <div class="meta">
        <h3>${p.patientName}</h3>
        <div class="tiny">Dr. ${p.doctorName} • ${p.date}</div>
        <div class="presc-meds">
          ${medsHtml}
        </div>
        ${notesHtml}
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;align-items:flex-end">
        ${editBtn}
        ${deleteBtn}
      </div>
    `;
    list.appendChild(card);
  });
  // attach edit/delete actions
  list.querySelectorAll('[data-edit]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = parseInt(e.target.dataset.edit,10);
      openEditPrescription(id);
    });
  });
  list.querySelectorAll('[data-delete]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = parseInt(e.target.dataset.delete,10);
      if (confirm('Delete this prescription?')) {
        appState.prescriptions = appState.prescriptions.filter(p=>p.id!==id);
        savePrescriptions(); renderPrescriptionsList();
      }
    });
  });
}
/* ---------- New / Edit Prescription Form ---------- */
function openNewPrescriptionForm() {
  appState.editingPrescriptionId = null;
  document.getElementById('presc-form-title').textContent = 'New Prescription';
  document.getElementById('presc-patient').value = '';
  document.getElementById('presc-notes').value = '';
  document.getElementById('medicines-wrap').innerHTML = '';
  addMedicineRow(); // one row to start
}
function openEditPrescription(id) {
  const presc = appState.prescriptions.find(p=>p.id===id);
  if (!presc) return alert('Prescription not found');
  if (appState.currentUser.type === 'patient' && presc.patientId !== appState.currentUser.id) {
    // patient viewing someone else's prescription - disallow
    return alert('You are not allowed to view this prescription');
  }
  if (appState.currentUser.type==='doctor') {
    openEditPrescriptionForm(presc);
  } else {
    // patient viewing own - show modal
    const content = `
      <h3>Prescription for ${presc.patientName}</h3>
      <p><strong>Doctor:</strong> ${presc.doctorName}</p>
      <p><strong>Date:</strong> ${presc.date}</p>
      ${presc.notes ? `<p><strong>Notes:</strong> ${presc.notes}</p>` : ''}
      <h4>Medicines:</h4>
      <ul>
        ${presc.medicines.map(m => `<li><strong>${m.name}</strong> - ${m.dosage}<br><small>${m.frequency} at ${m.times.join(', ')}</small></li>`).join('')}
      </ul>
    `;
    showModal(content);
  }
}
function openEditPrescriptionForm(presc) {
  appState.editingPrescriptionId = presc.id;
  document.getElementById('presc-form-title').textContent = 'Edit Prescription';
  document.getElementById('presc-patient').value = presc.patientId;
  document.getElementById('presc-notes').value = presc.notes || '';
  document.getElementById('medicines-wrap').innerHTML = '';
  presc.medicines.forEach(m => addMedicineRow(m));
  switchView('new-prescription');
}
/* add medicine row to form */
function addMedicineRow(med = null) {
  const wrap = document.getElementById('medicines-wrap');
  const row = document.createElement('div');
  row.className = 'medicine-row';
  const id = Date.now() + Math.floor(Math.random()*999);
  row.dataset.rowId = id;
  row.innerHTML = `
    <input placeholder="Medicine name" class="med-name" value="${med ? med.name : ''}" />
    <input placeholder="Dosage (e.g., 500mg)" class="med-dosage" value="${med ? med.dosage : ''}" />
    <input placeholder="Frequency (e.g., Twice daily)" class="med-freq" value="${med ? med.frequency : ''}" />
    <input placeholder="Time (HH:MM, comma separated)" class="med-times" value="${med ? med.times.join(',') : ''}" />
    <button class="remove-med" title="remove">✖</button>
  `;
  wrap.appendChild(row);
  row.querySelector('.remove-med').addEventListener('click', ()=> row.remove());
}
/* save prescription (create or update) */
function savePrescriptionFromForm() {
  const patientSelect = document.getElementById('presc-patient');
  const patientId = parseInt(patientSelect.value);
  if (!patientId) return alert('Select a patient');
  const patient = DEMO_USERS.patients.find(p => p.id === patientId);
  const patientName = patient ? patient.name : '';
  const rows = Array.from(document.querySelectorAll('.medicine-row'));
  const meds = [];
  rows.forEach(r=>{
    const nm = r.querySelector('.med-name').value.trim();
    const ds = r.querySelector('.med-dosage').value.trim();
    const fq = r.querySelector('.med-freq').value.trim() || 'As needed';
    const ts = r.querySelector('.med-times').value.trim();
    if (!nm || !ds || !ts) return; // skip invalid
    const times = ts.split(',').map(t=>t.trim()).filter(Boolean);
    meds.push({ id: Date.now() + Math.floor(Math.random()*999), name: nm, dosage: ds, frequency: fq, times });
  });
  if (meds.length === 0) return alert('Add at least one valid medicine (name, dosage, time)');
  const notes = document.getElementById('presc-notes').value.trim();
  const nowDate = new Date().toISOString().split('T')[0];
  if (appState.editingPrescriptionId) {
    // update existing
    const idx = appState.prescriptions.findIndex(p=>p.id===appState.editingPrescriptionId);
    if (idx===-1) return alert('Prescription not found');
    appState.prescriptions[idx].patientId = patientId;
    appState.prescriptions[idx].patientName = patientName;
    appState.prescriptions[idx].medicines = meds;
    appState.prescriptions[idx].notes = notes;
    appState.prescriptions[idx].date = nowDate;
  } else {
    // new
    const newPresc = {
      id: Date.now(),
      patientId,
      patientName,
      doctorId: appState.currentUser.id,
      doctorName: appState.currentUser.name,
      medicines: meds,
      notes,
      date: nowDate
    };
    appState.prescriptions.push(newPresc);
  }
  savePrescriptions();
  alert('Prescription saved');
  switchView('prescriptions');
}
/* ---------- Reminders logic ---------- */
/* produce flat reminders for today for the logged-in patient */
function getTodaysReminders() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const reminders = [];
  appState.prescriptions.forEach(p => {
    // doctors see everyone's reminders; patients only their own
    if (appState.currentUser.type === 'patient' && p.patientId !== appState.currentUser.id) return;
    p.medicines.forEach(m => {
      m.times.forEach(time => {
        // time format HH:MM
        const reminderId = `${p.id}-${m.id}-${time}`;
        const rm = {
          id: reminderId,
          prescId: p.id,
          patientName: p.patientName,
          medicine: m.name,
          dosage: m.dosage,
          time,
          date: today,
          taken: !!(localStorage.getItem(`mm_taken_${reminderId}`) === '1')
        };
        // compute status
        const [h,mn] = time.split(':').map(t=>parseInt(t,10));
        const remDate = new Date(today + 'T' + (time.length===5?time:('0'+time)));
        if (remDate > now) rm.status = 'upcoming';
        else {
          const diff = Math.abs(now - remDate);
          rm.status = (diff <= 30*60*1000) ? 'due' : 'overdue';
        }
        reminders.push(rm);
      });
    });
  });
  // sort ascending by time
  reminders.sort((a,b)=>a.time.localeCompare(b.time));
  return reminders;
}
/* render reminders view */
function renderReminders() {
  const wrap = document.getElementById('reminders-list'); wrap.innerHTML = '';
  const rems = getTodaysReminders();
  // Hide/show mark all for patients only
  document.getElementById('mark-all-taken').style.display = appState.currentUser.type === 'patient' ? 'inline-block' : 'none';
  if (rems.length===0) { wrap.innerHTML = `<div class="card">No reminders for today</div>`; return; }
  rems.forEach(r => {
    const div = document.createElement('div'); div.className='card';
    div.style.display='flex'; div.style.justifyContent='space-between'; div.style.alignItems='center';
    const statusText = r.taken ? 'Taken' : r.status.charAt(0).toUpperCase() + r.status.slice(1);
    const badgeClass = r.taken ? 'taken' : r.status === 'upcoming' ? 'upcoming' : r.status === 'due' ? 'due' : 'overdue';
    const toggleBtn = appState.currentUser.type === 'patient' ? `<button class="btn" data-toggle="${r.id}">${r.taken ? 'Undo' : 'Mark Taken'}</button>` : '';
    div.innerHTML = `
      <div>
        <div style="display:flex;gap:10px;align-items:center">
          <div style="font-weight:700;font-size:16px">${r.time}</div>
          <div style="font-size:15px">${r.medicine}</div>
          <div class="badge ${badgeClass}">${statusText}</div>
        </div>
        <div class="tiny">Dosage: ${r.dosage} • Patient: ${r.patientName}</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center">
        ${toggleBtn}
        <button class="btn small" data-info="${r.prescId}">View Presc</button>
      </div>
    `;
    wrap.appendChild(div);
  });
  // toggle taken handlers
  wrap.querySelectorAll('[data-toggle]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const id = e.target.dataset.toggle;
      const key = `mm_taken_${id}`;
      const was = localStorage.getItem(key) === '1';
      if (was) localStorage.removeItem(key);
      else localStorage.setItem(key,'1');
      renderReminders();
    });
  });
  // view prescription handlers
  wrap.querySelectorAll('[data-info]').forEach(btn=>{
    btn.addEventListener('click', (e)=>{
      const pid = parseInt(e.target.dataset.info,10);
      openEditPrescription(pid);
    });
  });
}
/* mark all as taken */
function markAllTaken(){
  const rems = getTodaysReminders().filter(r=>!r.taken);
  if (rems.length === 0) return alert('No pending reminders');
  rems.forEach(r => localStorage.setItem(`mm_taken_${r.id}`, '1'));
  renderReminders();
}
/* ---------- Reminder ticker + notifications ---------- */
function startReminderTicker(){
  // check every 30 seconds for due reminders to notify
  setInterval(()=> {
    if (!appState.currentUser) return;
    const rems = getTodaysReminders().filter(r=> r.status === 'due' && !r.taken);
    rems.forEach(r => {
      // to avoid spamming, mark a "notified" flag
      const key = `mm_notified_${r.id}`;
      if (!localStorage.getItem(key)) {
        showBrowserNotification(`Time to take ${r.medicine}`, `${r.time} • ${r.dosage}`);
        localStorage.setItem(key, '1');
      }
    });
    // refresh UI if we're on reminders
    if (!document.getElementById('view-reminders').classList.contains('hidden')) renderReminders();
    if (!document.getElementById('view-prescriptions').classList.contains('hidden')) renderPrescriptionsList();
    if (!document.getElementById('view-home').classList.contains('hidden')) renderHome();
  }, 30 * 1000);
}
/* Browser Notification */
function requestNotificationPermission(){
  if (!('Notification' in window)) return;
  if (Notification.permission === 'default') Notification.requestPermission();
}
function showBrowserNotification(title, body){
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  new Notification(title, { body, icon: '' });
}
/* ---------- Modal helper ---------- */
function wireModal() {
  const modal = document.getElementById('modal');
  const closeBtn = document.getElementById('close-modal');
  closeBtn.addEventListener('click', () => {
    modal.classList.add('hidden');
    modal.style.display = 'none';
  });
  modal.addEventListener('click', (e) => {
    if (e.target.id === 'modal') {
      modal.classList.add('hidden');
      modal.style.display = 'none';
    }
  });
  // Force hide on load
  modal.style.display = 'none';
  modal.classList.add('hidden');
}
function showModal(content) {
  const modal = document.getElementById('modal');
  document.getElementById('modal-body').innerHTML = content;
  modal.classList.remove('hidden');
  modal.style.display = 'flex';
}