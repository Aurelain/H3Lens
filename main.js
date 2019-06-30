const {app, BrowserWindow} = require('electron');

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';
let mainWindow;


app.on('ready', () => {
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
    app.quit();
});
