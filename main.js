const {app, BrowserWindow, globalShortcut} = require('electron');

process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true';

app.commandLine.appendSwitch('force-color-profile', 'srgb');

let mainWindow;

app.on('ready', () => {
    globalShortcut.register('Alt+Escape', () => {
        globalShortcut.unregisterAll();
        app.quit();
    });

    mainWindow = new BrowserWindow({
        // frame: false,
        // transparent:true,
        // resizable: false,
        // alwaysOnTop: true,
        // fullscreen: true,
        webPreferences: {
            nodeIntegration: true,
        }
    });
    // mainWindow.maximize();
    // mainWindow.setIgnoreMouseEvents(true);
    // mainWindow.setFullScreen(true);
    mainWindow.webContents.openDevTools();
    mainWindow.loadFile('index.html');

    // mainWindow.on('focus', () => mainWindow.setFullScreen(true));
    // mainWindow.on('blur', () => console.log('blur'));
    // mainWindow.on('show', () => console.log('show'));
    // mainWindow.on('restore', () => mainWindow.setFullScreen(true));
    // mainWindow.on('unmaximize', () => console.log('unmaximize'));
    // setInterval(() => mainWindow.setFullScreen(true), 3000);


});


app.on('window-all-closed', () => {
    globalShortcut.unregisterAll();
    app.quit();
});
