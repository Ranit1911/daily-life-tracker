/* ============================================
   LifeOS — Stats & Achievements Module
   Statistics screen + Achievements screen
   ============================================ */

const Stats = (() => {

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
    const grid = document.getElementById('achievements-grid');
    if (!grid) return;

    const achievements = await Storage.getAchievements();

    grid.innerHTML = achievements.map((a, i) => {
      const unlockedDate = a.unlockedDate
        ? new Date(a.unlockedDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : null;

      return `
        <div class="achievement-card ${a.unlocked ? 'unlocked' : 'locked'}" style="animation-delay: ${i * 60}ms">
          <span class="achievement-icon">${a.icon}</span>
          <div class="achievement-name">${a.name}</div>
          <div class="achievement-desc">${a.description}</div>
          <span class="achievement-status">
            ${a.unlocked ? `✓ Unlocked ${unlockedDate || ''}` : '🔒 Locked'}
          </span>
        </div>
      `;
    }).join('');
  }

  return { init, refresh, renderStats, renderAchievements };
})();
