/**
 * HANAQAAD COLLEGE — Admin & Teacher Management Logic (v3.0)
 * Powered by Browser LocalStorage (Local Database Engine)
 *
 * Capabilities:
 *  - Sequential Unique Student ID Generator (starts at HC-500)
 *  - Student Registration (Admin & Teachers, fee amount & free waiver)
 *  - Security PIN protection for Public Student Portal
 *  - Examination Results Management (Admin & Teachers)
 *  - Classroom Attendance Roll Call (P/A toggles)
 *  - Dynamic Programs (CLD, ED, TC, Arabic, Maths + Custom additions)
 *  - Tuition Fee Accounting & Tracking (Admin restricted)
 *  - Teacher Account Management (Admin restricted)
 *  - Real-time Overview Statistics & Live Activity Log
 *  - Backup & JSON Export
 */

'use strict';

/* ────────────────────────────────────────────────────────────
   1. BUILT-IN PROGRAM DEFAULTS
──────────────────────────────────────────────────────────── */
const BUILTIN_PROGRAMS = [
  { key: 'cld',    label: 'Computer Literacy Diploma (CLD)', fee: 150, builtin: true },
  { key: 'ed',     label: 'English Department (ED)',          fee: 120, builtin: true },
  { key: 'tc',     label: 'Training Course (TC)',             fee: 100, builtin: true },
  { key: 'arabic', label: 'Arabic Language (Arabic)',         fee:  80, builtin: true },
  { key: 'maths',  label: 'Mathematics (Maths)',              fee:  80, builtin: true },
];

const AVATAR_COLORS = ['av-blue', 'av-green', 'av-purple', 'av-amber', 'av-pink', 'av-teal'];

