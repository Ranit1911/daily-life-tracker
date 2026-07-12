/* ============================================
   LifeOS — Widgets Module
   Quick Notes + Next Hours Timeline
   ============================================ */

const Widgets = (() => {
  let saveTimeout = null;
  let timelineUpdateInterval = null;

  /* --- Initialize --- */
  function init() {
    initQuickNotes();
    initTimeline();

    App.on('viewChanged', (view) => {
      if (view === 'dashboard') {
        refreshTimeline();
      }
    });
  }

  /* ============================================
     QUICK NOTES
     ============================================ */
  function initQuickNotes() {
    const textarea = document.getElementById('quick-notes-textarea');
    if (!textarea) return;

    // Load saved notes
    const saved = getQuickNotes();
    if (saved.text) {
      textarea.value = saved.text;
    }

    // Update timestamp
    updateNotesTimestamp(saved.timestamp);

    // Auto-save on input
    textarea.addEventListener('input', () => {
      clearTimeout(saveTimeout);
      saveTimeout = setTimeout(() => {
        saveQuickNotes(textarea.value);
        showSaveIndicator();
      }, 500);
    });
  }

  function getQuickNotes() {
    try {
      const val = localStorage.getItem('lifeos_quick_notes');
      return val ? JSON.parse(val) : { text: '', timestamp: null };
    } catch {
      return { text: '', timestamp: null };
    }
  }

  function saveQuickNotes(text) {
    const data = {
      text,
      timestamp: Date.now()
    };
    localStorage.setItem('lifeos_quick_notes', JSON.stringify(data));
    updateNotesTimestamp(data.timestamp);
  }

  function updateNotesTimestamp(timestamp) {
    const el = document.getElementById('notes-timestamp');
    if (!el) return;

    if (timestamp) {
      const date = new Date(timestamp);
      const now = new Date();
      const diff = now - date;

      if (diff < 60000) {
        el.textContent = 'Just now';
      } else if (diff < 3600000) {
        el.textContent = `${Math.floor(diff / 60000)}m ago`;
      } else if (diff < 86400000) {
        el.textContent = `${Math.floor(diff / 3600000)}h ago`;
      } else {
        el.textContent = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      }
    } else {
      el.textContent = '';
    }
  }

  function showSaveIndicator() {
    const indicator = document.getElementById('notes-save-indicator');
    if (!indicator) return;

    indicator.classList.add('visible');
    setTimeout(() => {
      indicator.classList.remove('visible');
    }, 2000);
  }

  /* ============================================
     NEXT HOURS TIMELINE
     ============================================ */
  function initTimeline() {
    const addBtn = document.getElementById('timeline-add-btn');
    if (addBtn) {
      addBtn.addEventListener('click', () => addTimelineEntry());
    }

    refreshTimeline();

    // Update current time indicator every minute
    timelineUpdateInterval = setInterval(() => {
      refreshTimeline();
    }, 60000);
  }

  function getTimelineEntries() {
    try {
      const todayStr = Storage.getTodayString();
      const val = localStorage.getItem(`lifeos_timeline_${todayStr}`);
      return val ? JSON.parse(val) : [];
    } catch {
      return [];
    }
  }

  function saveTimelineEntries(entries) {
    const todayStr = Storage.getTodayString();
    localStorage.setItem(`lifeos_timeline_${todayStr}`, JSON.stringify(entries));
  }

  function addTimelineEntry() {
    const entries = getTimelineEntries();
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setHours(nextHour.getHours() + 1, 0, 0, 0);

    entries.push({
      id: Date.now(),
      time: `${String(nextHour.getHours()).padStart(2, '0')}:${String(nextHour.getMinutes()).padStart(2, '0')}`,
      task: 'New Task',
      completed: false
    });

    // Sort by time
    entries.sort((a, b) => a.time.localeCompare(b.time));

    saveTimelineEntries(entries);
    refreshTimeline();
  }

  function deleteTimelineEntry(id) {
    let entries = getTimelineEntries();
    entries = entries.filter(e => e.id !== id);
    saveTimelineEntries(entries);
    refreshTimeline();
  }

  function updateTimelineEntry(id, field, value) {
    const entries = getTimelineEntries();
    const entry = entries.find(e => e.id === id);
    if (entry) {
      entry[field] = value;
      if (field === 'time') {
        entries.sort((a, b) => a.time.localeCompare(b.time));
      }
      saveTimelineEntries(entries);
      if (field === 'time') refreshTimeline();
    }
  }

  function refreshTimeline() {
    const container = document.getElementById('timeline-list');
    if (!container) return;

    const entries = getTimelineEntries();
    const now = new Date();
    const currentTimeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: var(--space-xl) var(--space-md);">
          <div class="empty-state-icon">
            <i data-lucide="clock" class="lucide-icon"></i>
          </div>
          <div class="empty-state-title">No tasks scheduled</div>
          <div class="empty-state-desc">Add your upcoming tasks to stay on track</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = entries.map((entry, i) => {
      const isPast = entry.time < currentTimeStr || entry.completed;
      const isCurrent = !isPast && (i === 0 || entries[i - 1].time < currentTimeStr);

      return `
        <div class="timeline-item ${isPast ? 'past' : ''} ${isCurrent ? 'current' : ''}" 
             data-id="${entry.id}" style="animation-delay: ${i * 60}ms;">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-time">${formatTimeDisplay(entry.time)}</div>
            <input class="timeline-task task-name-input ${isPast ? 'completed' : ''}" 
                   value="${escapeHtml(entry.task)}"
                   data-field="task" data-id="${entry.id}"
                   aria-label="Task name" />
          </div>
          <button class="task-delete-btn" data-delete-id="${entry.id}" 
                  aria-label="Delete entry" style="opacity:1; flex-shrink:0;">
            <i data-lucide="x" style="width:14px;height:14px;" class="lucide-icon"></i>
          </button>
        </div>
      `;
    }).join('');

    // Attach event listeners
    container.querySelectorAll('.task-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        updateTimelineEntry(parseInt(e.target.dataset.id), 'task', e.target.value);
      });
      input.addEventListener('focus', () => {
        input.select();
      });
    });

    container.querySelectorAll('.task-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(btn.dataset.deleteId);
        deleteTimelineEntry(id);
      });
    });

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  /* --- Helpers --- */
  function formatTimeDisplay(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${displayH}:${String(m).padStart(2, '0')} ${period}`;
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  return { init, refreshTimeline };
})();
