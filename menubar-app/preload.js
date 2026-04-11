'use strict';
const { contextBridge, ipcRenderer } = require('electron');

// Keep at most one data-update listener to avoid duplicates across show/hide cycles
let _dataUpdateCb = null;

contextBridge.exposeInMainWorld('lc', {
    getCachedData: () => ipcRenderer.invoke('get-cached-data'),
    fetchUserData: (username) => ipcRenderer.invoke('fetch-user-data', username),
    getCompanies: () => ipcRenderer.invoke('get-companies'),
    getCompanyProblems: (company) => ipcRenderer.invoke('get-company-problems', company),
    getDailyProblem: () => ipcRenderer.invoke('get-daily-problem'),
    getUsername: () => ipcRenderer.invoke('get-username'),
    saveUsername: (username) => ipcRenderer.invoke('save-username', username),
    openUrl: (url) => ipcRenderer.send('open-url', url),
    openWebApp: () => ipcRenderer.send('open-webapp'),
    openTracker: () => ipcRenderer.send('open-tracker'),

    /** Register a single callback for live data pushes from the main process. */
    onDataUpdate: (fn) => {
        if (_dataUpdateCb) ipcRenderer.removeListener('data-update', _dataUpdateCb);
        _dataUpdateCb = (_, payload) => fn(payload);
        ipcRenderer.on('data-update', _dataUpdateCb);
    },
});