/* ────────────────────────────────────────────────────────────
   2. SUPABASE CLOUD DATABASE ENGINE
──────────────────────────────────────────────────────────── */
const SupabaseDB = {
  KEYS: {
    STUDENTS:      'hanaqaad_students',
    ATTENDANCE:    'hanaqaad_attendance',
    REGISTRATIONS: 'hanaqaad_registrations',
    FEES:          'hanaqaad_fees',
    ACTIVITY:      'hanaqaad_activity',
    PROGRAMS:      'hanaqaad_programs',
    TEACHERS:      'hanaqaad_teachers',
    EXAMS:         'hanaqaad_exams',
  },

  client: null,
  isLive: false,

  init() {
    // 1. Initialize Supabase Client if configured
    if (window.supabase && window.ENV_SUPABASE_URL && window.ENV_SUPABASE_ANON_KEY) {
      try {
        this.client = window.supabase.createClient(window.ENV_SUPABASE_URL, window.ENV_SUPABASE_ANON_KEY);
        window._sb = this.client;
      } catch (e) {
        console.warn('Supabase client init error:', e);
      }
    }

    // 2. Ensure initial empty structures in cache (zero demo data)
    if (!localStorage.getItem(this.KEYS.STUDENTS)) {
      localStorage.setItem(this.KEYS.STUDENTS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.KEYS.PROGRAMS)) {
      localStorage.setItem(this.KEYS.PROGRAMS, JSON.stringify(BUILTIN_PROGRAMS));
    }
    if (!localStorage.getItem(this.KEYS.TEACHERS)) {
      localStorage.setItem(this.KEYS.TEACHERS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.KEYS.EXAMS)) {
      localStorage.setItem(this.KEYS.EXAMS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.KEYS.FEES)) {
      localStorage.setItem(this.KEYS.FEES, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.KEYS.REGISTRATIONS)) {
      localStorage.setItem(this.KEYS.REGISTRATIONS, JSON.stringify([]));
    }
    if (!localStorage.getItem(this.KEYS.ATTENDANCE)) {
      localStorage.setItem(this.KEYS.ATTENDANCE, JSON.stringify({}));
    }
    if (!localStorage.getItem(this.KEYS.ACTIVITY)) {
      localStorage.setItem(this.KEYS.ACTIVITY, JSON.stringify([]));
    }

    // 3. Sync live records from Supabase
    this.syncFromSupabase();
  },

  async syncFromSupabase() {
    if (!this.client) return;

    try {
      const dot = document.getElementById('supabaseDot');
      const text = document.getElementById('supabaseText');

      // Sync programs (CLD, ED, TC, Arabic, Maths + Custom)
      const { data: progs, error: progErr } = await this.client.from('programs').select('*').order('created_at', { ascending: true });
      if (!progErr && progs && progs.length > 0) {
        // Merge with builtins
        const merged = [...BUILTIN_PROGRAMS];
        progs.forEach(p => {
          const idx = merged.findIndex(m => m.key === p.key);
          if (idx !== -1) {
            merged[idx] = { key: p.key, label: p.label, fee: Number(p.default_fee || merged[idx].fee), builtin: p.is_builtin };
          } else {
            merged.push({ key: p.key, label: p.label, fee: Number(p.default_fee || 100), builtin: false });
          }
        });
        localStorage.setItem(this.KEYS.PROGRAMS, JSON.stringify(merged));
        if (typeof populateAllProgramDropdowns === 'function') populateAllProgramDropdowns();
      }

      // Sync students
      const { data: studs, error: studErr } = await this.client.from('students').select('*').order('created_at', { ascending: false });
      if (!studErr && studs) {
        localStorage.setItem(this.KEYS.STUDENTS, JSON.stringify(studs));
        this.isLive = true;
      }

      // Sync attendance
      const { data: atts, error: attErr } = await this.client.from('attendance').select('*');
      if (!attErr && atts) {
        const store = {};
        atts.forEach(a => {
          if (!store[a.date]) store[a.date] = {};
          store[a.date][a.student_id] = a.status;
        });
        localStorage.setItem(this.KEYS.ATTENDANCE, JSON.stringify(store));
      }

      // Sync fees
      const { data: feeData, error: feeErr } = await this.client.from('fees').select('*').order('created_at', { ascending: false });
      if (!feeErr && feeData) {
        localStorage.setItem(this.KEYS.FEES, JSON.stringify(feeData));
      }

      // Sync exams
      const { data: examData, error: examErr } = await this.client.from('exams').select('*').order('created_at', { ascending: false });
      if (!examErr && examData) {
        localStorage.setItem(this.KEYS.EXAMS, JSON.stringify(examData));
      }

      // Sync teachers (from profiles table where role='teacher')
      const { data: profiles, error: profErr } = await this.client.from('profiles').select('*').eq('role', 'teacher');
      if (!profErr && profiles) {
        localStorage.setItem(this.KEYS.TEACHERS, JSON.stringify(profiles));
      }

      // Update Live Status Badge
      if (dot) dot.style.background = '#22c55e';
      if (text) text.textContent = 'Supabase Connected';

      // Refresh current dashboard view with live data
      if (typeof renderCurrentView === 'function') renderCurrentView();

    } catch (err) {
      console.warn('Supabase sync notice:', err);
    }
  },

  /**
   * Sequential Unique Student ID Generator
   * Format: HC-500, HC-501, HC-502, ...
   * Never duplicates, scans all existing records, starts at HC-500.
   */
  getNextStudentId() {
    const students = this.getStudents();
    const regs = this.getRegistrations();
    let maxNum = 499; // so that the first registered student receives HC-500

    const checkId = (idStr) => {
      if (!idStr) return;
      const m = String(idStr).match(/^HC-(\d+)$/i);
      if (m) {
        const num = parseInt(m[1], 10);
        if (!isNaN(num) && num > maxNum) maxNum = num;
      }
    };

    students.forEach(s => checkId(s.student_id));
    regs.forEach(r => checkId(r.student_id));

    return `HC-${maxNum + 1}`;
  },

  // ── Programs
  getPrograms() {
    try {
      const stored = JSON.parse(localStorage.getItem(this.KEYS.PROGRAMS));
      if (!stored || stored.length === 0) return [...BUILTIN_PROGRAMS];
      return stored;
    } catch {
      return [...BUILTIN_PROGRAMS];
    }
  },
  saveProgram(prog) {
    const list = this.getPrograms();
    const key = prog.key.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    const exists = list.find(p => p.key === key);
    if (exists) return null;
    const newProg = { key, label: prog.label, fee: Number(prog.fee || 0), builtin: false };
    list.push(newProg);
    localStorage.setItem(this.KEYS.PROGRAMS, JSON.stringify(list));
    this.logActivity(`Program added: ${prog.label}`, `Code: ${key.toUpperCase()} · Fee: $${prog.fee}`, 'activity-dot-blue');

    if (this.client) {
      this.client.from('programs').upsert([{
        key: newProg.key,
        label: newProg.label,
        default_fee: newProg.fee,
        is_builtin: false
      }]).then(res => {
        if (res.error) console.warn('Supabase program save error:', res.error);
      });
    }
    return newProg;
  },
  deleteProgram(key) {
    let list = this.getPrograms();
    const prog = list.find(p => p.key === key);
    if (prog && prog.builtin) return false;
    list = list.filter(p => p.key !== key);
    localStorage.setItem(this.KEYS.PROGRAMS, JSON.stringify(list));

    if (this.client) {
      this.client.from('programs').delete().eq('key', key).then(res => {
        if (res.error) console.warn('Supabase program delete error:', res.error);
      });
    }
    return true;
  },
  getProgramLabel(key) {
    const prog = this.getPrograms().find(p => p.key === key);
    return prog ? prog.label : (key || '').toUpperCase();
  },
  getProgramFee(key) {
    const prog = this.getPrograms().find(p => p.key === key);
    return prog ? prog.fee : 100;
  },

  // ── Students
  getStudents() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.STUDENTS)) || [];
    } catch {
      return [];
    }
  },
  saveStudent(student) {
    const list = this.getStudents();
    let saved = null;
    if (student.id && !student.id.startsWith('s_temp_')) {
      const idx = list.findIndex(s => s.id === student.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...student, updated_at: new Date().toISOString() };
        saved = list[idx];
      }
    } else {
      const newId = student.id || 's_' + Date.now();
      saved = {
        ...student,
        id: newId,
        created_at: new Date().toISOString(),
      };
      list.unshift(saved);
      this.logActivity(`Student enrolled: ${saved.first_name} ${saved.last_name}`, `ID: ${saved.student_id} · ${this.getProgramLabel(saved.program)}`, 'activity-dot-blue');
    }
    localStorage.setItem(this.KEYS.STUDENTS, JSON.stringify(list));

    if (this.client && saved) {
      const payload = {
        first_name: saved.first_name,
        last_name: saved.last_name,
        student_id: saved.student_id,
        phone: saved.phone,
        program: saved.program,
        status: saved.status || 'active',
        security_pin: saved.pin || saved.security_pin || null,
        fee_amount: Number(saved.fee_amount || 0),
        is_free: Boolean(saved.is_free),
        notes: saved.notes || null,
      };
      if (saved.id && !saved.id.startsWith('s_')) payload.id = saved.id;

      this.client.from('students').upsert([payload]).select().then(res => {
        if (!res.error && res.data && res.data[0]) {
          const idx = list.findIndex(s => s.student_id === saved.student_id);
          if (idx !== -1) {
            list[idx].id = res.data[0].id;
            localStorage.setItem(this.KEYS.STUDENTS, JSON.stringify(list));
          }
        } else if (res.error) {
          console.warn('Supabase student save error:', res.error);
        }
      });
    }
    return list;
  },
  deleteStudent(id) {
    let list = this.getStudents();
    const student = list.find(s => s.id === id);
    list = list.filter(s => s.id !== id);
    localStorage.setItem(this.KEYS.STUDENTS, JSON.stringify(list));
    if (student) {
      this.logActivity(`Student removed: ${student.first_name} ${student.last_name}`, 'Deleted from directory', 'activity-dot-amber');
    }
    if (this.client) {
      this.client.from('students').delete().eq('id', id).then(res => {
        if (res.error) console.warn('Supabase delete error:', res.error);
      });
    }
    return list;
  },

  // ── Attendance
  getAttendanceStore() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.ATTENDANCE)) || {};
    } catch {
      return {};
    }
  },
  getDateAttendance(date) {
    const store = this.getAttendanceStore();
    return store[date] || {};
  },
  saveDateAttendance(date, recordsMap) {
    const store = this.getAttendanceStore();
    store[date] = recordsMap;
    localStorage.setItem(this.KEYS.ATTENDANCE, JSON.stringify(store));

    const total = Object.keys(recordsMap).length;
    const present = Object.values(recordsMap).filter(v => v === 'present').length;
    this.logActivity(`Attendance saved for ${date}`, `${present} of ${total} students present`, 'activity-dot-green');

    if (this.client) {
      const rows = Object.entries(recordsMap).map(([studentId, status]) => ({
        student_id: studentId,
        date: date,
        status: status
      }));
      this.client.from('attendance').upsert(rows, { onConflict: 'student_id,date' }).then(res => {
        if (res.error) console.warn('Supabase attendance save error:', res.error);
      });
    }
  },

  // ── Registrations
  getRegistrations() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.REGISTRATIONS)) || [];
    } catch {
      return [];
    }
  },
  saveRegistration(reg) {
    const list = this.getRegistrations();
    if (reg.id) {
      const idx = list.findIndex(r => r.id === reg.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...reg, updated_at: new Date().toISOString() };
      }
    } else {
      const newReg = {
        ...reg,
        id: 'r_' + Date.now(),
        created_at: new Date().toISOString(),
      };
      list.unshift(newReg);
      const feeNote = newReg.is_free ? 'FREE Scholarship' : `Fee: $${newReg.fee_amount}`;
      this.logActivity(`New student registered: ${newReg.first_name} ${newReg.last_name}`, `ID: ${newReg.student_id} · ${feeNote}`, 'activity-dot-blue');
    }
    localStorage.setItem(this.KEYS.REGISTRATIONS, JSON.stringify(list));
    return list;
  },
  deleteRegistration(id) {
    let list = this.getRegistrations();
    list = list.filter(r => r.id !== id);
    localStorage.setItem(this.KEYS.REGISTRATIONS, JSON.stringify(list));
    return list;
  },

  // ── Examination Results
  getExams() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.EXAMS)) || [];
    } catch {
      return [];
    }
  },
  saveExam(exam) {
    const list = this.getExams();
    let saved = null;
    if (exam.id && !exam.id.startsWith('ex_')) {
      const idx = list.findIndex(e => e.id === exam.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...exam, updated_at: new Date().toISOString() };
        saved = list[idx];
      }
    } else {
      saved = {
        ...exam,
        id: exam.id || 'ex_' + Date.now(),
        created_at: new Date().toISOString(),
      };
      list.unshift(saved);
      this.logActivity(`Exam result saved: ${saved.subject}`, `${saved.student_name} scored ${saved.marks}% (${saved.grade})`, 'activity-dot-green');
    }
    localStorage.setItem(this.KEYS.EXAMS, JSON.stringify(list));

    if (this.client && saved) {
      const payload = {
        student_id: saved.student_id,
        exam_name: saved.exam_name,
        subject: saved.subject,
        marks: Number(saved.marks || 0),
        total_marks: Number(saved.total_marks || 100),
        grade: saved.grade,
        exam_date: saved.exam_date || new Date().toISOString().slice(0, 10),
        notes: saved.notes || null,
      };
      if (saved.id && !saved.id.startsWith('ex_')) payload.id = saved.id;
      this.client.from('exams').upsert([payload]).select().then(res => {
        if (!res.error && res.data && res.data[0]) {
          saved.id = res.data[0].id;
          localStorage.setItem(this.KEYS.EXAMS, JSON.stringify(list));
        } else if (res.error) {
          console.warn('Supabase exam save error:', res.error);
        }
      });
    }
    return list;
  },
  deleteExam(id) {
    let list = this.getExams();
    list = list.filter(e => e.id !== id);
    localStorage.setItem(this.KEYS.EXAMS, JSON.stringify(list));
    if (this.client) {
      this.client.from('exams').delete().eq('id', id).then(res => {
        if (res.error) console.warn('Supabase exam delete error:', res.error);
      });
    }
    return list;
  },

  // ── Fees
  getFees() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.FEES)) || [];
    } catch {
      return [];
    }
  },
  saveFee(fee) {
    const list = this.getFees();
    let saved = null;
    if (fee.id && !fee.id.startsWith('f_')) {
      const idx = list.findIndex(f => f.id === fee.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...fee, updated_at: new Date().toISOString() };
        saved = list[idx];
      }
    } else {
      saved = {
        ...fee,
        id: fee.id || 'f_' + Date.now(),
        created_at: new Date().toISOString(),
      };
      list.unshift(saved);
      const students = this.getStudents();
      const s = students.find(x => x.id === saved.student_id);
      const studentName = s ? `${s.first_name} ${s.last_name}` : 'Student';
      this.logActivity(`Fee payment recorded: $${saved.amount_paid}`, `${studentName} via ${(saved.payment_method || 'Zaad').toUpperCase()}`, 'activity-dot-green');
    }
    localStorage.setItem(this.KEYS.FEES, JSON.stringify(list));

    if (this.client && saved) {
      const payload = {
        student_id: saved.student_id,
        total_fee: Number(saved.total_fee || 0),
        amount_paid: Number(saved.amount_paid || 0),
        payment_date: saved.payment_date || new Date().toISOString().slice(0, 10),
        payment_method: saved.payment_method || 'cash',
        notes: saved.notes || null,
      };
      if (saved.id && !saved.id.startsWith('f_')) payload.id = saved.id;
      this.client.from('fees').upsert([payload]).select().then(res => {
        if (!res.error && res.data && res.data[0]) {
          saved.id = res.data[0].id;
          localStorage.setItem(this.KEYS.FEES, JSON.stringify(list));
        } else if (res.error) {
          console.warn('Supabase fee save error:', res.error);
        }
      });
    }
    return list;
  },
  deleteFee(id) {
    let list = this.getFees();
    list = list.filter(f => f.id !== id);
    localStorage.setItem(this.KEYS.FEES, JSON.stringify(list));
    if (this.client) {
      this.client.from('fees').delete().eq('id', id).then(res => {
        if (res.error) console.warn('Supabase fee delete error:', res.error);
      });
    }
    return list;
  },

  // ── Teachers
  getTeachers() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.TEACHERS)) || [];
    } catch {
      return [];
    }
  },
  async saveTeacher(teacher) {
    const list = this.getTeachers();
    if (teacher.id) {
      const idx = list.findIndex(t => t.id === teacher.id);
      if (idx !== -1) {
        list[idx] = { ...list[idx], ...teacher, updated_at: new Date().toISOString() };
      }
    } else {
      if (list.find(t => t.email.toLowerCase() === teacher.email.toLowerCase())) {
        return { error: 'A teacher with this email already exists.' };
      }
      const newTeacher = {
        ...teacher,
        id: 't_' + Date.now(),
        role: 'teacher',
        created_at: new Date().toISOString(),
      };
      list.push(newTeacher);
      this.logActivity(`Teacher account created: ${newTeacher.first_name} ${newTeacher.last_name}`, `Email: ${newTeacher.email}`, 'activity-dot-blue');
    }
    localStorage.setItem(this.KEYS.TEACHERS, JSON.stringify(list));

    // Create teacher in Supabase Auth and Profiles table
    if (this.client && teacher.password) {
      try {
        const { data, error } = await this.client.auth.signUp({
          email: teacher.email,
          password: teacher.password,
          options: {
            data: {
              role: 'teacher',
              first_name: teacher.first_name,
              last_name: teacher.last_name,
              phone: teacher.phone || ''
            }
          }
        });
        if (error) {
          console.warn('Supabase teacher signUp warning:', error.message);
        } else if (data && data.user) {
          await this.client.from('profiles').upsert([{
            id: data.user.id,
            role: 'teacher',
            first_name: teacher.first_name,
            last_name: teacher.last_name,
            phone: teacher.phone || null
          }]);
        }
      } catch (err) {
        console.warn('Supabase teacher creation error:', err);
      }
    }
    return { ok: true };
  },
  deleteTeacher(id) {
    let list = this.getTeachers();
    list = list.filter(t => t.id !== id);
    localStorage.setItem(this.KEYS.TEACHERS, JSON.stringify(list));
    if (this.client) {
      this.client.from('profiles').delete().eq('id', id).then(res => {
        if (res.error) console.warn('Supabase teacher delete error:', res.error);
      });
    }
    return list;
  },

  // ── Activity Log
  getActivity() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.ACTIVITY)) || [];
    } catch {
      return [];
    }
  },
  logActivity(title, desc, dot = 'activity-dot-blue') {
    const list = this.getActivity();
    list.unshift({ title, desc, dot, time: 'Just now' });
    localStorage.setItem(this.KEYS.ACTIVITY, JSON.stringify(list.slice(0, 20)));
  },

  // ── Full Backup Export
  exportAll() {
    return {
      version: '4.0',
      exported_at: new Date().toISOString(),
      college: 'Hanaqaad College, Berbera',
      database: 'Supabase Cloud Integration',
      students: this.getStudents(),
      attendance: this.getAttendanceStore(),
      registrations: this.getRegistrations(),
      fees: this.getFees(),
      exams: this.getExams(),
      teachers: this.getTeachers(),
      programs: this.getPrograms(),
      activity: this.getActivity(),
    };
  },
};

