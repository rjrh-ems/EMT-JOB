(function () {
  'use strict';

  const app = window.ERApp;
  const {
    state,
    dom,
    escapeHTML,
    formatRequesterDisplay,
    showLoader,
    hideLoader,
    showToast,
    getTodayBangkok,
    formatThaiDateShort,
    formatBangkokTimeHHMM,
    getStaffName,
    refreshAllStaffCache,
  } = app;

  function updateStaffClock() {
    const now = new Date();
    dom.liveDateDisplay.textContent = new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(now);
    dom.liveTimeDisplay.textContent = new Intl.DateTimeFormat('th-TH', {
      timeZone: 'Asia/Bangkok',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);
  }

  function startStaffClock() {
    updateStaffClock();
    stopStaffClock();
    state.staffClockTimer = setInterval(updateStaffClock, 1000);
  }

  function stopStaffClock() {
    if (state.staffClockTimer) {
      clearInterval(state.staffClockTimer);
      state.staffClockTimer = null;
    }
  }

  function switchStaffSubTab(tab) {
    if (tab === 'form') {
      dom.staffPanelForm.classList.remove('hidden');
      dom.staffPanelHistory.classList.add('hidden');
      dom.staffTabBtnForm.className = 'py-2.5 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-white text-teal-700 shadow-sm';
      dom.staffTabBtnHistory.className = 'py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800';
    } else {
      dom.staffPanelForm.classList.add('hidden');
      dom.staffPanelHistory.classList.remove('hidden');
      dom.staffTabBtnHistory.className = 'py-2.5 px-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 bg-white text-teal-700 shadow-sm';
      dom.staffTabBtnForm.className = 'py-2.5 px-3 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 text-slate-600 hover:text-slate-800';
      loadMyHistory();
    }
  }

  function isErReceiveTaskSelected() {
    const checkedValues = Array.from(
      dom.taskCheckboxesContainer.querySelectorAll('input[name="task_item"]:checked')
    ).map((cb) => cb.value.trim());
    return checkedValues.includes('รับผู้ป่วยหน้า ER');
  }

  function updateRequesterOptionalState() {
    const isOptional = isErReceiveTaskSelected();
    dom.requesterRequiredStar.classList.toggle('hidden', isOptional);
    dom.requesterOptionalBadge.classList.toggle('hidden', !isOptional);

    const defaultOpt = dom.requesterSelect.querySelector('option[value=""]');
    if (defaultOpt) {
      defaultOpt.textContent = isOptional
        ? '-- ไม่ระบุผู้แจ้ง (รับผู้ป่วยหน้า ER) --'
        : '-- กรุณาเลือกชื่อผู้แจ้งให้ทำ --';
    }

    if (isOptional) {
      hideFieldError(dom.requesterError);
    }
  }

  async function loadStaffFormMasterData() {
    try {
      const [tasksRes, reqRes] = await Promise.all([
        app.sb.from('task_types').select('*').eq('is_active', true).order('id', { ascending: true }),
        app.sb.from('requesters').select('*').eq('is_active', true).order('name', { ascending: true }),
      ]);

      if (tasksRes.error) throw tasksRes.error;
      if (reqRes.error) throw reqRes.error;

      renderTaskCheckboxes(tasksRes.data || []);
      renderRequesterSelect(reqRes.data || []);
      updateRequesterOptionalState();
    } catch (err) {
      console.error('Load form master data error:', err);
      showToast('ไม่สามารถโหลดข้อมูลตัวเลือกได้ กรุณาลองใหม่', 'error');
    }
  }

  function renderTaskCheckboxes(tasks) {
    if (tasks.length === 0) {
      dom.taskCheckboxesContainer.innerHTML = `<p class="col-span-full text-xs text-slate-400">ยังไม่มีรายการงานในระบบ</p>`;
      return;
    }
    dom.taskCheckboxesContainer.innerHTML = tasks
      .map(
        (t) => `
        <label
          for="task-id-${t.id}"
          class="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-white cursor-pointer hover:border-teal-400 transition-all select-none"
        >
          <input
            type="checkbox"
            id="task-id-${t.id}"
            name="task_item"
            value="${escapeHTML(t.task_name)}"
            class="w-5 h-5 rounded-md border-slate-300 text-teal-600 focus:ring-teal-500 cursor-pointer shrink-0"
          />
          <span class="text-sm font-medium text-slate-700 leading-snug">${escapeHTML(t.task_name)}</span>
        </label>
      `
      )
      .join('');

    dom.taskCheckboxesContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.addEventListener('change', () => {
        const label = cb.closest('label');
        if (cb.checked) {
          label.classList.add('border-teal-500', 'bg-teal-50/60', 'ring-1', 'ring-teal-500/30');
          label.classList.remove('border-slate-200', 'bg-white');
        } else {
          label.classList.remove('border-teal-500', 'bg-teal-50/60', 'ring-1', 'ring-teal-500/30');
          label.classList.add('border-slate-200', 'bg-white');
        }
        hideFieldError(dom.taskError);
        updateRequesterOptionalState();
      });
    });
  }

  function renderRequesterSelect(requesters) {
    const currentVal = dom.requesterSelect.value;
    dom.requesterSelect.innerHTML =
      `<option value="">-- กรุณาเลือกชื่อผู้แจ้งให้ทำ --</option>` +
      requesters.map((r) => `<option value="${escapeHTML(r.name)}">${escapeHTML(r.name)}</option>`).join('');
    if (currentVal) dom.requesterSelect.value = currentVal;
    updateRequesterOptionalState();
  }

  function updateCustomTaskUI() {
    if (dom.customTaskCheckbox.checked) {
      dom.customTaskLabel.classList.add('border-teal-500', 'bg-teal-50/60');
      dom.customTaskLabel.classList.remove('border-slate-200', 'bg-slate-50/60');
      dom.customTaskInputWrap.classList.remove('hidden');
      dom.customTaskInput.focus();
    } else {
      dom.customTaskLabel.classList.remove('border-teal-500', 'bg-teal-50/60');
      dom.customTaskLabel.classList.add('border-slate-200', 'bg-slate-50/60');
      dom.customTaskInputWrap.classList.add('hidden');
      dom.customTaskInput.value = '';
    }
  }

  function showFieldError(el, msg) {
    el.textContent = msg;
    el.classList.remove('hidden');
  }

  function hideFieldError(el) {
    el.textContent = '';
    el.classList.add('hidden');
  }

  function resetWorkLogForm() {
    dom.workLogForm.reset();
    hideFieldError(dom.hnError);
    hideFieldError(dom.taskError);
    hideFieldError(dom.requesterError);

    dom.taskCheckboxesContainer.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
      cb.checked = false;
      const label = cb.closest('label');
      label.classList.remove('border-teal-500', 'bg-teal-50/60', 'ring-1', 'ring-teal-500/30');
      label.classList.add('border-slate-200', 'bg-white');
    });

    dom.customTaskCheckbox.checked = false;
    updateCustomTaskUI();
    updateRequesterOptionalState();
  }

  async function handleWorkLogSubmit(e) {
    e.preventDefault();
    if (!state.currentUser) return;

    let isValid = true;
    let firstErrEl = null;

    const hnVal = dom.hnInput.value.trim();
    if (!hnVal) {
      showFieldError(dom.hnError, 'กรุณากรอกเลข HN ผู้ป่วย');
      isValid = false;
      firstErrEl = firstErrEl || dom.hnInput;
    } else {
      hideFieldError(dom.hnError);
    }

    const selectedTasks = Array.from(
      dom.taskCheckboxesContainer.querySelectorAll('input[name="task_item"]:checked')
    ).map((cb) => cb.value);

    let customTaskName = '';
    if (dom.customTaskCheckbox.checked) {
      customTaskName = dom.customTaskInput.value.trim();
      if (!customTaskName) {
        showFieldError(dom.taskError, 'กรุณาพิมพ์ชื่องานในช่อง "ระบุเอง"');
        isValid = false;
        firstErrEl = firstErrEl || dom.customTaskInput;
      } else {
        const exists = selectedTasks.some((t) => t.toLowerCase() === customTaskName.toLowerCase());
        if (!exists) selectedTasks.push(customTaskName);
      }
    }

    if (selectedTasks.length === 0 && !dom.customTaskCheckbox.checked) {
      showFieldError(dom.taskError, 'กรุณาเลือกงานที่ทำอย่างน้อย 1 รายการ');
      isValid = false;
      firstErrEl = firstErrEl || dom.taskCheckboxesContainer;
    } else if (!(dom.customTaskCheckbox.checked && !customTaskName)) {
      hideFieldError(dom.taskError);
    }

    const isRequesterOptional = isErReceiveTaskSelected();
    const requesterVal = dom.requesterSelect.value;
    if (!requesterVal && !isRequesterOptional) {
      showFieldError(dom.requesterError, 'กรุณาเลือกชื่อผู้แจ้งให้ทำ');
      isValid = false;
      firstErrEl = firstErrEl || dom.requesterSelect;
    } else {
      hideFieldError(dom.requesterError);
    }

    if (!isValid) {
      showToast('กรุณากรอกข้อมูลที่จำเป็นให้ครบถ้วน', 'error');
      if (firstErrEl && typeof firstErrEl.scrollIntoView === 'function') {
        firstErrEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      return;
    }

    const payload = {
      hn: hnVal,
      tasks: selectedTasks,
      customTaskName,
      requester_name: requesterVal || '-',
      primary_staff_id: state.currentUser.id,
      co_staff_ids: [],
    };

    dom.submitWorkLogBtn.disabled = true;
    showLoader('กำลังตรวจสอบข้อมูลซ้ำซ้อน...');
    try {
      const { data: dupRows, error: dupErr } = await app.sb.rpc('check_duplicate_task', {
        p_hn: payload.hn,
        p_tasks: payload.tasks,
      });

      if (dupErr) throw dupErr;

      if (Array.isArray(dupRows) && dupRows.length > 0) {
        hideLoader();
        dom.submitWorkLogBtn.disabled = false;
        state.pendingWorkLogData = payload;
        const match = dupRows[0];
        const matchedText = (match.matched_tasks || []).join(', ');
        const loggedTime = formatBangkokTimeHHMM(match.logged_at);

        dom.duplicateModalBody.innerHTML = `
          ผู้ป่วย HN <span class="font-bold text-slate-900">${escapeHTML(payload.hn)}</span>
          มีคุณ <span class="font-bold text-teal-700">${escapeHTML(match.staff_name)}</span>
          มีการบันทึกงาน <span class="font-bold text-amber-800">[${escapeHTML(matchedText)}]</span>
          ไปแล้วเมื่อเวลา <span class="font-semibold">${escapeHTML(loggedTime)} น.</span>
          <div class="mt-2 font-bold text-slate-800">คุณยืนยันจะบันทึกซ้ำหรือไม่?</div>
        `;
        dom.duplicateModal.classList.remove('hidden');
        return;
      }

      await commitWorkLogToSupabase(payload);
    } catch (err) {
      hideLoader();
      dom.submitWorkLogBtn.disabled = false;
      console.error('Duplicate check / submit error:', err);
      showToast('เกิดข้อผิดพลาดในการตรวจสอบข้อมูล กรุณาลองใหม่', 'error');
    }
  }

  async function commitWorkLogToSupabase(payload) {
    showLoader('กำลังบันทึกข้อมูลการทำงาน...');
    dom.submitWorkLogBtn.disabled = true;
    try {
      if (payload.customTaskName) {
        const { error: customErr } = await app.sb.rpc('add_custom_task', {
          p_task_name: payload.customTaskName,
        });
        if (customErr) throw customErr;
      }

      const { error: insertErr } = await app.sb.from('work_logs').insert({
        hn: payload.hn,
        tasks: payload.tasks,
        requester_name: payload.requester_name,
        primary_staff_id: payload.primary_staff_id,
        co_staff_ids: [],
      });

      if (insertErr) throw insertErr;

      dom.duplicateModal.classList.add('hidden');
      state.pendingWorkLogData = null;

      if (payload.customTaskName) {
        await loadStaffFormMasterData();
      }

      resetWorkLogForm();
      hideLoader();
      dom.submitWorkLogBtn.disabled = false;
      showToast('บันทึกข้อมูลการทำงานเรียบร้อยแล้ว', 'success');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      hideLoader();
      dom.submitWorkLogBtn.disabled = false;
      console.error('Insert work_log error:', err);
      showToast('บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง', 'error');
    }
  }

  async function loadMyHistory() {
    if (!state.currentUser) return;
    const selectedDate = dom.myHistoryDate.value || getTodayBangkok();
    const startIso = `${selectedDate}T00:00:00+07:00`;
    const endIso = `${selectedDate}T23:59:59+07:00`;

    dom.myHistoryList.innerHTML = `
      <div class="bg-white rounded-2xl border border-slate-200 p-8 text-center text-xs text-slate-400">
        กำลังโหลดรายการงาน...
      </div>
    `;

    try {
      await refreshAllStaffCache();
      const { data, error } = await app.sb
        .from('work_logs')
        .select('*')
        .gte('created_at', startIso)
        .lte('created_at', endIso)
        .eq('primary_staff_id', state.currentUser.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const logs = data || [];
      dom.myHistoryCount.textContent = `${logs.length} งาน`;

      if (logs.length === 0) {
        dom.myHistoryList.innerHTML = `
          <div class="bg-white rounded-2xl border border-dashed border-slate-300 p-10 text-center">
            <p class="text-sm font-semibold text-slate-600">ยังไม่มีรายการงานในวันที่ ${escapeHTML(formatThaiDateShort(selectedDate))}</p>
            <p class="text-xs text-slate-400 mt-1">รายการงานที่คุณบันทึกในวันที่เลือกจะแสดงที่นี่</p>
          </div>
        `;
        return;
      }

      dom.myHistoryList.innerHTML = logs
        .map((log) => {
          const taskPills = (log.tasks || [])
            .map(
              (t) =>
                `<span class="inline-block px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200/70">${escapeHTML(t)}</span>`
            )
            .join('');

          return `
            <article class="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
              <div class="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md tabular-nums">
                    ${escapeHTML(formatBangkokTimeHHMM(log.created_at))} น.
                  </span>
                  <span class="text-base font-bold text-slate-800">HN: ${escapeHTML(log.hn)}</span>
                </div>
                <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-teal-50 text-teal-700 border border-teal-200">
                  คุณ${escapeHTML(getStaffName(log.primary_staff_id))}
                </span>
              </div>
              <div class="py-3 flex flex-wrap gap-1.5">${taskPills}</div>
              <div class="pt-2.5 border-t border-slate-100 space-y-1 text-xs">
                <div class="flex justify-between gap-2">
                  <span class="text-slate-400">ผู้แจ้งให้ทำ:</span>
                  <span class="font-medium text-slate-700">${escapeHTML(formatRequesterDisplay(log.requester_name))}</span>
                </div>
                <div class="flex justify-between gap-2">
                  <span class="text-slate-400">ผู้ปฏิบัติงาน:</span>
                  <span class="font-medium text-slate-700">คุณ${escapeHTML(getStaffName(log.primary_staff_id))}</span>
                </div>
              </div>
            </article>
          `;
        })
        .join('');
    } catch (err) {
      console.error('Load my history error:', err);
      dom.myHistoryList.innerHTML = `
        <div class="bg-rose-50 rounded-2xl border border-rose-200 p-6 text-center text-xs text-rose-700">
          ไม่สามารถโหลดประวัติงานได้ กรุณาลองใหม่อีกครั้ง
        </div>
      `;
    }
  }

  window.ERApp = window.ERApp || {};
  Object.assign(window.ERApp, {
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
  });
})();
