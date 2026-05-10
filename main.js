/**
 * Electron 主进程
 * 经侦工作日志登记系统 (EIWLRS)
 * 制作人：陈洪涛
 */
const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// 防止多开
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    return;
}

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 700,
        title: '经侦工作日志登记系统 V1.2',
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
            sandbox: false
        },
        show: false,
        backgroundColor: '#F5F5F5'
    });

    mainWindow.loadFile('index.html');

    // 窗口准备好后再显示，避免白屏
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 开发模式下打开 DevTools
    if (process.argv.includes('--dev')) {
        mainWindow.webContents.openDevTools();
    }

    // 点击关闭时隐藏到托盘而非退出（可选）
    mainWindow.on('close', (e) => {
        // 直接退出
    });
}

// 应用准备就绪
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 所有窗口关闭时退出
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// IPC - 保存文件对话框
ipcMain.handle('show-save-dialog', async (event, options) => {
    const result = await dialog.showSaveDialog(mainWindow, {
        title: options.title || '保存文件',
        defaultPath: options.defaultPath || '未命名',
        filters: options.filters || []
    });
    return result;
});

// IPC - 打开文件对话框
ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(mainWindow, {
        title: options.title || '选择文件',
        filters: options.filters || [],
        properties: options.properties || ['openFile']
    });
    return result;
});

// IPC - 写文件
ipcMain.handle('write-file', async (event, filePath, data) => {
    try {
        // data 是 base64 编码的
        const buffer = Buffer.from(data, 'base64');
        fs.writeFileSync(filePath, buffer);
        return { success: true };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

// IPC - 关闭应用
ipcMain.handle('close-app', () => {
    app.quit();
});

// IPC - 读文件
ipcMain.handle('read-file', async (event, filePath) => {
    try {
        const buffer = fs.readFileSync(filePath);
        return { success: true, data: buffer.toString('base64') };
    } catch (e) {
        return { success: false, error: e.message };
    }
});

console.log('经侦工作日志登记系统 V1.2 - 制作人：陈洪涛');
