/* ============================================
   LifeOS — Stats & Achievements Module
   Statistics screen + Achievements screen
   ============================================ */

const Stats = (() => {

  let activeTab = 'all';

  /* --- Initialize --- */
  function init() {
    App.on('viewChanged', (view) => {
      if (view === 'stats') renderStats();
      if (view === 'achievements') renderAchievements();
    });

    App.on('dataChanged', () => {
      if (App.currentView === 'stats') renderStats();
      if (App.currentView === 'achievements') renderAchievements();
    });

    // Set up tabs navigation event delegation
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.ach-tab-btn');
      if (!btn) return;
      
      const tabNav = btn.parentElement;
      tabNav.querySelectorAll('.ach-tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      activeTab = btn.dataset.tab;
      renderAchievements();
    });

    renderStats();
    renderAchievements();
  }

  /* --- Refresh (called after achievement unlock) --- */
  function refresh() {
    renderStats();
    renderAchievements();
  }

  /* --- Render Statistics --- */
  async function renderStats() {
    const grid = document.getElementById('stats-grid');
    if (!grid) return;

    const stats = await Storage.getStats();

    const statsCards = [
      { icon: '📊', value: `${stats.avgScore}%`, label: 'Average Life Score' },
      { icon: '🔥', value: stats.currentStreak, label: 'Current Streak' },
      { icon: '🏅', value: stats.longestStreak, label: 'Longest Streak' },
      { icon: '🌱', value: `${stats.totalGrowth}h`, label: 'Total Growth Hours' },
      { icon: '💪', value: `${stats.totalWorkout}h`, label: 'Total Workout Hours' },
      { icon: '😴', value: `${stats.avgSleep}h`, label: 'Average Sleep' },
      { icon: '⭐', value: stats.productiveDays, label: 'Productive Days' },
      { icon: '📅', value: stats.totalDays, label: 'Days Tracked' },
      { icon: '📈', value: `${stats.weeklyAvg}%`, label: 'Weekly Average' },
      { icon: '📆', value: `${stats.monthlyAvg}%`, label: 'Monthly Average' },
      { icon: '🗓', value: `${stats.yearlyAvg}%`, label: 'Yearly Average' }
    ];

    grid.innerHTML = statsCards.map((stat, i) => `
      <div class="stats-big-card" style="animation-delay: ${i * 50}ms">
        <div class="stats-big-icon">${stat.icon}</div>
        <div class="stats-big-value">${stat.value}</div>
        <div class="stats-big-label">${stat.label}</div>
      </div>
    `).join('');
  }

  /* --- Render Achievements --- */
  async function renderAchievements() {
    const stats = await Storage.checkAchievements();
    const allData = await Storage.getAllData();
    const achievements = await Storage.getAchievements();

    const currentStreak = stats.currentStreak || 0;
    const longestStreak = stats.longestStreak || 0;
    const totalGrowth = parseFloat(stats.totalGrowth) || 0;
    const workoutDays = stats.workoutDays || 0;
    const sleepDays = stats.sleepDays || 0;
    const highScoreDays = stats.highScoreDays || 0;
    const maxScore = allData.dailyLogs?.length > 0 ? Math.max(...allData.dailyLogs.map(l => l.score)) : 0;

    const achDetails = {
      perfect_day: { 
        xp: 150, 
        icon: 'star', 
        theme: 'theme-perfect-day',
        current: maxScore, 
        target: 100,
        group: 'daily',
        reward: 'Gold Profile Badge & 150 XP'
      },
      streak_7: { 
        xp: 100, 
        icon: 'zap', 
        theme: 'theme-streak-7',
        current: Math.max(currentStreak, longestStreak), 
        target: 7,
        group: 'weekly',
        reward: 'Orange Streak Highlight & 100 XP'
      },
      sleep_master: { 
        xp: 200, 
        icon: 'moon', 
        theme: 'theme-sleep-master',
        current: sleepDays, 
        target: 14,
        group: 'weekly',
        reward: 'Deep Blue Dreamer Frame & 200 XP'
      },
      streak_30: { 
        xp: 500, 
        icon: 'flame', 
        theme: 'theme-streak-30',
        current: Math.max(currentStreak, longestStreak), 
        target: 30,
        group: 'monthly',
        reward: 'Crimson Ember Aura & 500 XP'
      },
      workout_champ: { 
        xp: 400, 
        icon: 'dumbbell', 
        theme: 'theme-workout-champ',
        current: workoutDays, 
        target: 30,
        group: 'monthly',
        reward: 'Pink Fitness Enthusiast Badge & 400 XP'
      },
      growth_100: { 
        xp: 250, 
        icon: 'brain', 
        theme: 'theme-growth-100',
        current: totalGrowth, 
        target: 100,
        group: 'monthly',
        reward: 'Mint Scholar Emblem & 250 XP'
      },
      growth_500: { 
        xp: 1000, 
        icon: 'rocket', 
        theme: 'theme-growth-500',
        current: totalGrowth, 
        target: 500,
        group: 'lifetime',
        reward: 'Emerald Trailblazer Title & 1000 XP'
      },
      legend: { 
        xp: 1000, 
        icon: 'crown', 
        theme: 'theme-legend',
        current: highScoreDays, 
        target: 50,
        group: 'lifetime',
        reward: 'Royal Crown Badge & 1000 XP'
      }
    };

    let totalXP = 0;
    let unlockedCount = 0;

    achievements.forEach(a => {
      const details = achDetails[a.id];
      if (details) {
        a.xp = details.xp;
        a.lucideIcon = details.icon;
        a.theme = details.theme;
        a.current = details.current;
        a.target = details.target;
        a.group = details.group;
        a.reward = details.reward;
        a.percent = a.unlocked ? 100 : Math.min(Math.round((details.current / details.target) * 100), 100);
      } else {
        a.xp = 50;
        a.lucideIcon = 'award';
        a.theme = 'theme-perfect-day';
        a.current = 0;
        a.target = 100;
        a.group = 'lifetime';
        a.reward = '50 XP';
        a.percent = a.unlocked ? 100 : 0;
      }

      if (a.unlocked) {
        totalXP += a.xp;
        unlockedCount++;
      }
    });

    const completionPercent = Math.round((unlockedCount / 8) * 100);
    const level = Math.floor(totalXP / 300) + 1;

    // Render top summary panel
    const summaryContainer = document.getElementById('achievements-summary');
    if (summaryContainer) {
      summaryContainer.innerHTML = `
        <div class="ach-summary-card">
          <div class="ach-summary-card-icon"><i data-lucide="award"></i></div>
          <div class="ach-summary-card-value">8</div>
          <div class="ach-summary-card-label">Total Achievements</div>
        </div>
        <div class="ach-summary-card">
          <div class="ach-summary-card-icon"><i data-lucide="unlock"></i></div>
          <div class="ach-summary-card-value">${unlockedCount}</div>
          <div class="ach-summary-card-label">Unlocked</div>
        </div>
        <div class="ach-summary-card">
          <div class="ach-summary-card-icon"><i data-lucide="zap"></i></div>
          <div class="ach-summary-card-value">${totalXP} XP</div>
          <div class="ach-summary-card-label">Total XP Earned</div>
        </div>
        <div class="ach-summary-card">
          <div class="ach-summary-card-icon"><i data-lucide="target"></i></div>
          <div class="ach-summary-card-value">${completionPercent}%</div>
          <div class="ach-summary-card-label">Completion %</div>
        </div>
        <div class="ach-summary-card">
          <div class="ach-summary-card-icon"><i data-lucide="crown"></i></div>
          <div class="ach-summary-card-value">Lvl ${level}</div>
          <div class="ach-summary-card-label">Current Level</div>
        </div>
        <div class="ach-summary-card">
          <div class="ach-summary-card-icon"><i data-lucide="flame"></i></div>
          <div class="ach-summary-card-value">${currentStreak}</div>
          <div class="ach-summary-card-label">Current Streak</div>
        </div>
      `;
    }

    // Filter achievements based on active tab
    const filteredAchs = achievements.filter(a => {
      if (activeTab === 'all') return true;
      return a.group === activeTab;
    });

    const grid = document.getElementById('achievements-grid');
    if (!grid) return;

    if (filteredAchs.length === 0) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1; padding: var(--space-3xl) var(--space-md);">
          <div class="empty-state-icon">
            <i data-lucide="award"></i>
          </div>
          <div class="empty-state-title">No achievements found</div>
          <div class="empty-state-desc">Select another tab filter to browse achievements</div>
        </div>
      `;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    grid.innerHTML = filteredAchs.map((a, i) => {
      const unlockedDate = a.unlockedDate
        ? new Date(a.unlockedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;
      
      const dateHtml = unlockedDate 
        ? `<div style="font-size: 10px; color: var(--text-tertiary); margin-top: 2px;">Unlocked on ${unlockedDate}</div>` 
        : '';

      const statusBadgeClass = a.unlocked ? 'unlocked' : 'locked';
      const statusBadgeText = a.unlocked ? 'Unlocked' : 'Locked';

      return `
        <div class="achievement-gaming-card ${a.theme} ${a.unlocked ? 'unlocked' : 'locked'}" style="animation: fadeInUp 300ms ease ${i * 45}ms forwards; opacity: 0;">
          <div class="ach-gaming-icon-container">
            <i data-lucide="${a.unlocked ? a.lucideIcon : 'lock'}"></i>
          </div>
          <div class="ach-gaming-details">
            <div class="ach-gaming-title-row">
              <span class="ach-gaming-title">
                ${a.name}
              </span>
              <span class="ach-gaming-xp-pill">+${a.xp} XP</span>
            </div>
            <div class="ach-gaming-desc">${a.description}</div>
            
            <div class="ach-gaming-progress-row">
              <div class="ach-gaming-progress-bar">
                <div class="ach-gaming-progress-fill" style="width: ${a.percent}%;"></div>
              </div>
              <span class="ach-gaming-progress-pct">${a.percent}%</span>
            </div>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-top: var(--space-xs); flex-wrap: wrap; gap: 4px;">
              <span style="font-size: 10px; color: var(--text-secondary); font-weight: 500;">
                Reward: <span style="color: var(--theme-color); font-weight: 600;">${a.reward}</span>
              </span>
              <div class="ach-gaming-status-badge ${statusBadgeClass}">${statusBadgeText}</div>
            </div>
            ${dateHtml}
          </div>
        </div>
      `;
    }).join('');

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  return { init, refresh, renderStats, renderAchievements };
})();
