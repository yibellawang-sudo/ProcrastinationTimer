function isElectron() {
  return typeof window !== "undefined" && typeof window.process === "object" && window.process.type === "renderer";
}

// ======= ELEMENTS =======
const startBtn = document.getElementById("startBtn");
const pauseBtn = document.getElementById("pauseBtn");
const stopBtn = document.getElementById("stopBtn");
const chartsBtn = document.getElementById("chartsBtn");
const milestonesBtn = document.getElementById("milestonesBtn");
const focusModeBtn = document.getElementById("focusModeBtn");
const timerDisplay = document.getElementById("timer");
const roastDiv = document.getElementById("roast");
const sessionNameInput = document.getElementById("sessionName");
const focusTimeDiv = document.getElementById("focusTime");
const procrastinationTimeDiv = document.getElementById("procrastinationTime");
const avatar = document.getElementById("avatar");
const circle = document.getElementById("progress-ring-circle");

// safe circle init (only if element exists)
let radius, circumference;
if (circle) {
  radius = circle.r.baseVal.value;
  circumference = 2 * Math.PI * radius;
  circle.style.strokeDasharray = circumference;
  circle.style.strokeDashoffset = circumference;
}

const startSound = document.getElementById("startSound");
const pauseSound = document.getElementById("pauseSound");
const stopSound = document.getElementById("stopSound");

// ======= STATE =======
let stopwatchSeconds = 0;
let focusSeconds = 0;
let procrastinationSeconds = 0;
let pauseCount = 0;
let focusInterval = null;
let procrastinationInterval = null;
let isFocusing = false;
let isProcrastinating = false;
let walkInterval = null;

// cumulative + other state
let cumulativeFocus = parseInt(localStorage.getItem("cumulativeFocus")) || 0;
let cumulativeProcrastination = parseInt(localStorage.getItem("cumulativeProcrastination")) || 0;
let streak = parseInt(localStorage.getItem("streak")) || 0;
let reachedMilestones = new Set();
let lastActiveDate = localStorage.getItem("lastActiveDate") || null;
let weeklyStats = JSON.parse(localStorage.getItem("weeklyStats")) || [];

const roasts = [
  "Oh wow, another break? Groundbreaking.",
  "Your future self is facepalming right now.",
  "TikTok called — they said thanks!",
  "Netflix isn't going to watch itself, right?",
  "Another notification? It can wait. Oh wait, you clicked it.",
  "Professional procrastinator applying for a raise?",
  "Your to-do list is weeping quietly in the corner.",
  "Instagram stories > your dreams, apparently.",
  "That 'quick' YouTube video was 45 minutes ago.",
  "Scrolling through memes counts as research, right?",
  "Your deadline sends its regards.",
  "Breaking news: Local person discovers new way to avoid work.",
  "Your productivity called. It left a voicemail you'll ignore.",
  "This break sponsored by 'I'll Start Tomorrow Inc.'",
  "Champion of the 'Just 5 More Minutes' Olympics.",
  "Your focus lasted longer than most celebrity marriages.",
  "Refresh that feed one more time, I'm sure it'll help.",
  "Coffee break #7 hits different, doesn't it?",
  "Your brain: 'Let's work!' Your body: 'But... couch.'",
  "Adding 'professional time waster' to your LinkedIn?"
];

const excuses = [
  "I had to water my imaginary plants :(",
  "My goldfish needed emotional support 🐟.",
  "My chair wasn't sitting right, had to adjust.",
  "I heard a noise. Had to investigate for 20 minutes.",
  "My pen ran out of ink. All of them. Simultaneously.",
  "The wifi signal looked weak. Had to stand closer.",
  "I was manifesting productivity. It didn't manifest.",
  "My cat gave me that look. You know the one.",
  "I had to reorganize my desk. For the third time today.",
  "The temperature was 0.5 degrees off. Unworkable conditions."
];

const milestones = [1800, 3600, 7200, 10800];

// ======= HELPERS =======
function getTodayString() {
  const today = new Date();
  return today.toISOString().split('T')[0]; // YYYY-MM-DD
}

function calculateProductivityScore(focus, procrastination) {
  const total = focus + procrastination;
  if (total === 0) return 0;
  const ratio = focus / total;
  // Score from 0-100 based on focus ratio
  return Math.round(ratio * 100);
}

function checkAndUpdateStreak() {
  const today = getTodayString();
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayString = yesterday.toISOString().split('T')[0];
  
  if (lastActiveDate === today) {
    // Already checked today
    return;
  }
  
  if (lastActiveDate === yesterdayString) {
    // Continuing streak
    streak++;
  } else if (lastActiveDate === null) {
    // First time user
    streak = 1;
  } else {
    // Streak broken
    streak = 1;
  }
  
  lastActiveDate = today;
  localStorage.setItem("lastActiveDate", lastActiveDate);
  localStorage.setItem("streak", streak);
}

