const form = document.getElementById('log-form');
const list = document.getElementById('log-list');
const logPanel = document.getElementById('log-panel');
const channelInput = document.getElementById('channel-input');
const formRadio = document.getElementById('form-radio');
const formTv = document.getElementById('form-tv');
const logModal = document.getElementById('log-modal');
const modalTitle = document.getElementById('modal-title');
const modalMeta = document.getElementById('modal-meta');
const modalBody = document.getElementById('modal-body');
const modalClose = document.getElementById('modal-close');
const modalBackdrop = document.getElementById('modal-backdrop');
const modalEdit = document.getElementById('modal-edit');
const submitButton = form.querySelector('button[type="submit"]');
const adminToggle = document.getElementById('admin-toggle');
const approvalControl = document.getElementById('approval-control');
const approvalCheckbox = document.getElementById('approval-checkbox');
const approvalStatus = document.getElementById('approval-status');
const modalDelete = document.getElementById('modal-delete');
const printPanel = document.getElementById('print-panel');
const auditPanel = document.getElementById('audit-panel');
const auditList = document.getElementById('audit-list');
const auditRefresh = document.getElementById('audit-refresh');
const workerSelect = document.getElementById('worker-select');
const formDate = document.getElementById('form-date');
const formChannel = document.getElementById('form-channel');
const formWorker = document.getElementById('form-worker');
const calendarTitle = document.getElementById('calendar-title');
const calendarGrid = document.getElementById('calendar-grid');
const logPanelTitle = document.getElementById('log-panel-title');
const logPanelSubtitle = document.getElementById('log-panel-subtitle');
const listTitle = document.getElementById('list-title');
const channelButtons = document.querySelectorAll('.channel-option');
const prevMonthButton = document.getElementById('prev-month');
const nextMonthButton = document.getElementById('next-month');

const calendarHint = document.getElementById('calendar-hint');

let currentMonth = new Date();
let selectedDate = formatDate(new Date());
let selectedChannel = '';
let selectedWorker = workerSelect.value;
let logsCache = [];
let displayedLogs = [];
let hasSelectedDate = false;
let editingId = null;
let modalLog = null;
let adminToken = localStorage.getItem('adminToken') || '';
let isAdmin = Boolean(adminToken);

function isSelectionReady() {
  return Boolean(selectedChannel && selectedWorker);
}

function updateHint() {
  if (isSelectionReady()) {
    calendarHint.textContent = '달력에서 날짜를 선택하면 해당 일지 내용이 바로 보여집니다.';
  } else {
    calendarHint.textContent = '채널과 근무자를 먼저 선택하면 달력에서 날짜를 고를 수 있습니다.';
  }
}

function showLogPanel() {
  hasSelectedDate = true;
  logPanel.classList.remove('hidden');
}

function hideLogPanel() {
  hasSelectedDate = false;
  logPanel.classList.add('hidden');
}

const RADIO_FORM = [
  {
    title: '라디오 주조',
    fields: [
      { k: 'sfm_pic', label: 'SFM PIC' },
      { k: 'sfm_studio', label: 'SFM STUDIO' },
      { k: 'mfm_pic', label: 'MFM PIC' },
      { k: 'mfm_studio', label: 'MFM STUDIO' },
      { k: 'sfm_mcfs', label: 'SFM MCFS 1/2' },
      { k: 'sfm_air', label: 'SFM AIR 1/2' },
      { k: 'mfm_mcfs', label: 'MFM MCFS 1/2' },
      { k: 'mfm_air', label: 'MFM AIR 1/2' },
      { k: 'smpte', label: 'SMPTE_Server' },
      { k: 'db_group', label: 'DB_Group' },
      { k: 'db1', label: 'DB 1' },
      { k: 'db2', label: 'DB 2' }
    ]
  },
  {
    title: 'GPS / 링크',
    fields: [
      { k: 'gps', label: 'GPS', options: ['Lock', 'Fault'] },
      { k: 'cheongju', label: '청주 링크', options: ['Lock', 'Fault'] }
    ]
  },
  {
    title: 'FM 스케줄',
    fields: [
      { k: 'sfm_sch_main', label: '표준FM · 주' },
      { k: 'sfm_sch_sub', label: '표준FM · 예비' },
      { k: 'sfm_sch_co', label: '표준FM · C/O' },
      { k: 'mfm_sch_main', label: '음악FM · 주' },
      { k: 'mfm_sch_sub', label: '음악FM · 예비' },
      { k: 'mfm_sch_co', label: '음악FM · C/O' }
    ]
  },
  {
    title: 'NAS / STL',
    fields: [
      { k: 'nas_main', label: 'NAS · 주' },
      { k: 'nas_sub', label: 'NAS · 예비' },
      { k: 'sfm_stl', label: '표준FM STL' },
      { k: 'mfm_stl', label: '음악FM STL' }
    ]
  },
  {
    title: '표준FM 송신기',
    fields: [
      { k: 'sfm_tx_a', label: 'Tx-A' },
      { k: 'sfm_tx_b', label: 'Tx-B' },
      { k: 'sfm_fwd', label: 'FWD', type: 'value' },
      { k: 'sfm_ref', label: 'REF', type: 'value' }
    ]
  },
  {
    title: '음악FM 송신기',
    fields: [
      { k: 'mfm_tx_a', label: 'Tx-A' },
      { k: 'mfm_tx_b', label: 'Tx-B' },
      { k: 'mfm_fwd', label: 'FWD', type: 'value' },
      { k: 'mfm_ref', label: 'REF', type: 'value' }
    ]
  },
  {
    title: 'IMC 렉실 (TV / 통합)',
    fields: [
      { k: 'imc_net', label: '통합망' },
      { k: 'xsan', label: 'XSAN' },
      { k: 'ndd', label: 'NDD 1/2' },
      { k: 'imco', label: 'iMCO 1/2' },
      { k: 'psip', label: 'PSIP' },
      { k: 'caption', label: 'Caption 서버' },
      { k: 'video', label: 'Video 서버' },
      { k: 'eurotech', label: '유로텍' }
    ]
  }
];

