const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");

let mainWindow;
let focusWindow = null;
let stopwatchSeconds = 0;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 500,
        height: 700,
        vibrancy: 'ultra-dark',
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        show: true
    });

    mainWindow.loadFile('index.html');
   
    mainWindow.on("closed", () => {mainWindow = null});
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
//IPC
ipcMain.on("toggle-focus-mode", (event, isOn) => {
    if(isOn) {
        focusWindow = new BrowserWindow({
            width: 300,
            height: 150,
            transparent: true,
            frame: false,
            alwaysOnTop: true,
            skipTaskbar: true,
            resizable: false,
            webPreferences: { nodeIntegration: true, contextIsolation: false }
        });

        focusWindow.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
        focusWindow.loadFile("focus.html");
        focusWindow.on("closed", () => {focusWindow = null});
    } else {
        if (focusWindow) {
            focusWindow.close();
            focusWindow = null;
        }
        if (mainWindow) mainWindow.show();
    }
});

ipcMain.on("timer-update", (event, timerData) => {
    if (focusWindow) {
        focusWindow.webContents.send("update-timer", timerData);
    }
});

 //handle pause from focus window
ipcMain.on("pause-timer", () => {
    if (mainWindow) mainWindow.webContents.send("pause-timer");
});

