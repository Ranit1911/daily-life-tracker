/* ============================================
   LifeOS — Stats & Achievements Module
   Statistics screen + Achievements screen
   ============================================ */

const Stats = (() => {

  let activeTab = 'all';
  let statsCharts = {};

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
    const summaryContainer = document.getElementById('stats-summary-row');
    if (!summaryContainer) return;

    const stats = await Storage.getStats();
    const allData = await Storage.getAllData();
    const dailyLogs = allData.dailyLogs || [];
    
    const activeLogs = dailyLogs.filter(l => {
      const total = Object.values(l.categories).reduce((s, v) => s + v, 0);
      return total > 0;
    });
    activeLogs.sort((a, b) => a.date.localeCompare(b.date));

    const bestScore = activeLogs.length > 0 ? Math.max(...activeLogs.map(l => l.score)) : 0;

    // 1. Populate top compact summary cards
    const summaryCards = [
      {
        lucideIcon: 'gauge',
        value: `${stats.avgScore}%`,
        label: 'Overall Balance',
        theme: 'theme-legend'
      },
      {
        lucideIcon: 'award',
        value: `${bestScore}%`,
        label: 'Best Score',
        theme: 'theme-perfect-day'
      },
      {
        lucideIcon: 'flame',
        value: `${stats.currentStreak}d`,
        label: 'Current Streak',
        theme: 'theme-streak-7'
      },
      {
        lucideIcon: 'history',
        value: `${stats.totalDays}`,
        label: 'Total Logs',
        theme: 'theme-growth-500'
      },
      {
        lucideIcon: 'calendar-days',
        value: `${stats.weeklyAvg}%`,
        label: 'Weekly Avg',
        theme: 'theme-growth-100'
      },
      {
        lucideIcon: 'calendar',
        value: `${stats.monthlyAvg}%`,
        label: 'Monthly Avg',
        theme: 'theme-sleep-master'
      }
    ];

    summaryContainer.innerHTML = summaryCards.map((card, i) => `
      <div class="stats-summary-card ${card.theme}" style="animation: fadeInUp 300ms ease ${i * 45}ms forwards; opacity: 0;">
        <div class="stats-summary-icon-container">
          <i data-lucide="${card.lucideIcon}"></i>
        </div>
        <div class="stats-summary-details">
          <span class="stats-summary-label">${card.label}</span>
          <span class="stats-summary-value">${card.value}</span>
        </div>
      </div>
    `).join('');

    // 2. Initialize Charts
    if (typeof Chart === 'undefined') {
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    const rootStyle = getComputedStyle(document.documentElement);
    const textColor = rootStyle.getPropertyValue('--text-secondary').trim() || 'rgba(255,255,255,0.6)';
    const borderCol = rootStyle.getPropertyValue('--border-color').trim() || 'rgba(255,255,255,0.1)';

    function createGradient(canvas, color1, color2) {
      try {
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 200);
        gradient.addColorStop(0, color1);
        gradient.addColorStop(1, color2);
        return gradient;
      } catch (e) {
        return color1;
      }
    }

    function getChartOptions(maxVal = null) {
      return {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: textColor, font: { size: 9 } }
          },
          y: {
            beginAtZero: true,
            max: maxVal,
            grid: { color: borderCol },
            ticks: { color: textColor, font: { size: 9 }, stepSize: maxVal ? maxVal / 4 : undefined }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(10, 10, 35, 0.95)',
            titleColor: '#fff',
            bodyColor: '#fff',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            borderWidth: 1
          }
        }
      };
    }

    // Weekly Trend
    const last7Logs = activeLogs.slice(-7);
    const weeklyLabels = last7Logs.map(l => {
      const parts = l.date.split('-');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : l.date;
    });
    const weeklyScores = last7Logs.map(l => l.score);

    if (statsCharts.weekly) statsCharts.weekly.destroy();
    const ctxWeekly = document.getElementById('stats-chart-weekly');
    if (ctxWeekly) {
      statsCharts.weekly = new Chart(ctxWeekly, {
        type: 'line',
        data: {
          labels: weeklyLabels.length > 0 ? weeklyLabels : ['No Logs'],
          datasets: [{
            label: 'Score',
            data: weeklyScores.length > 0 ? weeklyScores : [0],
            borderColor: '#a855f7',
            backgroundColor: createGradient(ctxWeekly, 'rgba(168, 85, 247, 0.15)', 'transparent'),
            fill: true,
            tension: 0.4,
            borderWidth: 2,
            pointRadius: 3,
            pointHoverRadius: 6
          }]
        },
        options: getChartOptions(100)
      });
    }

    // Monthly Trend
    const last30Logs = activeLogs.slice(-30);
    const monthlyLabels = last30Logs.map(l => {
      const parts = l.date.split('-');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : l.date;
    });
    const monthlyScores = last30Logs.map(l => l.score);

    if (statsCharts.monthly) statsCharts.monthly.destroy();
    const ctxMonthly = document.getElementById('stats-chart-monthly');
    if (ctxMonthly) {
      statsCharts.monthly = new Chart(ctxMonthly, {
        type: 'line',
        data: {
          labels: monthlyLabels.length > 0 ? monthlyLabels : ['No Logs'],
          datasets: [{
            label: 'Score',
            data: monthlyScores.length > 0 ? monthlyScores : [0],
            borderColor: '#3b82f6',
            backgroundColor: createGradient(ctxMonthly, 'rgba(59, 130, 246, 0.15)', 'transparent'),
            fill: true,
            tension: 0.3,
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 5
          }]
        },
        options: getChartOptions(100)
      });
    }

    // Mood Distribution
    let happyCount = 0, neutralCount = 0, stressedCount = 0;
    activeLogs.forEach(l => {
      if (l.score >= 80) happyCount++;
      else if (l.score >= 50) neutralCount++;
      else stressedCount++;
    });

    if (statsCharts.mood) statsCharts.mood.destroy();
    const ctxMood = document.getElementById('stats-chart-mood');
    if (ctxMood) {
      const totalCount = happyCount + neutralCount + stressedCount;
      statsCharts.mood = new Chart(ctxMood, {
        type: 'doughnut',
        data: {
          labels: ['Happy (≥80%)', 'Neutral (50-79%)', 'Stressed (<50%)'],
          datasets: [{
            data: totalCount > 0 ? [happyCount, neutralCount, stressedCount] : [0, 0, 1],
            backgroundColor: totalCount > 0 ? ['#22c55e', '#3b82f6', '#f43f5e'] : ['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)'],
            borderColor: 'transparent',
            borderWidth: 0,
            spacing: 2
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: {
              position: 'right',
              labels: { color: textColor, font: { size: 9 }, boxWidth: 10 }
            },
            tooltip: {
              backgroundColor: 'rgba(10, 10, 35, 0.95)',
              callbacks: {
                label: function(context) {
                  const val = context.raw;
                  if (totalCount === 0) return 'No Logs';
                  const pct = Math.round((val / totalCount) * 100);
                  return `${context.label}: ${val} days (${pct}%)`;
                }
              }
            }
          }
        }
      });
    }

    // Habit Breakdown
    const habitData = [];
    const habitColors = [];
    const habitLabels = [];
    const CAT_COLORS = {
      growth: '#22c55e',
      sleep: '#818cf8',
      maintenance: '#f97316',
      workout: '#ef4444',
      relief: '#ec4899',
      storage: '#06b6d4'
    };

    Object.entries(Storage.CATEGORIES).forEach(([key, cat]) => {
      const goal = cat.goalHours;
      const metDays = activeLogs.filter(l => (l.categories[key] || 0) >= goal).length;
      const rate = activeLogs.length > 0 ? Math.round((metDays / activeLogs.length) * 100) : 0;
      
      habitData.push(rate);
      habitColors.push(CAT_COLORS[key] || '#8b5cf6');
      habitLabels.push(cat.name);
    });

    if (statsCharts.habit) statsCharts.habit.destroy();
    const ctxHabit = document.getElementById('stats-chart-habit');
    if (ctxHabit) {
      statsCharts.habit = new Chart(ctxHabit, {
        type: 'bar',
        data: {
          labels: habitLabels,
          datasets: [{
            label: 'Goal Success Rate (%)',
            data: habitData,
            backgroundColor: habitColors,
            borderRadius: 6,
            barThickness: 12
          }]
        },
        options: {
          indexAxis: 'y',
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              beginAtZero: true,
              max: 100,
              grid: { color: borderCol },
              ticks: { color: textColor, font: { size: 9 }, callback: v => `${v}%` }
            },
            y: {
              grid: { display: false },
              ticks: { color: textColor, font: { size: 9 } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: 'rgba(10, 10, 35, 0.95)',
              callbacks: {
                label: (context) => `Goal Met: ${context.raw}% of days`
              }
            }
          }
        }
      });
    }

    // Productivity vs Sleep
    const last15Logs = activeLogs.slice(-15);
    const prodSleepLabels = last15Logs.map(l => {
      const parts = l.date.split('-');
      return parts.length === 3 ? `${parts[1]}/${parts[2]}` : l.date;
    });
    const productivityHours = last15Logs.map(l => {
      const growth = l.categories.growth || 0;
      const workout = l.categories.workout || 0;
      return parseFloat((growth + workout).toFixed(1));
    });
    const sleepHours = last15Logs.map(l => parseFloat((l.categories.sleep || 0).toFixed(1)));

    if (statsCharts.prodSleep) statsCharts.prodSleep.destroy();
    const ctxProdSleep = document.getElementById('stats-chart-prod-sleep');
    if (ctxProdSleep) {
      statsCharts.prodSleep = new Chart(ctxProdSleep, {
        type: 'bar',
        data: {
          labels: prodSleepLabels.length > 0 ? prodSleepLabels : ['No Logs'],
          datasets: [
            {
              type: 'bar',
              label: 'Productive Hours',
              data: productivityHours.length > 0 ? productivityHours : [0],
              backgroundColor: 'rgba(16, 185, 129, 0.35)',
              borderColor: '#10b981',
              borderWidth: 1,
              borderRadius: 4,
              yAxisID: 'y'
            },
            {
              type: 'line',
              label: 'Sleep Duration',
              data: sleepHours.length > 0 ? sleepHours : [0],
              borderColor: '#06b6d4',
              borderWidth: 2,
              tension: 0.3,
              pointRadius: 2,
              pointHoverRadius: 4,
              fill: false,
              yAxisID: 'y'
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              ticks: { color: textColor, font: { size: 8 } }
            },
            y: {
              beginAtZero: true,
              grid: { color: borderCol },
              ticks: { color: textColor, font: { size: 8 } }
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { size: 8 } }
            },
            tooltip: {
              backgroundColor: 'rgba(10, 10, 35, 0.95)',
              callbacks: {
                label: context => `${context.dataset.label}: ${context.raw}h`
              }
            }
          }
        }
      });
    }

    // Category Performance
    const avgHours = [];
    const goalHours = [];
    const radarLabels = [];
    Object.entries(Storage.CATEGORIES).forEach(([key, cat]) => {
      const avg = activeLogs.length > 0
        ? parseFloat((activeLogs.reduce((s, l) => s + (l.categories[key] || 0), 0) / activeLogs.length).toFixed(1))
        : 0;
      avgHours.push(avg);
      goalHours.push(cat.goalHours);
      radarLabels.push(cat.name);
    });

    if (statsCharts.categories) statsCharts.categories.destroy();
    const ctxCategories = document.getElementById('stats-chart-categories');
    if (ctxCategories) {
      statsCharts.categories = new Chart(ctxCategories, {
        type: 'radar',
        data: {
          labels: radarLabels,
          datasets: [
            {
              label: 'Daily Goals',
              data: goalHours,
              borderColor: 'rgba(255,255,255,0.25)',
              backgroundColor: 'rgba(255,255,255,0.02)',
              borderWidth: 1,
              pointRadius: 2,
              fill: true
            },
            {
              label: 'Your Averages',
              data: avgHours,
              borderColor: '#10b981',
              backgroundColor: 'rgba(16, 185, 129, 0.12)',
              borderWidth: 1.5,
              pointRadius: 2.5,
              fill: true
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            r: {
              beginAtZero: true,
              grid: { color: borderCol },
              angleLines: { color: borderCol },
              pointLabels: { color: textColor, font: { size: 8, weight: '500' } },
              ticks: { display: false }
            }
          },
          plugins: {
            legend: {
              position: 'bottom',
              labels: { color: textColor, font: { size: 8 } }
            },
            tooltip: {
              backgroundColor: 'rgba(10, 10, 35, 0.95)'
            }
          }
        }
      });
    }

    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
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
