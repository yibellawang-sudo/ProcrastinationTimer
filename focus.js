const { ipcRenderer } = require("electron");

const timerDisplay = document.getElementById("timer");
const pauseBtn = document.getElementById("pauseBtn");
const exitBtn = document.getElementById("exitFocusBtn");

function formatTime(sec) {
    const m = Math.floor(sec/60);
    const s = sec % 60;
    return `${m.toString().padStart(2,"0")}:${s.toString().padStart(2,"0")}`;
}

ipcRenderer.on("update-timer", (event, data) => {
    timerDisplay.textContent = formatTime(data.focusSeconds);
});

pauseBtn.addEventListener("click", ()=> {
    ipcRenderer.send("pause-timer");
});

exitBtn.addEventListener("click", () => {
    ipcRenderer.send("toggle-focus-mode", false);
});