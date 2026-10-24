/**
 * HANAQAAD COLLEGE — Main Application Script
 * Features: Sticky nav, mobile menu, scroll spy, counter animation,
 *           alumni directory, search/filter, form validation,
 *           intersection observer reveals, back-to-top button.
 */

'use strict';

/* ============================================================
   ALUMNI DATA
============================================================ */
const ALUMNI = [
  // ── CLD Cohort ──────────────────────────────────────────
  { id: 1, name: 'Abdihakim Elmi Dirir', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-101' },
  { id: 2, name: 'Abdihakim Mohamed Ar', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-102' },
  { id: 3, name: 'Abdikarim Hassan Ahmed', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-103' },
  { id: 4, name: 'Abdirahman Nasir Abdirahman', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-104' },
  { id: 5, name: 'Abdisalam Dahir Abdi', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-105' },
  { id: 6, name: 'Ahmed Hassan Ahmed', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-106' },
  { id: 7, name: 'Amin Ali Ahmed', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-107' },
  { id: 8, name: 'Awale Abdi Matan', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-108' },
  { id: 9, name: 'Ayan Mohamed Warsame', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-109' },
  { id: 10, name: 'Hujale Mohamoud Omer', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-110' },
  { id: 11, name: 'Husni Sayid Mohamed', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-111' },
  { id: 12, name: 'Ibrahim Ali Adam', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-112' },
  { id: 13, name: 'Marwa Hassan Ahmed', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-113' },
  { id: 14, name: 'Mohamed Abdilahi Saleban', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-114' },
  { id: 15, name: 'Mouse Abdikalik Mohamed', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-115' },
  { id: 16, name: 'Mowlid Abdikani Nour', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-116' },
  { id: 17, name: 'Munir Ismail Ahmed', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-117' },
  { id: 18, name: 'Mustafe Abdi Osman', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-118' },
  { id: 19, name: 'Saed Rashed Dirie', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-119' },
  { id: 20, name: 'Safwan Abdirahman Mohamed', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-120' },
  { id: 21, name: 'Sakarie Dek Osman', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-121' },
  { id: 22, name: 'Sakarie Mouse Hussein', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-122' },
  { id: 23, name: 'Saleban Jama Mohamed', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-123' },
  { id: 24, name: 'Suhaib Abdi Ba\'od', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-124' },
  { id: 25, name: 'Suhaib Harir Hassan', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-125' },

  // ── TC Cohort ──────────────────────────────────────────
  { id: 26, name: 'Abdiasis Karie Omer', course: 'Training Course', courseKey: 'tc', serial: 'TC-126' },
  { id: 27, name: 'Abdirahman Suhaib Mohamed', course: 'Training Course', courseKey: 'tc', serial: 'TC-127' },
  { id: 28, name: 'Ahmed Awale Jama', course: 'Training Course', courseKey: 'tc', serial: 'TC-128' },
  { id: 29, name: 'Asad Hassan Hashi', course: 'Training Course', courseKey: 'tc', serial: 'TC-129' },
  { id: 30, name: 'Asma Keise Omer', course: 'Training Course', courseKey: 'tc', serial: 'TC-130' },
  { id: 31, name: 'Asma Saed Jama', course: 'Training Course', courseKey: 'tc', serial: 'TC-131' },
  { id: 32, name: 'Awale Ahmed Bashe', course: 'Training Course', courseKey: 'tc', serial: 'TC-132' },
  { id: 33, name: 'Deka Ahmed Mohamoud', course: 'Training Course', courseKey: 'tc', serial: 'TC-133' },
  { id: 34, name: 'Hamse Ahmed Bashe', course: 'Training Course', courseKey: 'tc', serial: 'TC-134' },
  { id: 35, name: 'Marwa Ahmed Mohamed', course: 'Training Course', courseKey: 'tc', serial: 'TC-135' },
  { id: 36, name: 'Mubarak Ahmed Mohamed', course: 'Training Course', courseKey: 'tc', serial: 'TC-136' },
  { id: 37, name: 'Naema Muktar Mohamed', course: 'Training Course', courseKey: 'tc', serial: 'TC-137' },
  { id: 38, name: 'Rahma Mohamed Ali', course: 'Training Course', courseKey: 'tc', serial: 'TC-138' },
  { id: 39, name: 'Safa Abdilahi Omer', course: 'Training Course', courseKey: 'tc', serial: 'TC-139' },
  { id: 40, name: 'Sawda Mustafe Mohamed', course: 'Training Course', courseKey: 'tc', serial: 'TC-140' },
  { id: 41, name: 'Yahye Abdikarim Harir', course: 'Training Course', courseKey: 'tc', serial: 'TC-141' },

  // ── ED Cohort ──────────────────────────────────────────
  { id: 42, name: 'Abdihakim Elmi Dirir', course: 'English Department', courseKey: 'ed', serial: 'ED-142' },
  { id: 43, name: 'Abdisalam Ahmed Yousuf', course: 'English Department', courseKey: 'ed', serial: 'ED-143' },
  { id: 44, name: 'Amin Ali Dahir', course: 'English Department', courseKey: 'ed', serial: 'ED-144' },
  { id: 45, name: 'Guleid Abdirahman Mohamed', course: 'English Department', courseKey: 'ed', serial: 'ED-145' },
  { id: 46, name: 'Kalid Abdikalik Ismail', course: 'English Department', courseKey: 'ed', serial: 'ED-146' },
  { id: 47, name: 'Kalif Omer Mohamed', course: 'English Department', courseKey: 'ed', serial: 'ED-147' },
  { id: 48, name: 'Safwan Abdirahman Mohamed', course: 'English Department', courseKey: 'ed', serial: 'ED-148' },
  { id: 49, name: 'Salim Saed Abdi', course: 'English Department', courseKey: 'ed', serial: 'ED-149' },
  { id: 50, name: 'Sharma\'arke Mohamed Saed', course: 'English Department', courseKey: 'ed', serial: 'ED-150' },
  { id: 51, name: 'Yahye Hassan Ahmed', course: 'English Department', courseKey: 'ed', serial: 'ED-151' },
  { id: 52, name: 'Mahda Abdirashid Yasin', course: 'Training Course', courseKey: 'tc', serial: 'TC-152' },
  { id: 53, name: 'Sayidcali Saleban Salad', course: 'English Department', courseKey: 'ed', serial: 'ED-153' },
  { id: 54, name: 'Abdikani Kadar Ali', course: 'Training Course', courseKey: 'tc', serial: 'TC-154' },
  { id: 55, name: 'Asma Mohamed Awed', course: 'Training Course', courseKey: 'tc', serial: 'TC-155' },
  { id: 56, name: 'Sagal Abdilahi Mouse', course: 'Training Course', courseKey: 'tc', serial: 'TC-156' },
  { id: 57, name: 'Abshir Kadar Jama', course: 'Training Course', courseKey: 'tc', serial: 'TC-157' },
  { id: 58, name: 'Sainab Ibrahim Jama', course: 'Training Course', courseKey: 'tc', serial: 'TC-158' },
  { id: 59, name: 'Abdikarim Aydid Ahmed', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-159' },
  { id: 60, name: 'Mohamed Fu\'ad Abdi', course: 'Computer Literacy Diploma', courseKey: 'cld', serial: 'CLD-310' },
];

/* ============================================================
   UTILITY: Get initials for avatar
============================================================ */
function getInitials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

/* ============================================================
   DOM READY
============================================================ */
document.addEventListener('DOMContentLoaded', () => {
  initNavbar();
  initMobileMenu();
  initScrollSpy();
  initBackToTop();
  initCounterAnimation();
  initRevealAnimations();
  initAlumniDirectory();
  initStudentPortal();
  initContactForm();
  setFooterYear();
});

/* ============================================================
   1. NAVBAR — scroll shadow & state
============================================================ */
function initNavbar() {
  const navbar = document.getElementById('navbar');
  if (!navbar) return;

  const onScroll = () => {
    if (window.scrollY > 20) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* ============================================================
   2. MOBILE MENU
============================================================ */
function initMobileMenu() {
  const hamburger = document.getElementById('hamburger');
  const mobileMenu = document.getElementById('mobileMenu');
  const navLinks = document.querySelectorAll('.mobile-link, .mobile-cta');

  if (!hamburger || !mobileMenu) return;

  function openMenu() {
    hamburger.classList.add('active');
    mobileMenu.classList.add('open');
    hamburger.setAttribute('aria-expanded', 'true');
    document.body.style.overflow = 'hidden';
  }

  function closeMenu() {
    hamburger.classList.remove('active');
    mobileMenu.classList.remove('open');
    hamburger.setAttribute('aria-expanded', 'false');
    document.body.style.overflow = '';
  }

  hamburger.addEventListener('click', () => {
    const isOpen = mobileMenu.classList.contains('open');
    isOpen ? closeMenu() : openMenu();
  });

  // Close on nav link click
  navLinks.forEach(link => {
    link.addEventListener('click', closeMenu);
  });

  // Close on outside click / Escape
  document.addEventListener('click', (e) => {
    if (mobileMenu.classList.contains('open') &&
      !mobileMenu.contains(e.target) &&
      !hamburger.contains(e.target)) {
      closeMenu();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeMenu();
  });
}

/* ============================================================
   3. SCROLL SPY — active nav link
============================================================ */
function initScrollSpy() {
  const sections = document.querySelectorAll('section[id]');
  const navLinks = document.querySelectorAll('.nav-link[data-section]');
  const mLinks = document.querySelectorAll('.mobile-link[data-section]');

  const setActive = (sectionId) => {
    [...navLinks, ...mLinks].forEach(link => {
      link.classList.toggle('active', link.dataset.section === sectionId);
    });
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        setActive(entry.target.id);
      }
    });
  }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });

  sections.forEach(s => observer.observe(s));
}

/* ============================================================
   4. BACK TO TOP
============================================================ */
function initBackToTop() {
  const btn = document.getElementById('backToTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    btn.classList.toggle('visible', window.scrollY > 400);
  }, { passive: true });

  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ============================================================
   5. COUNTER ANIMATION
============================================================ */
function initCounterAnimation() {
  const counters = document.querySelectorAll('.stat-number[data-target]');
  if (!counters.length) return;

  const easeOutQuart = (t) => 1 - Math.pow(1 - t, 4);

  const animateCounter = (el) => {
    // Check if target should be custom calculated
    let target = parseInt(el.dataset.target, 10);
    // If it's the 50 placeholder from previous static HTML, update it to the true length (51).
    if (el.closest('.stat-item')?.querySelector('.stat-label')?.textContent.includes('Alumni')) {
      target = ALUMNI.length;
    }

    const duration = 1800;
    const startTime = performance.now();

    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const value = Math.round(easeOutQuart(progress) * target);
      el.textContent = value;
      if (progress < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => observer.observe(c));
}

/* ============================================================
   6. REVEAL ANIMATIONS (Intersection Observer)
============================================================ */
function initRevealAnimations() {
  const targets = [
    '.value-card',
    '.program-card',
    '.contact-item',
    '.section-header',
    '.about-story',
    '.values-grid',
    '.contact-form-wrap',
    '.map-placeholder',
    '.contact-info h3',
  ];

  targets.forEach((selector, idx) => {
    document.querySelectorAll(selector).forEach((el, i) => {
      el.classList.add('reveal');
      if (i < 4) el.classList.add(`reveal-delay-${i + 1}`);
    });
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ============================================================
   7. ALUMNI DIRECTORY
============================================================ */
function initAlumniDirectory() {
  const grid = document.getElementById('alumniGrid');
  const searchInput = document.getElementById('alumniSearch');
  const filterPills = document.querySelectorAll('.filter-pill');
  const countLabel = document.getElementById('alumniCount');
  const noResults = document.getElementById('noResults');

  if (!grid) return;

  let activeFilter = 'all';
  let searchQuery = '';

  function buildCard(alumni) {
    const initials = getInitials(alumni.name);
    const card = document.createElement('article');
    card.className = 'alumni-card';
    card.dataset.name = alumni.name.toLowerCase();
    card.dataset.course = alumni.courseKey;
    card.dataset.courseFull = alumni.course.toLowerCase();
    card.dataset.serial = alumni.serial.toLowerCase();
    card.innerHTML = `
      <div class="alumni-avatar" aria-hidden="true">${initials}</div>
      <span class="alumni-name">${alumni.name}</span>
      <span class="alumni-serial">Cert No: <strong style="color:var(--text-dark)">${alumni.serial}</strong></span>
      <span class="alumni-course">${alumni.course}</span>
    `;
    return card;
  }

  // Initial render
  ALUMNI.forEach(a => grid.appendChild(buildCard(a)));

  function applyFilters() {
    const query = searchQuery.trim().toLowerCase();
    let visible = 0;

    grid.querySelectorAll('.alumni-card').forEach(card => {
      const matchFilter = activeFilter === 'all' || card.dataset.course === activeFilter;
      const matchSearch = !query ||
        card.dataset.name.includes(query) ||
        card.dataset.courseFull.includes(query) ||
        card.dataset.serial.includes(query);

      const show = matchFilter && matchSearch;
      card.style.display = show ? '' : 'none';
      if (show) visible++;
    });

    countLabel.innerHTML = `Showing <strong>${visible}</strong> graduate${visible !== 1 ? 's' : ''}`;

    noResults.classList.toggle('hidden', visible > 0);
    grid.style.display = visible > 0 ? '' : 'none';
  }

  // Search input
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    applyFilters();
  });

  // Filter pills
  filterPills.forEach(pill => {
    pill.addEventListener('click', () => {
      filterPills.forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      activeFilter = pill.dataset.filter;
      applyFilters();
    });
  });
}

/* ============================================================
   8. CONTACT FORM VALIDATION
============================================================ */
function initContactForm() {
  const form = document.getElementById('contactForm');
  if (!form) return;

  const fields = {
    firstName: { el: document.getElementById('firstName'), label: 'First name', minLen: 2 },
    lastName: { el: document.getElementById('lastName'), label: 'Last name', minLen: 2 },
    phone: { el: document.getElementById('phone'), label: 'Phone number', pattern: /^[0-9\s\+\-]{7,15}$/ },
    email: { el: document.getElementById('email'), label: 'Email', optional: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
    message: { el: document.getElementById('message'), label: 'Message', minLen: 10 },
  };

  function showError(field, msg) {
    const errEl = field.el.nextElementSibling;
    field.el.classList.add('invalid');
    if (errEl && errEl.classList.contains('field-error')) errEl.textContent = msg;
  }

  function clearError(field) {
    const errEl = field.el.nextElementSibling;
    field.el.classList.remove('invalid');
    if (errEl && errEl.classList.contains('field-error')) errEl.textContent = '';
  }

  function validateField(field) {
    const val = field.el.value.trim();
    if (!val && !field.optional) {
      showError(field, `${field.label} is required.`);
      return false;
    }
    if (val && field.pattern && !field.pattern.test(val)) {
      showError(field, `Please enter a valid ${field.label.toLowerCase()}.`);
      return false;
    }
    if (val && field.minLen && val.length < field.minLen) {
      showError(field, `${field.label} must be at least ${field.minLen} characters.`);
      return false;
    }
    clearError(field);
    return true;
  }

  Object.values(fields).forEach(f => {
    if (!f.el) return;
    f.el.addEventListener('blur', () => validateField(f));
    f.el.addEventListener('input', () => {
      if (f.el.classList.contains('invalid')) validateField(f);
    });
  });

  form.addEventListener('submit', (e) => {
    let valid = true;
    Object.values(fields).forEach(f => {
      if (!f.el) return;
      if (!validateField(f)) valid = false;
    });

    if (!valid) {
      e.preventDefault();
      const firstInvalid = form.querySelector('.invalid');
      if (firstInvalid) firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    if (window.location.hostname === '127.0.0.1' ||
      window.location.hostname === 'localhost' ||
      window.location.protocol === 'file:') {
      e.preventDefault();
      showFormSuccess(form);
    }
  });
}

function showFormSuccess(form) {
  const wrap = form.closest('.contact-form-wrap');
  const title = wrap.querySelector('h3');
  form.style.transition = 'opacity 0.3s';
  form.style.opacity = '0';
  title.style.transition = 'opacity 0.3s';
  title.style.opacity = '0';

  setTimeout(() => {
    form.style.display = 'none';
    title.style.display = 'none';

    const successEl = document.createElement('div');
    successEl.className = 'form-success';
    successEl.innerHTML = `
      <div class="form-success-icon" aria-hidden="true">✓</div>
      <h3 style="font-family:var(--font-display);font-size:var(--text-2xl);font-weight:700;color:var(--text-dark);margin-bottom:var(--space-3)">Message Sent!</h3>
      <p style="color:var(--text-muted);font-size:var(--text-base);line-height:1.7;max-width:340px;margin:0 auto">
        Thank you for reaching out! The team at Hanaqaad College will get back to you within 24 hours.
      </p>
    `;
    wrap.appendChild(successEl);
  }, 300);
}

/* ============================================================
   8.5. STUDENT ACADEMIC PORTAL & RECORD VERIFICATION
============================================================ */
function initStudentPortal() {
  const form = document.getElementById('studentPortalForm');
  const idInput = document.getElementById('portalStudentId');
  const pinInput = document.getElementById('portalPin');
  const noticeBox = document.getElementById('portalNotice');
  const resultArea = document.getElementById('portalResultArea');
  const searchPanel = document.getElementById('portalSearchPanel');

  if (!form || !idInput || !pinInput || !noticeBox || !resultArea) return;

  // Program name lookup
  const PROGRAM_LABELS = {
    cld: 'Computer Literacy Diploma (CLD)',
    ed: 'English Department (ED)',
    tc: 'Training Course (TC)',
    arabic: 'Arabic Language (Arabic)',
    maths: 'Mathematics (Maths)',
  };

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function showNotice(msg, type = 'info') {
    noticeBox.className = `portal-notice ${type}`;
    noticeBox.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        ${type === 'error' ? '<circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line>' :
          type === 'warning' ? '<path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line>' :
          '<circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line>'}
      </svg>
      <div>${msg}</div>
    `;
    noticeBox.style.display = 'flex';
  }

  function clearNotice() {
    noticeBox.style.display = 'none';
    noticeBox.innerHTML = '';
  }

  // ── Real-time Student Record Verification via Supabase ──
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    clearNotice();

    const queryId = idInput.value.trim().toUpperCase();
    const queryPin = pinInput.value.trim();

    if (!queryId) {
      showNotice('Please enter your Student ID (e.g. HC-500).', 'warning');
      idInput.focus();
      return;
    }

    if (!queryPin) {
      showNotice('Please enter your 4-digit Security PIN or last 4 digits of your phone number.', 'warning');
      pinInput.focus();
      return;
    }

    const submitBtn = document.getElementById('portalSubmitBtn');
    const originalBtnHtml = submitBtn ? submitBtn.innerHTML : '';
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 0 1 10 10"/></svg>
        Verifying Records…
      `;
    }

    const restoreBtn = () => {
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnHtml;
      }
    };

    try {
      // 1. Try Supabase secure RPC first
      const sb = (window.supabase && window.ENV_SUPABASE_URL && window.ENV_SUPABASE_ANON_KEY)
        ? window.supabase.createClient(window.ENV_SUPABASE_URL, window.ENV_SUPABASE_ANON_KEY)
        : null;

      if (sb) {
        const { data: rpcRes, error: rpcErr } = await sb.rpc('get_student_portal_record', {
          p_student_id: queryId,
          p_pin: queryPin
        });

        if (!rpcErr && rpcRes) {
          restoreBtn();
          if (rpcRes.success && rpcRes.student) {
            renderStudentPortalView(rpcRes.student, rpcRes.attendance, rpcRes.fees, rpcRes.exams);
            return;
          } else if (rpcRes.error === 'NOT_FOUND') {
            showNotice(`No student record found with ID "<strong>${escapeHtml(queryId)}</strong>". Please double check your Student ID format (e.g. HC-500) or contact campus administration.`, 'error');
            resultArea.style.display = 'none';
            return;
          } else if (rpcRes.error === 'INVALID_PIN') {
            showNotice(
              `<strong>Security Verification Failed.</strong> The PIN or phone digits you entered do not match Student ID <strong>${escapeHtml(queryId)}</strong>. For student privacy, confidential grades and fee details cannot be displayed without correct verification.`,
              'warning'
            );
            resultArea.style.display = 'none';
            return;
          }
        }
      }

      // 2. Client-side database cache fallback
      const students = JSON.parse(localStorage.getItem('hanaqaad_students') || '[]');
      const student = students.find(s =>
        (s.student_id && s.student_id.toUpperCase() === queryId) ||
        (s.id && s.id.toUpperCase() === queryId)
      );

      restoreBtn();

      if (!student) {
        showNotice(`No student record found with ID "<strong>${escapeHtml(queryId)}</strong>". Please double check your Student ID format (e.g. HC-500) or contact campus administration.`, 'error');
        resultArea.style.display = 'none';
        return;
      }

      // Verify PIN / Phone Last 4
      const storedPin = (student.security_pin || student.pin || '').toString().trim();
      const rawPhone = (student.phone || '').replace(/\D/g, '');
      const phoneLast4 = rawPhone.slice(-4);

      const isVerified = (storedPin && queryPin === storedPin) || (phoneLast4 && queryPin === phoneLast4);

      if (!isVerified) {
        showNotice(
          `<strong>Security Verification Failed.</strong> The PIN or phone digits you entered do not match Student ID <strong>${escapeHtml(student.student_id || queryId)}</strong>. For student privacy, confidential grades and fee details cannot be displayed without correct verification.`,
          'warning'
        );
        resultArea.style.display = 'none';
        return;
      }

      // Render verified record from local cache
      renderStudentPortalView(student);

    } catch (err) {
      console.error('Portal lookup error:', err);
      restoreBtn();
      showNotice('An error occurred while connecting to the verification service. Please check your internet connection.', 'error');
    }
  });

  function renderStudentPortalView(student, attendanceOverride = null, feesOverride = null, examsOverride = null) {
    const studentIdCode = student.student_id || student.id;
    const fullName = `${student.first_name || ''} ${student.last_name || ''}`.trim() || 'Enrolled Student';
    const programLabels = (student.program || '').split(',').map(p => {
      const k = p.trim().toLowerCase();
      return PROGRAM_LABELS[k] || (k ? k.toUpperCase() : '');
    }).filter(Boolean);
    const programName = programLabels.length > 0 ? programLabels.join(' & ') : 'Diploma Course';
    const initials = `${(student.first_name || 'H')[0]}${(student.last_name || 'C')[0]}`.toUpperCase();

    // Mask phone number for privacy e.g. "+252 63 •••• 56"
    let maskedPhone = 'Protected';
    if (student.phone) {
      const p = student.phone.trim();
      if (p.length > 6) {
        maskedPhone = p.slice(0, 8) + ' •••• ' + p.slice(-2);
      } else {
        maskedPhone = '•••• ' + p.slice(-2);
      }
    }

    // ── 1. Attendance Metrics ──
    let totalSessions = 0;
    let presentCount = 0;
    let absentCount = 0;

    if (attendanceOverride) {
      totalSessions = Number(attendanceOverride.total_sessions || 0);
      presentCount = Number(attendanceOverride.present_count || 0);
      absentCount = Number(attendanceOverride.absent_count || 0);
    } else {
      const attStore = JSON.parse(localStorage.getItem('hanaqaad_attendance') || '{}');
      Object.values(attStore).forEach(dateRecord => {
        if (dateRecord && (dateRecord[student.id] || dateRecord[student.student_id])) {
          totalSessions++;
          const status = dateRecord[student.id] || dateRecord[student.student_id];
          if (status === 'present') presentCount++;
          else if (status === 'absent') absentCount++;
        }
      });
    }

    const attRate = totalSessions > 0 ? Math.round((presentCount / totalSessions) * 100) : 100;
    const attFillClass = attRate >= 80 ? 'fill-success' : attRate >= 60 ? 'fill-warning' : 'fill-danger';
    const attStatusText = totalSessions === 0 ? 'Enrolled (No sessions yet)' :
      attRate >= 85 ? 'Excellent Attendance' :
      attRate >= 70 ? 'Regular Attendance' : 'Attendance Warning';

    // ── 2. Fee Accounting ──
    let totalFee = student.fee_amount !== undefined ? Number(student.fee_amount) : 120;
    let amountPaid = 0;
    let isFreeStudent = Boolean(student.is_free);
    let feeDesc = '';

    if (feesOverride) {
      totalFee = Number(feesOverride.total_fee || totalFee);
      amountPaid = Number(feesOverride.amount_paid || 0);
      if (feesOverride.is_free !== undefined) isFreeStudent = Boolean(feesOverride.is_free);
      if (feesOverride.notes) feeDesc = feesOverride.notes;
    } else {
      const fees = JSON.parse(localStorage.getItem('hanaqaad_fees') || '[]');
      const feeRecord = fees.find(f => f.student_id === student.id || f.student_id === student.student_id);
      if (feeRecord) {
        totalFee = Number(feeRecord.total_fee || totalFee);
        amountPaid = Number(feeRecord.amount_paid || 0);
      }
      isFreeStudent = student.is_free || (feeRecord && Number(feeRecord.total_fee) === 0);
    }

    let balance = Math.max(0, totalFee - amountPaid);

    let feeStatusBadge = '';
    if (isFreeStudent) {
      feeStatusBadge = '<span class="status-badge" style="background:#dbeafe;color:#1e40af;font-weight:700;padding:0.25rem 0.65rem;border-radius:9999px">Free / Scholarship</span>';
      if (!feeDesc) feeDesc = '100% Tuition Waiver Granted';
      balance = 0;
    } else if (balance === 0 && totalFee > 0) {
      feeStatusBadge = '<span class="status-badge" style="background:#dcfce7;color:#15803d;font-weight:700;padding:0.25rem 0.65rem;border-radius:9999px">Paid in Full</span>';
      if (!feeDesc) feeDesc = 'Zero balance outstanding';
    } else if (amountPaid > 0 && balance > 0) {
      feeStatusBadge = '<span class="status-badge" style="background:#fef3c7;color:#92400e;font-weight:700;padding:0.25rem 0.65rem;border-radius:9999px">Partially Paid</span>';
      if (!feeDesc) feeDesc = `$${balance} balance remaining`;
    } else {
      feeStatusBadge = '<span class="status-badge" style="background:#fee2e2;color:#991b1b;font-weight:700;padding:0.25rem 0.65rem;border-radius:9999px">Payment Pending</span>';
      if (!feeDesc) feeDesc = `$${totalFee} tuition due`;
    }

    // ── 3. Examination Results ──
    let studentExams = [];
    if (examsOverride && Array.isArray(examsOverride)) {
      studentExams = examsOverride;
    } else {
      const allExams = JSON.parse(localStorage.getItem('hanaqaad_exams') || '[]');
      studentExams = allExams.filter(e =>
        (e.student_id && e.student_id === student.id) ||
        (e.student_code && e.student_code.toUpperCase() === studentIdCode.toUpperCase())
      );
    }

    let averageMark = 0;
    if (studentExams.length > 0) {
      const sum = studentExams.reduce((acc, curr) => acc + Number(curr.marks || 0), 0);
      averageMark = Math.round(sum / studentExams.length);
    }

    // Render HTML inside resultArea
    resultArea.innerHTML = `
      <!-- Header Banner -->
      <div class="portal-student-header">
        <div class="portal-student-identity">
          <div class="portal-avatar" aria-hidden="true">${escapeHtml(initials)}</div>
          <div>
            <h3 class="portal-student-name">${escapeHtml(fullName)}</h3>
            <div class="portal-student-meta">
              <span class="portal-id-badge">${escapeHtml(studentIdCode)}</span>
              <span class="portal-program-tag">${escapeHtml(programName)}</span>
              <span style="font-size:var(--text-xs);opacity:0.85;margin-left:4px">📞 ${escapeHtml(maskedPhone)}</span>
            </div>
          </div>
        </div>
        <div class="portal-header-actions">
          <button type="button" class="btn btn-ghost btn-sm" id="portalPrintBtn" style="color:#ffffff;border-color:rgba(255,255,255,0.4)">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 6 2 18 2 18 9"></polyline>
              <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
              <rect x="6" y="14" width="12" height="8"></rect>
            </svg>
            Print
          </button>
        </div>
      </div>

      <!-- Quick Metrics Strip -->
      <div class="portal-stats-grid">
        <div class="portal-stat-box">
          <span class="portal-stat-label">Class Attendance</span>
          <span class="portal-stat-value">${attRate}%</span>
          <div class="portal-progress-bar">
            <div class="portal-progress-fill ${attFillClass}" style="width:${attRate}%"></div>
          </div>
          <span class="portal-stat-sub">${presentCount} present out of ${totalSessions} sessions (${attStatusText})</span>
        </div>

        <div class="portal-stat-box">
          <span class="portal-stat-label">Tuition Status</span>
          <div style="margin:4px 0">${feeStatusBadge}</div>
          <span class="portal-stat-value" style="font-size:var(--text-lg)">
            ${isFreeStudent ? '$0.00' : `$${amountPaid} <span style="font-size:var(--text-xs);font-weight:400;color:var(--text-muted)">of $${totalFee}</span>`}
          </span>
          <span class="portal-stat-sub">${escapeHtml(feeDesc)}</span>
        </div>

        <div class="portal-stat-box">
          <span class="portal-stat-label">Assessments</span>
          <span class="portal-stat-value">${studentExams.length}</span>
          <span class="portal-stat-sub">${studentExams.length > 0 ? `Avg: ${averageMark}/100` : 'No results yet'}</span>
        </div>
      </div>

      <!-- Main Body -->
      <div class="portal-body">
        <!-- Examination Results Section -->
        <div>
          <h4 class="portal-section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Examination &amp; Assessment Results
          </h4>

          ${studentExams.length === 0 ? `
            <div style="background:var(--gray-50);border:1px dashed var(--border);border-radius:var(--radius-md);padding:var(--space-5);text-align:center;color:var(--text-muted)">
              <p style="font-weight:600;margin-bottom:4px">No examination results posted yet</p>
              <p style="font-size:0.75rem">Evaluations and term marks will be published here as soon as course instructors complete assessments.</p>
            </div>
          ` : `
            <div class="portal-table-container">
              <table class="portal-table">
                <thead>
                  <tr>
                    <th>Examination</th>
                    <th>Subject / Unit</th>
                    <th>Score</th>
                    <th>Grade</th>
                    <th>Date</th>
                    <th>Teacher Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  ${studentExams.map(ex => {
                    const gradeLetter = (ex.grade || 'A').toUpperCase().charAt(0);
                    const gradeClass = ['A', 'B', 'C', 'D', 'F'].includes(gradeLetter) ? `grade-${gradeLetter}` : 'grade-A';
                    return `
                      <tr>
                        <td><strong>${escapeHtml(ex.exam_name || 'Assessment')}</strong></td>
                        <td>${escapeHtml(ex.subject || 'General Unit')}</td>
                        <td><strong style="color:var(--primary)">${Number(ex.marks || 0)}</strong> / ${Number(ex.total_marks || 100)}</td>
                        <td><span class="grade-badge ${gradeClass}">${escapeHtml(ex.grade || 'A')}</span></td>
                        <td><span style="font-size:var(--text-xs);color:var(--text-muted)">${escapeHtml(ex.exam_date || 'Recent')}</span></td>
                        <td><em style="color:var(--text-muted);font-size:var(--text-xs)">${escapeHtml(ex.notes || 'Satisfactory academic performance.')}</em></td>
                      </tr>
                    `;
                  }).join('')}
                </tbody>
              </table>
            </div>
          `}
        </div>

        <!-- Academic Information Summary -->
        <div style="display:grid;grid-template-columns:repeat(auto-fit, minmax(280px, 1fr));gap:var(--space-4)">
          <div style="background:var(--gray-50);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-4)">
            <h5 style="font-family:var(--font-display);font-size:var(--text-sm);font-weight:700;color:var(--text-dark);margin-bottom:var(--space-2)">
              Registration Details
            </h5>
            <ul style="list-style:none;padding:0;margin:0;font-size:var(--text-xs);display:flex;flex-direction:column;gap:var(--space-2);color:var(--text-body)">
              <li><strong>Student ID:</strong> ${escapeHtml(studentIdCode)}</li>
              <li><strong>Program:</strong> ${escapeHtml(programName)}</li>
              <li><strong>Status:</strong> <span style="color:var(--success);font-weight:600">Active / Enrolled</span></li>
              <li><strong>Registered On:</strong> ${student.created_at ? new Date(student.created_at).toLocaleDateString() : 'Active Term'}</li>
            </ul>
          </div>

          <div style="background:var(--gray-50);border:1px solid var(--border);border-radius:var(--radius-md);padding:var(--space-4)">
            <h5 style="font-family:var(--font-display);font-size:var(--text-sm);font-weight:700;color:var(--text-dark);margin-bottom:var(--space-2)">
              Tuition & Clearance Status
            </h5>
            <ul style="list-style:none;padding:0;margin:0;font-size:var(--text-xs);display:flex;flex-direction:column;gap:var(--space-2);color:var(--text-body)">
              <li><strong>Total Tuition:</strong> ${isFreeStudent ? '$0.00 (Free Waiver)' : `$${totalFee}.00`}</li>
              <li><strong>Amount Paid:</strong> $${amountPaid}.00</li>
              <li><strong>Outstanding Due:</strong> <strong style="color:${balance > 0 ? 'var(--error)' : 'var(--success)'}">$${balance}.00</strong></li>
              <li><strong>Payment Notes:</strong> ${escapeHtml(feeRecord && feeRecord.notes ? feeRecord.notes : isFreeStudent ? 'Granted free enrollment scholarship' : 'Standard institutional registration')}</li>
            </ul>
          </div>
        </div>
      </div>

      <!-- Footer Action -->
      <div class="portal-footer">
        <button type="button" class="btn btn-ghost btn-sm" id="portalResetBtn">
          ← Search Another Student
        </button>
        <span style="font-size:var(--text-xs);color:var(--text-muted)">
          Hanaqaad College Academic Registry &bull; Berbera, Somaliland
        </span>
      </div>
    `;

    resultArea.style.display = 'block';

    // Hook up reset button
    const resetBtn = document.getElementById('portalResetBtn');
    if (resetBtn) {
      resetBtn.addEventListener('click', () => {
        resultArea.style.display = 'none';
        idInput.value = '';
        pinInput.value = '';
        clearNotice();
        idInput.focus();
        searchPanel.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    // Hook up print button
    const printBtn = document.getElementById('portalPrintBtn');
    if (printBtn) {
      printBtn.addEventListener('click', () => {
        window.print();
      });
    }

    // Smooth scroll down to result card
    resultArea.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
}

/* ============================================================
   9. FOOTER YEAR
============================================================ */
function setFooterYear() {
  const el = document.getElementById('footerYear');
  if (el) el.textContent = new Date().getFullYear();
}

/* ============================================================
   10. SMOOTH ANCHOR SCROLL
============================================================ */
document.addEventListener('click', (e) => {
  const link = e.target.closest('a[href^="#"]');
  if (!link) return;
  const targetId = link.getAttribute('href').slice(1);
  const target = document.getElementById(targetId);
  if (!target) return;
  e.preventDefault();
  target.scrollIntoView({ behavior: 'smooth' });
}, false);
