/* ============================================
   LifeOS — Analytics Module
   Performance circles + analytics charts
   ============================================ */

const Analytics = (() => {
  /* --- Chart instances --- */
  let individualCharts = {};
  let combinedChart = null;
  let gbnChart = null;

  /* --- Category Colors (match Charts module) --- */
  const COLORS = {
    growth: '#22c55e',
    sleep: '#818cf8',
    maintenance: '#f97316',
    workout: '#ef4444',
    relief: '#ec4899',
    storage: '#06b6d4'
  };

  /* --- Helper: make a color transparent --- */
  function withAlpha(hex, alpha) {
    if (hex.startsWith('#')) {
      const r = parseInt(hex.substring(1, 3), 16);
      const g = parseInt(hex.substring(3, 5), 16);
      const b = parseInt(hex.substring(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return hex;
  }

  /* --- Get all logs sorted by date --- */
  function getAllLogsSorted() {
    try {
      const val = localStorage.getItem('lifeos_logs');
      const logs = val ? JSON.parse(val) : {};
      const allLogs = Object.values(logs);
      // Filter only days with data
      const activeLogs = allLogs.filter(l => {
        const total = Object.values(l.categories).reduce((s, v) => s + v, 0);
        return total > 0;
      });
      activeLogs.sort((a, b) => a.date.localeCompare(b.date));
      return activeLogs;
    } catch {
      return [];
    }
  }

  /* --- Classify a day — returns excess hours in each group --- */
  function classifyDay(dayData) {
    const cats = dayData.categories;
    const goals = Storage.CATEGORIES;

    // Good excess: hours above goal for growth + workout
    const goodExcess = Math.max(0, (cats.growth || 0) - goals.growth.goalHours)
                     + Math.max(0, (cats.workout || 0) - goals.workout.goalHours);

    // Bad excess: hours above goal for relief + sleep + maintenance
    const badExcess = Math.max(0, (cats.relief || 0) - goals.relief.goalHours)
                    + Math.max(0, (cats.sleep || 0) - goals.sleep.goalHours)
                    + Math.max(0, (cats.maintenance || 0) - goals.maintenance.goalHours);

    return { goodExcess, badExcess };
  }

  /* --- Calculate performance percentages (proportional, sums to 100%) --- */
  function getPerformanceStats() {
    try {
      const val = localStorage.getItem('lifeos_logs');
      const logs = val ? JSON.parse(val) : {};
      const todayStr = Storage.getTodayString();
      const todayLog = logs[todayStr];

      if (!todayLog) return { good: 0, bad: 0, neutral: 0 };

      const dayTotal = Object.values(todayLog.categories).reduce((s, v) => s + Number(v), 0);
      if (dayTotal <= 0) return { good: 0, bad: 0, neutral: 0 };

      const result = classifyDay(todayLog);
      
      const goodPct = Math.round((result.goodExcess / dayTotal) * 100);
      const badPct = Math.round((result.badExcess / dayTotal) * 100);
      const neutralPct = Math.max(0, 100 - goodPct - badPct);

      return { good: goodPct, bad: badPct, neutral: neutralPct };
    } catch {
      return { good: 0, bad: 0, neutral: 0 };
    }
  }

  /* --- Render Performance Circles on Dashboard --- */
  function renderPerformanceCircles() {
    const stats = getPerformanceStats();
    const radius = 58;
    const circumference = 2 * Math.PI * radius; // ~364.42

    // Good circle
    const goodBar = document.getElementById('perf-good-bar');
    const goodVal = document.getElementById('perf-good-value');
    if (goodBar) {
      const offset = circumference - (stats.good / 100) * circumference;
      requestAnimationFrame(() => { goodBar.style.strokeDashoffset = offset; });
    }
    if (goodVal) goodVal.textContent = `${stats.good}%`;

    // Bad circle
    const badBar = document.getElementById('perf-bad-bar');
    const badVal = document.getElementById('perf-bad-value');
    if (badBar) {
      const offset = circumference - (stats.bad / 100) * circumference;
      requestAnimationFrame(() => { badBar.style.strokeDashoffset = offset; });
    }
    if (badVal) badVal.textContent = `${stats.bad}%`;

    // Neutral circle
    const neutralBar = document.getElementById('perf-neutral-bar');
    const neutralVal = document.getElementById('perf-neutral-value');
    if (neutralBar) {
      const offset = circumference - (stats.neutral / 100) * circumference;
      requestAnimationFrame(() => { neutralBar.style.strokeDashoffset = offset; });
    }
    if (neutralVal) neutralVal.textContent = `${stats.neutral}%`;
  }

  /* --- Render Individual Category Charts --- */
  function renderIndividualCharts() {
    if (typeof Chart === 'undefined') return;

    const logs = getAllLogsSorted();
    const dayLabels = logs.map((_, i) => `Day ${i + 1}`);

    Object.keys(Storage.CATEGORIES).forEach(key => {
      const ctx = document.getElementById(`analytics-chart-${key}`);
      if (!ctx) return;

      const data = logs.map(l => l.categories[key] || 0);
      const goalLine = Storage.CATEGORIES[key].goalHours;
      const color = COLORS[key];

      if (individualCharts[key]) individualCharts[key].destroy();

      individualCharts[key] = new Chart(ctx, {
        type: 'line',
        data: {
          labels: dayLabels,
          datasets: [
            {
              label: Storage.CATEGORIES[key].name,
              data: data,
              borderColor: color,
              backgroundColor: (context) => {
                const chart = context.chart;
                const { ctx: c, chartArea } = chart;
                if (!chartArea) return 'transparent';
                const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
                gradient.addColorStop(0, withAlpha(color, 0.25));
                gradient.addColorStop(1, 'transparent');
                return gradient;
              },
              fill: true,
              tension: 0.4,
              borderWidth: 2.5,
              pointRadius: logs.length > 30 ? 0 : 3,
              pointHoverRadius: 6,
              pointBackgroundColor: color,
              pointHoverBackgroundColor: color,
              pointHoverBorderColor: '#fff',
              pointHoverBorderWidth: 2
            },
            {
              label: 'Goal',
              data: Array(logs.length).fill(goalLine),
              borderColor: 'rgba(255,255,255,0.25)',
              borderDash: [6, 4],
              borderWidth: 1.5,
              pointRadius: 0,
              fill: false,
              tension: 0
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            x: {
              grid: { display: false },
              border: { display: false },
              ticks: {
                maxTicksLimit: 10,
                font: { size: 10 }
              }
            },
            y: {
              beginAtZero: true,
              grid: {
                color: getComputedStyle(document.documentElement)
                  .getPropertyValue('--border-color').trim()
              },
              border: { display: false },
              ticks: { font: { size: 10 } }
            }
          },
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (items) => items[0].label,
                label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}h`
              }
            }
          },
          interaction: { mode: 'index', intersect: false }
        }
      });
    });
  }

  /* --- Render Combined Chart --- */
  function renderCombinedChart() {
    if (typeof Chart === 'undefined') return;

    const ctx = document.getElementById('analytics-chart-combined');
    if (!ctx) return;

    const logs = getAllLogsSorted();
    const dayLabels = logs.map((_, i) => `Day ${i + 1}`);

    const datasets = Object.keys(Storage.CATEGORIES).map(key => {
      const color = COLORS[key];
      return {
        label: Storage.CATEGORIES[key].name,
        data: logs.map(l => l.categories[key] || 0),
        borderColor: color,
        backgroundColor: withAlpha(color, 0.05),
        fill: false,
        tension: 0.4,
        borderWidth: 2,
        pointRadius: logs.length > 30 ? 0 : 2,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        pointHoverBackgroundColor: color,
        pointHoverBorderColor: '#fff',
        pointHoverBorderWidth: 2
      };
    });

    if (combinedChart) combinedChart.destroy();

    combinedChart = new Chart(ctx, {
      type: 'line',
      data: { labels: dayLabels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { maxTicksLimit: 15, font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            grid: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--border-color').trim()
            },
            border: { display: false },
            ticks: { font: { size: 11 } },
            title: {
              display: true,
              text: 'Hours',
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--text-secondary').trim(),
              font: { size: 12, weight: '500' }
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              title: (items) => items[0].label,
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}h`
            }
          }
        },
        interaction: { mode: 'index', intersect: false }
      }
    });
  }

  /* --- Render Good/Bad/Neutral Trend Chart --- */
  function renderGBNChart() {
    if (typeof Chart === 'undefined') return;

    const ctx = document.getElementById('analytics-chart-gbn');
    if (!ctx) return;

    const logs = getAllLogsSorted();
    const dayLabels = logs.map((_, i) => `Day ${i + 1}`);

    // Compute cumulative percentages
    let cumulativeGoodExcess = 0;
    let cumulativeBadExcess = 0;
    let cumulativeTotalHours = 0;
    const goodPcts = [], badPcts = [], neutralPcts = [];

    logs.forEach((log) => {
      const result = classifyDay(log);
      cumulativeGoodExcess += result.goodExcess;
      cumulativeBadExcess += result.badExcess;
      const dayTotal = Object.values(log.categories).reduce((s, v) => s + v, 0);
      cumulativeTotalHours += dayTotal;

      if (cumulativeTotalHours > 0) {
        const goodPct = Math.round((cumulativeGoodExcess / cumulativeTotalHours) * 100);
        const badPct = Math.round((cumulativeBadExcess / cumulativeTotalHours) * 100);
        const neutralPct = Math.max(0, 100 - goodPct - badPct);

        goodPcts.push(goodPct);
        badPcts.push(badPct);
        neutralPcts.push(neutralPct);
      } else {
        goodPcts.push(0);
        badPcts.push(0);
        neutralPcts.push(100);
      }
    });

    if (gbnChart) gbnChart.destroy();

    gbnChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: dayLabels,
        datasets: [
          {
            label: 'Good %',
            data: goodPcts,
            borderColor: '#22c55e',
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx: c, chartArea } = chart;
              if (!chartArea) return 'transparent';
              const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(34, 197, 94, 0.2)');
              gradient.addColorStop(1, 'transparent');
              return gradient;
            },
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: logs.length > 30 ? 0 : 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#22c55e',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
          },
          {
            label: 'Bad %',
            data: badPcts,
            borderColor: '#ef4444',
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx: c, chartArea } = chart;
              if (!chartArea) return 'transparent';
              const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(239, 68, 68, 0.2)');
              gradient.addColorStop(1, 'transparent');
              return gradient;
            },
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: logs.length > 30 ? 0 : 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#ef4444',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
          },
          {
            label: 'Neutral %',
            data: neutralPcts,
            borderColor: '#3b82f6',
            backgroundColor: (context) => {
              const chart = context.chart;
              const { ctx: c, chartArea } = chart;
              if (!chartArea) return 'transparent';
              const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
              gradient.addColorStop(0, 'rgba(59, 130, 246, 0.2)');
              gradient.addColorStop(1, 'transparent');
              return gradient;
            },
            fill: true,
            tension: 0.4,
            borderWidth: 2.5,
            pointRadius: logs.length > 30 ? 0 : 3,
            pointHoverRadius: 6,
            pointBackgroundColor: '#3b82f6',
            pointHoverBorderColor: '#fff',
            pointHoverBorderWidth: 2
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            border: { display: false },
            ticks: { maxTicksLimit: 15, font: { size: 11 } }
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--border-color').trim()
            },
            border: { display: false },
            ticks: {
              stepSize: 25,
              font: { size: 11 },
              callback: (val) => `${val}%`
            },
            title: {
              display: true,
              text: 'Cumulative %',
              color: getComputedStyle(document.documentElement)
                .getPropertyValue('--text-secondary').trim(),
              font: { size: 12, weight: '500' }
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              pointStyle: 'circle',
              padding: 16,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              title: (items) => items[0].label,
              label: (ctx) => `${ctx.dataset.label}: ${ctx.raw}%`
            }
          }
        },
        interaction: { mode: 'index', intersect: false }
      }
    });
  }

  /* --- Render all analytics charts --- */
  function renderAnalyticsCharts() {
    renderIndividualCharts();
    renderCombinedChart();
    renderGBNChart();
  }

  /* --- Initialize --- */
  function init() {
    // Render performance circles on dashboard
    renderPerformanceCircles();

    // Listen for view changes
    App.on('viewChanged', (view) => {
      if (view === 'dashboard') {
        renderPerformanceCircles();
      }
      if (view === 'analytics') {
        renderAnalyticsCharts();
      }
    });

    // Listen for data changes
    App.on('dataChanged', () => {
      renderPerformanceCircles();
      if (App.currentView === 'analytics') {
        renderAnalyticsCharts();
      }
    });
  }

  return { init, renderPerformanceCircles, renderAnalyticsCharts };
})();
