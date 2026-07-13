/* ============================================
   LifeOS — Streak Module
   Battery streak, weekly badge, daily % change
   ============================================ */

const Streak = (() => {
  const BATTERY_COLORS = [
    '#ef4444', // Day 1 - Red
    '#f97316', // Day 2 - Orange
    '#f59e0b', // Day 3 - Yellow/Amber
    '#eab308', // Day 4 - Yellow
    '#84cc16', // Day 5 - Light Green
    '#22c55e', // Day 6 - Green
    '#10b981'  // Day 7 - Bright Green/Emerald
  ];

  /* --- Initialize --- */
  function init() {
    render();

    App.on('dataChanged', () => render());
    App.on('viewChanged', (view) => {
      if (view === 'dashboard') render();
    });
  }

  /* --- Render all streak components --- */
  async function render() {
    await renderBatteryStreak();
    await renderWeeklyBadge();
    await renderDailyChange();
  }

  /* --- Calculate current streak --- */
  function getCurrentStreak() {
    try {
      const val = localStorage.getItem('lifeos_logs');
      const logs = val ? JSON.parse(val) : {};
      const loggedDates = new Set();

      Object.values(logs).forEach(log => {
        const total = Object.values(log.categories).reduce((s, v) => s + v, 0);
        if (total > 0) loggedDates.add(log.date);
      });

      let streak = 0;
      const d = new Date();
      const todayDs = Storage.getDateString(d);
      if (!loggedDates.has(todayDs)) {
        d.setDate(d.getDate() - 1);
      }
      while (true) {
        const ds = Storage.getDateString(d);
        if (loggedDates.has(ds)) {
          streak++;
          d.setDate(d.getDate() - 1);
        } else {
          break;
        }
      }
      return streak;
    } catch {
      return 0;
    }
  }

  /* --- Get weekly streak count --- */
  function getWeeklyStreakCount() {
    try {
      const val = localStorage.getItem('lifeos_weekly_streaks');
      return val ? parseInt(val) : 0;
    } catch {
      return 0;
    }
  }

  /* --- Set weekly streak count --- */
  function setWeeklyStreakCount(count) {
    localStorage.setItem('lifeos_weekly_streaks', String(count));
  }

  /* --- Get last recorded streak day (to track when to reset) --- */
  function getLastStreakDay() {
    try {
      const val = localStorage.getItem('lifeos_last_streak_day');
      return val ? parseInt(val) : 0;
    } catch {
      return 0;
    }
  }

  function setLastStreakDay(day) {
    localStorage.setItem('lifeos_last_streak_day', String(day));
  }

  /* --- Render Battery Streak --- */
  async function renderBatteryStreak() {
    const segmentsContainer = document.getElementById('battery-segments');
    const dayText = document.getElementById('battery-day-text');
    const titleEl = document.getElementById('streak-title');
    const subtitleEl = document.getElementById('streak-subtitle');

    if (!segmentsContainer) return;

    const totalStreak = getCurrentStreak();
    const cycleDay = totalStreak === 0 ? 0 : ((totalStreak - 1) % 7) + 1; // 1-7
    const lastDay = getLastStreakDay();

    // Check if we completed a 7-day cycle
    if (lastDay === 7 && cycleDay === 1 && totalStreak > 7) {
      // Just rolled over
      const currentWeekly = getWeeklyStreakCount();
      setWeeklyStreakCount(currentWeekly + 1);
    } else if (cycleDay === 7 && lastDay < 7) {
      // Completed Day 7 but haven't incremented yet — will increment on next cycle
    }

    setLastStreakDay(cycleDay);

    // Build 7 segments
    segmentsContainer.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const segment = document.createElement('div');
      segment.className = 'battery-segment';
      if (i < cycleDay) {
        segment.classList.add('active');
        segment.style.setProperty('--segment-color', BATTERY_COLORS[i]);
        segment.style.background = BATTERY_COLORS[i];
        segment.style.boxShadow = `0 0 8px ${BATTERY_COLORS[i]}40`;
        segment.style.animationDelay = `${i * 80}ms`;
      }
      segmentsContainer.appendChild(segment);
    }

    // Update text
    if (dayText) dayText.textContent = cycleDay > 0 ? `Day ${cycleDay}/7` : 'Day 0';
    if (titleEl) titleEl.textContent = totalStreak > 0 ? `${totalStreak} Day Streak` : 'Daily Streak';

    if (subtitleEl) {
      if (totalStreak === 0) {
        subtitleEl.textContent = 'Start logging to build your streak!';
      } else if (cycleDay === 7) {
        subtitleEl.textContent = '🎉 Week complete! Keep going!';
      } else {
        subtitleEl.textContent = `${7 - cycleDay} more day${7 - cycleDay !== 1 ? 's' : ''} to complete this week`;
      }
    }
  }

  /* --- Render Weekly Badge --- */
  async function renderWeeklyBadge() {
    const container = document.getElementById('weekly-badge-container');
    if (!container) return;

    // Calculate completed weekly streaks
    const totalStreak = getCurrentStreak();
    const completedWeeks = Math.max(getWeeklyStreakCount(), Math.floor(totalStreak / 7));

    // Save if calculated is higher
    if (Math.floor(totalStreak / 7) > getWeeklyStreakCount()) {
      setWeeklyStreakCount(Math.floor(totalStreak / 7));
    }

    if (completedWeeks > 0) {
      container.innerHTML = `
        <div class="weekly-badge">
          <span class="weekly-badge-icon">🏆</span>
          <div>
            <div class="weekly-badge-count">${completedWeeks}</div>
            <div class="weekly-badge-text">Weekly Streak${completedWeeks !== 1 ? 's' : ''}</div>
          </div>
        </div>
      `;
    } else {
      container.innerHTML = `
        <div class="weekly-badge" style="opacity: 0.5; animation: none;">
          <span class="weekly-badge-icon">🔒</span>
          <div>
            <div class="weekly-badge-count">0</div>
            <div class="weekly-badge-text">Weekly Streaks</div>
          </div>
        </div>
      `;
    }
  }

  /* --- Render Daily Percentage Change on Category Cards --- */
  async function renderDailyChange() {
    const todayStr = Storage.getTodayString();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = Storage.getDateString(yesterday);

    const todayData = await Storage.getDayData(todayStr);
    const yesterdayData = await Storage.getDayData(yesterdayStr);

    Object.keys(Storage.CATEGORIES).forEach(key => {
      const changeEl = document.getElementById(`change-${key}`);
      if (!changeEl) return;

      const todayHours = todayData.categories[key] || 0;
      const yesterdayHours = yesterdayData.categories[key] || 0;

      let pctChange = 0;
      if (yesterdayHours > 0) {
        pctChange = Math.round(((todayHours - yesterdayHours) / yesterdayHours) * 100);
      } else if (todayHours > 0) {
        pctChange = 100;
      }

      let icon, cls, label;
      if (pctChange > 0) {
        icon = '▲';
        cls = 'positive';
        label = 'Growth';
      } else if (pctChange < 0) {
        icon = '▼';
        cls = 'negative';
        label = 'Decline';
      } else {
        icon = '▬';
        cls = 'neutral';
        label = 'Maintained';
      }

      changeEl.className = `daily-change ${cls}`;
      changeEl.innerHTML = `
        <span class="daily-change-icon">${icon}</span>
        <span>${pctChange > 0 ? '+' : ''}${pctChange}%</span>
      `;
      changeEl.title = label;
    });
  }

  return { init, render, renderDailyChange, getCurrentStreak, getWeeklyStreakCount };
})();
