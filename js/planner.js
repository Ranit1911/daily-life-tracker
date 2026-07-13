/* ============================================
   LifeOS — Planner Module
   Weekly Routine Planner + Daily Logs
   ============================================ */

const Planner = (() => {
  const STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    NOT_COMPLETED: 'not-completed'
  };

  const STATUS_LABELS = {
    [STATUS.PENDING]: { text: 'Pending', icon: '<i data-lucide="circle" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>' },
    [STATUS.COMPLETED]: { text: 'Done', icon: '<i data-lucide="check" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>' },
    [STATUS.NOT_COMPLETED]: { text: 'Missed', icon: '<i data-lucide="x" style="width: 12px; height: 12px; display: inline-block; vertical-align: middle; margin-right: 4px;"></i>' }
  };

  const STATUS_CYCLE = [STATUS.PENDING, STATUS.COMPLETED, STATUS.NOT_COMPLETED];

  let draggedRow = null;

  /* --- Initialize --- */
  function init() {
    // Planner add button
    const plannerAddBtn = document.getElementById('planner-add-btn');
    if (plannerAddBtn) {
      plannerAddBtn.addEventListener('click', () => addPlannerTask());
    }

    // Log add button
    const logAddBtn = document.getElementById('log-add-btn');
    if (logAddBtn) {
      logAddBtn.addEventListener('click', () => addLogEntry());
    }

    // Listen for view changes
    App.on('viewChanged', (view) => {
      if (view === 'weekly') {
        renderPlannerTasks();
        renderLogEntries();
      }
    });

    renderPlannerTasks();
    renderLogEntries();
  }

  /* ============================================
     PLANNER TASKS — CRUD & Storage
     ============================================ */
  function getPlannerTasks() {
    try {
      const todayStr = Storage.getTodayString();
      const val = localStorage.getItem(`lifeos_planner_${todayStr}`);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  function savePlannerTasks(tasks) {
    const todayStr = Storage.getTodayString();
    localStorage.setItem(`lifeos_planner_${todayStr}`, JSON.stringify(tasks));
  }

  function addPlannerTask() {
    const tasks = getPlannerTasks();
    tasks.push({
      id: Date.now(),
      name: 'New Task',
      startTime: '09:00',
      endTime: '10:00',
      status: STATUS.PENDING,
      order: tasks.length
    });
    savePlannerTasks(tasks);
    renderPlannerTasks();
  }

  function deletePlannerTask(id) {
    let tasks = getPlannerTasks();
    tasks = tasks.filter(t => t.id !== id);
    savePlannerTasks(tasks);
    renderPlannerTasks();
  }

  function updatePlannerTask(id, field, value) {
    const tasks = getPlannerTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    // Time conflict detection
    if (field === 'startTime' || field === 'endTime') {
      const updatedTask = { ...task, [field]: value };
      const conflict = checkTimeConflict(updatedTask, tasks.filter(t => t.id !== id));
      if (conflict) {
        showConflictWarning(id, conflict);
        return; // Don't save conflicting time
      }
      clearConflictWarning(id);
    }

    task[field] = value;
    savePlannerTasks(tasks);

    // If status changed, do animation
    if (field === 'status') {
      const pillEl = document.querySelector(`.status-pill[data-id="${id}"]`);
      if (pillEl) {
        pillEl.style.animation = 'none';
        requestAnimationFrame(() => {
          pillEl.style.animation = '';
        });
      }
    }
  }

  function cycleStatus(id) {
    const tasks = getPlannerTasks();
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const currentIndex = STATUS_CYCLE.indexOf(task.status);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    task.status = STATUS_CYCLE[nextIndex];
    savePlannerTasks(tasks);
    renderPlannerTasks();
  }

  /* --- Time Conflict Detection --- */
  function checkTimeConflict(task, otherTasks) {
    if (!task.startTime || !task.endTime) return null;

    const start = timeToMinutes(task.startTime);
    const end = timeToMinutes(task.endTime);

    if (end <= start) return null; // Invalid range, but don't block

    for (const other of otherTasks) {
      if (!other.startTime || !other.endTime) continue;

      const oStart = timeToMinutes(other.startTime);
      const oEnd = timeToMinutes(other.endTime);

      if (oEnd <= oStart) continue;

      // Check overlap
      if (start < oEnd && end > oStart) {
        return other;
      }
    }
    return null;
  }

  function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  }

  function showConflictWarning(taskId, conflictTask) {
    const row = document.querySelector(`.planner-task-row[data-id="${taskId}"]`);
    if (!row) return;

    // Remove existing warning
    const existing = row.querySelector('.time-conflict-warning');
    if (existing) existing.remove();

    const warning = document.createElement('div');
    warning.className = 'time-conflict-warning';
    warning.innerHTML = `⚠ Conflicts with "${escapeHtml(conflictTask.name)}"`;

    const timeCell = row.querySelector('.task-time-cell');
    if (timeCell) {
      timeCell.appendChild(warning);
    }

    // Auto-remove after 4 seconds
    setTimeout(() => warning.remove(), 4000);
  }

  function clearConflictWarning(taskId) {
    const row = document.querySelector(`.planner-task-row[data-id="${taskId}"]`);
    if (!row) return;
    const existing = row.querySelector('.time-conflict-warning');
    if (existing) existing.remove();
  }

  /* --- Render Planner Tasks --- */
  function renderPlannerTasks() {
    const container = document.getElementById('planner-tasks-list');
    if (!container) return;

    const tasks = getPlannerTasks();

    if (tasks.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i data-lucide="list-checks" class="lucide-icon"></i>
          </div>
          <div class="empty-state-title">No tasks planned</div>
          <div class="empty-state-desc">Add tasks to plan your daily routine</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = tasks.map((task, i) => {
      const statusInfo = STATUS_LABELS[task.status] || STATUS_LABELS[STATUS.PENDING];
      const isCompleted = task.status === STATUS.COMPLETED;

      return `
        <div class="planner-task-row" data-id="${task.id}" draggable="true" style="animation: fadeInUp 300ms ease ${i * 40}ms forwards; opacity: 0;">
          <div class="task-name-cell">
            <span class="task-drag-handle" title="Drag to reorder">
              <i data-lucide="grip-vertical" style="width:14px;height:14px;" class="lucide-icon"></i>
            </span>
            <div class="task-checkbox ${isCompleted ? 'checked' : ''}" data-check-id="${task.id}" title="Toggle completion">
              ${isCompleted ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
            </div>
            <input class="task-name-input ${isCompleted ? 'completed' : ''}" 
                   value="${escapeHtml(task.name)}"
                   data-field="name" data-id="${task.id}"
                   aria-label="Task name" />
          </div>
          <div class="task-time-cell">
            <input type="time" class="task-time-input" value="${task.startTime}" 
                   data-field="startTime" data-id="${task.id}" aria-label="Start time" />
            <span class="task-time-separator">–</span>
            <input type="time" class="task-time-input" value="${task.endTime}" 
                   data-field="endTime" data-id="${task.id}" aria-label="End time" />
          </div>
          <div>
            <button class="status-pill ${task.status}" data-id="${task.id}" title="Click to change status">
              ${statusInfo.icon} ${statusInfo.text}
            </button>
          </div>
          <button class="task-delete-btn" data-delete-id="${task.id}" aria-label="Delete task">
            <i data-lucide="trash-2" style="width:14px;height:14px;" class="lucide-icon"></i>
          </button>
        </div>
      `;
    }).join('');

    // Attach event listeners
    attachPlannerListeners(container);

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function attachPlannerListeners(container) {
    // Name inputs
    container.querySelectorAll('.task-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        updatePlannerTask(parseInt(e.target.dataset.id), 'name', e.target.value);
      });
      input.addEventListener('focus', () => {
        input.select();
      });
    });

    // Time inputs
    container.querySelectorAll('.task-time-input').forEach(input => {
      input.addEventListener('change', (e) => {
        updatePlannerTask(parseInt(e.target.dataset.id), e.target.dataset.field, e.target.value);
      });
    });

    // Status pills
    container.querySelectorAll('.status-pill').forEach(pill => {
      pill.addEventListener('click', () => {
        cycleStatus(parseInt(pill.dataset.id));
      });
    });

    // Checkboxes
    container.querySelectorAll('.task-checkbox').forEach(cb => {
      cb.addEventListener('click', () => {
        const id = parseInt(cb.dataset.checkId);
        const tasks = getPlannerTasks();
        const task = tasks.find(t => t.id === id);
        if (task) {
          task.status = task.status === STATUS.COMPLETED ? STATUS.PENDING : STATUS.COMPLETED;
          savePlannerTasks(tasks);
          renderPlannerTasks();
        }
      });
    });

    // Delete buttons
    container.querySelectorAll('.task-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        deletePlannerTask(parseInt(btn.dataset.deleteId));
      });
    });

    // Drag and drop
    container.querySelectorAll('.planner-task-row').forEach(row => {
      row.addEventListener('dragstart', (e) => {
        draggedRow = row;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        container.querySelectorAll('.planner-task-row').forEach(r => r.classList.remove('drag-over'));
        draggedRow = null;

        // Persist new order
        const newOrder = [];
        container.querySelectorAll('.planner-task-row').forEach(r => {
          newOrder.push(parseInt(r.dataset.id));
        });

        const tasks = getPlannerTasks();
        const reordered = newOrder.map(id => tasks.find(t => t.id === id)).filter(Boolean);
        savePlannerTasks(reordered);
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedRow && draggedRow !== row) {
          row.classList.add('drag-over');

          const rect = row.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;

          if (e.clientY < midY) {
            container.insertBefore(draggedRow, row);
          } else {
            container.insertBefore(draggedRow, row.nextSibling);
          }
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over');
      });
    });
  }

  /* ============================================
     DAILY LOGS — CRUD & Storage
     ============================================ */
  function getDailyLogs() {
    try {
      const todayStr = Storage.getTodayString();
      const val = localStorage.getItem(`lifeos_dailylogs_${todayStr}`);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  function saveDailyLogs(logs) {
    const todayStr = Storage.getTodayString();
    localStorage.setItem(`lifeos_dailylogs_${todayStr}`, JSON.stringify(logs));
  }

  function addLogEntry() {
    const logs = getDailyLogs();
    const now = new Date();

    logs.push({
      id: Date.now(),
      task: 'New Log Entry',
      time: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
      status: STATUS.PENDING,
      note: '',
      order: logs.length
    });

    saveDailyLogs(logs);
    renderLogEntries();
  }

  function deleteLogEntry(id) {
    let logs = getDailyLogs();
    logs = logs.filter(l => l.id !== id);
    saveDailyLogs(logs);
    renderLogEntries();
  }

  function updateLogEntry(id, field, value) {
    const logs = getDailyLogs();
    const log = logs.find(l => l.id === id);
    if (log) {
      log[field] = value;
      saveDailyLogs(logs);
    }
  }

  function cycleLogStatus(id) {
    const logs = getDailyLogs();
    const log = logs.find(l => l.id === id);
    if (!log) return;

    const currentIndex = STATUS_CYCLE.indexOf(log.status);
    const nextIndex = (currentIndex + 1) % STATUS_CYCLE.length;
    log.status = STATUS_CYCLE[nextIndex];
    saveDailyLogs(logs);
    renderLogEntries();
  }

  /* --- Render Daily Logs --- */
  function renderLogEntries() {
    const container = document.getElementById('logs-entries-list');
    if (!container) return;

    const logs = getDailyLogs();

    if (logs.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <i data-lucide="notebook-pen" class="lucide-icon"></i>
          </div>
          <div class="empty-state-title">No log entries yet</div>
          <div class="empty-state-desc">Record what you did today</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = logs.map((log, i) => {
      const statusInfo = STATUS_LABELS[log.status] || STATUS_LABELS[STATUS.PENDING];
      const isCompleted = log.status === STATUS.COMPLETED;

      return `
        <div class="planner-task-row" data-log-id="${log.id}" draggable="true" style="animation: fadeInUp 300ms ease ${i * 40}ms forwards; opacity: 0;">
          <div class="task-name-cell" style="flex-direction: column; align-items: flex-start; gap: 4px;">
            <div style="display: flex; align-items: center; gap: var(--space-sm); width: 100%;">
              <div class="task-checkbox ${isCompleted ? 'checked' : ''}" data-log-check-id="${log.id}" title="Toggle completion">
                ${isCompleted ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
              </div>
              <input class="task-name-input ${isCompleted ? 'completed' : ''}" 
                     value="${escapeHtml(log.task)}"
                     data-log-field="task" data-log-id="${log.id}"
                     aria-label="Log task" />
            </div>
            <input class="log-note-input" 
                   value="${escapeHtml(log.note || '')}"
                   placeholder="Add a note..."
                   data-log-field="note" data-log-id="${log.id}"
                   aria-label="Log note" />
          </div>
          <div>
            <input type="time" class="task-time-input" value="${log.time}" 
                   data-log-field="time" data-log-id="${log.id}" aria-label="Log time"
                   style="width: 100%;" />
          </div>
          <div>
            <button class="status-pill ${log.status}" data-log-status-id="${log.id}" title="Click to change status">
              ${statusInfo.icon} ${statusInfo.text}
            </button>
          </div>
          <button class="task-delete-btn" data-log-delete-id="${log.id}" aria-label="Delete log" style="opacity: 1;">
            <i data-lucide="trash-2" style="width:14px;height:14px;" class="lucide-icon"></i>
          </button>
        </div>
      `;
    }).join('');

    // Attach event listeners
    attachLogListeners(container);

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  function attachLogListeners(container) {
    // Task/note inputs
    container.querySelectorAll('[data-log-field]').forEach(input => {
      input.addEventListener('change', (e) => {
        updateLogEntry(parseInt(e.target.dataset.logId), e.target.dataset.logField, e.target.value);
      });
      input.addEventListener('focus', () => {
        input.select();
      });
    });

    // Status pills
    container.querySelectorAll('[data-log-status-id]').forEach(pill => {
      pill.addEventListener('click', () => {
        cycleLogStatus(parseInt(pill.dataset.logStatusId));
      });
    });

    // Checkboxes
    container.querySelectorAll('[data-log-check-id]').forEach(cb => {
      cb.addEventListener('click', () => {
        const id = parseInt(cb.dataset.logCheckId);
        const logs = getDailyLogs();
        const log = logs.find(l => l.id === id);
        if (log) {
          log.status = log.status === STATUS.COMPLETED ? STATUS.PENDING : STATUS.COMPLETED;
          saveDailyLogs(logs);
          renderLogEntries();
        }
      });
    });

    // Delete buttons
    container.querySelectorAll('[data-log-delete-id]').forEach(btn => {
      btn.addEventListener('click', () => {
        deleteLogEntry(parseInt(btn.dataset.logDeleteId));
      });
    });

    // Drag and drop for logs
    container.querySelectorAll('.planner-task-row').forEach(row => {
      row.addEventListener('dragstart', (e) => {
        draggedRow = row;
        row.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        container.querySelectorAll('.planner-task-row').forEach(r => r.classList.remove('drag-over'));
        draggedRow = null;

        // Persist new order
        const newOrder = [];
        container.querySelectorAll('.planner-task-row').forEach(r => {
          newOrder.push(parseInt(r.dataset.logId));
        });

        const logs = getDailyLogs();
        const reordered = newOrder.map(id => logs.find(l => l.id === id)).filter(Boolean);
        saveDailyLogs(reordered);
      });

      row.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (draggedRow && draggedRow !== row) {
          row.classList.add('drag-over');
          const rect = row.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            container.insertBefore(draggedRow, row);
          } else {
            container.insertBefore(draggedRow, row.nextSibling);
          }
        }
      });

      row.addEventListener('dragleave', () => {
        row.classList.remove('drag-over');
      });
    });
  }

  /* --- Helpers --- */
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, renderPlannerTasks, renderLogEntries };
})();
