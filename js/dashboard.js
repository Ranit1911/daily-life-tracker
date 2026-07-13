/* ============================================
   LifeOS — Dashboard Module
   Circular progress, category cards, stats
   ============================================ */

const Dashboard = (() => {
  let todayData = null;
  let holdInterval = null;

  /* --- Initialize --- */
  async function init() {
    todayData = await Storage.getDayData(Storage.getTodayString());

    renderGreeting();
    renderCircularProgress();
    renderCategoryCards();
    renderDashboardStats();
    renderEncouragement();

    // Listen for view changes
    App.on('viewChanged', (view) => {
      if (view === 'dashboard') refresh();
    });
  }

  /* --- Refresh --- */
  async function refresh() {
    todayData = await Storage.getDayData(Storage.getTodayString());
    renderCircularProgress();
    updateCategoryCards();
    renderDashboardStats();
    renderEncouragement();

    // Update daily change if Streak module is loaded
    if (typeof Streak !== 'undefined') {
      Streak.renderDailyChange();
    }
  }



  /* --- Render Greeting --- */
  function renderGreeting() {
    const greeting = App.getGreeting();
    const greetingEl = document.getElementById('greeting-text');
    const dateEl = document.getElementById('date-text');
    const quoteEl = document.getElementById('quote-text');

    if (greetingEl) {
      const greetingIcons = {
        '☀️': 'sun',
        '🌤': 'cloud-sun',
        '🌙': 'moon'
      };
      const iconName = greetingIcons[greeting.emoji] || 'sun';
      greetingEl.innerHTML = `${greeting.text} <i data-lucide="${iconName}" style="display: inline-block; width: 28px; height: 28px; vertical-align: text-bottom; margin-left: 6px;"></i>`;
    }
    if (dateEl) dateEl.textContent = App.getFormattedDate();
    if (quoteEl) quoteEl.textContent = `"${App.getDailyQuote()}"`;
  }

  /* --- Render Circular Progress --- */
  function renderCircularProgress() {
    const score = todayData.score;
    const svg = document.getElementById('score-progress-bar');
    const scoreValueEl = document.getElementById('score-value');
    const scoreLabelEl = document.getElementById('score-label');

    if (!svg) return;

    const radius = 95;
    const circumference = 2 * Math.PI * radius;
    svg.style.strokeDasharray = circumference;

    // Animate
    const offset = circumference - (score / 100) * circumference;
    requestAnimationFrame(() => {
      svg.style.strokeDashoffset = offset;
    });

    // Update gradient color based on score
    const gradStart = document.getElementById('scoreGradStart');
    const gradEnd = document.getElementById('scoreGradEnd');
    if (gradStart && gradEnd) {
      if (score >= 90) {
        gradStart.setAttribute('stop-color', '#10b981');
        gradEnd.setAttribute('stop-color', '#059669');
      } else if (score >= 75) {
        gradStart.setAttribute('stop-color', '#84cc16');
        gradEnd.setAttribute('stop-color', '#10b981');
      } else if (score >= 55) {
        gradStart.setAttribute('stop-color', '#eab308');
        gradEnd.setAttribute('stop-color', '#f97316');
      } else if (score >= 35) {
        gradStart.setAttribute('stop-color', '#f97316');
        gradEnd.setAttribute('stop-color', '#ef4444');
      } else {
        gradStart.setAttribute('stop-color', '#ef4444');
        gradEnd.setAttribute('stop-color', '#dc2626');
      }
    }

    // Animate score number
    if (scoreValueEl) animateNumber(scoreValueEl, score);
    if (scoreLabelEl) scoreLabelEl.textContent = App.getScoreLabel(score);

    // Confetti at 100%
    if (score >= 100) {
      App.triggerConfetti();
    }
  }

  /* --- Animate Number --- */
  function animateNumber(el, target) {
    const current = parseInt(el.textContent) || 0;
    const diff = target - current;
    if (diff === 0) { el.textContent = `${target}%`; return; }
    const steps = 30;
    let step = 0;
    const increment = diff / steps;

    function tick() {
      step++;
      const value = Math.round(current + increment * step);
      el.textContent = `${value}%`;
      if (step < steps) requestAnimationFrame(tick);
      else el.textContent = `${target}%`;
    }
    requestAnimationFrame(tick);
  }

  const CATEGORY_ICONS = {
    growth: 'sprout',
    sleep: 'moon-star',
    maintenance: 'utensils',
    workout: 'dumbbell',
    relief: 'gamepad-2',
    storage: 'package'
  };

  /* --- Render Category Cards --- */
  function renderCategoryCards() {
    const grid = document.getElementById('categories-grid');
    if (!grid) return;

    grid.innerHTML = '';

    Object.entries(Storage.CATEGORIES).forEach(([key, cat]) => {
      const currentHours = todayData.categories[key] || 0;
      const progress = Math.min(Math.round((currentHours / cat.goalHours) * 100), 100);
      const maxHours = 24;

      const card = document.createElement('div');
      card.className = 'category-card';
      card.dataset.category = key;

      card.innerHTML = `
        <div class="category-header">
          <div class="category-info">
            <div class="premium-icon-container ${key}">
              <i data-lucide="${CATEGORY_ICONS[key]}"></i>
            </div>
            <div>
              <div class="category-name">${cat.name}</div>
              <span class="daily-change neutral" id="change-${key}">
                <span class="daily-change-icon">▬</span>
                <span>0%</span>
              </span>
            </div>
          </div>
          <span class="category-goal-badge">${cat.goalPercent}%</span>
        </div>
        <div class="category-stats">
          <div class="category-stat">
            <div class="category-stat-value">${App.formatHours(cat.goalHours)}</div>
            <div class="category-stat-label">Goal</div>
          </div>
          <div class="category-stat">
            <div class="category-stat-value current-hours" id="current-${key}">${App.formatHours(currentHours)}</div>
            <div class="category-stat-label">Current</div>
          </div>
          <div class="category-stat">
            <div class="category-stat-value progress-pct" id="progress-${key}">${progress}%</div>
            <div class="category-stat-label">Progress</div>
          </div>
        </div>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" id="bar-${key}" style="width: ${progress}%"></div>
        </div>
        <div class="category-controls">
          <button class="control-btn ripple-container btn-press" data-action="decrease" data-category="${key}" aria-label="Decrease ${cat.name}">−</button>
          <input type="range" class="category-slider" id="slider-${key}" min="0" max="${maxHours}" step="0.25" value="${currentHours}" aria-label="${cat.name} hours">
          <span class="category-percentage" id="pct-${key}">${App.formatHours(currentHours)}</span>
          <button class="control-btn ripple-container btn-press" data-action="increase" data-category="${key}" aria-label="Increase ${cat.name}">+</button>
        </div>
      `;

      grid.appendChild(card);

      // Event listeners
      const slider = card.querySelector(`#slider-${key}`);
      const decreaseBtn = card.querySelector('[data-action="decrease"]');
      const increaseBtn = card.querySelector('[data-action="increase"]');

      slider.addEventListener('input', () => {
        updateCategory(key, parseFloat(slider.value));
      });

      // Single tap and press-and-hold for rapid increment
      const handlePointerDown = (e, delta) => {
        e.preventDefault(); // Prevents simulated mouse events and double-fires
        const current = todayData.categories[key] || 0;
        const limit = delta > 0 ? 24 : 0;
        const newVal = delta > 0 ? Math.min(limit, current + delta) : Math.max(limit, current + delta);
        updateCategory(key, newVal);
        startHold(key, delta);
      };

      decreaseBtn.addEventListener('pointerdown', (e) => handlePointerDown(e, -0.25));
      decreaseBtn.addEventListener('pointerup', stopHold);
      decreaseBtn.addEventListener('pointerleave', stopHold);
      decreaseBtn.addEventListener('pointercancel', stopHold);

      increaseBtn.addEventListener('pointerdown', (e) => handlePointerDown(e, 0.25));
      increaseBtn.addEventListener('pointerup', stopHold);
      increaseBtn.addEventListener('pointerleave', stopHold);
      increaseBtn.addEventListener('pointercancel', stopHold);
    });

    updateSlidersMax();

    // Initialize Lucide icons on new elements
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /* --- Hold for rapid increment --- */
  function startHold(category, delta) {
    let count = 0;
    holdInterval = setInterval(() => {
      count++;
      if (count > 2) { // Start rapid after 2 ticks
        const current = todayData.categories[category] || 0;
        const newVal = Math.max(0, Math.min(24, current + delta));
        updateCategory(category, newVal);
      }
    }, 150);
  }

  function stopHold() {
    if (holdInterval) {
      clearInterval(holdInterval);
      holdInterval = null;
    }
  }

  /* --- Update Category --- */
  async function updateCategory(key, value) {
    value = Math.max(0, Math.min(24, Math.round(value * 4) / 4)); // Snap to 0.25

    // Cap total hours at 24 across all categories with strict Number coercion
    const otherHours = Object.entries(todayData.categories)
      .filter(([k]) => k !== key)
      .reduce((sum, [, v]) => sum + Number(v), 0);
    const maxForThis = Math.max(0, 24 - otherHours);
    value = Math.min(value, maxForThis);
    value = Math.round(value * 4) / 4; // Re-snap after capping

    todayData.categories[key] = value;
    todayData.score = Storage.calculateScore(todayData.categories);

    // Update UI
    const cat = Storage.CATEGORIES[key];
    const progress = Math.min(Math.round((value / cat.goalHours) * 100), 100);

    const currentEl = document.getElementById(`current-${key}`);
    const progressEl = document.getElementById(`progress-${key}`);
    const barEl = document.getElementById(`bar-${key}`);
    const sliderEl = document.getElementById(`slider-${key}`);
    const pctEl = document.getElementById(`pct-${key}`);

    if (currentEl) currentEl.textContent = App.formatHours(value);
    if (progressEl) progressEl.textContent = `${progress}%`;
    if (barEl) barEl.style.width = `${progress}%`;
    if (sliderEl) sliderEl.value = value;
    if (pctEl) pctEl.textContent = App.formatHours(value);

    // Dynamic max hours updates for all sliders
    updateSlidersMax();

    renderCircularProgress();
    renderDashboardStats();
    renderEncouragement();

    // Save
    await Storage.saveDayData(Storage.getTodayString(), todayData.categories);
    App.emit('dataChanged', todayData);
  }

  /* --- Update Sliders Max --- */
  function updateSlidersMax() {
    if (!todayData || !todayData.categories) return;
    const categories = todayData.categories;
    const totalHours = Object.values(categories).reduce((sum, v) => sum + Number(v), 0);

    Object.keys(Storage.CATEGORIES).forEach(key => {
      const sliderEl = document.getElementById(`slider-${key}`);
      if (sliderEl) {
        const currentVal = Number(categories[key]) || 0;
        const otherHours = totalHours - currentVal;
        const maxForThis = Math.max(0, 24 - otherHours);
        sliderEl.max = maxForThis;
      }
    });
  }

  /* --- Update Category Cards (without re-creating DOM) --- */
  function updateCategoryCards() {
    Object.entries(Storage.CATEGORIES).forEach(([key, cat]) => {
      const currentHours = todayData.categories[key] || 0;
      const progress = Math.min(Math.round((currentHours / cat.goalHours) * 100), 100);

      const currentEl = document.getElementById(`current-${key}`);
      const progressEl = document.getElementById(`progress-${key}`);
      const barEl = document.getElementById(`bar-${key}`);
      const sliderEl = document.getElementById(`slider-${key}`);
      const pctEl = document.getElementById(`pct-${key}`);

      if (currentEl) currentEl.textContent = App.formatHours(currentHours);
      if (progressEl) progressEl.textContent = `${progress}%`;
      if (barEl) barEl.style.width = `${progress}%`;
      if (sliderEl) sliderEl.value = currentHours;
      if (pctEl) pctEl.textContent = App.formatHours(currentHours);
    });

    updateSlidersMax();
  }

  /* --- Render Dashboard Stats --- */
  function renderDashboardStats() {
    const totalHours = Object.values(todayData.categories).reduce((s, v) => s + Number(v), 0);
    const remainingHours = Math.max(0, 24 - totalHours);
    const pctCompleted = Math.round((totalHours / 24) * 100);

    // Most/least active
    let mostActive = '', leastActive = '', maxH = -1, minH = 25;
    Object.entries(todayData.categories).forEach(([key, val]) => {
      if (val > maxH) { maxH = val; mostActive = Storage.CATEGORIES[key].name; }
      if (val < minH) { minH = val; leastActive = Storage.CATEGORIES[key].name; }
    });

    const statsData = [
      { icon: '🎯', value: `${todayData.score}%`, label: "Today's Score" },
      { icon: '⏱', value: App.formatHours(totalHours), label: "Hours Completed" },
      { icon: '⏳', value: App.formatHours(remainingHours), label: "Hours Remaining" },
      { icon: '📊', value: `${pctCompleted}%`, label: "Day Completed" },
      { icon: '🔥', value: mostActive || '—', label: "Most Active" },
      { icon: '💤', value: leastActive || '—', label: "Least Active" }
    ];

    const OVERVIEW_ICONS = {
      "Today's Score": 'target',
      "Hours Completed": 'clock',
      "Hours Remaining": 'hourglass',
      "Day Completed": 'check-circle-2',
      "Most Active": 'zap',
      "Least Active": 'moon'
    };

    const container = document.getElementById('dashboard-stats');
    if (!container) return;

    container.innerHTML = statsData.map(stat => {
      const iconName = OVERVIEW_ICONS[stat.label] || 'activity';
      return `
        <div class="stat-card card-elevate">
          <div style="display: flex; justify-content: center; margin-bottom: var(--space-xs);">
            <div class="dashboard-icon-container">
              <i data-lucide="${iconName}"></i>
            </div>
          </div>
          <div class="stat-card-value">${stat.value}</div>
          <div class="stat-card-label">${stat.label}</div>
        </div>
      `;
    }).join('');
  }

  /* --- Render Encouragement --- */
  function renderEncouragement() {
    const el = document.getElementById('encouragement-text');
    if (el) el.textContent = App.getEncouragement(todayData.score);
  }

  return { init, refresh };
})();
