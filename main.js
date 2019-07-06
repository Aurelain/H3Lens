const {app, BrowserWindow, globalShortcut} = require('electron');

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
let mainWindow;

app.commandLine.appendSwitch('force-color-profile', 'srgb');
app.on('ready', () => {
    globalShortcut.register('Alt+Escape', () => {
        globalShortcut.unregisterAll();
        app.quit();
    });

    mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true,
        }
    });
    mainWindow.maximize();
    mainWindow.webContents.openDevTools();
    mainWindow.loadFile('index.html');

});

app.on('window-all-closed', () => {
    globalShortcut.unregisterAll();
    app.quit();
});