// Seamless backwards-compatible alias
const LocalDB = SupabaseDB;

/* ────────────────────────────────────────────────────────────
   4. APPLICATION STATE
──────────────────────────────────────────────────────────── */
let currentView = 'overview';
let allStudents = [];
let allRegistrations = [];
let allFees = [];
let allExams = [];
let allTeachers = [];
let currentAttendanceMap = {};
let pendingDelete = null;
let editingRegistrationId = null;
let editingExamId = null;
let editingFeeId = null;
let editingTeacherId = null;
let currentUserRole = 'admin'; // 'admin' or 'teacher'
let currentUserName = 'Administrator';

/* ────────────────────────────────────────────────────────────
   5. INITIALIZATION
──────────────────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  const sessionStr = localStorage.getItem('hanaqaad_admin_session');
  if (!sessionStr) {
    window.location.replace('login.html');
    return;
  }

  // Initialize Local Database
  LocalDB.init();

  // Populate user info & determine role
  try {
    const session = JSON.parse(sessionStr);
    currentUserName = session.name || 'Administrator';
    currentUserRole = session.role || 'admin';

    const initials = currentUserName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'AD';

    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userName').textContent = currentUserName;
    document.getElementById('userRoleLabel').textContent = currentUserRole === 'admin' ? 'Super Admin' : 'Teacher';
    if (document.getElementById('heroAdminName')) {
      document.getElementById('heroAdminName').textContent = currentUserName;
    }
  } catch (e) {
    console.error('Session parse error:', e);
  }

  // Apply role restrictions
  applyRoleRestrictions();

  // Set default attendance date to today
  const todayStr = new Date().toISOString().slice(0, 10);
  document.getElementById('attDate').value = todayStr;

  // Populate dynamic program dropdowns
  populateAllProgramDropdowns();

  // Initialize UI & Event Handlers
  initNavigation();
  initModals();
  initBackupControls();
  initLogout();
  initStudentEvents();
  initAttendanceEvents();
  initRegistrationEvents();
  initExamEvents();
  initFeeEvents();
  initTeacherEvents();
  initProgramEvents();

  // Load Initial Overview View
  loadOverview();
});

/* ────────────────────────────────────────────────────────────
   6. ROLE-BASED ACCESS CONTROL
──────────────────────────────────────────────────────────── */
function applyRoleRestrictions() {
  if (currentUserRole === 'teacher') {
    // Teachers cannot access Finance (Fees), Staff management (Teachers), or Programs configuration
    document.querySelectorAll('.admin-only-nav').forEach(el => {
      el.classList.add('hidden');
    });
  }
}

/* ────────────────────────────────────────────────────────────
   7. PROGRAM DROPDOWN HELPERS
──────────────────────────────────────────────────────────── */
function fillProgramSelect(sel, withAll = false, selectedKey = '') {
  if (!sel) return;
  const programs = LocalDB.getPrograms();
  const previousVal = selectedKey || sel.value;

  sel.innerHTML = '';

  if (withAll) {
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'All Programs';
    sel.appendChild(opt);
  } else {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = 'Select program…';
    sel.appendChild(placeholder);
  }

  programs.forEach(prog => {
    const opt = document.createElement('option');
    opt.value = prog.key;
    opt.textContent = prog.label;
    if (prog.key === previousVal) opt.selected = true;
    sel.appendChild(opt);
  });
}

function populateAllProgramDropdowns() {
  const filterSelects = ['studentProgramFilter', 'attProgram', 'regProgramFilter', 'feeProgramFilter', 'examProgramFilter'];
  const modalSelects  = ['rProgram'];

  filterSelects.forEach(id => {
    const el = document.getElementById(id);
    if (el) fillProgramSelect(el, true);
  });

  modalSelects.forEach(id => {
    const el = document.getElementById(id);
    if (el) fillProgramSelect(el, false);
  });
}

/* ────────────────────────────────────────────────────────────
   8. NAVIGATION & SIDEBAR
──────────────────────────────────────────────────────────── */
function initNavigation() {
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      closeMobileSidebar();
    });
  });

  // Mobile Hamburger Toggle
  const hamburger = document.getElementById('topbarHamburger');
  const sidebar   = document.getElementById('sidebar');
  const overlay   = document.getElementById('sidebarOverlay');

  hamburger.addEventListener('click', () => {
    const isOpen = sidebar.classList.contains('open');
    if (isOpen) {
      closeMobileSidebar();
    } else {
      sidebar.classList.add('open');
      overlay.style.display = 'block';
      hamburger.setAttribute('aria-expanded', 'true');
    }
  });

  overlay.addEventListener('click', closeMobileSidebar);

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeMobileSidebar();
  });
}

function closeMobileSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarOverlay').style.display = 'none';
  document.getElementById('topbarHamburger').setAttribute('aria-expanded', 'false');
}

function switchView(viewName) {
  // Guard admin-only views
  const adminOnlyViews = ['fees', 'teachers', 'programs'];
  if (currentUserRole === 'teacher' && adminOnlyViews.includes(viewName)) {
    showToast('Access restricted: Requires Administrator permissions.', 'error');
    return;
  }

  currentView = viewName;

  // Update nav buttons
  document.querySelectorAll('.nav-item[data-view]').forEach(btn => {
    const isTarget = btn.dataset.view === viewName;
    btn.classList.toggle('active', isTarget);
    btn.setAttribute('aria-current', isTarget ? 'page' : 'false');
  });

  // Show/hide view containers
  document.querySelectorAll('.view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${viewName}`);
  });

  // Update breadcrumb
  const labels = {
    overview:     'Overview',
    students:     'Students Directory',
    attendance:   'Class Attendance',
    registration: 'Student Registration',
    exams:        'Examination Results',
    fees:         'Fee Payments & Balances',
    teachers:     'Teacher Accounts',
    programs:     'Programs Management',
  };
  document.getElementById('breadcrumbCurrent').textContent = labels[viewName] || viewName;

  // Top Registration button visible in Students view
  const topBtn = document.getElementById('topAddStudentBtn');
  if (topBtn) topBtn.style.display = (viewName === 'students' || viewName === 'registration') ? 'inline-flex' : 'none';

  // Load view data
  if (viewName === 'overview')     loadOverview();
  if (viewName === 'students')     loadStudents();
  if (viewName === 'attendance')   loadAttendance();
  if (viewName === 'registration') loadRegistrations();
  if (viewName === 'exams')        loadExams();
  if (viewName === 'fees')         loadFees();
  if (viewName === 'teachers')     loadTeachers();
  if (viewName === 'programs')     loadPrograms();
}

