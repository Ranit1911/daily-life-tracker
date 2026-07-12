/* ============================================
   LifeOS — App Core
   Router, initialization, greeting, event bus
   ============================================ */

const App = (() => {
  /* --- Event Bus --- */
  const _listeners = {};

  function on(event, callback) {
    if (!_listeners[event]) _listeners[event] = [];
    _listeners[event].push(callback);
  }

  function emit(event, data) {
    if (_listeners[event]) {
      _listeners[event].forEach(cb => cb(data));
    }
  }

  /* --- Motivational Quotes --- */
  const QUOTES = [
    "Small progress every day builds a great future.",
    "The secret of getting ahead is getting started.",
    "Your future is created by what you do today.",
    "Discipline is the bridge between goals and accomplishment.",
    "It's not about being perfect, it's about making progress.",
    "Success is the sum of small efforts repeated day in and day out.",
    "What you do today can improve all your tomorrows.",
    "The only way to do great work is to love what you do.",
    "Push yourself, because no one else is going to do it for you.",
    "Great things never come from comfort zones.",
    "Don't watch the clock; do what it does. Keep going.",
    "A little progress each day adds up to big results.",
    "Believe you can and you're halfway there.",
    "It always seems impossible until it's done.",
    "The harder you work for something, the greater you'll feel when you achieve it.",
    "Your limitation—it's only your imagination.",
    "Dream bigger. Do bigger.",
    "Don't stop when you're tired. Stop when you're done.",
    "Wake up with determination. Go to bed with satisfaction.",
    "Do something today that your future self will thank you for.",
    "Success doesn't just find you. You have to go out and get it.",
    "The key to success is to focus on goals, not obstacles.",
    "Dream it. Wish it. Do it.",
    "Stay positive, work hard, make it happen.",
    "Be the energy you want to attract.",
    "One day or day one. You decide.",
    "The best time for new beginnings is now.",
    "Invest in yourself. It pays the best interest.",
    "Make each day your masterpiece.",
    "You are what you do, not what you say you'll do."
  ];

  /* --- Encouragement Messages --- */
  const ENCOURAGEMENTS = {
    excellent: [
      "Amazing work today! 🌟",
      "You're crushing it! Keep this energy! 💪",
      "Outstanding balance! You're a legend! 🏆",
      "Perfect harmony achieved! Incredible! ✨"
    ],
    great: [
      "Great job! You're almost at your goal! 🎯",
      "Impressive progress today! Keep going! 🚀",
      "You're doing fantastic! Nearly there! 💫"
    ],
    good: [
      "Good progress! You're on the right track! 👍",
      "Solid effort today! Keep building momentum! 💪",
      "You're making it happen! Stay focused! 🔥"
    ],
    fair: [
      "You're close to today's goal. Keep pushing! 💪",
      "Every step counts. You've got this! 🌱",
      "Room to grow — let's finish strong! 🎯"
    ],
    poor: [
      "Every journey starts with a single step. Start now! 🌟",
      "It's never too late to make today count! ⏰",
      "Small progress is still progress. Let's go! 🚀"
    ]
  };

  /* --- Greeting Logic --- */
  function getGreeting() {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return { text: 'Good Morning', emoji: '☀️' };
    if (hour >= 12 && hour < 17) return { text: 'Good Afternoon', emoji: '🌤' };
    if (hour >= 17 && hour < 21) return { text: 'Good Evening', emoji: '🌙' };
    return { text: 'Good Night', emoji: '🌙' };
  }

  /* --- Get Today's Date Formatted --- */
  function getFormattedDate() {
    const now = new Date();
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return now.toLocaleDateString('en-US', options);
  }

  /* --- Get Daily Quote --- */
  function getDailyQuote() {
    const dayOfYear = Math.floor(
      (new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24)
    );
    return QUOTES[dayOfYear % QUOTES.length];
  }

  /* --- Get Encouragement --- */
  function getEncouragement(score) {
    let level;
    if (score >= 90) level = 'excellent';
    else if (score >= 75) level = 'great';
    else if (score >= 55) level = 'good';
    else if (score >= 30) level = 'fair';
    else level = 'poor';

    const messages = ENCOURAGEMENTS[level];
    return messages[Math.floor(Math.random() * messages.length)];
  }

  /* --- Get Score Label --- */
  function getScoreLabel(score) {
    if (score >= 90) return 'Excellent';
    if (score >= 75) return 'Great';
    if (score >= 55) return 'Good';
    if (score >= 35) return 'Fair';
    return 'Needs Work';
  }

  /* --- Format Hours --- */
  function formatHours(hours) {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0) return `${m}m`;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  /* --- Router --- */
  let currentView = 'dashboard';

  function navigate(view) {
    window.location.hash = view;
  }

  function handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    const validViews = ['dashboard', 'weekly', 'monthly', 'stats', 'analytics', 'achievements', 'settings'];

    if (!validViews.includes(hash)) {
      navigate('dashboard');
      return;
    }

    // Transition out current view
    const currentSection = document.querySelector('.view-section.active');
    const nextSection = document.getElementById(`view-${hash}`);

    if (!nextSection) return;

    if (currentSection && currentSection !== nextSection) {
      currentSection.classList.remove('active');
      currentSection.classList.remove('view-enter');
    }

    // Show next view
    nextSection.classList.add('active');
    nextSection.classList.add('view-enter');

    // Update nav
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.view === hash);
    });

    currentView = hash;
    emit('viewChanged', hash);
  }

  /* --- Ripple Effect --- */
  function addRipple(event) {
    const btn = event.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement('span');
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.className = 'ripple';
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${x}px`;
    ripple.style.top = `${y}px`;

    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
  }

  /* --- Confetti --- */
  function triggerConfetti() {
    const container = document.createElement('div');
    container.className = 'confetti-container';
    document.body.appendChild(container);

    const colors = ['#10b981', '#818cf8', '#f97316', '#f43f5e', '#ec4899', '#06b6d4', '#eab308', '#8b5cf6'];

    for (let i = 0; i < 80; i++) {
      const piece = document.createElement('div');
      piece.className = 'confetti-piece';
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = `${Math.random() * 1.5}s`;
      piece.style.animationDuration = `${2 + Math.random() * 2}s`;
      piece.style.width = `${6 + Math.random() * 8}px`;
      piece.style.height = `${6 + Math.random() * 8}px`;
      piece.style.borderRadius = Math.random() > 0.5 ? '50%' : '2px';
      container.appendChild(piece);
    }

    setTimeout(() => container.remove(), 5000);
  }

  /* --- Toast Notification --- */
  function showToast(icon, message, duration = 4000) {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<span class="toast-icon">${icon}</span><span>${message}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  /* --- Initialize Lucide Icons --- */
  function initLucideIcons() {
    if (typeof lucide !== 'undefined') {
      lucide.createIcons();
    }
  }

  /* --- Initialize --- */
  async function init() {
    // Load settings
    const settings = Storage.getSettings();
    document.documentElement.setAttribute('data-theme', settings.theme);
    document.documentElement.setAttribute('data-accent', settings.accent);
    document.documentElement.setAttribute('data-animations', settings.animations);

    // Init DB
    await Storage.init();

    // Initialize Lucide Icons
    initLucideIcons();

    // Setup router
    window.addEventListener('hashchange', handleRoute);

    // Setup navigation clicks
    document.querySelectorAll('.nav-item, .bottom-nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(item.dataset.view);
      });
    });

    // Setup ripple effects on buttons
    document.querySelectorAll('.ripple-container, .control-btn, .nav-item, .settings-btn, .modal-btn').forEach(btn => {
      btn.addEventListener('click', addRipple);
    });

    // Initial route
    handleRoute();

    // Init modules
    Dashboard.init();

    // Init new modules
    if (typeof Streak !== 'undefined') Streak.init();
    if (typeof Widgets !== 'undefined') Widgets.init();
    if (typeof Planner !== 'undefined') Planner.init();

    Charts.init();
    Calendar.init();
    Stats.init();
    Analytics.init();
    Settings.init();

    // Re-init Lucide icons after all modules render
    setTimeout(() => initLucideIcons(), 100);

    // Listen for data changes
    on('dataChanged', async () => {
      const result = await Storage.checkAchievements();
      if (result.newlyUnlocked.length > 0) {
        result.newlyUnlocked.forEach(a => {
          showToast(a.icon, `Achievement Unlocked: ${a.name}!`, 5000);
          triggerConfetti();
        });
        Stats.refresh();
      }

      // Re-init icons for any newly rendered elements
      setTimeout(() => initLucideIcons(), 50);
    });
  }

  return {
    init,
    on,
    emit,
    getGreeting,
    getFormattedDate,
    getDailyQuote,
    getEncouragement,
    getScoreLabel,
    formatHours,
    navigate,
    addRipple,
    triggerConfetti,
    showToast,
    initLucideIcons,
    get currentView() { return currentView; }
  };
})();

/* --- Boot --- */
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
