/* ============================================
   LifeOS — Charts Module
   Chart.js integration (pie, bar, line, distribution)
   ============================================ */

const Charts = (() => {
  let pieChart = null;
  let barChart = null;
  let lineChart = null;
  let distChart = null;
  let initialized = false;

  /* --- Chart.js Global Config --- */
  function configureDefaults() {
    if (typeof Chart === 'undefined') return;

    Chart.defaults.color = getComputedStyle(document.documentElement)
      .getPropertyValue('--text-secondary').trim() || 'rgba(255,255,255,0.6)';
    Chart.defaults.font.family = "'Inter', sans-serif";
    Chart.defaults.font.size = 12;
    Chart.defaults.plugins.legend.labels.usePointStyle = true;
    Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
    Chart.defaults.plugins.legend.labels.padding = 16;
    Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10,10,35,0.9)';
    Chart.defaults.plugins.tooltip.borderColor = 'rgba(255,255,255,0.1)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.padding = 12;
    Chart.defaults.plugins.tooltip.titleFont = { weight: '600' };
    Chart.defaults.animation.duration = 800;
    Chart.defaults.animation.easing = 'easeOutQuart';
  }

  /* --- Category Colors --- */
  const COLORS = {
    growth: '#22c55e',
    sleep: '#818cf8',
    maintenance: '#f97316',
    workout: '#ef4444',
    relief: '#ec4899',
    storage: '#06b6d4'
  };

  const COLORS_BG = {
    growth: 'rgba(34,197,94,0.2)',
    sleep: 'rgba(129,140,248,0.2)',
    maintenance: 'rgba(249,115,22,0.2)',
    workout: 'rgba(239,68,68,0.2)',
    relief: 'rgba(236,72,153,0.2)',
    storage: 'rgba(6,182,212,0.2)'
  };

  /* --- Helper: make a color transparent --- */
  function withAlpha(color, alpha) {
    // Handle rgb/rgba format
    const rgbMatch = color.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
      const parts = rgbMatch[1].split(',').map(s => s.trim());
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    }
    // Handle hsl/hsla format
    const hslMatch = color.match(/hsla?\(([^)]+)\)/);
    if (hslMatch) {
      const parts = hslMatch[1].split(',').map(s => s.trim());
      return `hsla(${parts[0]}, ${parts[1]}, ${parts[2]}, ${alpha})`;
    }
    // Handle hex format
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      const r = parseInt(hex.substring(0, 2), 16);
      const g = parseInt(hex.substring(2, 4), 16);
      const b = parseInt(hex.substring(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return color;
  }

  /* --- Initialize --- */
  function init() {
    if (typeof Chart === 'undefined') {
      console.warn('Chart.js not loaded');
      return;
    }

    initialized = true;

    // Initial render
    renderAllCharts();

    // Listen for data changes
    App.on('dataChanged', () => renderAllCharts());
    App.on('viewChanged', (view) => {
      if (view === 'dashboard') renderAllCharts();
    });
  }

  /* --- Render All Charts --- */
  async function renderAllCharts() {
    if (!initialized) return;

    configureDefaults();

    const todayData = await Storage.getDayData(Storage.getTodayString());
    renderPieChart(todayData);
    renderDistributionChart(todayData);
    await renderBarChart();
    await renderLineChart();
  }

  /* --- Pie Chart: Today's Distribution --- */
  function renderPieChart(dayData) {
    const ctx = document.getElementById('chart-pie');
    if (!ctx) return;

    const labels = [];
    const data = [];
    const colors = [];

    Object.entries(Storage.CATEGORIES).forEach(([key, cat]) => {
      labels.push(cat.name);
      data.push(dayData.categories[key] || 0);
      colors.push(COLORS[key]);
    });

    const hasData = data.some(v => v > 0);

    if (pieChart) pieChart.destroy();

    pieChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data: hasData ? data : [1],
          backgroundColor: hasData ? colors : [withAlpha(getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(), 0.5)],
          borderColor: 'transparent',
          borderWidth: 0,
          hoverOffset: 8,
          spacing: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: {
            position: 'bottom',
            onClick: null,
            labels: {
              generateLabels: function(chart) {
                const ds = chart.data.datasets[0];
                return chart.data.labels.map((label, i) => ({
                  text: `${label}: ${App.formatHours(ds.data[i])}`,
                  fillStyle: hasData ? ds.backgroundColor[i] : withAlpha(getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(), 0.5),
                  strokeStyle: 'transparent',
                  pointStyle: 'circle',
                  hidden: false,
                  index: i,
                  fontColor: Chart.defaults.color
                }));
              }
            }
          },
          tooltip: {
            callbacks: {
              label: function(context) {
                return `${context.label}: ${App.formatHours(context.raw)}`;
              }
            }
          }
        }
      }
    });
  }

  /* --- Distribution Chart: Goal vs Actual --- */
  function renderDistributionChart(dayData) {
    const ctx = document.getElementById('chart-distribution');
    if (!ctx) return;

    const labels = Object.values(Storage.CATEGORIES).map(c => c.name);
    const goals = Object.values(Storage.CATEGORIES).map(c => c.goalHours);
    const actuals = Object.keys(Storage.CATEGORIES).map(k => dayData.categories[k] || 0);

    if (distChart) distChart.destroy();

    distChart = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [
          {
            label: 'Goal',
            data: goals,
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim(),
            backgroundColor: withAlpha(getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(), 0.5),
            borderWidth: 2,
            pointRadius: 3,
            pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--text-tertiary').trim()
          },
          {
            label: 'Actual',
            data: actuals,
            borderColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b5cf6',
            backgroundColor: withAlpha(getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b5cf6', 0.15),
            borderWidth: 2,
            pointRadius: 4,
            pointBackgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b5cf6'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            beginAtZero: true,
            grid: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(),
              circular: true
            },
            angleLines: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim()
            },
            pointLabels: {
              color: getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim(),
              font: { size: 11, weight: '500' }
            },
            ticks: {
              display: false
            }
          }
        },
        plugins: {
          legend: {
            position: 'bottom'
          }
        }
      }
    });
  }

  /* --- Bar Chart: Weekly Scores --- */
  async function renderBarChart() {
    const ctx = document.getElementById('chart-bar');
    if (!ctx) return;

    // Get current week (Sunday start)
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);

    const weekData = await Storage.getWeekData(weekStart);
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    const labels = dayNames;
    const scores = weekData.map(d => d.score);
    const barColors = scores.map(s => {
      if (s >= 80) return '#22c55e';
      if (s >= 55) return '#eab308';
      if (s > 0) return '#ef4444';
      return withAlpha(getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim(), 0.5);
    });

    if (barChart) barChart.destroy();

    barChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Score',
          data: scores,
          backgroundColor: barColors,
          borderRadius: 6,
          borderSkipped: false,
          barPercentage: 0.5,
          categoryPercentage: 0.7
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            grid: { display: false },
            border: { display: false }
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() },
            border: { display: false },
            ticks: { stepSize: 25 }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `Score: ${ctx.raw}%`
            }
          }
        }
      }
    });
  }

  /* --- Line Chart: Monthly Scores --- */
  async function renderLineChart() {
    const ctx = document.getElementById('chart-line');
    if (!ctx) return;

    const now = new Date();
    const monthData = await Storage.getMonthData(now.getFullYear(), now.getMonth());

    const labels = monthData.map((_, i) => i + 1);
    const scores = monthData.map(d => d.score);

    const accent = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#8b5cf6';

    if (lineChart) lineChart.destroy();

    lineChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Daily Score',
          data: scores,
          borderColor: accent,
          backgroundColor: (context) => {
            const chart = context.chart;
            const { ctx: c, chartArea } = chart;
            if (!chartArea) return 'transparent';
            const gradient = c.createLinearGradient(0, chartArea.top, 0, chartArea.bottom);
            gradient.addColorStop(0, withAlpha(accent, 0.2));
            gradient.addColorStop(1, 'transparent');
            return gradient;
          },
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBackgroundColor: accent,
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2
        }]
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
              callback: function(val) {
                return this.getLabelForValue(val);
              }
            }
          },
          y: {
            beginAtZero: true,
            max: 100,
            grid: { color: getComputedStyle(document.documentElement).getPropertyValue('--border-color').trim() },
            border: { display: false },
            ticks: { stepSize: 25 }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              title: (items) => `Day ${items[0].label}`,
              label: (ctx) => `Score: ${ctx.raw}%`
            }
          }
        },
        interaction: {
          mode: 'index',
          intersect: false
        }
      }
    });
  }

  return { init, renderAllCharts };
})();