const TV_WORKERS = ['이종학', '조종록', '이상근', '전언표', '전경후'];
const RADIO_WORKERS = ['박광형'];
const MD_WORKERS = ['송재준', '김세훈', '이종필'];
const WORKERS = { RADIO: RADIO_WORKERS, TV: TV_WORKERS };

const TV_TECH = [
  { k: 'weather', label: '날씨' },
  { k: 'broadcast_time', label: '방송 시간' },
  { k: 'td_day', label: 'TD 일근', type: 'select', options: TV_WORKERS },
  { k: 'td_night', label: 'TD 야근', type: 'select', options: TV_WORKERS },
  { k: 'md_am', label: 'MD 오전', type: 'select', options: MD_WORKERS },
  { k: 'md_pm', label: 'MD 오후', type: 'select', options: MD_WORKERS },
  { k: 'rack_temp', label: '주조 RACK실 온도(°C)' },
  { k: 'equip_note', label: '장비 특이사항 (TAKER, eVCR, 편집실, 랙실 등)', type: 'textarea' },
  { k: 'news_note', label: '뉴스 및 프로그램 특이사항', type: 'textarea' }
];

const TV_CHECK = [
  {
    title: 'HD-ENC',
    contacts: ['010-8236-1533 (산암, 최우형 대리)'],
    fields: [
      { k: 'hdenc1', label: 'HD-ENC 1' },
      { k: 'hdenc2', label: 'HD-ENC 2' }
    ]
  },
  {
    title: '310M C/O',
    fields: [
      { k: 'co_in', label: 'CH-1 (유로텍) 입력', type: 'choice', options: ['IN A', 'IN B'] }
    ]
  },
  {
    title: '송신소 DTV PIC',
    contacts: ['010-5287-2557 (브로닉스 한상원 상무)'],
    fields: [
      { k: 'pic_src', label: 'PIC 소스', type: 'choice', options: ['유로텍A', '유로텍B', '우암산', '관악산'] }
    ]
  },
  {
    title: 'LG 통합망',
    options: ['정상', '비정상'],
    contacts: ['010-3287-4592 (DBN 정연민 이사)', '010-2795-2922 (DBN 선우욱 이사)'],
    fields: [
      { k: 'lg_main', label: '주' },
      { k: 'lg_sub', label: '예비' }
    ]
  },
  {
    title: 'IMCO / LODMS',
    options: ['정상', '비정상'],
    contacts: ['010-5437-9093 (MBC C&I 양준규 부장)'],
    fields: [
      { k: 'imco_main', label: 'IMCO 주' },
      { k: 'imco_sub', label: 'IMCO 예비' },
      { k: 'lodms_main', label: 'LODMS 주' },
      { k: 'lodms_sub', label: 'LODMS 예비' }
    ]
  },
  {
    title: 'DMB (my MBC11)',
    disabled: true,
    contacts: ['02-2166-0726 (위성방송운용팀)', '042-330-3530 (대전/TV주조)'],
    fields: [
      { k: 'dmb_atx_in', label: 'A-TX 입력', type: 'choice', options: ['INPUT 1', 'INPUT 2'] },
      { k: 'dmb_atx', label: 'A-TX 상태' },
      { k: 'dmb_btx_in', label: 'B-TX 입력', type: 'choice', options: ['INPUT 1', 'INPUT 2'] },
      { k: 'dmb_btx', label: 'B-TX 상태' }
    ]
  },
  {
    title: 'CAPTION 자막방송',
    contacts: ['02-866-9946 (손의택 과장)', '010-7146-8788 (라이브 자막 담당)'],
    fields: [
      { k: 'cap_main', label: '주' },
      { k: 'cap_sub', label: '예비' }
    ]
  },
  {
    title: 'Loudness Log (-24LKFS ±2)',
    options: ['정상', '비정상'],
    contacts: ['010-4782-1515 (미디어큐브 어재원 차장)'],
    fields: [
      { k: 'loud_main', label: '주 음성' },
      { k: 'loud_sub', label: '부 음성' }
    ]
  },
  {
    title: '재난재해 방송',
    options: ['정상', '비정상'],
    contacts: ['010-9386-8733 (비주얼리서치 김현수 과장)', '010-9329-4195 (비주얼리서치 백승윤 차장)'],
    fields: [
      { k: 'dis_main', label: '주' },
      { k: 'dis_sub', label: '예비' }
    ]
  },
  {
    title: 'M/W 유로텍',
    contacts: ['010-2203-2601 (유로텍 박승원 부장)'],
    fields: [
      { k: 'mw_txa_pwr', label: 'TX-A POWER(dBm)', type: 'value' },
      { k: 'mw_txb_pwr', label: 'TX-B POWER(dBm)', type: 'value' },
      { k: 'mw_rxa_pwr', label: 'RX-A POWER(dBm)', type: 'value' },
      { k: 'mw_rxb_pwr', label: 'RX-B POWER(dBm)', type: 'value' },
      { k: 'mw_rack', label: 'RACK실 온도(°C)', type: 'value' }
    ]
  }
];

