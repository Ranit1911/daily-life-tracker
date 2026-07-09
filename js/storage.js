/* ============================================
   LifeOS — Storage Module
   LocalStorage wrapper, data model, import/export
   ============================================ */

const Storage = (() => {
  const DB_VERSION = 2; // Incremented for LocalStorage transition

  /* --- Category Definitions --- */
  const DEFAULT_CATEGORIES = {
    growth:      { name: 'Growth',      icon: '🌱', goalPercent: 40, goalHours: 9.6  },
    sleep:       { name: 'Sleep',       icon: '😴', goalPercent: 30, goalHours: 7.2  },
    maintenance: { name: 'Maintenance', icon: '🍽', goalPercent: 10, goalHours: 2.4  },
    workout:     { name: 'Workout',     icon: '💪', goalPercent: 5,  goalHours: 1.2  },
    relief:      { name: 'Relief',      icon: '🎮', goalPercent: 5,  goalHours: 1.2  },
    storage:     { name: 'Storage',     icon: '📦', goalPercent: 10, goalHours: 2.4  }
  };

  const CATEGORIES = (() => {
    try {
      const val = localStorage.getItem('lifeos_categories');
      if (val) return JSON.parse(val);
    } catch {}
    return JSON.parse(JSON.stringify(DEFAULT_CATEGORIES));
  })();

  function saveCategories(newHoursMap) {
    let totalHours = 0;
    Object.values(newHoursMap).forEach(h => totalHours += h);
    if (totalHours <= 0) totalHours = 1; // Prevent division by zero
    
    Object.keys(CATEGORIES).forEach(key => {
      if (newHoursMap[key] !== undefined) {
        CATEGORIES[key].goalHours = newHoursMap[key];
        CATEGORIES[key].goalPercent = Math.round((newHoursMap[key] / totalHours) * 100);
      }
    });

    localStorage.setItem('lifeos_categories', JSON.stringify(CATEGORIES));
  }

  /* --- Achievement Definitions --- */
  const ACHIEVEMENT_DEFS = [
    { id: 'streak_7',      name: '7-Day Streak',        icon: '🔥', description: 'Log 7 consecutive days' },
    { id: 'streak_30',     name: '30-Day Streak',       icon: '🔥', description: 'Log 30 consecutive days' },
    { id: 'growth_100',    name: '100 Growth Hours',    icon: '🌱', description: 'Accumulate 100h of Growth' },
    { id: 'growth_500',    name: '500 Growth Hours',    icon: '🌱', description: 'Accumulate 500h of Growth' },
    { id: 'perfect_day',   name: 'Perfect Day',         icon: '⭐', description: 'Reach 100% Life Balance Score' },
    { id: 'workout_champ', name: 'Workout Champion',    icon: '💪', description: '30 days with ≥1h workout' },
    { id: 'sleep_master',  name: 'Sleep Master',        icon: '😴', description: '14 days of 7+ hours sleep' },
    { id: 'legend',        name: 'Productivity Legend',  icon: '🏆', description: '50 days with score ≥ 90%' }
  ];

  /* --- LocalStorage Helpers --- */
  function _getLogs() {
    try {
      const val = localStorage.getItem('lifeos_logs');
      return val ? JSON.parse(val) : {};
    } catch { return {}; }
  }

  function _saveLogs(logs) {
    localStorage.setItem('lifeos_logs', JSON.stringify(logs));
  }

  function _getAchievementsRaw() {
    try {
      const val = localStorage.getItem('lifeos_achievements');
      return val ? JSON.parse(val) : {};
    } catch { return {}; }
  }

  function _saveAchievements(ach) {
    localStorage.setItem('lifeos_achievements', JSON.stringify(ach));
  }

  /* --- Initialize --- */
  function init() {
    return Promise.resolve(true); // No longer needed for LocalStorage, but kept for compatibility
  }

  /* --- Date Helpers --- */
  function getDateString(date = new Date()) {
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function getTodayString() {
    return getDateString(new Date());
  }

  /* --- Create Empty Day Data --- */
  function createEmptyDay(dateStr) {
    const categories = {};
    Object.keys(CATEGORIES).forEach(key => {
      categories[key] = 0;
    });
    return {
      date: dateStr,
      categories,
      score: 0,
      timestamp: Date.now()
    };
  }

  /* --- Calculate Life Balance Score --- */
  function calculateScore(categories) {
    let totalWeight = 0;
    let weightedScore = 0;

    Object.keys(CATEGORIES).forEach(key => {
      const goal = CATEGORIES[key].goalHours;
      const actual = categories[key] || 0;
      const ratio = Math.min(actual / goal, 1); // Cap at 100%
      const weight = CATEGORIES[key].goalPercent;
      weightedScore += ratio * weight;
      totalWeight += weight;
    });

    return Math.round((weightedScore / totalWeight) * 100);
  }

  /* --- Save Day Data --- */
  function saveDayData(dateStr, categories) {
    return new Promise((resolve) => {
      const score = calculateScore(categories);
      const data = {
        date: dateStr,
        categories: { ...categories },
        score,
        timestamp: Date.now()
      };

      const logs = _getLogs();
      logs[dateStr] = data;
      _saveLogs(logs);

      resolve(data);
    });
  }

  /* --- Get Day Data --- */
  function getDayData(dateStr) {
    return new Promise((resolve) => {
      const logs = _getLogs();
      resolve(logs[dateStr] || createEmptyDay(dateStr));
    });
  }

  /* --- Get Week Data --- */
  function getWeekData(startDate) {
    return new Promise(async (resolve) => {
      const days = [];
      const start = new Date(startDate);
      for (let i = 0; i < 7; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        const data = await getDayData(getDateString(d));
        days.push(data);
      }
      resolve(days);
    });
  }

  /* --- Get Month Data --- */
  function getMonthData(year, month) {
    return new Promise(async (resolve) => {
      const days = [];
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      for (let i = 1; i <= daysInMonth; i++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        const data = await getDayData(dateStr);
        days.push(data);
      }
      resolve(days);
    });
  }

  /* --- Get All Data (for export) --- */
  function getAllData() {
    return new Promise((resolve) => {
      resolve({
        version: DB_VERSION,
        exportDate: new Date().toISOString(),
        categories: CATEGORIES,
        dailyLogs: Object.values(_getLogs()),
        achievements: Object.values(_getAchievementsRaw()),
        settings: getSettings()
      });
    });
  }

  /* --- Import Data --- */
  function importData(jsonData) {
    return new Promise((resolve, reject) => {
      try {
        const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

        if (!data.dailyLogs || !Array.isArray(data.dailyLogs)) {
          throw new Error('Invalid data format');
        }

        const newLogs = {};
        data.dailyLogs.forEach(log => newLogs[log.date] = log);
        _saveLogs(newLogs);

        if (data.achievements) {
          const newAch = {};
          data.achievements.forEach(a => newAch[a.id] = a);
          _saveAchievements(newAch);
        }

        if (data.categories) {
          Object.assign(CATEGORIES, data.categories);
          localStorage.setItem('lifeos_categories', JSON.stringify(CATEGORIES));
        }

        if (data.settings) {
          Object.keys(data.settings).forEach(key => {
            localStorage.setItem(`lifeos_${key}`, JSON.stringify(data.settings[key]));
          });
        }

        resolve(true);
      } catch (e) {
        reject(e);
      }
    });
  }

  /* --- Clear All Data --- */
  function clearAllData() {
    return new Promise((resolve) => {
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('lifeos_')) {
          localStorage.removeItem(key);
        }
      });
      resolve(true);
    });
  }

  /* --- Settings (LocalStorage) --- */
  function getSetting(key, defaultValue) {
    try {
      const val = localStorage.getItem(`lifeos_${key}`);
      return val !== null ? JSON.parse(val) : defaultValue;
    } catch {
      return defaultValue;
    }
  }

  function setSetting(key, value) {
    localStorage.setItem(`lifeos_${key}`, JSON.stringify(value));
  }

  function getSettings() {
    return {
      theme: getSetting('theme', 'dark'),
      accent: getSetting('accent', 'purple'),
      animations: getSetting('animations', true),
      notifications: getSetting('notifications', true)
    };
  }

  /* --- Achievements --- */
  function getAchievements() {
    return new Promise((resolve) => {
      const storedMap = _getAchievementsRaw();

      // Merge with definitions
      const achievements = ACHIEVEMENT_DEFS.map(def => ({
        ...def,
        unlocked: storedMap[def.id]?.unlocked || false,
        unlockedDate: storedMap[def.id]?.unlockedDate || null
      }));
      resolve(achievements);
    });
  }

  function unlockAchievement(id) {
    return new Promise((resolve) => {
      const ach = _getAchievementsRaw();
      const data = {
        id,
        unlocked: true,
        unlockedDate: new Date().toISOString()
      };
      ach[id] = data;
      _saveAchievements(ach);
      resolve(data);
    });
  }

  /* --- Check Achievements --- */
  async function checkAchievements() {
    const achievements = await getAchievements();
    const allLogs = Object.values(_getLogs());
    const newlyUnlocked = [];

    // Sort logs by date
    allLogs.sort((a, b) => a.date.localeCompare(b.date));

    // Calculate streaks
    let currentStreak = 0;
    let longestStreak = 0;
    const today = getTodayString();
    const loggedDates = new Set(allLogs.filter(l => {
      const totalHours = Object.values(l.categories).reduce((s, v) => s + v, 0);
      return totalHours > 0;
    }).map(l => l.date));

    // Count backwards from today
    const d = new Date();
    while (true) {
      const ds = getDateString(d);
      if (loggedDates.has(ds)) {
        currentStreak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }

    // Calculate longest streak
    let tempStreak = 0;
    const sortedDates = Array.from(loggedDates).sort();
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Totals
    let totalGrowth = 0;
    let workoutDays = 0;
    let sleepDays = 0;
    let highScoreDays = 0;
    let perfectDay = false;

    allLogs.forEach(log => {
      totalGrowth += log.categories.growth || 0;
      if ((log.categories.workout || 0) >= 1) workoutDays++;
      if ((log.categories.sleep || 0) >= 7) sleepDays++;
      if (log.score >= 90) highScoreDays++;
      if (log.score >= 100) perfectDay = true;
    });

    // Check each achievement
    const checks = {
      streak_7: currentStreak >= 7 || longestStreak >= 7,
      streak_30: currentStreak >= 30 || longestStreak >= 30,
      growth_100: totalGrowth >= 100,
      growth_500: totalGrowth >= 500,
      perfect_day: perfectDay,
      workout_champ: workoutDays >= 30,
      sleep_master: sleepDays >= 14,
      legend: highScoreDays >= 50
    };

    for (const achievement of achievements) {
      if (!achievement.unlocked && checks[achievement.id]) {
        await unlockAchievement(achievement.id);
        newlyUnlocked.push(achievement);
      }
    }

    return { newlyUnlocked, currentStreak, longestStreak, totalGrowth, workoutDays, sleepDays, highScoreDays };
  }

  /* --- Get Stats --- */
  async function getStats() {
    const allLogs = Object.values(_getLogs());

    const activeLogs = allLogs.filter(l => {
      const total = Object.values(l.categories).reduce((s, v) => s + v, 0);
      return total > 0;
    });

    activeLogs.sort((a, b) => a.date.localeCompare(b.date));

    // Averages
    const avgScore = activeLogs.length > 0
      ? Math.round(activeLogs.reduce((s, l) => s + l.score, 0) / activeLogs.length)
      : 0;

    // Streaks
    let currentStreak = 0;
    let longestStreak = 0;
    const loggedDates = new Set(activeLogs.map(l => l.date));

    const d = new Date();
    while (true) {
      const ds = getDateString(d);
      if (loggedDates.has(ds)) { currentStreak++; d.setDate(d.getDate() - 1); }
      else break;
    }

    let tempStreak = 0;
    const sortedDates = Array.from(loggedDates).sort();
    for (let i = 0; i < sortedDates.length; i++) {
      if (i === 0) { tempStreak = 1; }
      else {
        const prev = new Date(sortedDates[i - 1]);
        const curr = new Date(sortedDates[i]);
        const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
        tempStreak = diffDays === 1 ? tempStreak + 1 : 1;
      }
      longestStreak = Math.max(longestStreak, tempStreak);
    }

    // Totals
    let totalGrowth = 0, totalWorkout = 0, totalSleep = 0;
    let productiveDays = 0;

    activeLogs.forEach(log => {
      totalGrowth += log.categories.growth || 0;
      totalWorkout += log.categories.workout || 0;
      totalSleep += log.categories.sleep || 0;
      if (log.score >= 80) productiveDays++;
    });

    const avgSleep = activeLogs.length > 0
      ? (totalSleep / activeLogs.length).toFixed(1)
      : '0.0';

    // Weekly average (last 7 days)
    const last7 = activeLogs.slice(-7);
    const weeklyAvg = last7.length > 0
      ? Math.round(last7.reduce((s, l) => s + l.score, 0) / last7.length)
      : 0;

    // Monthly average (last 30 days)
    const last30 = activeLogs.slice(-30);
    const monthlyAvg = last30.length > 0
      ? Math.round(last30.reduce((s, l) => s + l.score, 0) / last30.length)
      : 0;

    // Yearly average
    const thisYear = new Date().getFullYear();
    const yearLogs = activeLogs.filter(l => l.date.startsWith(String(thisYear)));
    const yearlyAvg = yearLogs.length > 0
      ? Math.round(yearLogs.reduce((s, l) => s + l.score, 0) / yearLogs.length)
      : 0;

    return {
      avgScore,
      currentStreak,
      longestStreak,
      totalGrowth: totalGrowth.toFixed(1),
      totalWorkout: totalWorkout.toFixed(1),
      avgSleep,
      productiveDays,
      weeklyAvg,
      monthlyAvg,
      yearlyAvg,
      totalDays: activeLogs.length
    };
  }

  return {
    init,
    CATEGORIES,
    ACHIEVEMENT_DEFS,
    getDateString,
    getTodayString,
    createEmptyDay,
    calculateScore,
    saveDayData,
    getDayData,
    getWeekData,
    getMonthData,
    getAllData,
    importData,
    clearAllData,
    getSetting,
    setSetting,
    getSettings,
    getAchievements,
    unlockAchievement,
    checkAchievements,
    getStats,
    saveCategories
  };
})();
