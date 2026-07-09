/* ============================================
   LifeOS — Calendar Module
   Weekly view + Monthly calendar
   ============================================ */

const Calendar = (() => {
  let currentWeekStart = null;
  let currentMonth = null;
  let currentYear = null;

  /* --- Initialize --- */
  function init() {
    const now = new Date();

    // Set initial week (Sunday start)
    currentWeekStart = new Date(now);
    currentWeekStart.setDate(now.getDate() - now.getDay());
    currentWeekStart.setHours(0, 0, 0, 0);

    currentMonth = now.getMonth();
    currentYear = now.getFullYear();

    // Setup nav buttons
    setupWeeklyNav();
    setupMonthlyNav();

    // Listen for view changes
    App.on('viewChanged', (view) => {
      if (view === 'weekly') renderWeeklyView();
      if (view === 'monthly') renderMonthlyView();
    });

    // Listen for data changes
    App.on('dataChanged', () => {
      if (App.currentView === 'weekly') renderWeeklyView();
      if (App.currentView === 'monthly') renderMonthlyView();
    });

    renderWeeklyView();
    renderMonthlyView();
  }

  /* === WEEKLY VIEW === */

  function setupWeeklyNav() {
    const prevBtn = document.getElementById('week-prev');
    const nextBtn = document.getElementById('week-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() - 7);
        renderWeeklyView();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentWeekStart.setDate(currentWeekStart.getDate() + 7);
        renderWeeklyView();
      });
    }
  }

  async function renderWeeklyView() {
    const weekData = await Storage.getWeekData(currentWeekStart);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayStr = Storage.getTodayString();

    // Update title
    const titleEl = document.getElementById('week-title');
    if (titleEl) {
      const endDate = new Date(currentWeekStart);
      endDate.setDate(currentWeekStart.getDate() + 6);
      titleEl.textContent = `${formatShortDate(currentWeekStart)} — ${formatShortDate(endDate)}`;
    }

    // Render day cards
    const grid = document.getElementById('weekly-grid');
    if (!grid) return;

    grid.innerHTML = '';

    weekData.forEach((day, index) => {
      const d = new Date(currentWeekStart);
      d.setDate(currentWeekStart.getDate() + index);
      const dateStr = Storage.getDateString(d);
      const isToday = dateStr === todayStr;
      const totalHours = Object.values(day.categories).reduce((s, v) => s + v, 0);
      const hasData = totalHours > 0;

      const scoreColor = getScoreColor(day.score, hasData);

      const card = document.createElement('div');
      card.className = `day-card ${isToday ? 'today' : ''}`;
      card.innerHTML = `
        <div class="day-card-name">${dayNames[index]}</div>
        <div class="day-card-date">${d.getDate()}</div>
        <div class="day-card-score" style="color: ${scoreColor}">${hasData ? `${day.score}%` : '—'}</div>
        <div class="day-card-indicator" style="background: ${scoreColor}"></div>
      `;

      card.addEventListener('click', () => showDayDetail(dateStr, day));
      grid.appendChild(card);
    });
  }

  /* === MONTHLY VIEW === */

  function setupMonthlyNav() {
    const prevBtn = document.getElementById('month-prev');
    const nextBtn = document.getElementById('month-next');

    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        currentMonth--;
        if (currentMonth < 0) { currentMonth = 11; currentYear--; }
        renderMonthlyView();
      });
    }
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        currentMonth++;
        if (currentMonth > 11) { currentMonth = 0; currentYear++; }
        renderMonthlyView();
      });
    }
  }

  async function renderMonthlyView() {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    // Update title
    const titleEl = document.getElementById('calendar-title');
    if (titleEl) titleEl.textContent = `${monthNames[currentMonth]} ${currentYear}`;

    const grid = document.getElementById('calendar-grid');
    if (!grid) return;

    const monthData = await Storage.getMonthData(currentYear, currentMonth);
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = monthData.length;
    const todayStr = Storage.getTodayString();

    grid.innerHTML = '';

    // Day headers
    ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].forEach(name => {
      const header = document.createElement('div');
      header.className = 'calendar-day-header';
      header.textContent = name;
      grid.appendChild(header);
    });

    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) {
      const empty = document.createElement('div');
      empty.className = 'calendar-day empty';
      grid.appendChild(empty);
    }

    // Day cells
    monthData.forEach((day, index) => {
      const dateNum = index + 1;
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
      const isToday = dateStr === todayStr;
      const totalHours = Object.values(day.categories).reduce((s, v) => s + v, 0);
      const hasData = totalHours > 0;

      let dotClass = 'nodata';
      if (hasData) {
        if (day.score >= 80) dotClass = 'excellent';
        else if (day.score >= 50) dotClass = 'average';
        else dotClass = 'poor';
      }

      const cell = document.createElement('div');
      cell.className = `calendar-day ${isToday ? 'today' : ''}`;
      cell.innerHTML = `
        <span>${dateNum}</span>
        <div class="day-dot ${dotClass}"></div>
      `;

      cell.addEventListener('click', () => showDayDetail(dateStr, day));
      grid.appendChild(cell);
    });
  }

  /* === SHARED === */

  function getScoreColor(score, hasData) {
    if (!hasData) return 'var(--color-nodata)';
    if (score >= 80) return 'var(--color-excellent)';
    if (score >= 55) return 'var(--color-good)';
    if (score >= 30) return 'var(--color-fair)';
    return 'var(--color-poor)';
  }

  function formatShortDate(date) {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  }

  /* --- Day Detail Modal --- */
  function showDayDetail(dateStr, dayData) {
    const totalHours = Object.values(dayData.categories).reduce((s, v) => s + v, 0);
    const hasData = totalHours > 0;

    const dateObj = new Date(dateStr + 'T00:00:00');
    const dateFormatted = dateObj.toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    let detailItems = '';
    Object.entries(Storage.CATEGORIES).forEach(([key, cat]) => {
      const hours = dayData.categories[key] || 0;
      const progress = Math.min(Math.round((hours / cat.goalHours) * 100), 100);
      detailItems += `
        <li class="modal-detail-item">
          <span class="modal-detail-label">${cat.icon} ${cat.name}</span>
          <span class="modal-detail-value">${App.formatHours(hours)} / ${App.formatHours(cat.goalHours)} (${progress}%)</span>
        </li>
      `;
    });

    const overlay = document.getElementById('modal-overlay');
    const modal = overlay.querySelector('.modal');

    modal.innerHTML = `
      <div class="modal-title">${dateFormatted}</div>
      <div class="modal-body">
        <div style="text-align:center; margin-bottom: var(--space-lg);">
          <div style="font-size: var(--fs-3xl); font-weight: 800; color: var(--text-primary);">${hasData ? dayData.score + '%' : '—'}</div>
          <div style="font-size: var(--fs-base); color: var(--accent); font-weight: 600;">${hasData ? App.getScoreLabel(dayData.score) : 'No data logged'}</div>
        </div>
        <ul class="modal-detail-list">
          ${detailItems}
        </ul>
        <div style="text-align: center; margin-top: var(--space-md); color: var(--text-tertiary); font-size: var(--fs-sm);">
          Total: ${App.formatHours(totalHours)} / 24h
        </div>
      </div>
      <div class="modal-actions">
        <button class="modal-btn modal-btn-secondary" id="modal-close-btn">Close</button>
      </div>
    `;

    overlay.classList.add('active');

    document.getElementById('modal-close-btn').addEventListener('click', () => {
      overlay.classList.remove('active');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  }

  return { init, renderWeeklyView, renderMonthlyView };
})();