function pillRow(field, prefix, groupOptions, disabled) {
  const options = field.options || groupOptions || ['정상', 'Fault'];
  const isChoice = field.type === 'choice';
  const pills = options
    .map((option, index) => {
      let tone = 'is-ok';
      if (isChoice) {
        tone = 'is-pick';
      } else if (option === 'Fault' || option === '비정상') {
        tone = 'is-fault';
      }
      const checked = !isChoice && index === 0 ? 'checked' : '';
      return `
        <label class="status-pill ${tone}">
          <input type="radio" name="${prefix}${field.k}" value="${escapeHtml(option)}" ${checked} ${disabled ? 'disabled' : ''} />
          <span>${escapeHtml(option)}</span>
        </label>`;
    })
    .join('');
  return `
    <div class="check-row">
      <span class="check-label">${escapeHtml(field.label)}</span>
      <div class="status-pills">${pills}</div>
    </div>`;
}

function valueRow(field, prefix, disabled) {
  return `
    <div class="check-row">
      <span class="check-label">${escapeHtml(field.label)}</span>
      <input type="text" class="value-input" name="${prefix}${field.k}" placeholder="측정값" ${disabled ? 'disabled' : ''} />
    </div>`;
}

function renderCheckGroups(groups, prefix) {
  return groups
    .map((group) => {
      const rows = group.fields
        .map((field) =>
          field.type === 'value'
            ? valueRow(field, prefix, group.disabled)
            : pillRow(field, prefix, group.options, group.disabled)
        )
        .join('');
      const contacts =
        group.contacts && group.contacts.length
          ? `<div class="group-contacts">${group.contacts.map((c) => escapeHtml(c)).join('<br>')}</div>`
          : '';
      return `
        <fieldset class="check-group${group.disabled ? ' is-disabled' : ''}">
          <legend>${escapeHtml(group.title)}</legend>
          ${rows}
          ${contacts}
        </fieldset>`;
    })
    .join('');
}

function renderRadioForm() {
  formRadio.innerHTML = `
    ${renderCheckGroups(RADIO_FORM, 'r_')}
    <label class="remarks">
      비고
      <textarea name="r_remarks" rows="4" placeholder="특이사항을 적어주세요."></textarea>
    </label>`;
}

function renderTvForm() {
  const tech = TV_TECH.map((field) => {
    let control;
    if (field.type === 'textarea') {
      control = `<textarea name="t_${field.k}" rows="2"></textarea>`;
    } else if (field.type === 'select') {
      control =
        `<select name="t_${field.k}"><option value="">선택</option>` +
        field.options.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('') +
        `</select>`;
    } else {
      control = `<input type="text" name="t_${field.k}" />`;
    }
    const wide = field.type === 'textarea' ? ' tv-tech-wide' : '';
    return `<label class="tv-tech-field${wide}"><span>${escapeHtml(field.label)}</span>${control}</label>`;
  }).join('');

  formTv.innerHTML = `
    <fieldset class="check-group tv-tech">
      <legend>기술일지</legend>
      <div class="tv-tech-grid">${tech}</div>
    </fieldset>
    ${renderCheckGroups(TV_CHECK, 't_')}
    <label class="remarks">
      비고
      <textarea name="t_remarks" rows="3" placeholder="특이사항을 적어주세요."></textarea>
    </label>`;
}

function updateFormMode() {
  formRadio.hidden = selectedChannel !== 'RADIO';
  formTv.hidden = selectedChannel !== 'TV';
}

function buildGroupsContent(groups, prefix, formData) {
  const lines = [];
  groups.forEach((group) => {
    lines.push(`[${group.title}]`);
    group.fields.forEach((field) => {
      const value = (formData.get(`${prefix}${field.k}`) || '').toString().trim() || '-';
      lines.push(`- ${field.label}: ${value}`);
    });
    lines.push('');
  });
  return lines;
}

function buildRadioContent(formData) {
  const lines = buildGroupsContent(RADIO_FORM, 'r_', formData);
  const remarks = (formData.get('r_remarks') || '').toString().trim();
  if (remarks) {
    lines.push('[비고]');
    lines.push(remarks);
  }
  return lines.join('\n').trim();
}

function buildTvContent(formData) {
  const lines = ['[기술일지]'];
  TV_TECH.filter((field) => field.type !== 'textarea').forEach((field) => {
    lines.push(`- ${field.label}: ${(formData.get(`t_${field.k}`) || '').toString().trim() || '-'}`);
  });
  lines.push('');
  lines.push(...buildGroupsContent(TV_CHECK, 't_', formData));
  TV_TECH.filter((field) => field.type === 'textarea').forEach((field) => {
    const value = (formData.get(`t_${field.k}`) || '').toString().trim();
    if (value) {
      lines.push(`[${field.label}]`);
      lines.push(value);
      lines.push('');
    }
  });
  const remarks = (formData.get('t_remarks') || '').toString().trim();
  if (remarks) {
    lines.push('[비고]');
    lines.push(remarks);
  }
  return lines.join('\n').trim();
}

