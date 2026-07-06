const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron')
const path = require('path')
const fs = require('fs')

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    }
  })
  win.loadURL('http://localhost:5173')
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('media', (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace('media://', ''))
    callback({ path: filePath })
  })
  createWindow()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('select-folder', async () => {
  const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
  return result.filePaths[0] || null
})

ipcMain.handle('scan-folder', async (_, folderPath) => {
  const exts = ['.mp4', '.mkv', '.mov', '.avi']
  const entries = fs.readdirSync(folderPath, { withFileTypes: true })

  const subfolders = entries
    .filter(e => e.isDirectory())
    .map(e => {
      const subPath = path.join(folderPath, e.name)
      const files = fs.readdirSync(subPath)
        .filter(f => exts.includes(path.extname(f).toLowerCase()))
        .map(f => ({
          name: f,
          path: path.join(subPath, f),
          size: fs.statSync(path.join(subPath, f)).size,
          mtime: fs.statSync(path.join(subPath, f)).mtimeMs
        }))
        .sort((a, b) => b.mtime - a.mtime)
      return { name: e.name, files }
    })
    .filter(f => f.files.length > 0)

  // Video langsung di root folder (bukan subfolder)
  const rootFiles = entries
    .filter(e => e.isFile() && exts.includes(path.extname(e.name).toLowerCase()))
    .map(e => ({
      name: e.name,
      path: path.join(folderPath, e.name),
      size: fs.statSync(path.join(folderPath, e.name)).size,
      mtime: fs.statSync(path.join(folderPath, e.name)).mtimeMs
    }))
    .sort((a, b) => b.mtime - a.mtime)

  if (rootFiles.length > 0) {
    subfolders.unshift({ name: 'Uncategorized', files: rootFiles })
  }

  return subfolders
})

ipcMain.handle('trim-video', async (_, input, output, start, end) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg')
    ffmpeg(input)
      .setStartTime(start)
      .setDuration(end - start)
      .outputOptions('-c copy')
      .output(output)
      .on('end', () => resolve({ success: true, output }))
      .on('error', (err) => reject(err.message))
      .run()
  })
})

ipcMain.handle('compress-video', async (_, input, output) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg')
    const targetSizeKb = 9 * 1024 // 9MB biar aman di bawah 10MB
    
    // Dapetin durasi dulu buat hitung bitrate
    ffmpeg.ffprobe(input, (err, metadata) => {
      if (err) return reject(err.message)
      
      const durationSec = metadata.format.duration
      const targetBitrate = Math.floor((targetSizeKb * 8) / durationSec) // kbps
      const audioBitrate = 128 // kbps
      const videoBitrate = targetBitrate - audioBitrate

      ffmpeg(input)
        .videoCodec('libx264')
        .audioBitrate(`${audioBitrate}k`)
        .videoBitrate(`${videoBitrate}k`)
        .outputOptions(['-preset fast', '-movflags +faststart'])
        .output(output)
        .on('end', () => resolve({ success: true, output }))
        .on('error', (err) => reject(err.message))
        .run()
    })
  })
})

ipcMain.handle('get-thumbnail', async (_, videoPath) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg')
    const os = require('os')
    const thumbPath = path.join(os.tmpdir(), `thumb_${path.basename(videoPath)}.jpg`)
    
    if (fs.existsSync(thumbPath)) return resolve(thumbPath)

    ffmpeg(videoPath)
      .screenshots({
        timestamps: ['10%'],
        filename: path.basename(thumbPath),
        folder: os.tmpdir(),
        size: '320x180'
      })
      .on('end', () => resolve(thumbPath))
      .on('error', (err) => reject(err.message))
  })
})

ipcMain.handle('get-video-duration', async (_, videoPath) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg')
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err.message)
      resolve(metadata.format.duration || 0)
    })
  })
})

ipcMain.handle('get-thumbnail-at', async (_, videoPath, timeSec) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg')
    const os = require('os')
    const thumbPath = path.join(os.tmpdir(), `thumb_${path.basename(videoPath)}_${timeSec}.jpg`)
    if (fs.existsSync(thumbPath)) return resolve(thumbPath)
    ffmpeg(videoPath)
      .screenshots({
        timestamps: [timeSec],
        filename: path.basename(thumbPath),
        folder: os.tmpdir(),
        size: '320x180'
      })
      .on('end', () => resolve(thumbPath))
      .on('error', err => reject(err.message))
  })
})