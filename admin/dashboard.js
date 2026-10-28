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
    //    Show "Syncing…" status badge immediately on page load
    const _dot  = document.getElementById('supabaseDot');
    const _text = document.getElementById('supabaseText');
    if (_dot && this.client)  _dot.style.background  = '#f59e0b';
    if (_text && this.client) _text.textContent = 'Syncing…';
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

      // Sync students — MERGE with local data so freshly-registered students
      // that haven't synced to Supabase yet are NOT lost on page load.
      const { data: studs, error: studErr } = await this.client.from('students').select('*').order('created_at', { ascending: false });
      if (!studErr && studs) {
        const localStudents = JSON.parse(localStorage.getItem(this.KEYS.STUDENTS) || '[]');
        // Keep any local-only students whose student_id isn't in Supabase yet
        const supabaseStudentIds = new Set(studs.map(s => s.student_id).filter(Boolean));
        const localOnly = localStudents.filter(ls => ls.student_id && !supabaseStudentIds.has(ls.student_id));
        const mergedStudents = [...studs, ...localOnly];
        localStorage.setItem(this.KEYS.STUDENTS, JSON.stringify(mergedStudents));
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

      // Sync registrations — keep local-only ones that aren't in Supabase yet
      const { data: regData, error: regErr } = await this.client.from('registrations').select('*').order('created_at', { ascending: false });
      if (!regErr && regData) {
        const localRegs = JSON.parse(localStorage.getItem(this.KEYS.REGISTRATIONS) || '[]');
        const supabaseRegIds = new Set(regData.map(r => r.student_id).filter(Boolean));
        const localOnlyRegs = localRegs.filter(lr => lr.student_id && !supabaseRegIds.has(lr.student_id));
        const mergedRegs = [...regData, ...localOnlyRegs];
        localStorage.setItem(this.KEYS.REGISTRATIONS, JSON.stringify(mergedRegs));
      }

      // Sync teachers (from teachers table or profiles table where role='teacher')
      const { data: tData, error: tErr } = await this.client.from('teachers').select('*');
      if (!tErr && tData && tData.length > 0) {
        localStorage.setItem(this.KEYS.TEACHERS, JSON.stringify(tData));
      } else {
        const { data: profiles, error: profErr } = await this.client.from('profiles').select('*').eq('role', 'teacher');
        if (!profErr && profiles) {
          localStorage.setItem(this.KEYS.TEACHERS, JSON.stringify(profiles));
        }
      }

      // Update Live Status Badge
      if (dot) dot.style.background = '#22c55e';
      if (text) text.textContent = 'Supabase Connected';

      // SILENT AUTO-MIGRATION: Ensure all existing local data is instantly uploaded to Supabase
      if (this.client) {
        try {
          const localStudents = JSON.parse(localStorage.getItem(this.KEYS.STUDENTS) || '[]');
          const unsyncedStudents = localStudents.filter(ls => ls.student_id && !supabaseStudentIds.has(ls.student_id));
          if (unsyncedStudents.length > 0) {
            const batch = unsyncedStudents.map(s => ({
              first_name: s.first_name,
              last_name: s.last_name,
              student_id: s.student_id,
              phone: s.phone,
              program: Array.isArray(s.programs) ? s.programs.join(', ') : (s.program || ''),
              status: s.status || 'active',
              security_pin: s.pin || s.security_pin || null,
              fee_amount: Number(s.fee_amount || 0),
              is_free: Boolean(s.is_free),
              address: s.address || null,
              notes: s.notes || null,
            }));
            await this.client.from('students').upsert(batch, { onConflict: 'student_id' });
          }

          // Also auto-migrate local registrations
          const localRegs = JSON.parse(localStorage.getItem(this.KEYS.REGISTRATIONS) || '[]');
          if (localRegs.length > 0) {
            const regBatch = localRegs.map(r => ({
              student_id: r.student_id,
              first_name: r.first_name,
              last_name: r.last_name,
              phone: r.phone || null,
              program: Array.isArray(r.programs) ? r.programs.join(', ') : (r.program || ''),
              fee_amount: Number(r.fee_amount || 0),
              is_free: Boolean(r.is_free),
              status: r.status || 'approved',
              registered_by: r.registered_by || null,
              notes: r.notes || null,
            }));
            await this.client.from('registrations').upsert(regBatch, { onConflict: 'student_id' });
          }

          // Also auto-migrate teachers
          const localTeachers = JSON.parse(localStorage.getItem(this.KEYS.TEACHERS) || '[]');
          if (localTeachers.length > 0) {
            const teacherBatch = localTeachers.map(t => ({
              first_name: t.first_name,
              last_name: t.last_name,
              phone: t.phone,
              username: t.username || null,
              password: t.password || null,
              role: 'teacher'
            }));
            await this.client.from('teachers').upsert(teacherBatch, { onConflict: 'phone' });
          }
        } catch (mErr) {
          console.warn('Auto-migration notice:', mErr);
        }
      }

      // ── Always refresh the UI after sync so all devices see the same data ──
      // Refresh whatever view is currently active
      if (typeof loadOverview      === 'function' && currentView === 'overview')     loadOverview();
      if (typeof loadStudents      === 'function' && currentView === 'students')     loadStudents();
      if (typeof loadRegistrations === 'function' && currentView === 'registration') loadRegistrations();
      if (typeof loadFees          === 'function' && currentView === 'fees')         loadFees();
      if (typeof loadExams         === 'function' && currentView === 'exams')        loadExams();
      if (typeof loadTeachers      === 'function' && currentView === 'teachers')     loadTeachers();

      // ALWAYS refresh overview stat counters so sidebar & hero numbers are correct
      // even if user is on a different view
      if (typeof loadOverview === 'function') {
        // Update just the stat counters without switching views
        const _students = this.getStudents();
        const _sc = document.getElementById('statTotalStudents');
        const _ss = document.getElementById('sidebarStudentCount');
        if (_sc) _sc.textContent = _students.length;
        if (_ss) _ss.textContent = _students.length;
      }

    } catch (err) {
      console.warn('Supabase sync notice:', err);
      const dot = document.getElementById('supabaseDot');
      const text = document.getElementById('supabaseText');
      if (dot) dot.style.background = '#ef4444';
      if (text) text.textContent = 'Sync Error';
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
    if (!key) return '—';
    let keys = [];
    if (Array.isArray(key)) {
      keys = key;
    } else if (typeof key === 'string') {
      keys = key.split(',').map(k => k.trim()).filter(Boolean);
    }
    if (keys.length === 0) return '—';
    return keys.map(k => {
      const prog = this.getPrograms().find(p => p.key.toLowerCase() === k.toLowerCase());
      return prog ? prog.label : k.toUpperCase();
    }).join(', ');
  },
  getProgramBadges(key) {
    if (!key) return '<span class="badge badge-gray">—</span>';
    let keys = [];
    if (Array.isArray(key)) {
      keys = key;
    } else if (typeof key === 'string') {
      keys = key.split(',').map(k => k.trim()).filter(Boolean);
    }
    if (keys.length === 0) return '<span class="badge badge-gray">—</span>';
    return keys.map(k => {
      const prog = this.getPrograms().find(p => p.key.toLowerCase() === k.toLowerCase());
      const label = prog ? prog.label : k.toUpperCase();
      return `<span class="badge badge-blue" style="margin:2px 3px 2px 0;display:inline-block">${label}</span>`;
    }).join('');
  },
  getProgramFee(key) {
    if (!key) return 0;
    let keys = [];
    if (Array.isArray(key)) keys = key;
    else if (typeof key === 'string') keys = key.split(',').map(k => k.trim()).filter(Boolean);
    if (keys.length === 0) return 0;
    return keys.reduce((sum, k) => {
      const prog = this.getPrograms().find(p => p.key.toLowerCase() === k.toLowerCase());
      return sum + (prog ? Number(prog.fee || 0) : 0);
    }, 0);
  },

  // ── Students
  getStudents() {
    try {
      return JSON.parse(localStorage.getItem(this.KEYS.STUDENTS)) || [];
    } catch {
      return [];
    }
  },
  async saveStudent(student) {
    const list = this.getStudents();
    let saved = null;
    let idx = -1;
    if (student.id) {
      idx = list.findIndex(s => s.id === student.id || (s.student_id && student.student_id && s.student_id === student.student_id));
    }
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...student, updated_at: new Date().toISOString() };
      saved = list[idx];
    } else {
      const newId = student.id && !student.id.startsWith('s_temp_') ? student.id : ('s_' + Date.now());
      saved = {
        ...student,
        id: newId,
        created_at: student.created_at || new Date().toISOString(),
      };
      list.unshift(saved);
      this.logActivity(`Student enrolled: ${saved.first_name} ${saved.last_name}`, `ID: ${saved.student_id} · ${this.getProgramLabel(saved.program)}`, 'activity-dot-blue');
    }

    if (this.client && saved) {
      const payload = {
        first_name: saved.first_name,
        last_name: saved.last_name,
        student_id: saved.student_id,
        phone: saved.phone,
        program: Array.isArray(saved.programs) ? saved.programs.join(', ') : (saved.program || ''),
        status: saved.status || 'active',
        security_pin: saved.pin || saved.security_pin || null,
        fee_amount: Number(saved.fee_amount || 0),
        is_free: Boolean(saved.is_free),
        address: saved.address || null,
        notes: saved.notes || null,
      };
      const isUUID = saved.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id);
      if (isUUID) payload.id = saved.id;

      try {
        const { data, error } = await this.client.from('students').upsert([payload], { onConflict: 'student_id' }).select();
        if (!error && data && data[0]) {
          saved.id = data[0].id;
        } else if (error) {
          console.error('Supabase student save error:', error);
        }
      } catch (err) {
        console.error('Supabase save error:', err);
      }
    }
    localStorage.setItem(this.KEYS.STUDENTS, JSON.stringify(list));
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
  async saveRegistration(reg) {
    const list = this.getRegistrations();
    let idx = -1;
    if (reg.id) {
      idx = list.findIndex(r => r.id === reg.id || (r.student_id && reg.student_id && r.student_id === reg.student_id));
    }
    let saved = null;
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...reg, updated_at: new Date().toISOString() };
      saved = list[idx];
    } else {
      saved = {
        ...reg,
        id: reg.id || ('r_' + Date.now()),
        created_at: reg.created_at || new Date().toISOString(),
      };
      list.unshift(saved);
      const feeNote = saved.is_free ? 'FREE Scholarship' : `Fee: $${saved.fee_amount}`;
      this.logActivity(`New student registered: ${saved.first_name} ${saved.last_name}`, `ID: ${saved.student_id} · ${feeNote}`, 'activity-dot-blue');
    }

    if (this.client && saved) {
      const regPayload = {
        student_id:   saved.student_id,
        first_name:   saved.first_name,
        last_name:    saved.last_name,
        phone:        saved.phone || null,
        program:      Array.isArray(saved.programs) ? saved.programs.join(', ') : (saved.program || ''),
        fee_amount:   Number(saved.fee_amount || 0),
        is_free:      Boolean(saved.is_free),
        status:       saved.status || 'approved',
        registered_by: saved.registered_by || null,
        notes:        saved.notes || null,
      };
      try {
        await this.client.from('registrations').upsert([regPayload], { onConflict: 'student_id' });
      } catch (err) {
        console.warn('Supabase registration save error:', err);
      }
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
  async saveFee(fee) {
    const list = this.getFees();
    let saved = null;
    const existingIndex = fee.id
      ? list.findIndex(f => f.id === fee.id)
      : list.findIndex(f => f.student_id === fee.student_id);

    if (existingIndex !== -1) {
      list[existingIndex] = { ...list[existingIndex], ...fee, updated_at: new Date().toISOString() };
      saved = list[existingIndex];
      const students = this.getStudents();
      const s = students.find(x => x.id === saved.student_id);
      const studentName = s ? `${s.first_name} ${s.last_name}` : 'Student';
      this.logActivity(`Fee updated: $${saved.amount_paid}/$${saved.total_fee}`, `${studentName} payment status`, 'activity-dot-green');
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

    if (this.client && saved) {
      const payload = {
        student_id: saved.student_id,
        total_fee: Number(saved.total_fee || 0),
        amount_paid: Number(saved.amount_paid || 0),
        payment_date: saved.payment_date || new Date().toISOString().slice(0, 10),
        payment_method: saved.payment_method || 'cash',
        notes: saved.notes || null,
      };
      const isUUID = saved.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved.id);
      if (isUUID) payload.id = saved.id;

      try {
        const { data, error } = await this.client.from('fees').upsert([payload]).select();
        if (!error && data && data[0]) {
          saved.id = data[0].id;
        }
      } catch (err) {
        console.warn('Supabase fee save error:', err);
      }
    }
    localStorage.setItem(this.KEYS.FEES, JSON.stringify(list));
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
    const cleanPhone = (teacher.phone || '').replace(/\D/g, '');
    let saved = null;
    let idx = -1;
    if (teacher.id) {
      idx = list.findIndex(t => t.id === teacher.id);
    }
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...teacher, updated_at: new Date().toISOString() };
      saved = list[idx];
    } else {
      const exists = list.find(t => (t.phone || '').replace(/\D/g, '') === cleanPhone);
      if (exists) {
        return { error: 'Macalin leh lambarkan taleefanka ayaa horay u jiray (Phone already registered).' };
      }
      const cleanUsername = (teacher.username || '').toLowerCase().trim();
      if (cleanUsername) {
        const userExists = list.find(t => (t.username || '').toLowerCase() === cleanUsername);
        if (userExists) {
          return { error: 'Username-kan qof kale ayaa horey u qaatay (Username already taken).' };
        }
      }
      saved = {
        ...teacher,
        id: teacher.id || ('t_' + Date.now()),
        first_name: teacher.first_name,
        last_name:  teacher.last_name,
        phone:      teacher.phone,
        username:   cleanUsername || `teacher_${cleanPhone.slice(-4) || Date.now().toString().slice(-4)}`,
        password:   teacher.password || '123456',
        email:      teacher.email || `${cleanUsername || 'teacher_' + cleanPhone}@hanaqaad.edu`,
        role:       'teacher',
        created_at: new Date().toISOString(),
      };
      list.push(saved);
      this.logActivity(`Teacher account created: ${saved.first_name} ${saved.last_name}`, `User: ${saved.username}`, 'activity-dot-blue');
    }
    localStorage.setItem(this.KEYS.TEACHERS, JSON.stringify(list));

    // Also sync to Supabase teachers table if live
    if (this.client && saved) {
      try {
        await this.client.from('teachers').upsert([{
          first_name: saved.first_name,
          last_name:  saved.last_name,
          phone:      saved.phone,
          username:   saved.username,
          password:   saved.password,
          role:       'teacher'
        }], { onConflict: 'phone' });
      } catch (err) {
        console.warn('Supabase teacher sync notice:', err);
      }
    }
    return { ok: true, teacher: saved };
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
document.addEventListener('DOMContentLoaded', async () => {
  let sessionStr = localStorage.getItem('hanaqaad_admin_session');

  // If local session cache is missing, try recovering from active Supabase session
  if (!sessionStr && window.supabase && window.ENV_SUPABASE_URL && window.ENV_SUPABASE_ANON_KEY) {
    try {
      const sb = window.supabase.createClient(window.ENV_SUPABASE_URL, window.ENV_SUPABASE_ANON_KEY);
      const { data: { session } } = await sb.auth.getSession();
      if (session && session.user) {
        const { data: profile } = await sb
          .from('profiles')
          .select('role, first_name, last_name')
          .eq('id', session.user.id)
          .maybeSingle();

        const role = profile?.role || (session.user.email?.toLowerCase().includes('admin') ? 'admin' : 'teacher');
        const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || session.user.email.split('@')[0];
        const recovered = {
          id: session.user.id,
          email: session.user.email,
          name: name,
          role: role,
          loginTime: new Date().toISOString()
        };
        localStorage.setItem('hanaqaad_admin_session', JSON.stringify(recovered));
        sessionStr = JSON.stringify(recovered);
      }
    } catch (e) {
      console.warn('Could not restore session from Supabase:', e);
    }
  }

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
    // Healing: Email logins or sessions without teacher phone default to Admin
    if (session.email && (!session.phone || session.email.includes('@'))) {
      currentUserRole = 'admin';
      session.role = 'admin';
      localStorage.setItem('hanaqaad_admin_session', JSON.stringify(session));
    } else {
      currentUserRole = session.role || 'admin';
    }

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
  } else {
    // Admins have full access to all sections
    document.querySelectorAll('.admin-only-nav').forEach(el => {
      el.classList.remove('hidden');
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
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('Are you sure you want to log out of Hanaqaad College?')) {
      localStorage.removeItem('hanaqaad_admin_session');
      if (window._sb && window._sb.auth) {
        try { await window._sb.auth.signOut(); } catch (e) {}
      }
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
  // Expected tuition = per-student fee_amount (covers students with no fee record yet)
  const totalFees = students.reduce((sum, s) => {
    if (s.is_free) return sum;
    const feeRec = fees.find(f => f.student_id === s.id);
    return sum + (Number(feeRec ? feeRec.total_fee : s.fee_amount) || 0);
  }, 0);
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
        <td>${LocalDB.getProgramBadges(s.program || s.programs)}</td>
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

  // ── Overview Applet 1: Student Fee Payments Table ──
  const overviewFeeTotalEl = document.getElementById('overviewFeeTotal');
  const overviewFeePaidEl = document.getElementById('overviewFeePaid');
  const overviewFeeOutstandingEl = document.getElementById('overviewFeeOutstanding');
  const overviewFeesTbody = document.getElementById('overviewFeesTbody');

  // Derive expected tuition from each student's own fee_amount (covers students with no fee record yet)
  const totalTuitionSum = students.reduce((sum, s) => {
    if (s.is_free) return sum;
    const feeRec = fees.find(f => f.student_id === s.id);
    return sum + (Number(feeRec ? feeRec.total_fee : s.fee_amount) || 0);
  }, 0);
  const totalPaidSum    = fees.reduce((sum, f) => sum + (Number(f.amount_paid) || 0), 0);
  const totalBalance    = Math.max(0, totalTuitionSum - totalPaidSum);

  if (overviewFeeTotalEl) overviewFeeTotalEl.textContent = formatCurrency(totalTuitionSum);
  if (overviewFeePaidEl) overviewFeePaidEl.textContent = formatCurrency(totalPaidSum);
  if (overviewFeeOutstandingEl) overviewFeeOutstandingEl.textContent = formatCurrency(totalBalance);

  if (overviewFeesTbody) {
    if (students.length === 0) {
      overviewFeesTbody.innerHTML = emptyRow(8, 'Arday weli lama diiwaangelin (No students enrolled yet)');
    } else {
      overviewFeesTbody.innerHTML = students.slice(0, 8).map((s, i) => {
        const feeRecord = fees.find(f => f.student_id === s.id) || {};
        const total = Number(feeRecord.total_fee ?? s.fee_amount ?? 0);
        const paid = Number(feeRecord.amount_paid ?? 0);
        const balance = Math.max(0, total - paid);
        const isFree = s.is_free;
        const status = isFree ? 'free' : (balance <= 0 && total > 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'));

        let actionHtml = '';
        if (isFree) {
          actionHtml = '<span class="free-badge">🎓 FREE</span>';
        } else if (status === 'paid') {
          actionHtml = `<span class="badge badge-green" style="font-weight:700">✓ Fully Paid</span>`;
        } else {
          actionHtml = `
            <div style="display:flex;gap:0.4rem;align-items:center">
              <button class="btn btn-xs btn-success" onclick="markStudentPaid('${s.id}')" title="Xaqiiji inuu lacagta wada bixiyay">
                ✓ Sax Lacagta
              </button>
              <button class="btn btn-xs btn-ghost" onclick="openPaymentModal(null, '${s.id}')" title="Faahfaahin ama qayb qor">
                Qor
              </button>
            </div>
          `;
        }

        return `
          <tr>
            <td>
              <div class="cell-name">
                <div class="mini-avatar ${avatarColor(i)}">${getInitials(s.first_name, s.last_name)}</div>
                <div class="cell-name-text">
                  <strong>${s.first_name} ${s.last_name}</strong>
                  <span>${s.phone || '—'}</span>
                </div>
              </div>
            </td>
            <td><code style="font-size:0.8rem;background:var(--blue-50);color:var(--primary);padding:2px 6px;border-radius:4px;font-weight:800">${s.student_id || '—'}</code></td>
            <td>${LocalDB.getProgramBadges(s.program || s.programs)}</td>
            <td><strong>${isFree ? '$0' : formatCurrency(total)}</strong></td>
            <td style="color:var(--success);font-weight:700">${formatCurrency(paid)}</td>
            <td style="color:${balance > 0 ? 'var(--error)' : 'var(--success)'};font-weight:700">${formatCurrency(balance)}</td>
            <td>${statusBadge(status)}</td>
            <td>${actionHtml}</td>
          </tr>
        `;
      }).join('');
    }
  }

  // ── Overview Applet 2: Teacher Accounts Management ──
  const overviewTeachersContainer = document.getElementById('overviewTeachersContainer');
  if (overviewTeachersContainer) {
    const teachers = LocalDB.getTeachers();
    if (teachers.length === 0) {
      overviewTeachersContainer.innerHTML = `
        <div style="text-align:center;padding:2rem 1rem;background:var(--gray-50);border-radius:var(--radius-md);border:1px dashed var(--border)">
          <p style="color:var(--text-muted);font-size:0.9rem;margin-bottom:0.75rem">Weli ma jiro macallin ku diiwaangashan nidaamka.</p>
          <button class="btn btn-primary btn-sm" onclick="openTeacherModal()">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            + Samee Account-kii ugu horreeyay ee Macallin
          </button>
        </div>
      `;
    } else {
      overviewTeachersContainer.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(280px, 1fr));gap:0.75rem">
          ${teachers.slice(0, 6).map((t, idx) => `
            <div class="teacher-item-compact">
              <div style="display:flex;align-items:center;gap:0.75rem">
                <div class="mini-avatar ${avatarColor(idx)}">${getInitials(t.first_name, t.last_name)}</div>
                <div>
                  <strong style="display:block;font-size:0.875rem;color:var(--text-dark)">${t.first_name} ${t.last_name}</strong>
                  <div style="display:flex;flex-wrap:wrap;gap:0.4rem;margin-top:0.15rem;font-size:0.75rem">
                    <span style="color:var(--primary);font-weight:700">👤 User: <code>${t.username || t.phone}</code></span>
                    <span style="color:var(--text-muted)">🔑 Pass: <code>${t.password || '••••'}</code></span>
                  </div>
                </div>
              </div>
              <div style="display:flex;gap:0.35rem">
                <button class="btn btn-xs btn-ghost" onclick="editTeacher('${t.id}')" title="Edit Teacher">Edit</button>
              </div>
            </div>
          `).join('')}
        </div>
      `;
    }
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
  allFees     = LocalDB.getFees();          // Always refresh fees so fee status is up-to-date
  document.getElementById('sidebarStudentCount').textContent = allStudents.length;
  renderStudentsTable(allStudents);
}

function renderStudentsTable(students) {
  const tbody = document.getElementById('studentsTbody');

  if (students.length === 0) {
    tbody.innerHTML = emptyRow(7, 'No students found');
    return;
  }

  tbody.innerHTML = students.map((s, i) => {
    const feeRecord = allFees.find(f => f.student_id === s.id) || {};
    const total = Number(feeRecord.total_fee ?? s.fee_amount ?? 0);
    const paid = Number(feeRecord.amount_paid ?? 0);
    const balance = Math.max(0, total - paid);
    const isFree = s.is_free;
    const feeStatus = isFree ? 'free' : (balance <= 0 && total > 0 ? 'paid' : (paid > 0 ? 'partial' : 'unpaid'));

    let feeCellHtml = '';
    if (isFree) {
      feeCellHtml = '<span class="free-badge">🎓 FREE</span>';
    } else if (feeStatus === 'paid') {
      feeCellHtml = `<span class="badge badge-green" style="font-weight:700">✓ Paid (${formatCurrency(total)})</span>`;
    } else {
      feeCellHtml = `
        <div style="display:inline-flex;align-items:center;gap:0.35rem">
          <span class="badge badge-amber" style="font-weight:700">${formatCurrency(balance)} unpaid</span>
          <button class="btn btn-xs btn-outline-success" onclick="markStudentPaid('${s.id}')" title="Sax Lacagta (Mark as Paid)">✓ Sax</button>
        </div>
      `;
    }

    return `
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
        <td>${LocalDB.getProgramBadges(s.program || s.programs)}</td>
        <td><strong>${s.phone || '—'}</strong></td>
        <td>${feeCellHtml}</td>
        <td><code style="font-size:0.78rem;background:var(--gray-100);padding:2px 6px;border-radius:4px;font-weight:700">${s.pin || '1234'}</code></td>
        <td>${statusBadge(s.status || 'active')}</td>
        <td>
          <div class="row-actions">
            <button onclick="openPaymentModal(null, '${s.id}')" title="Record payment for student" style="color:var(--primary)">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
              </svg>
            </button>
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
    `;
  }).join('');
}

function filterStudentsTable() {
  const q      = document.getElementById('studentSearch').value.toLowerCase().trim();
  const prog   = document.getElementById('studentProgramFilter').value;
  const status = document.getElementById('studentStatusFilter').value;

  const filtered = allStudents.filter(s => {
    const textMatch   = !q || `${s.first_name} ${s.last_name} ${s.student_id || ''} ${s.phone || ''}`.toLowerCase().includes(q);
    const sProgs      = Array.isArray(s.programs) ? s.programs : (s.program ? s.program.split(',').map(p=>p.trim()) : []);
    const progMatch   = !prog || sProgs.includes(prog);
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
  const filteredStudents = progFilter ? students.filter(s => {
    const sProgs = Array.isArray(s.programs) ? s.programs : (s.program ? s.program.split(',').map(p=>p.trim()) : []);
    return sProgs.includes(progFilter);
  }) : students;

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
      <td>${LocalDB.getProgramBadges(r.program || r.programs)}</td>
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
    const rProgs      = Array.isArray(r.programs) ? r.programs : (r.program ? r.program.split(',').map(p=>p.trim()) : []);
    const progMatch   = !prog || rProgs.includes(prog);
    const statusMatch = !status || r.status === status;
    return textMatch && progMatch && statusMatch;
  });

  renderRegistrationsTable(filtered);
}

function renderRegistrationProgramCheckboxes(selectedKeys = []) {
  const container = document.getElementById('rProgramsGrid');
  if (!container) return;

  const programs = LocalDB.getPrograms();
  const normalizedSelected = Array.isArray(selectedKeys)
    ? selectedKeys.map(k => String(k).trim().toLowerCase())
    : String(selectedKeys || '').split(',').map(k => k.trim().toLowerCase()).filter(Boolean);

  container.innerHTML = programs.map(prog => {
    const isChecked = normalizedSelected.includes(prog.key.toLowerCase());
    return `
      <label class="program-choice-card ${isChecked ? 'selected' : ''}" id="progChoice-${prog.key}">
        <input type="checkbox" name="rPrograms" value="${prog.key}" data-fee="${prog.fee || 0}" ${isChecked ? 'checked' : ''} onchange="handleProgramCheckboxChange(this)" />
        <div class="program-choice-content">
          <span class="program-choice-title">${prog.label}</span>
          <span class="program-choice-fee">$${prog.fee || 0} USD</span>
        </div>
      </label>
    `;
  }).join('');

  updateSelectedProgramsSummary(false);
}

function handleProgramCheckboxChange(cb) {
  const card = document.getElementById(`progChoice-${cb.value}`);
  if (card) {
    card.classList.toggle('selected', cb.checked);
  }
  updateSelectedProgramsSummary(true);
}

function updateSelectedProgramsSummary(recalcFee = true) {
  const checkedBoxes = Array.from(document.querySelectorAll('input[name="rPrograms"]:checked'));
  const countBadge = document.getElementById('selectedProgramsBadge');
  if (countBadge) {
    countBadge.textContent = `${checkedBoxes.length} selected`;
  }

  const hiddenInput = document.getElementById('rProgram');
  if (hiddenInput) {
    hiddenInput.value = checkedBoxes.map(cb => cb.value).join(', ');
  }

  const isFree = document.getElementById('rFree')?.checked;
  const feeInput = document.getElementById('rFeeAmount');
  if (feeInput && !isFree && recalcFee) {
    const totalFee = checkedBoxes.reduce((sum, cb) => sum + (parseFloat(cb.dataset.fee) || 0), 0);
    feeInput.value = totalFee;
  }

  const errEl = document.getElementById('rProgramErr');
  if (errEl && checkedBoxes.length > 0) errEl.textContent = '';
}

function handleFreeToggle() {
  const isFree = document.getElementById('rFree').checked;
  const feeInput = document.getElementById('rFeeAmount');
  if (!feeInput) return;
  if (isFree) {
    feeInput.value = 0;
    feeInput.disabled = true;
    feeInput.style.opacity = '0.5';
  } else {
    feeInput.disabled = false;
    feeInput.style.opacity = '1';
    const checkedBoxes = Array.from(document.querySelectorAll('input[name="rPrograms"]:checked'));
    const totalFee = checkedBoxes.reduce((sum, cb) => sum + (parseFloat(cb.dataset.fee) || 0), 0);
    feeInput.value = totalFee;
  }
}

function openRegistrationModal(reg = null) {
  editingRegistrationId = reg?.id || null;
  document.getElementById('registrationModalTitle').textContent = reg ? 'Edit Registration' : 'Student Registration';

  // Render multi-program checkboxes with selected programs
  const regPrograms = reg?.programs || reg?.program || '';
  renderRegistrationProgramCheckboxes(regPrograms);

  document.getElementById('rFirstName').value      = reg?.first_name || '';
  document.getElementById('rLastName').value       = reg?.last_name  || '';
  document.getElementById('rPhone').value          = reg?.phone      || '';
  if (document.getElementById('rAddress')) document.getElementById('rAddress').value = reg?.address || '';
  document.getElementById('rFree').checked         = reg?.is_free    || false;
  document.getElementById('rRegistrationId').value = reg?.id         || '';

  // Fee calculation / display
  const feeInput = document.getElementById('rFeeAmount');
  if (reg?.fee_amount !== undefined && reg?.fee_amount !== '') {
    feeInput.value = reg.fee_amount;
  } else {
    const checkedBoxes = Array.from(document.querySelectorAll('input[name="rPrograms"]:checked'));
    feeInput.value = checkedBoxes.reduce((sum, cb) => sum + (parseFloat(cb.dataset.fee) || 0), 0);
  }

  if (reg?.is_free) {
    feeInput.disabled = true;
    feeInput.style.opacity = '0.5';
  } else {
    feeInput.disabled = false;
    feeInput.style.opacity = '1';
  }

  // Generate PIN if new
  if (!reg || !reg.pin) {
    generateRandomPin();
  } else {
    document.getElementById('rPin').value = reg.pin;
  }

  ['rFirstNameErr', 'rLastNameErr', 'rPhoneErr', 'rProgramErr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });

  openModal('registrationModal');
}

function editRegistration(id) {
  const reg = allRegistrations.find(r => r.id === id);
  if (reg) openRegistrationModal(reg);
}

function editRegistrationByStudentId(studentId) {
  const student = LocalDB.getStudents().find(s => s.id === studentId || s.student_id === studentId);
  if (student) {
    openRegistrationModal({
      id: student.id,
      first_name: student.first_name,
      last_name:  student.last_name,
      phone:      student.phone,
      program:    student.program,
      programs:   student.programs,
      pin:        student.pin || student.security_pin,
      address:    student.address,
      fee_amount: student.fee_amount !== undefined ? student.fee_amount : LocalDB.getProgramFee(student.program),
      is_free:    student.is_free || false,
      student_id: student.student_id,
      status:     student.status || 'active',
    });
  }
}

async function saveRegistration() {
  const firstName = document.getElementById('rFirstName').value.trim();
  const lastName  = document.getElementById('rLastName').value.trim();
  const phone     = document.getElementById('rPhone').value.trim();
  const pin       = document.getElementById('rPin').value.trim() || generateRandomPin().toString();
  const addressEl = document.getElementById('rAddress');
  const address   = addressEl ? addressEl.value.trim() : 'Berbera, Somaliland';
  const isFree    = document.getElementById('rFree').checked;
  const feeAmount = isFree ? 0 : (parseFloat(document.getElementById('rFeeAmount').value) || 0);

  // Selected multi-programs
  const selectedBoxes = Array.from(document.querySelectorAll('input[name="rPrograms"]:checked'));
  const selectedPrograms = selectedBoxes.map(cb => cb.value);

  let valid = true;
  if (!firstName) { document.getElementById('rFirstNameErr').textContent = 'Required'; valid = false; }
  if (!lastName)  { document.getElementById('rLastNameErr').textContent  = 'Required'; valid = false; }
  if (!phone)     { document.getElementById('rPhoneErr').textContent     = 'Required'; valid = false; }
  if (selectedPrograms.length === 0) {
    document.getElementById('rProgramErr').textContent = 'Fadlan xulo ugu yaraan 1 program (Select at least 1 program)';
    valid = false;
  }
  if (!valid) return;

  const programsString = selectedPrograms.join(', ');

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
    program:    programsString,
    programs:   selectedPrograms,
    pin,
    address:    address || 'Berbera, Somaliland',
    status:     'active',
    is_free:    isFree,
    fee_amount: feeAmount,
  };
  await LocalDB.saveStudent(studentPayload);

  // 2. Save Registration record
  const regPayload = {
    id:          editingRegistrationId || ('r_' + Date.now()),
    student_id:  assignedStudentId,
    first_name:  firstName,
    last_name:   lastName,
    phone,
    program:     programsString,
    programs:    selectedPrograms,
    pin,
    address,
    fee_amount:  feeAmount,
    is_free:     isFree,
    status:      'approved',
    registered_by: currentUserName,
  };
  await LocalDB.saveRegistration(regPayload);

  // 3. Create/update initial Fee record if new
  if (!editingRegistrationId) {
    await LocalDB.saveFee({
      student_id:     studentRecordId,
      total_fee:      isFree ? 0 : feeAmount,
      amount_paid:    0,
      payment_date:   new Date().toISOString().slice(0, 10),
      payment_method: 'zaad',
      notes: isFree ? 'Full scholarship (Waived fee)' : `Initial tuition (${programsString}) registered by ${currentUserName}`,
    });
  }

  closeModal('registrationModal');
  showToast(`🎉 Diiwaangelintii guul leh! Student ID: ${assignedStudentId} · PIN: ${pin}`, 'success');

  // Refresh all related global state from localStorage immediately
  allStudents = LocalDB.getStudents();
  allFees     = LocalDB.getFees();
  allRegistrations = LocalDB.getRegistrations();

  // Always refresh overview counters
  loadOverview();

  // Switch to Students Directory so the user sees the new student immediately
  switchView('students');
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
          <div class="row-actions" style="gap:0.4rem;align-items:center">
            ${balance > 0 ? `
              <button class="btn btn-xs btn-success" onclick="markStudentPaid('${f.id}')" title="Xaqiiji inuu lacagta oo dhan wada bixiyay">
                ✓ Sax Lacagta
              </button>
            ` : '<span style="color:var(--success);font-weight:700;font-size:0.78rem">✓ Bixiyay</span>'}
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

function openPaymentModal(fee = null, preselectedStudentId = null) {
  editingFeeId = fee?.id || null;
  const targetStudentId = fee?.student_id || preselectedStudentId;

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
    if (targetStudentId === s.id) opt.selected = true;
    sel.appendChild(opt);
  });

  if (!fee && targetStudentId) {
    const s = LocalDB.getStudents().find(x => x.id === targetStudentId);
    if (s) {
      const existingFee = LocalDB.getFees().find(f => f.student_id === s.id);
      if (existingFee) {
        editingFeeId = existingFee.id;
        document.getElementById('pFeeId').value      = existingFee.id;
        document.getElementById('pTotalFee').value   = existingFee.total_fee || s.fee_amount || 0;
        document.getElementById('pAmountPaid').value = existingFee.amount_paid || 0;
        document.getElementById('pMethod').value     = existingFee.payment_method || 'zaad';
        document.getElementById('pNotes').value      = existingFee.notes || '';
      } else {
        const expected = s.is_free ? 0 : (s.fee_amount || 0);
        document.getElementById('pTotalFee').value   = expected;
        document.getElementById('pAmountPaid').value = expected;
      }
    }
  }

  ['pStudentErr', 'pTotalFeeErr', 'pAmountPaidErr', 'pPaymentDateErr'].forEach(id => {
    document.getElementById(id).textContent = '';
  });

  openModal('paymentModal');
}

function markStudentPaid(studentOrFeeId, method = 'zaad') {
  let fee = allFees.find(f => f.id === studentOrFeeId || f.student_id === studentOrFeeId);
  let student = allStudents.find(s => s.id === studentOrFeeId || s.id === fee?.student_id);

  if (!fee && student) {
    const sFee = Number(student.fee_amount || 0);
    fee = {
      student_id: student.id,
      total_fee: sFee,
      amount_paid: sFee,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: method,
      notes: 'Fully cleared / Saxay lacagta (1-click payment)',
    };
  } else if (fee) {
    const totalToPay = Number(fee.total_fee || student?.fee_amount || 0);
    fee = {
      ...fee,
      amount_paid: totalToPay,
      payment_date: new Date().toISOString().slice(0, 10),
      payment_method: method,
      notes: (fee.notes ? fee.notes + ' · ' : '') + 'Saxay lacagta (Marked as paid)',
    };
  }

  if (fee) {
    LocalDB.saveFee(fee);
    const sName = student ? `${student.first_name} ${student.last_name}` : 'Ardayga';
    showToast(`✓ Lacagta ardayga (${sName}) si guul leh ayaa loo saxay inuu wada bixiyay!`, 'success');
    allFees = LocalDB.getFees();
    allStudents = LocalDB.getStudents();
    loadFees();
    loadStudents();
    loadRegistrations();
    if (currentView === 'overview') loadOverview();
  }
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

  const fName = document.getElementById('tFirstName');
  const uName = document.getElementById('tUsername');
  if (fName && uName) {
    fName.addEventListener('input', () => {
      if (!editingTeacherId && (!uName.value || uName.dataset.auto === 'true')) {
        uName.value = fName.value.toLowerCase().replace(/[^a-z0-9]/g, '');
        uName.dataset.auto = 'true';
      }
    });
    uName.addEventListener('input', () => {
      uName.dataset.auto = 'false';
    });
  }

  const genBtn = document.getElementById('tGenPassBtn');
  const passInput = document.getElementById('tPassword');
  if (genBtn && passInput) {
    genBtn.addEventListener('click', () => {
      passInput.value = 'Hanaqaad@' + Math.floor(1000 + Math.random() * 9000);
    });
  }
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
        <h3 style="font-size:1rem;font-weight:700;color:var(--text-dark);margin-bottom:0.35rem">Weli ma jiraan account-yo macalimiin</h3>
        <p style="font-size:0.85rem">Guji "+ Add Teacher" si aad u sameyso account-ka macalinka (Magaca iyo Telefoonka kaliya).</p>
      </div>`;
    return;
  }

  grid.innerHTML = teachers.map((t, i) => `
    <div class="teacher-card">
      <div class="user-avatar">${getInitials(t.first_name, t.last_name)}</div>
      <div class="teacher-card-info">
        <strong>${t.first_name} ${t.last_name}</strong>
        <span style="display:flex;align-items:center;gap:0.35rem;margin-top:0.25rem;font-size:0.85rem;color:var(--primary);font-weight:700">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z"/></svg>
          ${t.phone || '—'}
        </span>
        <div style="margin-top:0.35rem;font-size:0.78rem;background:var(--gray-50);padding:4px 8px;border-radius:4px;border:1px solid var(--border);display:inline-flex;flex-wrap:wrap;gap:0.6rem;align-items:center">
          <span><strong>Username:</strong> <code style="color:var(--primary);font-weight:800">${t.username || t.phone}</code></span>
          <span><strong>Password:</strong> <code style="font-weight:700">${t.password || '••••••'}</code></span>
        </div>
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
  document.getElementById('tFirstName').value = teacher?.first_name || '';
  document.getElementById('tLastName').value  = teacher?.last_name  || '';
  document.getElementById('tPhone').value     = teacher?.phone      || '';
  document.getElementById('tUsername').value  = teacher?.username   || '';
  document.getElementById('tPassword').value  = teacher?.password   || '';
  document.getElementById('tTeacherId').value = teacher?.id         || '';

  ['tFirstNameErr', 'tLastNameErr', 'tPhoneErr', 'tUsernameErr', 'tPasswordErr'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.textContent = '';
  });

  openModal('teacherModal');
}

function editTeacher(id) {
  const teacher = allTeachers.find(t => t.id === id);
  if (teacher) openTeacherModal(teacher);
}

async function saveTeacher() {
  const firstName = document.getElementById('tFirstName').value.trim();
  const lastName  = document.getElementById('tLastName').value.trim();
  const phone     = document.getElementById('tPhone').value.trim();
  const username  = document.getElementById('tUsername').value.trim();
  const password  = document.getElementById('tPassword').value.trim();

  let valid = true;
  if (!firstName) { document.getElementById('tFirstNameErr').textContent = 'Magaca hore waa qasab (Required)'; valid = false; }
  if (!lastName)  { document.getElementById('tLastNameErr').textContent  = 'Magaca dambe waa qasab (Required)'; valid = false; }
  if (!phone)     { document.getElementById('tPhoneErr').textContent     = 'Lambarka taleefanka waa qasab (Required)'; valid = false; }
  if (!username)  { document.getElementById('tUsernameErr').textContent  = 'Username-ka waa qasab (Required)'; valid = false; }
  if (!password)  { document.getElementById('tPasswordErr').textContent  = 'Password-ka waa qasab (Required)'; valid = false; }
  if (!valid) return;

  const payload = {
    first_name: firstName,
    last_name:  lastName,
    phone:      phone,
    username:   username,
    password:   password,
  };

  if (editingTeacherId) payload.id = editingTeacherId;

  const result = await LocalDB.saveTeacher(payload);

  if (result && result.error) {
    if (result.error.includes('Username')) {
      document.getElementById('tUsernameErr').textContent = result.error;
    } else {
      document.getElementById('tPhoneErr').textContent = result.error;
    }
    return;
  }

  closeModal('teacherModal');
  showToast(editingTeacherId 
    ? 'Xogta macalinka waa la cusbooneysiiyay!' 
    : `🎉 Account-ka macalinka (${firstName} ${lastName}) waa la sameeyay! User: "${username}" · Pass: "${password}"`, 'success');
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
window.handleProgramCheckboxChange = handleProgramCheckboxChange;
window.generateRandomPin      = generateRandomPin;
window.openExamModal          = openExamModal;
window.editExam               = editExam;
window.openPaymentModal       = openPaymentModal;
window.markStudentPaid        = markStudentPaid;
window.editFee                = editFee;
window.openTeacherModal       = openTeacherModal;
window.editTeacher            = editTeacher;
window.openProgramModal       = openProgramModal;
window.deleteProgram          = deleteProgram;
window.setStudentAttendance    = setStudentAttendance;
window.promptDeleteRecord     = promptDeleteRecord;