function parseLogContent(content) {
  const sections = {};
  let current = null;
  (content || '').split('\n').forEach((line) => {
    const header = line.trim().match(/^\[(.+)\]$/);
    if (header) {
      current = header[1];
      sections[current] = sections[current] || { fields: {}, text: '' };
      return;
    }
    if (!current) {
      return;
    }
    const match = line.trim().match(/^-\s*(.+?):\s*(.*)$/);
    if (match) {
      sections[current].fields[match[1].trim()] = match[2].trim();
    } else {
      sections[current].text += (sections[current].text ? '\n' : '') + line;
    }
  });
  Object.keys(sections).forEach((key) => {
    sections[key].text = sections[key].text.trim();
  });
  return sections;
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function populateWorkers(channel, currentWorker) {
  const list = WORKERS[channel] ? [...WORKERS[channel]] : [];
  if (currentWorker && !list.includes(currentWorker)) {
    list.push(currentWorker);
  }
  workerSelect.innerHTML =
    '<option value="" disabled selected>근무자 선택</option>' +
    list.map((name) => `<option value="${escapeHtml(name)}">${escapeHtml(name)}</option>`).join('');
}

function setSelection(date, channel, worker) {
  selectedDate = date;
  selectedChannel = channel;
  selectedWorker = worker;
  channelInput.value = channel;
  channelButtons.forEach((button) => button.classList.toggle('active', button.dataset.channel === channel));
  populateWorkers(channel, worker);
  workerSelect.value = worker;
  formDate.value = date;
  formChannel.value = channel;
  formWorker.value = worker;
  logPanelTitle.textContent = `${date} · ${channel}`;
  logPanelSubtitle.textContent = `${selectedWorker} 근무자의 일지를 확인합니다.`;
  listTitle.textContent = `${selectedDate} · ${selectedChannel} · ${selectedWorker} 최근 일지`;
  updateFormMode();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderCalendar() {
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  calendarTitle.textContent = `${year}년 ${month + 1}월`;

  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const offset = firstDay.getDay();
  const totalCells = Math.ceil((offset + daysInMonth) / 7) * 7;

  calendarGrid.innerHTML = '';

  for (let index = 0; index < totalCells; index += 1) {
    const dayNumber = index - offset + 1;
    const cell = document.createElement('div');
    cell.className = 'calendar-cell';

    if (dayNumber < 1 || dayNumber > daysInMonth) {
      cell.classList.add('disabled');
      calendarGrid.appendChild(cell);
      continue;
    }

    const dateValue = formatDate(new Date(year, month, dayNumber));
    const dayButton = document.createElement('button');
    dayButton.type = 'button';
    dayButton.className = 'calendar-day';
    dayButton.textContent = String(dayNumber);
    dayButton.dataset.date = dateValue;

    if (hasSelectedDate && dateValue === selectedDate) {
      dayButton.classList.add('active');
    }

    dayButton.disabled = !isSelectionReady();

    dayButton.addEventListener('click', () => {
      if (!isSelectionReady()) {
        return;
      }
      const existing = logsCache.find(
        (log) => log.date === dateValue && log.channel === selectedChannel
      );
      if (existing) {
        startEdit(existing);
        return;
      }
      cancelEdit();
      form.reset();
      setSelection(dateValue, selectedChannel, selectedWorker);
      showLogPanel();
      renderCalendar();
      loadLogs();
    });

    cell.appendChild(dayButton);

    const dayLogs = logsCache.filter(
      (log) => log.date === dateValue && (isAdmin || log.channel === selectedChannel)
    );
    const channels = [...new Set(dayLogs.map((log) => log.channel))].slice(0, 2);
    const badges = document.createElement('div');
    badges.className = 'calendar-badges';

    channels.forEach((channel) => {
      const badge = document.createElement('button');
      badge.type = 'button';
      badge.className = 'calendar-badge';
      badge.textContent = channel === 'TV' ? 'T' : 'R';
      const dayLog = dayLogs.find((log) => log.channel === channel);
      if (isAdmin && dayLog && dayLog.approved) {
        badge.classList.add('approved');
      }
      badge.disabled = !isAdmin && !isSelectionReady();
      badge.addEventListener('click', (event) => {
        event.stopPropagation();
        if (!isAdmin && !isSelectionReady()) {
          return;
        }
        const target = logsCache.find(
          (log) => log.date === dateValue && log.channel === channel
        );
        if (target) {
          startEdit(target);
          openModal(target);
        }
      });
      badges.appendChild(badge);
    });

    if (channels.length) {
      cell.appendChild(badges);
    }

    calendarGrid.appendChild(cell);
  }
}

async function loadAllLogs() {
  try {
    const response = await fetch('/api/logs');
    logsCache = await response.json();
    renderCalendar();
    await loadLogs();
  } catch (error) {
    list.innerHTML = '<div class="empty">일지를 불러오지 못했습니다.</div>';
  }
}

async function loadLogs() {
  try {
    const query = new URLSearchParams({
      date: selectedDate,
      channel: selectedChannel,
      worker: selectedWorker
    });
    const response = await fetch(`/api/logs?${query.toString()}`);
    const logs = await response.json();
    renderLogs(logs);
  } catch (error) {
    list.innerHTML = '<div class="empty">일지를 불러오지 못했습니다.</div>';
  }
}

function renderLogs(logs) {
  displayedLogs = logs.filter((log) => log.channel === selectedChannel);

  if (!displayedLogs.length) {
    list.innerHTML = '<div class="empty">아직 저장된 일지가 없습니다.</div>';
    return;
  }

  list.innerHTML = displayedLogs
    .map(
      (log) => `
        <article class="log-card" data-id="${escapeHtml(log.id)}">
          <div class="log-meta">${escapeHtml(log.date)} · ${escapeHtml(log.channel)} · ${escapeHtml(log.worker)}</div>
          <h3>${escapeHtml(log.title)}</h3>
          <span class="log-open-hint">클릭하여 자세히 보기 →</span>
        </article>
      `
    )
    .join('');
}

function renderModalContent(content) {
  return escapeHtml(content)
    .replace(/:\s*(정상|Lock)\b/g, ': <span class="ok">$1</span>')
    .replace(/:\s*(Fault)\b/g, ': <span class="fault">$1</span>');
}

function updateApprovalControl() {
  modalDelete.hidden = !isAdmin;
  if (isAdmin && modalLog) {
    approvalControl.hidden = false;
    approvalCheckbox.checked = Boolean(modalLog.approved);
    approvalStatus.textContent = modalLog.approved
      ? `확인 완료 (${(modalLog.approvedAt || '').slice(0, 10)})`
      : '미확인';
  } else {
    approvalControl.hidden = true;
    approvalStatus.textContent = '';
  }
}

function actionLabel(action) {
  return { create: '작성', update: '수정', delete: '삭제', approve: '확인', unapprove: '확인해제' }[action] || action;
}

function renderAudit(entries) {
  if (!entries.length) {
    auditList.innerHTML = '<div class="empty">기록이 없습니다.</div>';
    return;
  }
  auditList.innerHTML = entries
    .map(
      (entry) => `
        <div class="audit-row">
          <span class="audit-time">${escapeHtml((entry.at || '').replace('T', ' ').slice(0, 19))}</span>
          <span class="audit-action audit-${escapeHtml(entry.action)}">${escapeHtml(actionLabel(entry.action))}</span>
          <span class="audit-target">${escapeHtml(entry.date || '')} · ${escapeHtml(entry.channel || '')} · ${escapeHtml(entry.worker || '')} · ${escapeHtml(entry.title || '')}</span>
          <span class="audit-actor">${escapeHtml(entry.actor || '')}</span>
        </div>`
    )
    .join('');
}

async function loadAudit() {
  if (!isAdmin) {
    return;
  }
  try {
    const response = await fetch('/api/audit', { headers: { 'x-admin-token': adminToken } });
    if (response.ok) {
      renderAudit(await response.json());
    } else if (response.status === 401) {
      adminLogout();
    }
  } catch (error) {
    auditList.innerHTML = '<div class="empty">로그를 불러오지 못했습니다.</div>';
  }
}

async function deleteLog() {
  if (!modalLog || !isAdmin) {
    return;
  }
  if (!confirm('이 일지를 삭제하시겠습니까? 되돌릴 수 없습니다.')) {
    return;
  }
  try {
    const response = await fetch(`/api/logs/${modalLog.id}`, {
      method: 'DELETE',
      headers: { 'x-admin-token': adminToken }
    });
    if (response.ok) {
      closeModal();
      await loadAllLogs();
      await loadAudit();
    } else if (response.status === 401) {
      alert('관리자 인증이 만료되었습니다. 다시 로그인해주세요.');
      adminLogout();
    } else {
      alert('삭제에 실패했습니다.');
    }
  } catch (error) {
    alert('삭제에 실패했습니다.');
  }
}

modalDelete.addEventListener('click', deleteLog);
auditRefresh.addEventListener('click', loadAudit);

function openModal(log) {
  modalLog = log;
  modalTitle.textContent = log.title;
  modalMeta.textContent = `${log.date} · ${log.channel} · ${log.worker}`;
  modalBody.innerHTML = renderModalContent(log.content || '');
  updateApprovalControl();
  logModal.classList.remove('hidden');
}

function closeModal() {
  logModal.classList.add('hidden');
}

function updateAdminUI() {
  adminToggle.textContent = isAdmin ? '관리자 모드 · 로그아웃' : '관리자 로그인';
  adminToggle.classList.toggle('is-admin', isAdmin);
  printPanel.hidden = !isAdmin;
  auditPanel.hidden = !isAdmin;
  if (isAdmin) {
    loadAudit();
  }
}

async function adminLogin() {
  const password = prompt('관리자 비밀번호를 입력하세요');
  if (!password) {
    return;
  }
  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password })
    });
    if (response.ok) {
      const data = await response.json();
      adminToken = data.token;
      isAdmin = true;
      localStorage.setItem('adminToken', adminToken);
      updateAdminUI();
      renderCalendar();
      updateApprovalControl();
    } else {
      alert('비밀번호가 올바르지 않습니다.');
    }
  } catch (error) {
    alert('로그인에 실패했습니다.');
  }
}

