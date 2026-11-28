(function () {
  'use strict';

  const app = window.ERApp;
  const {
    DEVICE_AUTH_STORAGE_KEY,
    state,
    dom,
    escapeHTML,
    showLoader,
    hideLoader,
    showToast,
    getTodayBangkok,
    getRoleBadgeMeta,
    generateRandomAccessCode,
    isSuperAdmin,
    refreshAllStaffCache,
    startStaffClock,
    stopStaffClock,
    switchStaffSubTab,
    loadStaffFormMasterData,
    updateCustomTaskUI,
    hideFieldError,
    resetWorkLogForm,
    handleWorkLogSubmit,
    commitWorkLogToSupabase,
    loadMyHistory,
    updateAdminStaffDropdownLabel,
    updateAdminShiftHint,
    resetAdminDashboard,
    handleAdminSearch,
    openWorkLogEditorModal,
    handleSaveWorkLogEditor,
    exportAdminExcel,
    loadSuperAdminTab,
    openStaffEditorModal,
    closeStaffEditorModal,
    handleSaveStaff,
    handleAddRequester,
    handleAddTask,
    handleRenameMaster,
  } = app;

  let verifyRequestToken = 0;

  function saveDeviceUser(user) {
    try {
      localStorage.setItem(DEVICE_AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      // ignore storage restriction
    }
  }

  function clearDeviceUser() {
    try {
      localStorage.removeItem(DEVICE_AUTH_STORAGE_KEY);
    } catch (e) {
      // ignore
    }
  }

  function showSupabaseUnavailableError() {
    dom.loginVerifyBox.innerHTML = `
      <div class="w-full px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center space-y-1 animate-fade-in">
        <div class="font-semibold">ไม่สามารถโหลดระบบเชื่อมต่อฐานข้อมูล (Supabase SDK) ได้</div>
        <div class="text-[11px] text-rose-500">กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต หรือรีเฟรชหน้าเว็บใหม่อีกครั้ง</div>
      </div>
    `;
  }

  async function handleAccessCodeInput() {
    const rawValue = dom.accessCodeInput.value;
    const hasThaiChars = /[ก-๛]/.test(rawValue);
    const cleaned = rawValue.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    dom.accessCodeInput.value = cleaned;

    state.verifiedLoginCandidate = null;
    dom.loginSubmitBtn.disabled = true;

    if (!app.sb) {
      showSupabaseUnavailableError();
      return;
    }

    if (hasThaiChars && cleaned.length < 6) {
      dom.loginVerifyBox.innerHTML = `
        <div class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-medium animate-fade-in">
          <svg class="w-5 h-5 shrink-0 text-amber-600" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>กรุณาเปลี่ยนภาษาแป้นพิมพ์เป็นภาษาอังกฤษ (EN) เพื่อกรอกรหัส 6 หลัก</span>
        </div>
      `;
      return;
    }

    if (cleaned.length < 6) {
      dom.loginVerifyBox.innerHTML = `<p class="text-xs text-slate-400 text-center">พิมพ์รหัสให้ครบ 6 หลักเพื่อตรวจสอบชื่อผู้ใช้งาน (${cleaned.length}/6)</p>`;
      return;
    }

    const currentToken = ++verifyRequestToken;
    dom.loginVerifyBox.innerHTML = `
      <div class="flex items-center gap-2 text-xs text-teal-700 font-medium">
        <svg class="animate-spin h-4 w-4 text-teal-600" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
        </svg>
        กำลังตรวจสอบรหัสกับฐานข้อมูล...
      </div>
    `;

    try {
      const { data, error } = await app.sb
        .from('staff')
        .select('*')
        .eq('access_code', cleaned)
        .maybeSingle();

      if (currentToken !== verifyRequestToken) return;
      if (error) throw error;

      if (!data) {
        dom.loginVerifyBox.innerHTML = `
          <div class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs sm:text-sm font-medium animate-fade-in">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>ไม่พบรหัส ${escapeHTML(cleaned)} ในระบบ</span>
          </div>
        `;
        return;
      }

      if (!data.is_active) {
        dom.loginVerifyBox.innerHTML = `
          <div class="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs sm:text-sm font-medium animate-fade-in">
            <svg class="w-5 h-5 shrink-0" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            <span>บัญชีคุณ${escapeHTML(data.full_name)} ถูกระงับการใช้งาน</span>
          </div>
        `;
        return;
      }

      state.verifiedLoginCandidate = data;
      dom.loginSubmitBtn.disabled = false;
      const badge = getRoleBadgeMeta(data.role);

      dom.loginVerifyBox.innerHTML = `
        <div class="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-2xl bg-teal-50 border border-teal-200 animate-fade-in">
          <div class="w-10 h-10 rounded-full bg-gradient-to-br from-teal-600 to-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
            ${escapeHTML(data.full_name.charAt(0))}
          </div>
          <div class="text-left">
            <div class="flex items-center gap-2">
              <span class="text-sm font-bold text-slate-800">คุณ${escapeHTML(data.full_name)}</span>
              <span class="px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}">${badge.label}</span>
            </div>
            <div class="text-[11px] text-teal-700 mt-0.5">ยืนยันตัวตนสำเร็จ ระบบจะจดจำอุปกรณ์นี้ไว้ให้อัตโนมัติ</div>
          </div>
        </div>
      `;
    } catch (err) {
      if (currentToken !== verifyRequestToken) return;
      console.error('Login verification error:', err);
      dom.loginVerifyBox.innerHTML = `
        <div class="w-full px-4 py-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs text-center space-y-1 animate-fade-in">
          <div class="font-semibold">เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล กรุณาลองใหม่อีกครั้ง</div>
          <div class="text-[11px] text-rose-500 font-mono break-all">${escapeHTML(err?.message || String(err))}</div>
        </div>
      `;
    }
  }

  async function completeLogin(user, showWelcome = true) {
    state.currentUser = user;
    saveDeviceUser(user);

    const badge = getRoleBadgeMeta(user.role);
    dom.headerAvatar.textContent = user.full_name.charAt(0);
    dom.headerUserName.textContent = `คุณ${user.full_name}`;
    dom.headerRoleBadge.textContent = badge.label;
    dom.headerRoleBadge.className = `px-2 py-0.5 rounded-full text-[10px] font-semibold border ${badge.cls}`;

    buildModeSwitcher();

    showLoader('กำลังเตรียมข้อมูลระบบ...');
    await refreshAllStaffCache();
    hideLoader();

    dom.loginView.classList.add('hidden');
    dom.appView.classList.remove('hidden');

    if (user.role === 'super_admin') {
      await switchMode('super_admin');
    } else if (user.role === 'admin') {
      await switchMode('admin');
    } else {
      await switchMode('staff');
    }

    if (showWelcome) {
      showToast(`ยินดีต้อนรับ คุณ${user.full_name}`, 'success');
    }
  }

  function logout() {
    state.currentUser = null;
    state.currentMode = null;
    state.verifiedLoginCandidate = null;
    stopStaffClock();
    clearDeviceUser();

    dom.accessCodeInput.value = '';
    handleAccessCodeInput();
    dom.appView.classList.add('hidden');
    dom.loginView.classList.remove('hidden');
    dom.accessCodeInput.focus();
    showToast('ออกจากระบบเรียบร้อยแล้ว', 'info');
  }

  async function tryRestoreDeviceSession() {
    if (!app.sb) return false;
    try {
      const raw = localStorage.getItem(DEVICE_AUTH_STORAGE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!saved || !saved.id) return false;

      showLoader('กำลังเข้าสู่ระบบอัตโนมัติ...');
      const { data, error } = await app.sb
        .from('staff')
        .select('*')
        .eq('id', saved.id)
        .eq('is_active', true)
        .maybeSingle();
      hideLoader();

      if (error || !data) {
        clearDeviceUser();
        return false;
      }
      await completeLogin(data, false);
      return true;
    } catch (err) {
      hideLoader();
      return false;
    }
  }

  function buildModeSwitcher() {
    const modes = [];
    if (state.currentUser.role === 'super_admin') {
      modes.push({ key: 'staff', label: 'บันทึกงาน', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' });
      modes.push({ key: 'admin', label: 'Admin Dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' });
      modes.push({ key: 'super_admin', label: 'จัดการระบบ', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' });
    } else if (state.currentUser.role === 'admin' && state.currentUser.is_operator) {
      modes.push({ key: 'staff', label: 'บันทึกงาน', icon: 'M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z' });
      modes.push({ key: 'admin', label: 'Admin Dashboard', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' });
    }

    if (modes.length <= 1) {
      dom.modeSwitcherBar.classList.add('hidden');
      dom.modeSwitcherButtons.innerHTML = '';
      return;
    }

    dom.modeSwitcherBar.classList.remove('hidden');
    dom.modeSwitcherButtons.innerHTML = modes
      .map(
        (m) => `
        <button
          type="button"
          data-mode="${m.key}"
          class="mode-switch-btn shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" d="${m.icon}" />
          </svg>
          ${m.label}
        </button>
      `
      )
      .join('');

    dom.modeSwitcherButtons.querySelectorAll('.mode-switch-btn').forEach((btn) => {
      btn.addEventListener('click', () => switchMode(btn.dataset.mode));
    });
  }

  async function switchMode(mode) {
    state.currentMode = mode;

    dom.modeSwitcherButtons.querySelectorAll('.mode-switch-btn').forEach((btn) => {
      if (btn.dataset.mode === mode) {
        btn.className = 'mode-switch-btn shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all bg-teal-600 text-white shadow-sm';
      } else {
        btn.className = 'mode-switch-btn shrink-0 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all bg-slate-100 text-slate-600 hover:bg-slate-200';
      }
    });

    dom.modeStaffEl.classList.add('hidden');
    dom.modeAdminEl.classList.add('hidden');
    dom.modeSuperAdminEl.classList.add('hidden');
    stopStaffClock();

    if (mode === 'staff') {
      dom.modeStaffEl.classList.remove('hidden');
      startStaffClock();
      dom.myHistoryDate.value = getTodayBangkok();
      await loadStaffFormMasterData();
      resetWorkLogForm();
      switchStaffSubTab('form');
    } else if (mode === 'admin') {
      dom.modeAdminEl.classList.remove('hidden');
      dom.adminAddWorklogBtn.classList.toggle('hidden', !isSuperAdmin());
      await refreshAllStaffCache();
      resetAdminDashboard(false);
    } else if (mode === 'super_admin') {
      dom.modeSuperAdminEl.classList.remove('hidden');
      await loadSuperAdminTab('staff');
    }
  }

  function bindEvents() {
    // Login
    dom.accessCodeInput.addEventListener('input', handleAccessCodeInput);
    dom.loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (state.verifiedLoginCandidate) {
        await completeLogin(state.verifiedLoginCandidate, true);
      }
    });
    dom.logoutBtn.addEventListener('click', logout);

    // Staff Sub-tabs & Form
    dom.staffTabBtnForm.addEventListener('click', () => switchStaffSubTab('form'));
    dom.staffTabBtnHistory.addEventListener('click', () => switchStaffSubTab('history'));
    dom.hnInput.addEventListener('input', () => hideFieldError(dom.hnError));
    dom.requesterSelect.addEventListener('change', () => hideFieldError(dom.requesterError));

    dom.customTaskCheckbox.addEventListener('change', () => {
      updateCustomTaskUI();
      hideFieldError(dom.taskError);
    });
    dom.customTaskInput.addEventListener('input', () => hideFieldError(dom.taskError));

    dom.workLogForm.addEventListener('submit', handleWorkLogSubmit);
    dom.myHistoryDate.addEventListener('change', loadMyHistory);
    dom.refreshMyHistoryBtn.addEventListener('click', loadMyHistory);

    // Duplicate Modal
    dom.duplicateCancelBtn.addEventListener('click', () => {
      dom.duplicateModal.classList.add('hidden');
      state.pendingWorkLogData = null;
    });
    dom.duplicateConfirmBtn.addEventListener('click', () => {
      if (state.pendingWorkLogData) {
        commitWorkLogToSupabase(state.pendingWorkLogData);
      }
    });

    // Admin Dashboard
    dom.adminFilterStartDate.addEventListener('change', () => {
      if (dom.adminFilterEndDate.value && dom.adminFilterStartDate.value > dom.adminFilterEndDate.value) {
        dom.adminFilterEndDate.value = dom.adminFilterStartDate.value;
      }
      updateAdminShiftHint();
    });
    dom.adminFilterEndDate.addEventListener('change', () => {
      if (dom.adminFilterStartDate.value && dom.adminFilterEndDate.value < dom.adminFilterStartDate.value) {
        dom.adminFilterStartDate.value = dom.adminFilterEndDate.value;
      }
      updateAdminShiftHint();
    });
    dom.adminFilterShift.addEventListener('change', updateAdminShiftHint);

    // Multi-select Staff Dropdown Toggle & Outside Click
    dom.adminStaffDropdownBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      dom.adminStaffDropdownMenu.classList.toggle('hidden');
    });
    dom.adminStaffSelectAllBtn.addEventListener('click', () => {
      dom.adminStaffCheckboxList.querySelectorAll('input[name="admin_staff_opt"]').forEach((cb) => {
        cb.checked = true;
      });
      updateAdminStaffDropdownLabel();
    });
    dom.adminStaffClearSelBtn.addEventListener('click', () => {
      dom.adminStaffCheckboxList.querySelectorAll('input[name="admin_staff_opt"]').forEach((cb) => {
        cb.checked = false;
      });
      updateAdminStaffDropdownLabel();
    });
    document.addEventListener('click', (e) => {
      if (!dom.adminStaffMultiselectWrap.contains(e.target)) {
        dom.adminStaffDropdownMenu.classList.add('hidden');
      }
    });

    dom.adminFilterForm.addEventListener('submit', handleAdminSearch);
    dom.adminClearBtn.addEventListener('click', () => resetAdminDashboard(true));
    dom.adminExportBtn.addEventListener('click', exportAdminExcel);

    // Work Log Add/Edit Modal (Super Admin)
    dom.adminAddWorklogBtn.addEventListener('click', () => openWorkLogEditorModal(null));
    dom.worklogModalCloseX.addEventListener('click', () => dom.worklogEditorModal.classList.add('hidden'));
    dom.worklogModalCancelBtn.addEventListener('click', () => dom.worklogEditorModal.classList.add('hidden'));
    dom.worklogEditorForm.addEventListener('submit', handleSaveWorkLogEditor);

    // Generic Confirm Delete Modal
    dom.confirmDeleteCancelBtn.addEventListener('click', () => {
      dom.confirmDeleteModal.classList.add('hidden');
      state.pendingDeleteAction = null;
    });
    dom.confirmDeleteOkBtn.addEventListener('click', async () => {
      dom.confirmDeleteModal.classList.add('hidden');
      if (typeof state.pendingDeleteAction === 'function') {
        const fn = state.pendingDeleteAction;
        state.pendingDeleteAction = null;
        await fn();
      }
    });

    // Super Admin Tabs & Forms
    dom.saTabBtns.forEach((btn) => {
      btn.addEventListener('click', () => loadSuperAdminTab(btn.dataset.saTab));
    });
    dom.saOpenAddStaffBtn.addEventListener('click', () => openStaffEditorModal(null));
    dom.staffModalCloseX.addEventListener('click', closeStaffEditorModal);
    dom.staffModalCancelBtn.addEventListener('click', closeStaffEditorModal);
    dom.editStaffCode.addEventListener('input', () => {
      dom.editStaffCode.value = dom.editStaffCode.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
    });
    dom.generateCodeBtn.addEventListener('click', () => {
      dom.editStaffCode.value = generateRandomAccessCode();
    });
    dom.staffEditorForm.addEventListener('submit', handleSaveStaff);

    dom.saAddRequesterForm.addEventListener('submit', handleAddRequester);
    dom.saAddTaskForm.addEventListener('submit', handleAddTask);
    dom.renameTaskCancelBtn.addEventListener('click', () => dom.renameTaskModal.classList.add('hidden'));
    dom.renameTaskForm.addEventListener('submit', handleRenameMaster);
  }

  window.addEventListener('DOMContentLoaded', async () => {
    bindEvents();
    if (!app.sb) {
      showSupabaseUnavailableError();
      return;
    }
    const restored = await tryRestoreDeviceSession();
    if (!restored) {
      dom.accessCodeInput.focus();
    }
  });
})();