/* ────────────────────────────────────────────────────────────
   9. DATABASE BACKUP CONTROLS (Export JSON)
──────────────────────────────────────────────────────────── */
function initBackupControls() {
  const exportBtn = document.getElementById('exportDataBtn');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      const data = LocalDB.exportAll();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url;
      a.download = `hanaqaad_database_backup_${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Database exported as JSON backup!', 'info');
    });
  }
}


/* ────────────────────────────────────────────────────────────
   10. MODALS & TOASTS
──────────────────────────────────────────────────────────── */
function initModals() {
  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.close));
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) closeModal(overlay.id);
    });
  });
}

function openModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.add('open');
    const firstInput = el.querySelector('input:not([type="hidden"]), select, textarea');
    if (firstInput) setTimeout(() => firstInput.focus(), 80);
  }
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('open');
}

function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  const icons = {
    success: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error:   `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
  };

  toast.innerHTML = `${icons[type] || icons.info} <span>${message}</span>`;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add('show'));

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 350);
  }, 4000);
}

function initLogout() {
  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to log out of Hanaqaad College?')) {
      localStorage.removeItem('hanaqaad_admin_session');
      window.location.replace('login.html');
    }
  });
}

/* ────────────────────────────────────────────────────────────
   11. UTILITY HELPERS
──────────────────────────────────────────────────────────── */
function getInitials(firstName, lastName) {
  return ((firstName?.[0] || '') + (lastName?.[0] || '')).toUpperCase() || '??';
}

function avatarColor(index) {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '$0.00';
  return '$' + Number(amount).toFixed(2);
}

function statusBadge(status) {
  const map = {
    active:    'badge-green',
    graduated: 'badge-blue',
    suspended: 'badge-red',
    pending:   'badge-amber',
    approved:  'badge-green',
    rejected:  'badge-red',
    paid:      'badge-green',
    partial:   'badge-amber',
    unpaid:    'badge-red',
    free:      'badge-green',
  };
  return `<span class="badge ${map[status] || 'badge-gray'}">${status}</span>`;
}

function gradeBadge(grade) {
  const g = (grade || '').toUpperCase();
  const classMap = {
    'A+': 'grade-aplus',
    'A':  'grade-a',
    'B+': 'grade-bplus',
    'B':  'grade-b',
    'C+': 'grade-cplus',
    'C':  'grade-c',
    'D':  'grade-d',
    'F':  'grade-f',
  };
  return `<span class="grade-badge ${classMap[g] || 'grade-a'}">${g || '—'}</span>`;
}

function generateRandomPin() {
  const pin = Math.floor(1000 + Math.random() * 9000);
  const pinInput = document.getElementById('rPin');
  if (pinInput) pinInput.value = pin;
  return pin;
}

function calculateGrade(marks, total = 100) {
  const pct = (parseFloat(marks) / parseFloat(total)) * 100;
  if (isNaN(pct)) return 'A';
  if (pct >= 90) return 'A+';
  if (pct >= 80) return 'A';
  if (pct >= 75) return 'B+';
  if (pct >= 70) return 'B';
  if (pct >= 65) return 'C+';
  if (pct >= 60) return 'C';
  if (pct >= 50) return 'D';
  return 'F';
}

function emptyRow(colspan, title = 'No records found', message = 'Try adjusting your search or filters.') {
  return `<tr><td colspan="${colspan}">
    <div style="text-align:center;padding:2.5rem 1rem;color:var(--text-muted)">
      <div style="font-size:2rem;margin-bottom:0.5rem">🎓</div>
      <h3 style="font-size:1rem;font-weight:700;color:var(--text-dark);margin-bottom:0.25rem">${title}</h3>
      <p style="font-size:0.825rem">${message}</p>
    </div>
  </td></tr>`;
}

/* ====================================================================
   12. MODULE: OVERVIEW
==================================================================== */
function loadOverview() {
  const students   = LocalDB.getStudents();
  const fees       = LocalDB.getFees();
  const regs       = LocalDB.getRegistrations();
  const exams      = LocalDB.getExams();
  const activities = LocalDB.getActivity();

  // Sidebar counters
  document.getElementById('sidebarStudentCount').textContent = students.length;
  const pendingRegCount = regs.filter(r => r.status === 'pending').length;
  const sidebarReg = document.getElementById('sidebarRegCount');
  if (sidebarReg) sidebarReg.textContent = pendingRegCount;

  // Overview Stats
  document.getElementById('statTotalStudents').textContent = students.length;
  const examsStat = document.getElementById('statTotalExams');
  if (examsStat) examsStat.textContent = exams.length;

  // Today's Attendance
  const today = new Date().toISOString().slice(0, 10);
  const todayAtt   = LocalDB.getDateAttendance(today);
  const attEntries = Object.values(todayAtt);
  const presentCount = attEntries.filter(s => s === 'present').length;
  const totalAtt = attEntries.length;
  const attRate  = totalAtt > 0 ? Math.round((presentCount / totalAtt) * 100) : 0;

  document.getElementById('statPresentToday').textContent = presentCount;
  document.getElementById('statPresentSub').textContent   = totalAtt > 0
    ? `${attRate}% attendance rate today`
    : 'No roll recorded today';

  // Fee Stats (admin only UI)
  const totalFees   = fees.reduce((sum, f) => sum + (Number(f.total_fee) || 0), 0);
  const paidFees    = fees.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0);
  const fcEl = document.getElementById('statFeesCollected');
  const fsEl = document.getElementById('statFeesSub');
  if (fcEl) fcEl.textContent = formatCurrency(paidFees);
  if (fsEl) fsEl.textContent = `of ${formatCurrency(totalFees)} expected`;

  // Recent Students table
  const recentStudents = students.slice(0, 5);
  const tbody = document.getElementById('recentStudentsTbody');
  if (recentStudents.length === 0) {
    tbody.innerHTML = emptyRow(4, 'No students enrolled yet');
  } else {
    tbody.innerHTML = recentStudents.map((s, i) => `
      <tr>
        <td>
          <div class="cell-name">
            <div class="mini-avatar ${avatarColor(i)}">${getInitials(s.first_name, s.last_name)}</div>
            <div class="cell-name-text">
              <strong>${s.first_name} ${s.last_name}</strong>
              <span>${s.phone}</span>
            </div>
          </div>
        </td>
        <td><code style="font-size:0.75rem;background:var(--gray-100);padding:2px 6px;border-radius:4px;font-weight:700">${s.student_id || '—'}</code></td>
        <td><span class="badge badge-blue">${LocalDB.getProgramLabel(s.program)}</span></td>
        <td>${statusBadge(s.status || 'active')}</td>
      </tr>
    `).join('');
  }

  // Activity list
  const actList = document.getElementById('activityList');
  if (activities.length === 0) {
    actList.innerHTML = '<p style="color:var(--text-muted);font-size:0.85rem">No recent activity logged.</p>';
  } else {
    actList.innerHTML = activities.slice(0, 5).map(item => `
      <div class="activity-item">
        <div class="activity-dot ${item.dot || 'activity-dot-blue'}"></div>
        <div class="activity-text">
          <strong>${item.title}</strong>
          <p>${item.desc}</p>
        </div>
        <span class="activity-time">${item.time}</span>
      </div>
    `).join('');
  }
}

/* ====================================================================
   13. MODULE: STUDENTS DIRECTORY
==================================================================== */
function initStudentEvents() {
  document.getElementById('studentSearch').addEventListener('input', filterStudentsTable);
  document.getElementById('studentProgramFilter').addEventListener('change', filterStudentsTable);
  document.getElementById('studentStatusFilter').addEventListener('change', filterStudentsTable);
}