function adminLogout() {
  adminToken = '';
  isAdmin = false;
  localStorage.removeItem('adminToken');
  updateAdminUI();
  renderCalendar();
  updateApprovalControl();
}

async function toggleApproval(approved) {
  if (!modalLog) {
    return;
  }
  try {
    const response = await fetch(`/api/logs/${modalLog.id}/approval`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'x-admin-token': adminToken },
      body: JSON.stringify({ approved })
    });
    if (response.ok) {
      const updated = await response.json();
      modalLog = updated;
      const index = logsCache.findIndex((log) => log.id === updated.id);
      if (index > -1) {
        logsCache[index] = updated;
      }
      updateApprovalControl();
      renderCalendar();
      loadLogs();
      loadAudit();
    } else if (response.status === 401) {
      alert('관리자 인증이 만료되었습니다. 다시 로그인해주세요.');
      adminLogout();
    } else {
      alert('확인 처리에 실패했습니다.');
    }
  } catch (error) {
    alert('확인 처리에 실패했습니다.');
  }
}

adminToggle.addEventListener('click', () => {
  if (isAdmin) {
    adminLogout();
  } else {
    adminLogin();
  }
});

approvalCheckbox.addEventListener('change', () => {
  toggleApproval(approvalCheckbox.checked);
});

