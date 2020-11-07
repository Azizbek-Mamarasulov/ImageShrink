const path = require('path');
const os = require('os');
const imagemin = require('imagemin');
const imageminMozJpeg = require('imagemin-mozjpeg');
const imageminPngQuant = require('imagemin-pngquant');
const slash = require('slash');
const log = require('electron-log');

process.env.NODE_ENV = "production";
const isDev = process.env.NODE_ENV === 'development';
const isMac = process.platform === 'darwin';

const cwd = process.cwd();
function getPath(x){
    return path.join(cwd, x)
}

const { app, BrowserWindow, Menu, ipcMain, dialog, shell } = require('electron')

const { DEFAULT_FOLDER_NAME, ERROR } = require('../src/js/consts');

function createWindow() {
    const win = new BrowserWindow({
        width: isDev ? 800 : 400,
        height: 600,
        icon: path.join(getPath("/assets/icons/Icon_256x256.png")),
        webPreferences: {
            nodeIntegration: true
        },
        resizable: isDev ? true : false
    });

    win.loadFile(getPath('src/index.html'));
    if (isDev) {
        win.webContents.openDevTools();
    }
}

function createAboutWindow() {
    const win = new BrowserWindow({
        width: 300,
        height: 300,
        resizable: false,
        icon: path.join(getPath("/assets/icons/Icon_256x256.png")),
    });
    win.loadFile(getPath("/src/about.html"));
    win.removeMenu();
}

app.whenReady().then(() => {
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
    createWindow();
});

const menuTemplate = [
    ...(isMac ? [{
        label: app.name,
        submenu: [
            {
                label: "About",
                click: createAboutWindow
            }
        ]
    }] : []),
    { role: "fileMenu" },
    ...(isDev ? [
        {
            label: "Developer",
            submenu: [
                { role: "reload" },
                { role: "forcereload" },
                { type: "separator" },
                { role: "toggledevtools" }
            ]
        }
    ] : []),
    ...(!isMac ? [
        {
            label: "Help",
            submenu: [
                {
                    label: "About",
                    click: createAboutWindow
                }
            ]
        }
    ] : [])
];

async function imageShrink({ imgPath, quality, dest }) {
    try {
        const pngQuality = quality / 100;
        const image = slash(imgPath);
        await imagemin([image], {
            destination: dest,
            plugins: [
                imageminMozJpeg({ quality }),
                imageminPngQuant({
                    quality: [pngQuality, pngQuality]
                }),
            ]
        });

        log.info({
            sourcePath: dest,
            destinationPath: imgPath,
            quality: quality
        });

        shell.openPath(dest);
        return true;
    } catch (err) {
        log.error(err);
        dialog.showErrorBox(err.name, err.message);
    }
}


ipcMain.handle('select-dir', () => {
    try {
        return dialog.showOpenDialogSync({
            properties: ["openDirectory"]
        });
    } catch (err) {
        log.error(err);
        ipcMain.emit('alert', {}, {
            type: ERROR,
            title: err.name,
            message: err.message,
            description: err.description
        });
    }
});

ipcMain.handle('image-minimize', async (e, options) => {
    if (!options.dest) {
        options.dest = path.join(os.homedir(), DEFAULT_FOLDER_NAME);
    }
    return await imageShrink(options);
});

ipcMain.on('alert', (e, { type, title, message, detail }) => {
    if (type === ERROR) {
        log.error({
            title,
            message,
            detail
        });
    }
    dialog.showMessageBox({
        type,
        title,
        message,
        detail
    })
})

app.on('window-all-closed', () => {
    if (isMac) {
        app.quit();
    }
});

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
});