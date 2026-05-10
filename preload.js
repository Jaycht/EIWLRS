/**
 * preload.js — 安全的桥接层
 * 经侦工作日志登记系统 (EIWLRS)
 * 制作人：陈洪涛
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
    showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
    writeFile: (filePath, data) => ipcRenderer.invoke('write-file', filePath, data),
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
    closeApp: () => ipcRenderer.invoke('close-app'),
    isElectron: true
});