function cancelEdit() {
  if (editingId) {
    editingId = null;
    submitButton.textContent = '저장하기';
  }
}

function populateForm(log) {
  if (log.channel === 'RADIO') {
    const { groups: parsedGroups, remarks } = parseRadioContent(log.content);
    RADIO_FORM.forEach((group) => {
      const groupValues = parsedGroups[group.title] || {};
      group.fields.forEach((field) => {
        const value = groupValues[field.label];
        if (field.type === 'value') {
          const input = form.querySelector(`[name="r_${field.k}"]`);
          if (input) {
            input.value = value && value !== '-' ? value : '';
          }
        } else if (value) {
          form.querySelectorAll(`input[name="r_${field.k}"]`).forEach((radio) => {
            radio.checked = radio.value === value;
          });
        }
      });
    });
    const remarksEl = form.querySelector('[name="r_remarks"]');
    if (remarksEl) {
      remarksEl.value = remarks || '';
    }
  } else if (log.channel === 'TV') {
    const sections = parseLogContent(log.content);
    const techFields = (sections['기술일지'] || { fields: {} }).fields;
    TV_TECH.forEach((field) => {
      const el = form.querySelector(`[name="t_${field.k}"]`);
      if (!el) {
        return;
      }
      if (field.type === 'textarea') {
        el.value = (sections[field.label] || { text: '' }).text || '';
      } else {
        const value = techFields[field.label];
        el.value = value && value !== '-' ? value : '';
      }
    });
    TV_CHECK.forEach((group) => {
      const groupValues = (sections[group.title] || { fields: {} }).fields;
      group.fields.forEach((field) => {
        const value = groupValues[field.label];
        if (field.type === 'value') {
          const input = form.querySelector(`[name="t_${field.k}"]`);
          if (input) {
            input.value = value && value !== '-' ? value : '';
          }
        } else if (value) {
          form.querySelectorAll(`input[name="t_${field.k}"]`).forEach((radio) => {
            radio.checked = radio.value === value;
          });
        }
      });
    });
    const remarksEl = form.querySelector('[name="t_remarks"]');
    if (remarksEl) {
      remarksEl.value = (sections['비고'] || { text: '' }).text || '';
    }
  }
}

function startEdit(log) {
  editingId = log.id;
  form.reset();
  setSelection(log.date, log.channel, log.worker);
  showLogPanel();
  populateForm(log);
  submitButton.textContent = '수정 저장';
  renderCalendar();
  loadLogs();
  logPanel.scrollIntoView({ behavior: 'smooth' });
}

list.addEventListener('click', (event) => {
  const card = event.target.closest('.log-card');
  if (!card) {
    return;
  }
  const log = displayedLogs.find((entry) => entry.id === card.dataset.id);
  if (log) {
    openModal(log);
  }
});

modalEdit.addEventListener('click', () => {
  if (modalLog) {
    startEdit(modalLog);
    closeModal();
  }
});

modalClose.addEventListener('click', closeModal);
modalBackdrop.addEventListener('click', closeModal);
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') {
    closeModal();
  }
});

channelButtons.forEach((button) => {
  button.addEventListener('click', () => {
    cancelEdit();
    channelButtons.forEach((candidate) => candidate.classList.remove('active'));
    button.classList.add('active');
    selectedChannel = button.dataset.channel;
    channelInput.value = selectedChannel;
    formChannel.value = selectedChannel;
    selectedWorker = '';
    setSelection(selectedDate, selectedChannel, selectedWorker);
    updateHint();
    renderCalendar();
    loadLogs();
  });
});

workerSelect.addEventListener('change', (event) => {
  cancelEdit();
  selectedWorker = event.target.value;
  formWorker.value = selectedWorker;
  setSelection(selectedDate, selectedChannel, selectedWorker);
  updateHint();
  renderCalendar();
  loadLogs();
});

prevMonthButton.addEventListener('click', () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1);
  renderCalendar();
});

nextMonthButton.addEventListener('click', () => {
  currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
  renderCalendar();
});

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);

  let payload;
  if (selectedChannel === 'RADIO') {
    payload = {
      date: selectedDate,
      channel: selectedChannel,
      worker: selectedWorker,
      title: '라디오주조·IMC렉실 점검일지',
      content: buildRadioContent(formData)
    };
  } else if (selectedChannel === 'TV') {
    payload = {
      date: selectedDate,
      channel: selectedChannel,
      worker: selectedWorker,
      title: 'TV 기술일지·장비점검일지',
      content: buildTvContent(formData)
    };
  } else {
    return;
  }

  const url = editingId ? `/api/logs/${editingId}` : '/api/logs';
  const method = editingId ? 'PUT' : 'POST';

  try {
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      form.reset();
      cancelEdit();
      setSelection(selectedDate, selectedChannel, selectedWorker);
      await loadAllLogs();
      await loadAudit();
    } else if (response.status === 409) {
      const data = await response.json().catch(() => ({}));
      alert(data.error || '이미 해당 날짜·매체의 일지가 있습니다. 기존 일지를 수정해주세요.');
      await loadAllLogs();
    }
  } catch (error) {
    alert('저장에 실패했습니다.');
  }
});