function loadStudents() {
  allStudents = LocalDB.getStudents();
  document.getElementById('sidebarStudentCount').textContent = allStudents.length;
  renderStudentsTable(allStudents);
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('studentsTbody');

  if (students.length === 0) {
    tbody.innerHTML = emptyRow(7, 'No students found');
    return;
  }

  tbody.innerHTML = students.map((s, i) => `
    <tr>
      <td>
        <div class="cell-name">
          <div class="mini-avatar ${avatarColor(i)}">${getInitials(s.first_name, s.last_name)}</div>
          <div class="cell-name-text">
            <strong>${s.first_name} ${s.last_name}</strong>
            <span>${s.address || 'Berbera'}</span>
          </div>
        </div>
      </td>
      <td><code style="font-size:0.85rem;background:var(--blue-50);color:var(--primary);padding:3px 8px;border-radius:4px;font-weight:800">${s.student_id || '—'}</code></td>
      <td><span class="badge badge-blue">${LocalDB.getProgramLabel(s.program)}</span></td>
      <td><strong>${s.phone || '—'}</strong></td>
      <td><code style="font-size:0.78rem;background:var(--gray-100);padding:2px 6px;border-radius:4px;font-weight:700">${s.pin || '1234'}</code></td>
      <td>${statusBadge(s.status || 'active')}</td>
      <td>
        <div class="row-actions">
          <button onclick="editRegistrationByStudentId('${s.id}')" title="Edit Student Registration">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="delete" onclick="promptDeleteRecord('students', '${s.id}', '${s.first_name} ${s.last_name}')" title="Delete student">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterStudentsTable() {
  const q      = document.getElementById('studentSearch').value.toLowerCase().trim();
  const prog   = document.getElementById('studentProgramFilter').value;
  const status = document.getElementById('studentStatusFilter').value;

  const filtered = allStudents.filter(s => {
    const textMatch   = !q || `${s.first_name} ${s.last_name} ${s.student_id || ''} ${s.phone || ''}`.toLowerCase().includes(q);
    const progMatch   = !prog || s.program === prog;
    const statusMatch = !status || (s.status || 'active') === status;
    return textMatch && progMatch && statusMatch;
  });

  renderStudentsTable(filtered);
}

/* ====================================================================
   14. MODULE: ATTENDANCE
==================================================================== */
function initAttendanceEvents() {
  document.getElementById('loadAttendanceBtn').addEventListener('click', loadAttendance);
  document.getElementById('saveAttendanceBtn').addEventListener('click', saveAttendance);
  document.getElementById('markAllPresent').addEventListener('click', () => markAllAttendance('present'));
  document.getElementById('markAllAbsent').addEventListener('click', () => markAllAttendance('absent'));
  document.getElementById('attDate').addEventListener('change', loadAttendance);
  document.getElementById('attProgram').addEventListener('change', loadAttendance);
}

function loadAttendance() {
  const date       = document.getElementById('attDate').value || new Date().toISOString().slice(0, 10);
  const progFilter = document.getElementById('attProgram').value;

  const students         = LocalDB.getStudents().filter(s => s.status === 'active');
  const filteredStudents = progFilter ? students.filter(s => s.program === progFilter) : students;

  const savedDateMap = LocalDB.getDateAttendance(date);
  currentAttendanceMap = {};

  filteredStudents.forEach(s => {
    currentAttendanceMap[s.id] = savedDateMap[s.id] || 'present';
  });

  renderAttendanceGrid(filteredStudents);
  updateAttendanceSummary();
}

function renderAttendanceGrid(students) {
  const grid = document.getElementById('attendanceGrid');

  if (students.length === 0) {
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:2rem;color:var(--text-muted)">No active students found for this program.</div>';
    document.getElementById('attGridDesc').textContent = '0 students';
    return;
  }

  document.getElementById('attGridDesc').textContent = `${students.length} active students in roll call`;

  grid.innerHTML = students.map((s, i) => {
    const status = currentAttendanceMap[s.id] || 'present';
    return `
      <div class="attendance-student-card" id="attCard-${s.id}">
        <div class="att-student-info">
          <div class="mini-avatar ${avatarColor(i)}" style="width:30px;height:30px;font-size:0.65rem">
            ${getInitials(s.first_name, s.last_name)}
          </div>
          <div>
            <div class="att-student-name">${s.first_name} ${s.last_name}</div>
            <div class="att-student-serial">${s.student_id} · ${LocalDB.getProgramLabel(s.program)}</div>
          </div>
        </div>
        <div class="att-toggle">
          <button class="att-btn att-btn-present ${status === 'present' ? 'selected' : ''}"
            onclick="setStudentAttendance('${s.id}', 'present')" title="Mark Present">P</button>
          <button class="att-btn att-btn-absent ${status === 'absent' ? 'selected' : ''}"
            onclick="setStudentAttendance('${s.id}', 'absent')" title="Mark Absent">A</button>
        </div>
      </div>
    `;
  }).join('');
}

function setStudentAttendance(studentId, status) {
  currentAttendanceMap[studentId] = status;

  const card = document.getElementById(`attCard-${studentId}`);
  if (card) {
    card.querySelector('.att-btn-present').classList.toggle('selected', status === 'present');
    card.querySelector('.att-btn-absent').classList.toggle('selected', status === 'absent');
  }

  updateAttendanceSummary();
}

function markAllAttendance(status) {
  Object.keys(currentAttendanceMap).forEach(sid => {
    currentAttendanceMap[sid] = status;
  });

  document.querySelectorAll('.att-btn-present').forEach(btn => {
    btn.classList.toggle('selected', status === 'present');
  });
  document.querySelectorAll('.att-btn-absent').forEach(btn => {
    btn.classList.toggle('selected', status === 'absent');
  });

  updateAttendanceSummary();
}

function updateAttendanceSummary() {
  const values  = Object.values(currentAttendanceMap);
  const present = values.filter(v => v === 'present').length;
  const absent  = values.filter(v => v === 'absent').length;
  const total   = values.length;
  const rate    = total > 0 ? Math.round((present / total) * 100) : 0;

  document.getElementById('attPresentCount').textContent = present;
  document.getElementById('attAbsentCount').textContent  = absent;
  document.getElementById('attRateDisplay').textContent  = total > 0 ? `${rate}%` : '0%';
}

function saveAttendance() {
  const date = document.getElementById('attDate').value;
  if (!date) {
    showToast('Please select a date.', 'error');
    return;
  }

  LocalDB.saveDateAttendance(date, currentAttendanceMap);
  showToast(`Attendance saved for ${Object.keys(currentAttendanceMap).length} students!`, 'success');

  if (currentView === 'overview') loadOverview();
}

/* ====================================================================
   15. MODULE: REGISTRATION (Used by both Teachers & Admin)
==================================================================== */
function initRegistrationEvents() {
  document.getElementById('regSearch').addEventListener('input', filterRegistrationsTable);
  document.getElementById('regProgramFilter').addEventListener('change', filterRegistrationsTable);
  document.getElementById('regStatusFilter').addEventListener('change', filterRegistrationsTable);
  document.getElementById('saveRegistrationBtn').addEventListener('click', saveRegistration);

  // Auto-fill fee amount when program is selected
  document.getElementById('rProgram').addEventListener('change', e => {
    const isFree = document.getElementById('rFree').checked;
    if (!isFree && e.target.value) {
      document.getElementById('rFeeAmount').value = LocalDB.getProgramFee(e.target.value);
    }
  });
}

function loadRegistrations() {
  allRegistrations = LocalDB.getRegistrations();
  const pendingCount = allRegistrations.filter(r => r.status === 'pending').length;
  const sidebarReg = document.getElementById('sidebarRegCount');
  if (sidebarReg) sidebarReg.textContent = pendingCount;
  renderRegistrationsTable(allRegistrations);
}

function renderRegistrationsTable(regs) {
  const tbody = document.getElementById('registrationTbody');

  if (regs.length === 0) {
    tbody.innerHTML = emptyRow(8, 'No registrations found');
    return;
  }

  tbody.innerHTML = regs.map((r, i) => `
    <tr>
      <td>
        <div class="cell-name">
          <div class="mini-avatar ${avatarColor(i)}">${getInitials(r.first_name, r.last_name)}</div>
          <div class="cell-name-text">
            <strong>${r.first_name} ${r.last_name}</strong>
            <span>${r.phone || '—'}</span>
          </div>
        </div>
      </td>
      <td><code style="font-size:0.82rem;background:var(--blue-50);color:var(--primary);padding:2px 8px;border-radius:4px;font-weight:800">${r.student_id || '—'}</code></td>
      <td><span class="badge badge-blue">${LocalDB.getProgramLabel(r.program)}</span></td>
      <td><strong>${r.phone || '—'}</strong></td>
      <td>
        ${r.is_free
          ? '<span class="free-badge">🎓 FREE</span>'
          : `<strong>${formatCurrency(r.fee_amount || 0)}</strong>`
        }
      </td>
      <td>${formatDate(r.created_at)}</td>
      <td>${statusBadge(r.status || 'approved')}</td>
      <td>
        <div class="row-actions">
          <button onclick="editRegistration('${r.id}')" title="Edit Registration">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="delete" onclick="promptDeleteRecord('registrations', '${r.id}', '${r.first_name} ${r.last_name}')" title="Delete application">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </td>
    </tr>
  `).join('');
}

function filterRegistrationsTable() {
  const q      = document.getElementById('regSearch').value.toLowerCase().trim();
  const prog   = document.getElementById('regProgramFilter').value;
  const status = document.getElementById('regStatusFilter').value;

  const filtered = allRegistrations.filter(r => {
    const textMatch   = !q || `${r.first_name} ${r.last_name} ${r.phone || ''} ${r.student_id || ''}`.toLowerCase().includes(q);
    const progMatch   = !prog || r.program === prog;
    const statusMatch = !status || r.status === status;
    return textMatch && progMatch && statusMatch;
  });

  renderRegistrationsTable(filtered);
}

function handleFreeToggle() {
  const isFree = document.getElementById('rFree').checked;
  const feeInput = document.getElementById('rFeeAmount');
  if (isFree) {
    feeInput.value = 0;
    feeInput.disabled = true;
    feeInput.style.opacity = '0.5';
  } else {
    feeInput.disabled = false;
    feeInput.style.opacity = '1';
    const prog = document.getElementById('rProgram').value;
    if (prog) feeInput.value = LocalDB.getProgramFee(prog);
  }
}

function openRegistrationModal(reg = null) {
  editingRegistrationId = reg?.id || null;
  document.getElementById('registrationModalTitle').textContent = reg ? 'Edit Registration' : 'Student Registration';

  // Fill programs
  fillProgramSelect(document.getElementById('rProgram'), false, reg?.program || '');

  document.getElementById('rFirstName').value      = reg?.first_name || '';
  document.getElementById('rLastName').value       = reg?.last_name  || '';
  document.getElementById('rPhone').value          = reg?.phone      || '';
  if (document.getElementById('rAddress')) document.getElementById('rAddress').value = reg?.address || '';
  document.getElementById('rFeeAmount').value      = reg?.fee_amount !== undefined ? reg.fee_amount : '';
  document.getElementById('rFree').checked         = reg?.is_free    || false;
  document.getElementById('rRegistrationId').value = reg?.id         || '';

  // Generate PIN if new
  if (!reg || !reg.pin) {
    generateRandomPin();
  } else {
    document.getElementById('rPin').value = reg.pin;
  }

  // Handle free toggle state
  const feeInput = document.getElementById('rFeeAmount');
  if (reg?.is_free) {
    feeInput.disabled = true;
    feeInput.style.opacity = '0.5';
  } else {
    feeInput.disabled = false;
    feeInput.style.opacity = '1';
  }

  ['rFirstNameErr', 'rLastNameErr', 'rPhoneErr', 'rProgramErr'].forEach(id => {
    document.getElementById(id).textContent = '';
  });

  openModal('registrationModal');
}

function editRegistration(id) {
  const reg = allRegistrations.find(r => r.id === id);
  if (reg) openRegistrationModal(reg);
}

function editRegistrationByStudentId(studentId) {
  const student = LocalDB.getStudents().find(s => s.id === studentId);
  if (student) {
    openRegistrationModal({
      id: student.id,
      first_name: student.first_name,
      last_name:  student.last_name,
      phone:      student.phone,
      program:    student.program,
      pin:        student.pin,
      address:    student.address,
      fee_amount: student.fee_amount || LocalDB.getProgramFee(student.program),
      is_free:    student.is_free || false,
      student_id: student.student_id,
      status:     student.status || 'active',
    });
  }
}

function saveRegistration() {
  const firstName = document.getElementById('rFirstName').value.trim();
  const lastName  = document.getElementById('rLastName').value.trim();
  const phone     = document.getElementById('rPhone').value.trim();
  const program   = document.getElementById('rProgram').value;
  const pin       = document.getElementById('rPin').value.trim() || generateRandomPin().toString();
  const addressEl = document.getElementById('rAddress');
  const address   = addressEl ? addressEl.value.trim() : '';
  const isFree    = document.getElementById('rFree').checked;
  const feeAmount = isFree ? 0 : (parseFloat(document.getElementById('rFeeAmount').value) || 0);

  let valid = true;
  if (!firstName) { document.getElementById('rFirstNameErr').textContent = 'Required'; valid = false; }
  if (!lastName)  { document.getElementById('rLastNameErr').textContent  = 'Required'; valid = false; }
  if (!phone)     { document.getElementById('rPhoneErr').textContent     = 'Required'; valid = false; }
  if (!program)   { document.getElementById('rProgramErr').textContent   = 'Select program'; valid = false; }
  if (!valid) return;

  let assignedStudentId;
  let studentRecordId;

  if (editingRegistrationId) {
    // Updating existing record
    const existing = LocalDB.getStudents().find(s => s.id === editingRegistrationId)
      || allRegistrations.find(r => r.id === editingRegistrationId);
    assignedStudentId = existing?.student_id || LocalDB.getNextStudentId();
    studentRecordId = editingRegistrationId;
  } else {
    // Automatic Student ID Generation starting at HC-500, HC-501, ...
    assignedStudentId = LocalDB.getNextStudentId();
    studentRecordId = 's_' + Date.now();
  }

  // 1. Save Student record
  const studentPayload = {
    id:         studentRecordId,
    student_id: assignedStudentId,
    first_name: firstName,
    last_name:  lastName,
    phone,
    program,
    pin,
    address:    address || 'Berbera, Somaliland',
    status:     'active',
    is_free:    isFree,
    fee_amount: feeAmount,
  };
  LocalDB.saveStudent(studentPayload);

  // 2. Save Registration record
  const regPayload = {
    id:          editingRegistrationId || ('r_' + Date.now()),
    student_id:  assignedStudentId,
    first_name:  firstName,
    last_name:   lastName,
    phone,
    program,
    pin,
    address,
    fee_amount:  feeAmount,
    is_free:     isFree,
    status:      'approved',
    registered_by: currentUserName,
  };
  LocalDB.saveRegistration(regPayload);

  // 3. Create/update initial Fee record if new
  if (!editingRegistrationId) {
    LocalDB.saveFee({
      student_id:     studentRecordId,
      total_fee:      isFree ? 0 : feeAmount,
      amount_paid:    0,
      payment_date:   new Date().toISOString().slice(0, 10),
      payment_method: 'zaad',
      notes: isFree ? 'Full scholarship (Waived fee)' : `Initial tuition registered by ${currentUserName}`,
    });
  }

  closeModal('registrationModal');
  showToast(`🎉 Registration saved! Student ID: ${assignedStudentId} (PIN: ${pin})`, 'success');

  loadRegistrations();
  loadStudents();
  if (currentView === 'overview') loadOverview();
}

/* ====================================================================
   16. MODULE: EXAMINATION RESULTS (Teachers & Admin)
==================================================================== */
function initExamEvents() {
  const search = document.getElementById('examSearch');
  if (search) search.addEventListener('input', filterExamsTable);

  const progFilter = document.getElementById('examProgramFilter');
  if (progFilter) progFilter.addEventListener('change', filterExamsTable);

  const nameFilter = document.getElementById('examNameFilter');
  if (nameFilter) nameFilter.addEventListener('change', filterExamsTable);

  const saveBtn = document.getElementById('saveExamBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveExam);

  // Auto-calculate grade when marks input changes
  const marksInput = document.getElementById('exMarks');
  if (marksInput) {
    marksInput.addEventListener('input', () => {
      const marks = parseFloat(marksInput.value);
      const grade = calculateGrade(marks, 100);
      const gradeSelect = document.getElementById('exGrade');
      if (gradeSelect) gradeSelect.value = grade;
    });
  }
}

function loadExams() {
  allStudents = LocalDB.getStudents();
  allExams    = LocalDB.getExams();
  renderExamsTable(allExams);
}

function renderExamsTable(exams) {
  const tbody = document.getElementById('examsTbody');
  if (!tbody) return;

  if (exams.length === 0) {
    tbody.innerHTML = emptyRow(9, 'No exam results recorded', 'Click "+ Record Exam Result" to enter scores.');
    return;
  }

  tbody.innerHTML = exams.map((ex, i) => {
    return `
      <tr>
        <td>
          <div class="cell-name">
            <div class="mini-avatar ${avatarColor(i)}">${getInitials(ex.student_name, '')}</div>
            <div class="cell-name-text">
              <strong>${ex.student_name}</strong>
              <span style="font-size:0.75rem;color:var(--text-muted)">${ex.notes || ''}</span>
            </div>
          </div>
        </td>
        <td><code style="font-size:0.82rem;background:var(--blue-50);color:var(--primary);padding:2px 8px;border-radius:4px;font-weight:800">${ex.student_code || '—'}</code></td>
        <td><span class="badge badge-blue">${LocalDB.getProgramLabel(ex.program)}</span></td>
        <td><strong>${ex.exam_name}</strong></td>
        <td>${ex.subject}</td>
        <td><strong>${ex.marks} / ${ex.total_marks || 100}</strong></td>
        <td>${gradeBadge(ex.grade)}</td>
        <td>${formatDate(ex.exam_date)}</td>
        <td><span style="font-size:0.8rem;color:var(--text-muted)">${ex.recorded_by || 'Staff'}</span></td>
        <td>
          <div class="row-actions">
            <button onclick="editExam('${ex.id}')" title="Edit Result">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="delete" onclick="promptDeleteRecord('exams', '${ex.id}', '${ex.subject} result for ${ex.student_name}')" title="Delete Result">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterExamsTable() {
  const q      = document.getElementById('examSearch').value.toLowerCase().trim();
  const prog   = document.getElementById('examProgramFilter').value;
  const name   = document.getElementById('examNameFilter').value;

  const filtered = allExams.filter(ex => {
    const textMatch = !q || `${ex.student_name} ${ex.student_code || ''} ${ex.subject} ${ex.exam_name}`.toLowerCase().includes(q);
    const progMatch = !prog || ex.program === prog;
    const nameMatch = !name || ex.exam_name === name;
    return textMatch && progMatch && nameMatch;
  });

  renderExamsTable(filtered);
}

function openExamModal(exam = null) {
  editingExamId = exam?.id || null;
  document.getElementById('examModalTitle').textContent = exam ? 'Edit Exam Result' : 'Record Exam Result';

  // Populate student select
  const studentSel = document.getElementById('exStudent');
  studentSel.innerHTML = '<option value="" disabled selected>Select student…</option>';
  LocalDB.getStudents().forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.first_name} ${s.last_name} (${s.student_id} · ${LocalDB.getProgramLabel(s.program)})`;
    if (exam && (exam.student_id === s.id || exam.student_code === s.student_id)) {
      opt.selected = true;
    }
    studentSel.appendChild(opt);
  });

  document.getElementById('exExamId').value = exam?.id || '';
  document.getElementById('exName').value   = exam?.exam_name || 'Midterm Examination';
  document.getElementById('exSubject').value = exam?.subject || '';
  document.getElementById('exMarks').value  = exam?.marks !== undefined ? exam.marks : '';
  document.getElementById('exGrade').value  = exam?.grade || 'A';
  document.getElementById('exDate').value   = exam?.exam_date || new Date().toISOString().slice(0, 10);
  document.getElementById('exNotes').value  = exam?.notes || '';

  ['exStudentErr', 'exNameErr', 'exSubjectErr', 'exMarksErr', 'exDateErr'].forEach(id => {
    document.getElementById(id).textContent = '';
  });

  openModal('examModal');
}

function editExam(id) {
  const exam = allExams.find(e => e.id === id);
  if (exam) openExamModal(exam);
}

function saveExam() {
  const studentId = document.getElementById('exStudent').value;
  const examName  = document.getElementById('exName').value.trim();
  const subject   = document.getElementById('exSubject').value.trim();
  const marksStr  = document.getElementById('exMarks').value;
  const grade     = document.getElementById('exGrade').value;
  const examDate  = document.getElementById('exDate').value;
  const notes     = document.getElementById('exNotes').value.trim();

  let valid = true;
  if (!studentId) { document.getElementById('exStudentErr').textContent = 'Please select a student'; valid = false; }
  if (!examName)  { document.getElementById('exNameErr').textContent    = 'Required'; valid = false; }
  if (!subject)   { document.getElementById('exSubjectErr').textContent = 'Required'; valid = false; }
  if (marksStr === '' || isNaN(marksStr) || parseFloat(marksStr) < 0 || parseFloat(marksStr) > 100) {
    document.getElementById('exMarksErr').textContent = 'Enter marks 0 - 100'; valid = false;
  }
  if (!examDate)  { document.getElementById('exDateErr').textContent    = 'Required'; valid = false; }
  if (!valid) return;

  const marks = parseFloat(marksStr);
  const student = LocalDB.getStudents().find(s => s.id === studentId);

  const payload = {
    student_id:   studentId,
    student_code: student ? student.student_id : 'HC-500',
    student_name: student ? `${student.first_name} ${student.last_name}` : 'Student',
    program:      student ? student.program : 'cld',
    exam_name:    examName,
    subject,
    marks,
    total_marks:  100,
    grade:        grade || calculateGrade(marks, 100),
    exam_date:    examDate,
    recorded_by:  currentUserName,
    notes:        notes || null,
  };

  if (editingExamId) payload.id = editingExamId;

  LocalDB.saveExam(payload);
  closeModal('examModal');
  showToast(editingExamId ? 'Exam result updated!' : `Exam result saved for ${payload.student_name}!`, 'success');

  loadExams();
  if (currentView === 'overview') loadOverview();
}

/* ====================================================================
   17. MODULE: FEES (Admin Restricted)
==================================================================== */
function initFeeEvents() {
  document.getElementById('feeSearch').addEventListener('input', filterFeesTable);
  document.getElementById('feeProgramFilter').addEventListener('change', filterFeesTable);
  document.getElementById('feeStatusFilter').addEventListener('change', filterFeesTable);
  document.getElementById('savePaymentBtn').addEventListener('click', savePayment);

  document.getElementById('pStudent').addEventListener('change', e => {
    const student = allStudents.find(s => s.id === e.target.value);
    if (student) {
      const defaultFee = LocalDB.getProgramFee(student.program);
      document.getElementById('pTotalFee').value = defaultFee;
    }
  });
}

function loadFees() {
  allStudents = LocalDB.getStudents();
  allFees     = LocalDB.getFees();
  renderFeesTable(allFees);
  updateFeeSummary(allFees);
}

function updateFeeSummary(fees) {
  const total       = fees.reduce((sum, f) => sum + (Number(f.total_fee) || 0), 0);
  const paid        = fees.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0);
  const outstanding = Math.max(0, total - paid);

  document.getElementById('feeTotal').textContent       = formatCurrency(total);
  document.getElementById('feePaid').textContent        = formatCurrency(paid);
  document.getElementById('feeOutstanding').textContent = formatCurrency(outstanding);
}

function getFeeStatus(fee) {
  const total = Number(fee.total_fee) || 0;
  const paid  = Number(fee.amount_paid) || 0;
  if (total === 0) return 'free';
  if (paid >= total && total > 0) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
}

function renderFeesTable(fees) {
  const tbody = document.getElementById('feesTbody');

  if (fees.length === 0) {
    tbody.innerHTML = emptyRow(8, 'No fee records found');
    return;
  }

  tbody.innerHTML = fees.map((f, i) => {
    const student = allStudents.find(s => s.id === f.student_id) || {};
    const total   = Number(f.total_fee) || 0;
    const paid    = Number(f.amount_paid) || 0;
    const balance = Math.max(0, total - paid);
    const status  = getFeeStatus(f);

    return `
      <tr>
        <td>
          <div class="cell-name">
            <div class="mini-avatar ${avatarColor(i)}">${getInitials(student.first_name, student.last_name)}</div>
            <div class="cell-name-text">
              <strong>${student.first_name || '—'} ${student.last_name || ''}</strong>
              <span>${student.student_id || ''}</span>
            </div>
          </div>
        </td>
        <td><span class="badge badge-blue">${LocalDB.getProgramLabel(student.program || '')}</span></td>
        <td><strong>${formatCurrency(total)}</strong></td>
        <td style="color:var(--success);font-weight:700">${formatCurrency(paid)}</td>
        <td style="color:${balance > 0 ? 'var(--error)' : 'var(--success)'};font-weight:700">${formatCurrency(balance)}</td>
        <td>${formatDate(f.payment_date)}</td>
        <td>${statusBadge(status)}</td>
        <td>
          <div class="row-actions">
            <button onclick="editFee('${f.id}')" title="Edit payment record">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
            </button>
            <button class="delete" onclick="promptDeleteRecord('fees', '${f.id}', 'payment record for ${student.first_name || 'student'}')" title="Delete payment">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/>
                <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
              </svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function filterFeesTable() {
  const q      = document.getElementById('feeSearch').value.toLowerCase().trim();
  const prog   = document.getElementById('feeProgramFilter').value;
  const status = document.getElementById('feeStatusFilter').value;

  const filtered = allFees.filter(f => {
    const student    = allStudents.find(s => s.id === f.student_id) || {};
    const textMatch  = !q || `${student.first_name || ''} ${student.last_name || ''} ${student.student_id || ''}`.toLowerCase().includes(q);
    const progMatch  = !prog || student.program === prog;
    const statusMatch = !status || getFeeStatus(f) === status;
    return textMatch && progMatch && statusMatch;
  });

  renderFeesTable(filtered);
  updateFeeSummary(filtered);
}

function openPaymentModal(fee = null) {
  editingFeeId = fee?.id || null;
  document.getElementById('paymentModalTitle').textContent = fee ? 'Edit Fee Record' : 'Record Fee Payment';
  document.getElementById('pFeeId').value       = fee?.id             || '';
  document.getElementById('pTotalFee').value    = fee?.total_fee      || '';
  document.getElementById('pAmountPaid').value  = fee?.amount_paid    || '';
  document.getElementById('pPaymentDate').value = fee?.payment_date   || new Date().toISOString().slice(0, 10);
  document.getElementById('pMethod').value      = fee?.payment_method || 'zaad';
  document.getElementById('pNotes').value       = fee?.notes          || '';

  const sel = document.getElementById('pStudent');
  sel.innerHTML = '<option value="" disabled selected>Select student…</option>';
  LocalDB.getStudents().forEach(s => {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = `${s.first_name} ${s.last_name} (${s.student_id} · ${LocalDB.getProgramLabel(s.program)})`;
    if (fee?.student_id === s.id) opt.selected = true;
    sel.appendChild(opt);
  });

  ['pStudentErr', 'pTotalFeeErr', 'pAmountPaidErr', 'pPaymentDateErr'].forEach(id => {
    document.getElementById(id).textContent = '';
  });

  openModal('paymentModal');
}

function editFee(id) {
  const fee = allFees.find(f => f.id === id);
  if (fee) openPaymentModal(fee);
}

function savePayment() {
  const studentId  = document.getElementById('pStudent').value;
  const totalFee   = parseFloat(document.getElementById('pTotalFee').value);
  const amountPaid = parseFloat(document.getElementById('pAmountPaid').value);
  const paymentDate = document.getElementById('pPaymentDate').value;

  let valid = true;
  if (!studentId)                           { document.getElementById('pStudentErr').textContent  = 'Please select student'; valid = false; }
  if (isNaN(totalFee)   || totalFee < 0)   { document.getElementById('pTotalFeeErr').textContent  = 'Enter valid fee';    valid = false; }
  if (isNaN(amountPaid) || amountPaid < 0) { document.getElementById('pAmountPaidErr').textContent = 'Enter valid amount'; valid = false; }
  if (!paymentDate)                         { document.getElementById('pPaymentDateErr').textContent = 'Required';           valid = false; }
  if (!valid) return;

  const payload = {
    student_id:     studentId,
    total_fee:      totalFee,
    amount_paid:    amountPaid,
    payment_date:   paymentDate,
    payment_method: document.getElementById('pMethod').value,
    notes:          document.getElementById('pNotes').value.trim() || null,
  };

  if (editingFeeId) payload.id = editingFeeId;

  LocalDB.saveFee(payload);
  closeModal('paymentModal');
  showToast(editingFeeId ? 'Payment record updated!' : 'Payment recorded successfully!', 'success');

  loadFees();
  if (currentView === 'overview') loadOverview();
}

/* ====================================================================
   18. MODULE: TEACHERS (Admin Restricted)
==================================================================== */
function initTeacherEvents() {
  const saveBtn = document.getElementById('saveTeacherBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveTeacher);
}

function loadTeachers() {
  allTeachers = LocalDB.getTeachers();
  renderTeacherGrid(allTeachers);
}

function renderTeacherGrid(teachers) {
  const grid = document.getElementById('teacherGrid');
  if (!grid) return;

  if (teachers.length === 0) {
    grid.innerHTML = `
      <div style="grid-column:1/-1;text-align:center;padding:3rem 1rem;color:var(--text-muted)">
        <div style="font-size:2.5rem;margin-bottom:0.75rem">👩‍🏫</div>
        <h3 style="font-size:1rem;font-weight:700;color:var(--text-dark);margin-bottom:0.35rem">No teacher accounts created yet</h3>
        <p style="font-size:0.85rem">Click "+ Add Teacher" to create the first teacher account.</p>
      </div>`;
    return;
  }

  grid.innerHTML = teachers.map((t, i) => `
    <div class="teacher-card">
      <div class="user-avatar">${getInitials(t.first_name, t.last_name)}</div>
      <div class="teacher-card-info">
        <strong>${t.first_name} ${t.last_name}</strong>
        <span>${t.email}</span>
        ${t.subject ? `<span style="display:block;margin-top:0.2rem;font-size:0.75rem;color:var(--primary);font-weight:600">${t.subject}</span>` : ''}
        ${t.phone ? `<span style="display:block;font-size:0.75rem;color:var(--text-muted)">${t.phone}</span>` : ''}
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:0.5rem;flex-shrink:0">
        <span class="role-tag role-teacher">Teacher</span>
        <span style="font-size:0.7rem;color:var(--text-muted)">Since ${formatDate(t.created_at)}</span>
        <div class="row-actions" style="margin-top:0.25rem">
          <button onclick="editTeacher('${t.id}')" title="Edit teacher">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button class="delete" onclick="promptDeleteRecord('teachers', '${t.id}', '${t.first_name} ${t.last_name}')" title="Delete teacher account">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"/>
              <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

function openTeacherModal(teacher = null) {
  editingTeacherId = teacher?.id || null;
  document.getElementById('teacherModalTitle').textContent = teacher ? 'Edit Teacher Account' : 'Add Teacher Account';
  document.getElementById('tFirstName').value  = teacher?.first_name || '';
  document.getElementById('tLastName').value   = teacher?.last_name  || '';
  document.getElementById('tEmail').value      = teacher?.email      || '';
  document.getElementById('tPassword').value   = teacher?.password   || '';
  document.getElementById('tPhone').value      = teacher?.phone      || '';
  document.getElementById('tSubject').value    = teacher?.subject    || '';
  document.getElementById('tTeacherId').value  = teacher?.id         || '';

  ['tFirstNameErr', 'tLastNameErr', 'tEmailErr', 'tPasswordErr'].forEach(id => {
    document.getElementById(id).textContent = '';
  });

  openModal('teacherModal');
}

function editTeacher(id) {
  const teacher = allTeachers.find(t => t.id === id);
  if (teacher) openTeacherModal(teacher);
}

function saveTeacher() {
  const firstName = document.getElementById('tFirstName').value.trim();
  const lastName  = document.getElementById('tLastName').value.trim();
  const email     = document.getElementById('tEmail').value.trim().toLowerCase();
  const password  = document.getElementById('tPassword').value.trim();

  let valid = true;
  if (!firstName) { document.getElementById('tFirstNameErr').textContent = 'Required'; valid = false; }
  if (!lastName)  { document.getElementById('tLastNameErr').textContent  = 'Required'; valid = false; }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    document.getElementById('tEmailErr').textContent = 'Valid email required'; valid = false;
  }
  if (!editingTeacherId && !password) {
    document.getElementById('tPasswordErr').textContent = 'Required for new teacher'; valid = false;
  }
  if (!valid) return;

  const payload = {
    first_name: firstName,
    last_name:  lastName,
    email,
    password:   password || undefined,
    phone:      document.getElementById('tPhone').value.trim()   || null,
    subject:    document.getElementById('tSubject').value.trim() || null,
  };

  if (editingTeacherId) payload.id = editingTeacherId;

  const result = LocalDB.saveTeacher(payload);

  if (result && result.error) {
    document.getElementById('tEmailErr').textContent = result.error;
    return;
  }

  closeModal('teacherModal');
  showToast(editingTeacherId ? 'Teacher account updated!' : `Teacher account created! Login: ${email}`, 'success');
  loadTeachers();
  if (currentView === 'overview') loadOverview();
}

/* ====================================================================
   19. MODULE: PROGRAMS (Admin Restricted)
==================================================================== */
function initProgramEvents() {
  const saveBtn = document.getElementById('saveProgramBtn');
  if (saveBtn) saveBtn.addEventListener('click', saveProgram);

  const codeInput = document.getElementById('progCode');
  if (codeInput) {
    codeInput.addEventListener('input', () => {
      codeInput.value = codeInput.value.toUpperCase();
    });
  }
}

function loadPrograms() {
  renderProgramsTable(LocalDB.getPrograms());
}

function renderProgramsTable(programs) {
  const tbody = document.getElementById('programsTbody');
  if (!tbody) return;

  tbody.innerHTML = programs.map(prog => `
    <tr>
      <td><strong>${prog.label}</strong></td>
      <td><code style="font-size:0.8rem;background:var(--gray-100);padding:2px 8px;border-radius:4px;font-weight:700">${prog.key.toUpperCase()}</code></td>
      <td><strong style="color:var(--primary)">${formatCurrency(prog.fee)}</strong></td>
      <td>${prog.builtin
          ? '<span class="badge badge-blue">Built-in</span>'
          : '<span class="badge badge-green">Custom</span>'
        }
      </td>
      <td>
        ${prog.builtin
          ? '<span style="font-size:0.75rem;color:var(--text-muted)">System program</span>'
          : `<button class="delete" onclick="deleteProgram('${prog.key}')" title="Delete program" style="display:inline-flex">
               <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                 <polyline points="3 6 5 6 21 6"/>
                 <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/>
               </svg>
             </button>`
        }
      </td>
    </tr>
  `).join('');
}

function openProgramModal() {
  document.getElementById('progName').value = '';
  document.getElementById('progCode').value = '';
  document.getElementById('progFee').value  = '';
  ['progNameErr', 'progCodeErr', 'progFeeErr'].forEach(id => {
    document.getElementById(id).textContent = '';
  });
  openModal('programModal');
}

function saveProgram() {
  const name = document.getElementById('progName').value.trim();
  const code = document.getElementById('progCode').value.trim().toUpperCase();
  const fee  = parseFloat(document.getElementById('progFee').value);

  let valid = true;
  if (!name) { document.getElementById('progNameErr').textContent = 'Required'; valid = false; }
  if (!code) { document.getElementById('progCodeErr').textContent = 'Required'; valid = false; }
  if (isNaN(fee) || fee < 0) { document.getElementById('progFeeErr').textContent = 'Enter valid fee'; valid = false; }
  if (!valid) return;

  const key = code.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

  const existing = LocalDB.getPrograms().find(p => p.key === key);
  if (existing) {
    document.getElementById('progCodeErr').textContent = 'Program code already exists';
    return;
  }

  const result = LocalDB.saveProgram({ key, label: `${name} (${code})`, fee });
  if (!result) {
    document.getElementById('progCodeErr').textContent = 'Program code already exists';
    return;
  }

  closeModal('programModal');
  showToast(`Program "${name}" added successfully!`, 'success');

  populateAllProgramDropdowns();
  loadPrograms();
}

function deleteProgram(key) {
  const prog = LocalDB.getPrograms().find(p => p.key === key);
  if (!prog) return;
  if (prog.builtin) {
    showToast('Built-in programs cannot be deleted.', 'error');
    return;
  }
  if (confirm(`Delete program "${prog.label}"?`)) {
    LocalDB.deleteProgram(key);
    showToast('Program deleted.', 'info');
    populateAllProgramDropdowns();
    loadPrograms();
  }
}

/* ====================================================================
   20. DELETE CONFIRMATION
==================================================================== */
function promptDeleteRecord(table, id, label) {
  pendingDelete = { table, id, label };
  document.getElementById('confirmMessage').textContent =
    `Are you sure you want to delete "${label}"? This record will be permanently removed.`;
  openModal('confirmModal');

  document.getElementById('confirmDeleteBtn').onclick = executeDelete;
}

function executeDelete() {
  if (!pendingDelete) return;
  const { table, id } = pendingDelete;

  if (table === 'students')      LocalDB.deleteStudent(id);
  if (table === 'registrations') LocalDB.deleteRegistration(id);
  if (table === 'fees')          LocalDB.deleteFee(id);
  if (table === 'teachers')      LocalDB.deleteTeacher(id);
  if (table === 'exams')         LocalDB.deleteExam(id);

  closeModal('confirmModal');
  showToast('Record deleted successfully.', 'info');

  if (table === 'students')      loadStudents();
  if (table === 'registrations') loadRegistrations();
  if (table === 'fees')          loadFees();
  if (table === 'teachers')      loadTeachers();
  if (table === 'exams')         loadExams();
  if (currentView === 'overview') loadOverview();

  pendingDelete = null;
}

/* ────────────────────────────────────────────────────────────
   21. EXPOSE GLOBAL FUNCTIONS
──────────────────────────────────────────────────────────── */
window.switchView             = switchView;
window.openModal              = openModal;
window.closeModal             = closeModal;
window.openRegistrationModal  = openRegistrationModal;
window.editRegistration       = editRegistration;
window.editRegistrationByStudentId = editRegistrationByStudentId;
window.handleFreeToggle       = handleFreeToggle;
window.generateRandomPin      = generateRandomPin;
window.openExamModal          = openExamModal;
window.editExam               = editExam;
window.openPaymentModal       = openPaymentModal;
window.editFee                = editFee;
window.openTeacherModal       = openTeacherModal;
window.editTeacher            = editTeacher;
window.openProgramModal       = openProgramModal;
window.deleteProgram          = deleteProgram;
window.setStudentAttendance    = setStudentAttendance;
window.promptDeleteRecord     = promptDeleteRecord;