function penalizeStreak(procrastinationRatio) {
  // If more than 60% of session was procrastination, lose streak
  if (procrastinationRatio > 0.6 && streak > 0) {
    streak = 0;
    localStorage.setItem("streak", streak);
    roastDiv.textContent = "💔 Streak lost! Too much procrastination detected.";
    setTimeout(() => {
      roastDiv.textContent = "Reset and try again tomorrow!";
    }, 3000);
  }
}

function saveSessionToWeekly(focusTime, procrastTime) {
  const today = getTodayString();
  const score = calculateProductivityScore(focusTime, procrastTime);
  
  // Find if today already exists
  const existingIndex = weeklyStats.findIndex(s => s.date === today);
  
  if (existingIndex >= 0) {
    // Update existing day
    weeklyStats[existingIndex].focus += focusTime;
    weeklyStats[existingIndex].procrastination += procrastTime;
    weeklyStats[existingIndex].score = calculateProductivityScore(
      weeklyStats[existingIndex].focus,
      weeklyStats[existingIndex].procrastination
    );
  } else {
    // Add new day
    weeklyStats.push({
      date: today,
      focus: focusTime,
      procrastination: procrastTime,
      score: score
    });
  }
  
  // Keep only last 30 days
  if (weeklyStats.length > 30) {
    weeklyStats = weeklyStats.slice(-30);
  }
  
  localStorage.setItem("weeklyStats", JSON.stringify(weeklyStats));
}

function getLeaderboardData() {
  // Get last 7 days
  const sortedStats = [...weeklyStats].sort((a, b) => new Date(b.date) - new Date(a.date));
  const last7Days = sortedStats.slice(0, 7);
  
  return last7Days.map(day => ({
    date: new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
    score: day.score,
    focus: formatTime(day.focus),
    procrastination: formatTime(day.procrastination)
  }));
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function setProgress(percent) {
  if (!circle || !circumference) return;
  const offset = circumference - (percent / 100) * circumference;
  circle.style.strokeDashoffset = offset;
}

function updateDisplays() {
  timerDisplay.textContent = formatTime(stopwatchSeconds);
  
  if (isElectron()) {
    const { ipcRenderer } = require("electron");
    ipcRenderer.send("timer-update", { 
      stopwatchSeconds,
      focusSeconds,
      procrastinationSeconds 
    });
  }
  
  const total = cumulativeFocus + cumulativeProcrastination + focusSeconds + procrastinationSeconds;
  const percentFocused = total ? Math.round(((cumulativeFocus + focusSeconds) / total) * 100) : 0;
  
  if (focusTimeDiv) focusTimeDiv.textContent = `${formatTime(cumulativeFocus + focusSeconds)}`;
  if (procrastinationTimeDiv) {
    procrastinationTimeDiv.textContent = `${formatTime(cumulativeProcrastination + procrastinationSeconds)} (${percentFocused}% focused)`;
    
    // Add streak display
    if (streak > 0) {
      procrastinationTimeDiv.textContent += ` | 🔥 ${streak} day streak`;
    }
  }
  
  setProgress(Math.min((focusSeconds / 3600) * 100, 100));
}

function checkMilestones() {
  if (milestones.includes(stopwatchSeconds) && !reachedMilestones.has(stopwatchSeconds)) {
    reachedMilestones.add(stopwatchSeconds);
    roastDiv.textContent = "🎉 Milestone reached!";
    timerDisplay.style.color = "#ffdc00";
  }
}

// AVATAR MOTION - Seamless looping version
function startWalking() {
  if (walkInterval) return;
  
  avatar.src = "foxWalking.gif";
  
  // Get current position to start from wherever avatar currently is
  const currentRect = avatar.getBoundingClientRect();
  let avatarX = currentRect.left; // Start from current left position
  
  walkInterval = setInterval(() => {
    avatarX -= 3; // move left
    
    // When avatar goes completely off the LEFT side
    if (avatarX < -120) { // avatar width is 120px
      // Teleport to RIGHT side
      avatarX = window.innerWidth;
    }
    
    // Use absolute positioning with left instead of transform
    avatar.style.left = avatarX + "px";
    avatar.style.right = "auto"; // Override CSS right positioning
  }, 30);
}

function pauseWalkingAndSetSad() {
  if (walkInterval) {
    clearInterval(walkInterval);
    walkInterval = null;
  }
  avatar.src = "foxSad.gif";
}

function stopWalkingAndSetNeutral() {
  if (walkInterval) {
    clearInterval(walkInterval);
    walkInterval = null;
  }
  avatar.src = "foxNeutral.png";
}

// TIMERS
function startFocusTracking() {
  if (isFocusing) return;
  
  if (procrastinationInterval) {
    clearInterval(procrastinationInterval);
    procrastinationInterval = null;
  }
  
  isFocusing = true;
  isProcrastinating = false;
  
  focusInterval = setInterval(() => {
    focusSeconds++;
    stopwatchSeconds++;
    updateDisplays();
    checkMilestones();
  }, 1000);
}

function startProcrastinationTracking() {
  if (isProcrastinating) return;
  
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }
  
  isProcrastinating = true;
  isFocusing = false;
  
  procrastinationInterval = setInterval(() => {
    procrastinationSeconds++;
    updateDisplays();
  }, 1000);
}