const printChannel = document.getElementById('print-channel');
const printPeriod = document.getElementById('print-period');
const printYear = document.getElementById('print-year');
const printMonth = document.getElementById('print-month');
const printMonthWrap = document.getElementById('print-month-wrap');
const printQuarter = document.getElementById('print-quarter');
const printQuarterWrap = document.getElementById('print-quarter-wrap');
const printButton = document.getElementById('print-button');

function pad2(value) {
  return String(value).padStart(2, '0');
}

function initPrintControls() {
  for (let month = 1; month <= 12; month += 1) {
    const option = document.createElement('option');
    option.value = String(month);
    option.textContent = `${month}월`;
    printMonth.appendChild(option);
  }
  const now = new Date();
  printYear.value = String(now.getFullYear());
  printMonth.value = String(now.getMonth() + 1);
  printQuarter.value = String(Math.floor(now.getMonth() / 3) + 1);
}

function buildPrintRange() {
  const year = parseInt(printYear.value, 10);
  if (printPeriod.value === 'month') {
    const month = parseInt(printMonth.value, 10);
    const lastDay = new Date(year, month, 0).getDate();
    return {
      start: `${year}-${pad2(month)}-01`,
      end: `${year}-${pad2(month)}-${pad2(lastDay)}`,
      label: `${year}년 ${month}월`
    };
  }
  const quarter = parseInt(printQuarter.value, 10);
  const startMonth = (quarter - 1) * 3 + 1;
  const endMonth = quarter * 3;
  const lastDay = new Date(year, endMonth, 0).getDate();
  return {
    start: `${year}-${pad2(startMonth)}-01`,
    end: `${year}-${pad2(endMonth)}-${pad2(lastDay)}`,
    label: `${year}년 ${quarter}분기 (${startMonth}~${endMonth}월)`
  };
}

function parseRadioContent(content) {
  const groups = {};
  let current = null;
  let remarks = '';
  let inRemarks = false;
  (content || '').split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed === '[비고]') {
      inRemarks = true;
      current = null;
      return;
    }
    const header = trimmed.match(/^\[(.+)\]$/);
    if (header) {
      inRemarks = false;
      current = header[1];
      groups[current] = groups[current] || {};
      return;
    }
    if (inRemarks) {
      remarks += (remarks ? '\n' : '') + line;
      return;
    }
    const match = trimmed.match(/^-\s*(.+?):\s*(.*)$/);
    if (match && current) {
      groups[current][match[1].trim()] = match[2].trim();
    }
  });
  return { groups, remarks: remarks.trim() };
}

function buildRadioPrintBody(log) {
  const { groups: parsedGroups, remarks } = parseRadioContent(log.content);
  const groups = RADIO_FORM.map((group) => {
    const groupValues = parsedGroups[group.title] || {};
    const rows = group.fields
      .map((field) => {
        const value = groupValues[field.label] || '-';
        const tone = value === 'Fault' ? 'fault' : value === '정상' || value === 'Lock' ? 'ok' : '';
        return `<div class="r-item"><span class="r-l">${escapeHtml(field.label)}</span><span class="r-v ${tone}">${escapeHtml(value)}</span></div>`;
      })
      .join('');
    return `<section class="r-group"><h4>${escapeHtml(group.title)}</h4><div class="r-items">${rows}</div></section>`;
  }).join('');
  const remarksHtml = remarks
    ? `<section class="r-group r-remarks"><h4>비고</h4><div class="r-remarks-body">${escapeHtml(remarks).replace(/\n/g, '<br>')}</div></section>`
    : '';
  return `
    <header class="r-head">
      <h2>라디오주조 · IMC렉실 점검일지</h2>
      <div class="r-meta">${escapeHtml(log.date)} &nbsp;·&nbsp; 근무자: ${escapeHtml(log.worker)}${approvalText(log)}</div>
    </header>
    <div class="r-grid">${groups}</div>
    ${remarksHtml}`;
}

function approvalText(log) {
  if (!isAdmin) {
    return '';
  }
  const text = log.approved ? `기술부장 확인 완료(${(log.approvedAt || '').slice(0, 10)})` : '미확인';
  return ` &nbsp;·&nbsp; <span class="r-appr">관리자 확인 : ${escapeHtml(text)}</span>`;
}

