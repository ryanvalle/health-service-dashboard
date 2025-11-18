// Preload script for Electron
// This script runs before the web page loads and has access to both
// Node.js APIs and the web page's DOM

const { contextBridge, shell } = require('electron');

// Expose protected methods that allow the renderer process to use
// limited Node.js functionality
contextBridge.exposeInMainWorld('electron', {
  // Add any Electron-specific APIs you want to expose to the frontend here
  isElectron: true,
  version: process.versions.electron,
  openExternal: (url) => shell.openExternal(url)
});

console.log('Preload script loaded');