function stopTracking() {
  if (focusInterval) {
    clearInterval(focusInterval);
    focusInterval = null;
  }
  if (procrastinationInterval) {
    clearInterval(procrastinationInterval);
    procrastinationInterval = null;
  }
  isFocusing = false;
  isProcrastinating = false;
}

// BUTTON HANDLERS
startBtn.addEventListener("click", () => {
  startSound?.play?.();
  
  const sessionName = sessionNameInput.value || "Unnamed Session";
  roastDiv.textContent = `🔒 Focus session started: ${sessionName}`;
  
  startWalking();
  startFocusTracking();
  
  startBtn.disabled = true;
  pauseBtn.disabled = false;
  stopBtn.disabled = false;
});

pauseBtn.addEventListener("click", () => {
  pauseSound?.play?.();
  
  pauseWalkingAndSetSad();
  startProcrastinationTracking();
  
  pauseCount++;
  const msg = (pauseCount % 2 === 0) 
    ? excuses[Math.floor(Math.random() * excuses.length)] 
    : roasts[Math.floor(Math.random() * roasts.length)];
  roastDiv.textContent = msg;
  
  startBtn.disabled = false;
});

stopBtn.addEventListener("click", () => {
  stopSound?.play?.();
  
  stopWalkingAndSetNeutral();
  stopTracking();
  
  startBtn.disabled = false;
  pauseBtn.disabled = true;
  stopBtn.disabled = true;
  
  // Check and update streak
  checkAndUpdateStreak();
  
  // Calculate session stats
  const totalSessionTime = focusSeconds + procrastinationSeconds;
  const procrastinationRatio = totalSessionTime > 0 ? procrastinationSeconds / totalSessionTime : 0;
  const sessionScore = calculateProductivityScore(focusSeconds, procrastinationSeconds);
  
  // Penalize if too much procrastination
  penalizeStreak(procrastinationRatio);
  
  // Save session to weekly stats
  saveSessionToWeekly(focusSeconds, procrastinationSeconds);
  
  cumulativeFocus += focusSeconds;
  cumulativeProcrastination += procrastinationSeconds;
  localStorage.setItem("cumulativeFocus", cumulativeFocus);
  localStorage.setItem("cumulativeProcrastination", cumulativeProcrastination);
  
  roastDiv.textContent = `Session ended. Focus: ${formatTime(focusSeconds)}, Procrastination: ${formatTime(procrastinationSeconds)}. Score: ${sessionScore}/100`;
  
  stopwatchSeconds = 0;
  focusSeconds = 0;
  procrastinationSeconds = 0;
  updateDisplays();
});

// Navigation handlers
const leaderboardBtn = document.getElementById("leaderboardBtn");

if (isElectron()) {
  const { ipcRenderer } = require("electron");
  
  milestonesBtn.addEventListener("click", () => {
    ipcRenderer.send("navigate", "milestone.html");
  });
  
  chartsBtn.addEventListener("click", () => {
    ipcRenderer.send("navigate", "charts.html");
  });
  
  if (leaderboardBtn) {
    leaderboardBtn.addEventListener("click", () => {
      ipcRenderer.send("navigate", "leaderboard.html");
    });
  }

  focusModeBtn.addEventListener("click", () => {
    ipcRenderer.send("toggle-focus-mode", true);
  });
  
  // Listen for pause from focus window
  ipcRenderer.on("pause-timer", () => {
    pauseBtn.click();
  });
} else {
  milestonesBtn.addEventListener("click", () => {
    window.location.href = "milestone.html";
  });
  
  chartsBtn.addEventListener("click", () => {
    window.location.href = "charts.html";
  });
  
  leaderboardBtn.addEventListener("click", () => {
      window.location.href = "leaderboard.html";
    });
  
  focusModeBtn.addEventListener("click", () => {
    alert("Focus Mode only works in the desktop app!");
  });
}

// Initial display update
updateDisplays();