function buildTvPrintBody(log) {
  const sections = parseLogContent(log.content);
  const techFields = (sections['기술일지'] || { fields: {} }).fields;
  const techItems = TV_TECH.filter((field) => field.type !== 'textarea')
    .map(
      (field) =>
        `<div class="r-item"><span class="r-l">${escapeHtml(field.label)}</span><span class="r-v">${escapeHtml(techFields[field.label] || '-')}</span></div>`
    )
    .join('');
  const noteItems = TV_TECH.filter((field) => field.type === 'textarea')
    .map((field) => {
      const text = (sections[field.label] || { text: '' }).text;
      return text ? `<div class="r-note"><b>${escapeHtml(field.label)}</b> ${escapeHtml(text).replace(/\n/g, ' ')}</div>` : '';
    })
    .join('');
  const checkGroups = TV_CHECK.map((group) => {
    const groupValues = (sections[group.title] || { fields: {} }).fields;
    const rows = group.fields
      .map((field) => {
        const value = groupValues[field.label] || '-';
        const tone = value === 'Fault' || value === '비정상' ? 'fault' : value === '정상' || value === 'Lock' ? 'ok' : '';
        return `<div class="r-item"><span class="r-l">${escapeHtml(field.label)}</span><span class="r-v ${tone}">${escapeHtml(value)}</span></div>`;
      })
      .join('');
    return `<section class="r-group"><h4>${escapeHtml(group.title)}</h4><div class="r-items">${rows}</div></section>`;
  }).join('');
  const remarks = (sections['비고'] || { text: '' }).text;
  const remarksHtml = remarks
    ? `<section class="r-group r-remarks"><h4>비고</h4><div class="r-remarks-body">${escapeHtml(remarks).replace(/\n/g, '<br>')}</div></section>`
    : '';
  return `
    <header class="r-head">
      <h2>TV 기술일지 · 장비점검일지</h2>
      <div class="r-meta">${escapeHtml(log.date)} &nbsp;·&nbsp; 근무자: ${escapeHtml(log.worker)}${approvalText(log)}</div>
    </header>
    <section class="r-group tv-tech-print">
      <h4>기술일지</h4>
      <div class="r-items r-items-2col">${techItems}</div>
      ${noteItems}
    </section>
    <div class="r-grid">${checkGroups}</div>
    ${remarksHtml}`;
}

function buildPrintDoc(medium, label, logs) {
  const pages = logs
    .map((log) => {
      const inner = log.channel === 'RADIO' ? buildRadioPrintBody(log) : buildTvPrintBody(log);
      const sheetClass = log.channel === 'TV' ? 'sheet tv' : 'sheet';
      return `<div class="${sheetClass}">${inner}</div>`;
    })
    .join('');
  const body = pages || '<p class="p-empty">해당 기간에 저장된 일지가 없습니다.</p>';
  return `<!DOCTYPE html>
<html lang="ko"><head><meta charset="UTF-8" /><title>${escapeHtml(medium)} 일지 - ${escapeHtml(label)}</title>
<style>
  @page { size: A4 portrait; margin: 10mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Malgun Gothic', 'Segoe UI', sans-serif; color: #111; margin: 0; font-size: 10px; }
  .sheet { page-break-after: always; }
  .sheet:last-child { page-break-after: auto; }
  .r-head h2 { font-size: 15px; margin: 0 0 2px; text-align: center; }
  .r-meta { text-align: center; color: #333; font-size: 10px; margin: 0 0 8px; }
  .r-appr { color: #0f766e; font-weight: 700; }
  .r-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6px; align-items: start; }
  .r-group { border: 1px solid #888; border-radius: 4px; padding: 4px 7px 5px; break-inside: avoid; }
  .r-group h4 { margin: 0 0 3px; font-size: 10.5px; color: #1d4ed8; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
  .r-items { display: grid; gap: 0; }
  .r-item { display: flex; justify-content: space-between; gap: 8px; padding: 1.5px 0; border-bottom: 1px dotted #e3e3e3; }
  .r-item:last-child { border-bottom: none; }
  .r-l { font-weight: 600; }
  .r-v { font-weight: 700; white-space: nowrap; }
  .ok { color: #15803d; }
  .fault { color: #b91c1c; }
  .r-remarks { margin-top: 6px; }
  .r-remarks-body { white-space: pre-wrap; line-height: 1.4; font-weight: normal; }
  .sheet.tv { font-size: 9px; }
  .sheet.tv .r-grid { grid-template-columns: repeat(3, 1fr); }
  .r-items-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 14px; }
  .tv-tech-print { margin-bottom: 6px; }
  .r-note { font-size: 9px; margin-top: 3px; line-height: 1.4; }
  .r-note b { color: #1d4ed8; }
  .p-empty { color: #666; margin: 24px; }
</style></head>
<body>
  ${body}
  <script>window.onload = function () { window.print(); };<\/script>
</body></html>`;
}

async function handlePrint() {
  const medium = printChannel.value;
  const { start, end, label } = buildPrintRange();
  let logs = [];
  try {
    const response = await fetch(`/api/logs?channel=${encodeURIComponent(medium)}`);
    const all = await response.json();
    logs = all
      .filter((log) => log.date >= start && log.date <= end)
      .sort((a, b) => a.date.localeCompare(b.date) || (a.createdAt || '').localeCompare(b.createdAt || ''));
  } catch (error) {
    alert('일지를 불러오지 못했습니다.');
    return;
  }
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('팝업이 차단되었습니다. 팝업을 허용한 뒤 다시 시도해주세요.');
    return;
  }
  printWindow.document.write(buildPrintDoc(medium, label, logs));
  printWindow.document.close();
}

printPeriod.addEventListener('change', () => {
  const isMonth = printPeriod.value === 'month';
  printMonthWrap.hidden = !isMonth;
  printQuarterWrap.hidden = isMonth;
});

printButton.addEventListener('click', handlePrint);
initPrintControls();

renderRadioForm();
renderTvForm();
updateAdminUI();
setSelection(selectedDate, selectedChannel, selectedWorker);
updateHint();
loadAllLogs();
