/* ============================================
   LifeOS — Settings Module
   Theme, accent, export, import, reset
   ============================================ */

const Settings = (() => {

  /* --- Initialize --- */
  function init() {
    setupThemeToggle();
    setupAccentSwatches();
    setupAnimationToggle();
    setupNotificationToggle();
    setupExport();
    setupExportPDF();
    setupImport();
    setupReset();
    setupGoalsConfig();

    // Restore current states
    restoreSettings();

    App.on('viewChanged', (view) => {
      if (view === 'settings') restoreSettings();
    });
  }

  /* --- Restore Settings to UI --- */
  function restoreSettings() {
    const settings = Storage.getSettings();

    // Theme toggle
    const themeToggle = document.getElementById('toggle-theme');
    if (themeToggle) {
      themeToggle.classList.toggle('active', settings.theme === 'dark');
    }

    // Accent swatches
    document.querySelectorAll('.accent-swatch').forEach(swatch => {
      swatch.classList.toggle('active', swatch.dataset.accent === settings.accent);
    });

    // Animation toggle
    const animToggle = document.getElementById('toggle-animations');
    if (animToggle) animToggle.classList.toggle('active', settings.animations === true);

    // Notification toggle
    const notifToggle = document.getElementById('toggle-notifications');
    if (notifToggle) {
      notifToggle.classList.toggle('active', settings.notifications === true);
    }

    renderGoalsConfig();
  }

  /* --- Theme Toggle --- */
  function setupThemeToggle() {
    const toggle = document.getElementById('toggle-theme');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const current = Storage.getSetting('theme', 'dark');
      const newTheme = current === 'dark' ? 'light' : 'dark';
      Storage.setSetting('theme', newTheme);
      document.documentElement.setAttribute('data-theme', newTheme);
      toggle.classList.toggle('active', newTheme === 'dark');
      App.showToast('🎨', `Switched to ${newTheme} mode`);

      // Re-render charts with new colors
      if (typeof Charts !== 'undefined') {
        setTimeout(() => Charts.renderAllCharts(), 100);
      }
    });
  }

  /* --- Accent Color Swatches --- */
  function setupAccentSwatches() {
    document.querySelectorAll('.accent-swatch').forEach(swatch => {
      swatch.addEventListener('click', () => {
        const accent = swatch.dataset.accent;
        Storage.setSetting('accent', accent);
        document.documentElement.setAttribute('data-accent', accent);

        // Update active state
        document.querySelectorAll('.accent-swatch').forEach(s => s.classList.remove('active'));
        swatch.classList.add('active');

        App.showToast('🎨', `Accent color changed to ${accent}`);

        // Re-render charts
        if (typeof Charts !== 'undefined') {
          setTimeout(() => Charts.renderAllCharts(), 100);
        }
      });
    });
  }

  /* --- Animation Toggle --- */
  function setupAnimationToggle() {
    const toggle = document.getElementById('toggle-animations');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const current = Storage.getSetting('animations', true);
      const newVal = !current;
      Storage.setSetting('animations', newVal);
      document.documentElement.setAttribute('data-animations', newVal);
      toggle.classList.toggle('active', newVal);
      App.showToast('✨', `Animations ${newVal ? 'enabled' : 'disabled'}`);
    });
  }

  /* --- Notification Toggle --- */
  function setupNotificationToggle() {
    const toggle = document.getElementById('toggle-notifications');
    if (!toggle) return;

    toggle.addEventListener('click', () => {
      const current = Storage.getSetting('notifications', true);
      const newVal = !current;
      Storage.setSetting('notifications', newVal);
      toggle.classList.toggle('active', newVal);
      App.showToast('🔔', `Notifications ${newVal ? 'enabled' : 'disabled'}`);
    });
  }

  /* --- Goals Configuration --- */
  function renderGoalsConfig() {
    const container = document.getElementById('goals-config-container');
    if (!container) return;
    container.innerHTML = '';

    const categories = Storage.CATEGORIES;
    Object.keys(categories).forEach(key => {
      const cat = categories[key];
      const item = document.createElement('div');
      item.className = 'settings-item';
      item.style.marginBottom = '0.5rem';
      item.innerHTML = `
        <div class="settings-item-info">
          <div class="settings-item-icon">${cat.icon}</div>
          <div class="settings-item-text">
            <h4>${cat.name}</h4>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 0.5rem;">
          <input type="number" id="goal-input-${key}" class="goal-input" value="${cat.goalHours}" min="0" max="24" step="0.25" style="width: 70px; padding: 0.5rem; border-radius: 8px; border: 1px solid var(--border-color); background: rgba(255,255,255,0.05); color: var(--text-color); font-size: 1rem;">
          <span style="color: var(--text-secondary);">hours</span>
        </div>
      `;
      container.appendChild(item);
    });
  }

  function setupGoalsConfig() {
    const btn = document.getElementById('btn-save-goals');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const newGoals = {};
      const categories = Storage.CATEGORIES;
      Object.keys(categories).forEach(key => {
        const input = document.getElementById(`goal-input-${key}`);
        if (input) {
          const val = parseFloat(input.value);
          if (!isNaN(val) && val >= 0) {
            newGoals[key] = val;
          }
        }
      });
      Storage.saveCategories(newGoals);
      App.showToast('✅', 'Goals updated successfully!');
      
      // Re-render dashboard if we're on it, but Settings is currently active
      // Dashboard will auto-render when navigated to, thanks to App.js calling initDashboard
    });
  }

  /* --- Export Data --- */
  function setupExport() {
    const btn = document.getElementById('btn-export');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      try {
        const data = await Storage.getAllData();
        const json = JSON.stringify(data, null, 2);
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `lifeos-backup-${Storage.getTodayString()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        App.showToast('💾', 'Data exported successfully!');
      } catch (e) {
        App.showToast('❌', 'Export failed: ' + e.message);
      }
    });
  }

  /* --- Export PDF --- */
  function setupExportPDF() {
    const btn = document.getElementById('btn-export-pdf');
    if (!btn) return;

    btn.addEventListener('click', async () => {
      try {
        if (!window.jspdf) {
          App.showToast('❌', 'PDF library not loaded yet');
          return;
        }

        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Title
        doc.setFontSize(22);
        doc.text("LifeOS - Personal Data Report", 14, 22);
        
        // Get data
        const data = await Storage.getAllData();
        const stats = await Storage.getStats();
        
        // Add Summary Stats
        doc.setFontSize(14);
        doc.text("Summary Statistics", 14, 34);
        doc.setFontSize(11);
        doc.text(`Total Days Logged: ${stats.totalDays}`, 14, 42);
        doc.text(`Average Balance Score: ${stats.avgScore}%`, 14, 48);
        doc.text(`Longest Streak: ${stats.longestStreak} days`, 14, 54);
        doc.text(`Total Growth Hours: ${stats.totalGrowth}h`, 14, 60);
        
        // Daily Logs Table
        const logs = data.dailyLogs.sort((a, b) => b.date.localeCompare(a.date)); // Sort newest first
        
        const tableColumn = ["Date", "Score", "Growth", "Sleep", "Maint.", "Workout", "Relief", "Storage"];
        const tableRows = [];

        logs.forEach(log => {
          const cat = log.categories;
          const row = [
            log.date,
            `${log.score}%`,
            `${cat.growth || 0}h`,
            `${cat.sleep || 0}h`,
            `${cat.maintenance || 0}h`,
            `${cat.workout || 0}h`,
            `${cat.relief || 0}h`,
            `${cat.storage || 0}h`
          ];
          tableRows.push(row);
        });

        doc.autoTable({
          head: [tableColumn],
          body: tableRows,
          startY: 68,
          theme: 'striped',
          headStyles: { fillColor: [139, 92, 246] }
        });
        
        // Save PDF
        doc.save(`lifeos-report-${Storage.getTodayString()}.pdf`);
        App.showToast('📄', 'PDF exported successfully!');

      } catch (e) {
        console.error(e);
        App.showToast('❌', 'PDF Export failed: ' + e.message);
      }
    });
  }

  /* --- Import Data --- */
  function setupImport() {
    const btn = document.getElementById('btn-import');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';

      input.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
          const text = await file.text();
          await Storage.importData(text);
          App.showToast('✅', 'Data imported successfully! Refreshing...');

          // Refresh all views
          setTimeout(() => window.location.reload(), 1500);
        } catch (err) {
          App.showToast('❌', 'Import failed: ' + err.message);
        }
      });

      input.click();
    });
  }

  /* --- Reset Data --- */
  function setupReset() {
    const btn = document.getElementById('btn-reset');
    if (!btn) return;

    btn.addEventListener('click', () => {
      const overlay = document.getElementById('modal-overlay');
      const modal = overlay.querySelector('.modal');

      modal.innerHTML = `
        <div class="modal-title">⚠️ Reset All Data</div>
        <div class="modal-body">
          <p style="color: var(--text-secondary); margin-bottom: var(--space-md);">
            This will permanently delete all your tracked data, achievements, and settings. This action cannot be undone.
          </p>
          <p style="color: var(--color-poor); font-weight: 600;">
            Are you sure you want to continue?
          </p>
        </div>
        <div class="modal-actions">
          <button class="modal-btn modal-btn-secondary" id="reset-cancel">Cancel</button>
          <button class="modal-btn modal-btn-danger" id="reset-confirm">Reset Everything</button>
        </div>
      `;

      overlay.classList.add('active');

      document.getElementById('reset-cancel').addEventListener('click', () => {
        overlay.classList.remove('active');
      });

      document.getElementById('reset-confirm').addEventListener('click', async () => {
        await Storage.clearAllData();
        overlay.classList.remove('active');
        App.showToast('🗑️', 'All data has been reset.');
        setTimeout(() => window.location.reload(), 1500);
      });

      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) overlay.classList.remove('active');
      });
    });
  }

  return { init };
})();
