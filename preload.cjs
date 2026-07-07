const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  scanFolder: (folderPath) => ipcRenderer.invoke('scan-folder', folderPath),
  trimVideo: (input, output, start, end) => ipcRenderer.invoke('trim-video', input, output, start, end),
  compressVideo: (input, output) => ipcRenderer.invoke('compress-video', input, output),
  getThumbnail: (videoPath) => ipcRenderer.invoke('get-thumbnail', videoPath),
  getVideoDuration: (videoPath) => ipcRenderer.invoke('get-video-duration', videoPath),
  getThumbnailAt: (videoPath, timeSec) => ipcRenderer.invoke('get-thumbnail-at', videoPath, timeSec),
  renameVideo: (oldPath, newName) => ipcRenderer.invoke('rename-video', oldPath, newName),
  compressVideoWithTrim: (input, outputName, start, end) => ipcRenderer.invoke('compress-video-with-trim', input, outputName, start, end),
  startDrag: (filePath) => ipcRenderer.invoke('start-drag', filePath),
  deleteVideos: (filePaths) => ipcRenderer.invoke('delete-videos', filePaths),
  restartToUpdate: () => ipcRenderer.invoke('restart-to-update'),
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_, msg) => cb(msg)),
})