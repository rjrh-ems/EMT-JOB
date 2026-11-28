(function () {
  'use strict';

  // =========================================================================
  // 1. SUPABASE CONFIGURATION & DEVICE STORAGE KEY
  // =========================================================================
  const SUPABASE_URL = 'https://jhezhynenhxgnramrhby.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_ztuD1ceo8ME7VSKcYSaYKg_X9A5lHpE';
  const DEVICE_AUTH_STORAGE_KEY = 'er_task_log_device_user_v1';

  let sb = null;
  try {
    if (window.supabase && typeof window.supabase.createClient === 'function') {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
  } catch (initErr) {
    console.error('Supabase initialization error:', initErr);
    sb = null;
  }

  // =========================================================================
  // 2. SHARED APPLICATION STATE
  // =========================================================================
  const state = {
    verifiedLoginCandidate: null,
    currentUser: null,
    currentMode: null, // 'staff' | 'admin' | 'super_admin'
    staffClockTimer: null,
    allStaffList: [],
    allStaffMap: {},
    pendingWorkLogData: null,
    lastAdminLogs: [],
    lastAdminMeta: null,
    pendingDeleteAction: null,
  };

  // =========================================================================
  // 3. SHARED DOM REFERENCES
  // =========================================================================
  const dom = {
    toastContainer: document.getElementById('toast-container'),
    globalLoader: document.getElementById('global-loader'),
    globalLoaderText: document.getElementById('global-loader-text'),

    // Login
    loginView: document.getElementById('login-view'),
    loginForm: document.getElementById('login-form'),
    accessCodeInput: document.getElementById('access-code-input'),
    loginVerifyBox: document.getElementById('login-verify-box'),
    loginSubmitBtn: document.getElementById('login-submit-btn'),

    // App Shell & Header
    appView: document.getElementById('app-view'),
    headerAvatar: document.getElementById('header-avatar'),
    headerUserName: document.getElementById('header-user-name'),
    headerRoleBadge: document.getElementById('header-role-badge'),
    logoutBtn: document.getElementById('logout-btn'),
    modeSwitcherBar: document.getElementById('mode-switcher-bar'),
    modeSwitcherButtons: document.getElementById('mode-switcher-buttons'),

    // Mode Containers
    modeStaffEl: document.getElementById('mode-staff'),
    modeAdminEl: document.getElementById('mode-admin'),
    modeSuperAdminEl: document.getElementById('mode-super-admin'),

    // Staff Mode Elements
    staffTabBtnForm: document.getElementById('staff-tab-btn-form'),
    staffTabBtnHistory: document.getElementById('staff-tab-btn-history'),
    staffPanelForm: document.getElementById('staff-panel-form'),
    staffPanelHistory: document.getElementById('staff-panel-history'),
    liveDateDisplay: document.getElementById('live-date-display'),
    liveTimeDisplay: document.getElementById('live-time-display'),
    workLogForm: document.getElementById('work-log-form'),
    hnInput: document.getElementById('hn-input'),
    hnError: document.getElementById('hn-error'),
    taskCheckboxesContainer: document.getElementById('task-checkboxes-container'),
    customTaskCheckbox: document.getElementById('custom-task-checkbox'),
    customTaskLabel: document.getElementById('custom-task-label'),
    customTaskInputWrap: document.getElementById('custom-task-input-wrap'),
    customTaskInput: document.getElementById('custom-task-input'),
    taskError: document.getElementById('task-error'),
    requesterSelect: document.getElementById('requester-select'),
    requesterRequiredStar: document.getElementById('requester-required-star'),
    requesterOptionalBadge: document.getElementById('requester-optional-badge'),
    requesterError: document.getElementById('requester-error'),
    submitWorkLogBtn: document.getElementById('submit-work-log-btn'),
    myHistoryDate: document.getElementById('my-history-date'),
    refreshMyHistoryBtn: document.getElementById('refresh-my-history-btn'),
    myHistoryCount: document.getElementById('my-history-count'),
    myHistoryList: document.getElementById('my-history-list'),

    // Duplicate Modal
    duplicateModal: document.getElementById('duplicate-modal'),
    duplicateModalBody: document.getElementById('duplicate-modal-body'),
    duplicateCancelBtn: document.getElementById('duplicate-cancel-btn'),
    duplicateConfirmBtn: document.getElementById('duplicate-confirm-btn'),

    // Admin Mode Elements
    adminFilterForm: document.getElementById('admin-filter-form'),
    adminFilterStartDate: document.getElementById('admin-filter-start-date'),
    adminFilterEndDate: document.getElementById('admin-filter-end-date'),
    adminFilterShift: document.getElementById('admin-filter-shift'),
    adminStaffMultiselectWrap: document.getElementById('admin-staff-multiselect-wrap'),
    adminStaffDropdownBtn: document.getElementById('admin-staff-dropdown-btn'),
    adminStaffDropdownLabel: document.getElementById('admin-staff-dropdown-label'),
    adminStaffDropdownMenu: document.getElementById('admin-staff-dropdown-menu'),
    adminStaffSelectAllBtn: document.getElementById('admin-staff-select-all-btn'),
    adminStaffClearSelBtn: document.getElementById('admin-staff-clear-sel-btn'),
    adminStaffCheckboxList: document.getElementById('admin-staff-checkbox-list'),
    adminClearBtn: document.getElementById('admin-clear-btn'),
    adminShiftHint: document.getElementById('admin-shift-hint'),
    adminAddWorklogBtn: document.getElementById('admin-add-worklog-btn'),
    adminEmptyState: document.getElementById('admin-empty-state'),
    adminResultsArea: document.getElementById('admin-results-area'),
    adminStatTotal: document.getElementById('admin-stat-total'),
    adminStatHn: document.getElementById('admin-stat-hn'),
    adminStatRange: document.getElementById('admin-stat-range'),
    adminStatStaff: document.getElementById('admin-stat-staff'),
    adminTableBadge: document.getElementById('admin-table-badge'),
    adminExportBtn: document.getElementById('admin-export-btn'),
    adminNoRows: document.getElementById('admin-no-rows'),
    adminTableWrap: document.getElementById('admin-table-wrap'),
    adminTableActionsTh: document.getElementById('admin-table-actions-th'),
    adminTableBody: document.getElementById('admin-table-body'),

    // Work Log Editor Modal
    worklogEditorModal: document.getElementById('worklog-editor-modal'),
    worklogModalTitle: document.getElementById('worklog-modal-title'),
    worklogModalSubtitle: document.getElementById('worklog-modal-subtitle'),
    worklogModalCloseX: document.getElementById('worklog-modal-close-x'),
    worklogModalCancelBtn: document.getElementById('worklog-modal-cancel-btn'),
    worklogEditorForm: document.getElementById('worklog-editor-form'),
    editWorklogId: document.getElementById('edit-worklog-id'),
    editWorklogDatetime: document.getElementById('edit-worklog-datetime'),
    editWorklogHn: document.getElementById('edit-worklog-hn'),
    editWorklogTasksContainer: document.getElementById('edit-worklog-tasks-container'),
    editWorklogRequester: document.getElementById('edit-worklog-requester'),
    editWorklogStaff: document.getElementById('edit-worklog-staff'),

    // Confirm Delete Modal
    confirmDeleteModal: document.getElementById('confirm-delete-modal'),
    confirmDeleteTitle: document.getElementById('confirm-delete-title'),
    confirmDeleteBody: document.getElementById('confirm-delete-body'),
    confirmDeleteCancelBtn: document.getElementById('confirm-delete-cancel-btn'),
    confirmDeleteOkBtn: document.getElementById('confirm-delete-ok-btn'),

    // Super Admin Elements
    saTabBtns: document.querySelectorAll('.sa-tab-btn'),
    saPanelStaff: document.getElementById('sa-panel-staff'),
    saPanelRequesters: document.getElementById('sa-panel-requesters'),
    saPanelTasks: document.getElementById('sa-panel-tasks'),
    saOpenAddStaffBtn: document.getElementById('sa-open-add-staff-btn'),
    saStaffTbody: document.getElementById('sa-staff-tbody'),
    saAddRequesterForm: document.getElementById('sa-add-requester-form'),
    saNewRequesterInput: document.getElementById('sa-new-requester-input'),
    saRequestersList: document.getElementById('sa-requesters-list'),
    saAddTaskForm: document.getElementById('sa-add-task-form'),
    saNewTaskInput: document.getElementById('sa-new-task-input'),
    saTasksList: document.getElementById('sa-tasks-list'),

    // Staff Editor Modal
    staffEditorModal: document.getElementById('staff-editor-modal'),
    staffModalTitle: document.getElementById('staff-modal-title'),
    staffModalCloseX: document.getElementById('staff-modal-close-x'),
    staffModalCancelBtn: document.getElementById('staff-modal-cancel-btn'),
    staffEditorForm: document.getElementById('staff-editor-form'),
    editStaffId: document.getElementById('edit-staff-id'),
    editStaffName: document.getElementById('edit-staff-name'),
    editStaffCode: document.getElementById('edit-staff-code'),
    generateCodeBtn: document.getElementById('generate-code-btn'),
    editStaffRole: document.getElementById('edit-staff-role'),
    selfRoleGuardNote: document.getElementById('self-role-guard-note'),
    editStaffOperator: document.getElementById('edit-staff-operator'),

    // Rename Master Modal
    renameTaskModal: document.getElementById('rename-task-modal'),
    renameModalTitle: document.getElementById('rename-modal-title'),
    renameModalLabel: document.getElementById('rename-modal-label'),
    renameTargetTable: document.getElementById('rename-target-table'),
    renameTaskForm: document.getElementById('rename-task-form'),
    renameTaskId: document.getElementById('rename-task-id'),
    renameTaskInput: document.getElementById('rename-task-input'),
    renameTaskCancelBtn: document.getElementById('rename-task-cancel-btn'),
  };

  // =========================================================================
  // 4. UTILITY HELPERS (TIMEZONE BANGKOK +07:00, TOAST, LOADER, CLIPBOARD)
  // =========================================================================
  function escapeHTML(str) {
    if (str === null || str === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(str);
    return div.innerHTML;
  }

  function formatRequesterDisplay(name) {
    if (!name || String(name).trim() === '' || String(name).trim() === '-') {
      return '-';
    }
    return `คุณ${String(name).trim()}`;
  }

  function showLoader(text = 'กำลังโหลดข้อมูล...') {
    dom.globalLoaderText.textContent = text;
    dom.globalLoader.classList.remove('hidden');
  }

  function hideLoader() {
    dom.globalLoader.classList.add('hidden');
  }

  function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    const styles = {
      success: 'bg-teal-700 text-white border-teal-600',
      error: 'bg-rose-600 text-white border-rose-500',
      info: 'bg-slate-800 text-white border-slate-700',
    };
    const iconSvg =
      type === 'success'
        ? `<svg class="w-5 h-5 shrink-0 text-teal-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
        : type === 'error'
        ? `<svg class="w-5 h-5 shrink-0 text-rose-200" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`
        : `<svg class="w-5 h-5 shrink-0 text-sky-300" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`;

    toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-2xl shadow-lg border text-sm font-medium animate-fade-in ${styles[type] || styles.info}`;
    toast.innerHTML = `${iconSvg}<span>${escapeHTML(message)}</span>`;
    dom.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-6px)';
      toast.style.transition = 'all 0.25s ease';
      setTimeout(() => toast.remove(), 250);
    }, 3200);
  }

  function copyTextToClipboard(text) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.top = '-9999px';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const ok = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (ok) {
        showToast(`คัดลอกรหัส ${text} เรียบร้อยแล้ว`, 'success');
      } else {
        showToast('ไม่สามารถคัดลอกรหัสได้ กรุณาคัดลอกด้วยตนเอง', 'error');
      }
    } catch (err) {
      showToast('ไม่สามารถคัดลอกรหัสได้', 'error');
    }
  }

  function getTodayBangkok() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  function toBangkokDatetimeLocalValue(isoStr) {
    const d = isoStr ? new Date(isoStr) : new Date();
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(d);
    const map = {};
    parts.forEach((p) => {
      map[p.type] = p.value;
    });
    return `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}`;
  }

  function addDaysToDateStr(dateStr, days) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + days));
    const yy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, '0');
    const dd = String(dt.getUTCDate()).padStart(2, '0');
    return `${yy}-${mm}-${dd}`;
  }

  function formatThaiDateShort(dateStr) {
    const [y, m, d] = dateStr.split('-').map(Number);
    return `${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${y + 543}`;
  }

  function formatBangkokTimeHHMM(isoStr) {
    return new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(isoStr));
  }

  function formatBangkokDateTime(isoStr) {
    const d = new Date(isoStr);
    const datePart = new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
    const timePart = formatBangkokTimeHHMM(isoStr);
    return `${datePart} ${timePart}`;
  }

  function getShiftRangeIso(startDateStr, endDateStr, shiftKey) {
    const isSameDay = startDateStr === endDateStr;
    const dateDisplay = isSameDay
      ? formatThaiDateShort(startDateStr)
      : `${formatThaiDateShort(startDateStr)} - ${formatThaiDateShort(endDateStr)}`;
    const nextEndDayStr = addDaysToDateStr(endDateStr, 1);

    if (shiftKey === 'morning') {
      return {
        startIso: `${startDateStr}T07:00:00+07:00`,
        endIso: `${endDateStr}T14:59:59+07:00`,
        label: `เวรเช้า (${dateDisplay} • 07:00 - 15:00 น.)`,
      };
    }
    if (shiftKey === 'afternoon') {
      return {
        startIso: `${startDateStr}T15:00:00+07:00`,
        endIso: `${endDateStr}T22:59:59+07:00`,
        label: `เวรบ่าย (${dateDisplay} • 15:00 - 23:00 น.)`,
      };
    }
    if (shiftKey === 'night') {
      return {
        startIso: `${startDateStr}T23:00:00+07:00`,
        endIso: `${nextEndDayStr}T06:59:59+07:00`,
        label: `เวรดึก (${formatThaiDateShort(startDateStr)} 23:00 - ${formatThaiDateShort(nextEndDayStr)} 07:00 น.)`,
      };
    }
    return {
      startIso: `${startDateStr}T00:00:00+07:00`,
      endIso: `${endDateStr}T23:59:59+07:00`,
      label: `ทั้งหมด (${dateDisplay} • 00:00 - 23:59 น.)`,
    };
  }

  function isTimestampInShift(isoStr, shiftKey) {
    if (shiftKey === 'all') return true;
    const hourStr = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      hour12: false,
    }).format(new Date(isoStr));
    const hour = Number(hourStr);

    if (shiftKey === 'morning') return hour >= 7 && hour < 15;
    if (shiftKey === 'afternoon') return hour >= 15 && hour < 23;
    if (shiftKey === 'night') return hour >= 23 || hour < 7;
    return true;
  }

  function getRoleBadgeMeta(role) {
    if (role === 'super_admin') {
      return { label: 'Super Admin', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
    }
    if (role === 'admin') {
      return { label: 'Admin', cls: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
    return { label: 'Staff', cls: 'bg-teal-50 text-teal-700 border-teal-200' };
  }

  function generateRandomAccessCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  function getStaffName(id) {
    return state.allStaffMap[id]?.full_name || 'ไม่ทราบชื่อ';
  }

  function isSuperAdmin() {
    return state.currentUser && state.currentUser.role === 'super_admin';
  }

  function openConfirmDeleteModal({ title, bodyHtml, onConfirm }) {
    dom.confirmDeleteTitle.textContent = title || 'ยืนยันการลบข้อมูล';
    dom.confirmDeleteBody.innerHTML = bodyHtml;
    state.pendingDeleteAction = onConfirm;
    dom.confirmDeleteModal.classList.remove('hidden');
  }

  // =========================================================================
  // 5. SHARED MASTER DATA FETCHER
  // =========================================================================
  async function refreshAllStaffCache() {
    if (!sb) return;
    try {
      const { data, error } = await sb
        .from('staff')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      state.allStaffList = data || [];
      state.allStaffMap = {};
      state.allStaffList.forEach((s) => {
        state.allStaffMap[s.id] = s;
      });
      if (window.ERApp && typeof window.ERApp.populateAdminStaffFilter === 'function') {
        window.ERApp.populateAdminStaffFilter();
      }
    } catch (err) {
      console.error('Error fetching staff cache:', err);
    }
  }

  window.ERApp = window.ERApp || {};
  Object.assign(window.ERApp, {
    SUPABASE_URL,
    SUPABASE_ANON_KEY,
    DEVICE_AUTH_STORAGE_KEY,
    get sb() {
      return sb;
    },
    state,
    dom,
    escapeHTML,
    formatRequesterDisplay,
    showLoader,
    hideLoader,
    showToast,
    copyTextToClipboard,
    getTodayBangkok,
    toBangkokDatetimeLocalValue,
    addDaysToDateStr,
    formatThaiDateShort,
    formatBangkokTimeHHMM,
    formatBangkokDateTime,
    getShiftRangeIso,
    isTimestampInShift,
    getRoleBadgeMeta,
    generateRandomAccessCode,
    getStaffName,
    isSuperAdmin,
    openConfirmDeleteModal,
    refreshAllStaffCache,
  });
})();
