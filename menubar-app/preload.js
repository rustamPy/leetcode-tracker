'use strict';
const { contextBridge, ipcRenderer } = require('electron');

let _dataUpdateCb = null;

contextBridge.exposeInMainWorld('lc', {
    getCachedData: () => ipcRenderer.invoke('get-cached-data'),
    getVersion: () => ipcRenderer.invoke('get-version'),
    checkForUpdate: () => ipcRenderer.invoke('check-for-update'),
    fetchUserData: (username) => ipcRenderer.invoke('fetch-user-data', username),
    getCompanies: () => ipcRenderer.invoke('get-companies'),
    getCompanyProblems: (company) => ipcRenderer.invoke('get-company-problems', company),
    getDailyProblem: () => ipcRenderer.invoke('get-daily-problem'),
    checkPremium: (titleSlug) => ipcRenderer.invoke('check-premium', titleSlug),
    getUsername: () => ipcRenderer.invoke('get-username'),
    saveUsername: (username) => ipcRenderer.invoke('save-username', username),
    getSession: () => ipcRenderer.invoke('get-session'),
    saveSession: (token) => ipcRenderer.invoke('save-session', token),
    getSessionUsername: () => ipcRenderer.invoke('get-session-username'),
    checkSession: () => ipcRenderer.invoke('check-session'),
    loginWithBrowser: () => ipcRenderer.invoke('login-with-browser'),
    openUrl: (url) => ipcRenderer.send('open-url', url),
    openWebApp: () => ipcRenderer.send('open-webapp'),
    openTracker: () => ipcRenderer.send('open-tracker'),

    onDataUpdate: (fn) => {
        if (_dataUpdateCb) ipcRenderer.removeListener('data-update', _dataUpdateCb);
        _dataUpdateCb = (_, payload) => fn(payload);
        ipcRenderer.on('data-update', _dataUpdateCb);
    },

    onUpdateAvailable: (fn) => {
        ipcRenderer.once('update-available', (_, payload) => fn(payload));
    },
});
