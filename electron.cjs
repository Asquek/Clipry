const { app, BrowserWindow, ipcMain, dialog, protocol } = require('electron')
const path = require('path')
const fs = require('fs')
const { autoUpdater } = require('electron-updater')
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg')
const ffmpeg = require('fluent-ffmpeg')

// Fix path untuk production
const ffmpegPath = app.isPackaged
  ? path.join(process.resourcesPath, 'ffmpeg.exe')
  : ffmpegInstaller.path
ffmpeg.setFfmpegPath(ffmpegPath)

let mainWindow

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
    }
  })
  mainWindow.setMenuBarVisibility(false)

  mainWindow.on('app-command', (e, cmd) => {
    if (cmd === 'browser-backward') {
      mainWindow.webContents.send('mouse-back-triggered')
    }
  })

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, 'dist/index.html'))
  } else {
    mainWindow.loadURL('http://localhost:5173')
  }
}

app.whenReady().then(() => {
  protocol.registerFileProtocol('media', (request, callback) => {
    const filePath = decodeURIComponent(request.url.replace('media://', ''))
    callback({ path: filePath })
  })
  createWindow()

  if (app.isPackaged) {
    autoUpdater.checkForUpdatesAndNotify()

    autoUpdater.on('update-available', () => {
      mainWindow.webContents.send('update-status', 'Update available, downloading...')
    })

    autoUpdater.on('update-downloaded', () => {
      mainWindow.webContents.send('update-status', 'Update ready! Restart to install.')
    })

    autoUpdater.on('error', (err) => {
      mainWindow.webContents.send('update-status', `Update error: ${err.message}`)
    })
  }
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

ipcMain.handle('restart-to-update', () => {
  autoUpdater.quitAndInstall()
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
    const targetSizeKb = 9 * 1024
    ffmpeg.ffprobe(input, (err, metadata) => {
      if (err) return reject(err.message)
      const durationSec = metadata.format.duration
      const targetBitrate = Math.floor((targetSizeKb * 8) / durationSec)
      const audioBitrate = 128
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
    ffmpeg.ffprobe(videoPath, (err, metadata) => {
      if (err) return reject(err.message)
      resolve(metadata.format.duration || 0)
    })
  })
})

ipcMain.handle('get-thumbnail-at', async (_, videoPath, timeSec) => {
  return new Promise((resolve, reject) => {
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

ipcMain.handle('rename-video', async (_, oldPath, newName) => {
  const dir = path.dirname(oldPath)
  const ext = path.extname(oldPath)
  let finalizedName = newName
  if (!newName.endsWith(ext)) finalizedName = newName + ext
  const newPath = path.join(dir, finalizedName)
  fs.renameSync(oldPath, newPath)
  const stats = fs.statSync(newPath)
  return { name: finalizedName, path: newPath, size: stats.size, mtime: stats.mtimeMs }
})

ipcMain.handle('compress-video-with-trim', async (event, input, outputName, start, end, targetSizeMB = 9) => {
  return new Promise((resolve, reject) => {
    const os = require('os')
    const tempDir = os.tmpdir()
    const uniqueOutputName = `clipry_dist_${Date.now()}_${outputName}`
    const absoluteOutputPath = path.join(tempDir, uniqueOutputName)
    const trimDuration = end - start
    
    const targetSizeBits = targetSizeMB * 0.95 * 1024 * 1024 * 8
    const audioBitrateBits = 128 * 1024 * trimDuration
    const videoBitrateBits = targetSizeBits - audioBitrateBits
    let calcVideoBitrateKbps = Math.floor((videoBitrateBits / trimDuration) / 1024)
    if (calcVideoBitrateKbps > 8000) calcVideoBitrateKbps = 8000
    if (calcVideoBitrateKbps < 100) calcVideoBitrateKbps = 100

    ffmpeg(input)
      .setStartTime(start)
      .setDuration(trimDuration)
      .videoBitrate(calcVideoBitrateKbps)
      .audioCodec('aac')
      .audioBitrate(128)
      .outputOptions(['-map_metadata -1', '-pix_fmt yuv420p', '-movflags +faststart'])
      .output(absoluteOutputPath)
      .on('progress', (progress) => {
        const timeToken = progress.timemark.split(':')
        const currentSec = parseFloat(timeToken[0]) * 3600 + parseFloat(timeToken[1]) * 60 + parseFloat(timeToken[2])
        const percent = Math.min(99, Math.floor((currentSec / trimDuration) * 100))
        event.sender.send('conversion-progress', percent)
      })
      .on('end', () => {
        event.sender.send('conversion-progress', 100)
        resolve(absoluteOutputPath)
      })
      .on('error', (err) => reject(err.message))
      .run()
  })
})

ipcMain.handle('proklamasi-video', async (event, input, outputName, start, end) => {
  return new Promise((resolve, reject) => {
    const os = require('os')
    const tempDir = os.tmpdir()
    const uniqueOutputName = `clipry_proklamasi_${Date.now()}_${outputName}`
    const absoluteOutputPath = path.join(tempDir, uniqueOutputName)
    const trimDuration = end - start

    const vfChain = [
      'scale=256:144',   
      'fps=10'           
    ].join(',')

    ffmpeg(input)
      .setStartTime(start)
      .setDuration(trimDuration)
      .videoFilters(vfChain)
      .videoCodec('libx264')
      .videoBitrate(50) 
      .outputOptions([
        '-maxrate 60k',
        '-bufsize 120k',
        '-c:a aac',
        '-ac 1',                                  
        '-b:a 12k',                               
        '-map_metadata -1', 
        '-pix_fmt yuv420p', 
        '-movflags +faststart', 
        '-preset fast'
      ])
      .output(absoluteOutputPath)
      .on('progress', (progress) => {
        const timeToken = progress.timemark.split(':')
        const currentSec = parseFloat(timeToken[0]) * 3600 + parseFloat(timeToken[1]) * 60 + parseFloat(timeToken[2])
        const percent = Math.min(99, Math.floor((currentSec / trimDuration) * 100))
        event.sender.send('conversion-progress', percent)
      })
      .on('end', () => {
        event.sender.send('conversion-progress', 100)
        resolve(absoluteOutputPath)
      })
      .on('error', (err) => reject(err.message))
      .run()
  })
})

ipcMain.handle('start-drag', (event, filePath) => {
  const absolutePath = path.resolve(filePath)
  if (!fs.existsSync(absolutePath)) return false

  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'drag-icon-dummy.png')
    : path.join(__dirname, 'drag-icon-dummy.png')

  event.sender.startDrag({
    file: absolutePath,
    icon: fs.existsSync(iconPath) ? iconPath : path.join(__dirname, 'public', 'vite.svg')
  })

  return true
})

ipcMain.handle('delete-videos', async (_, filePaths) => {
  let deletedCount = 0
  let errors = []
  for (const filePath of filePaths) {
    try {
      const absolutePath = path.resolve(filePath)
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath)
        deletedCount++
      }
    } catch (err) {
      errors.push(`Failed to delete ${path.basename(filePath)}: ${err.message}`)
    }
  }
  if (errors.length > 0) throw new Error(errors.join('\n'))
  return deletedCount
})

app.on('before-quit', () => {
  const os = require('os')
  const tempDir = os.tmpdir()
  try {
    fs.readdirSync(tempDir)
      .filter(f => f.startsWith('clipry_dist_') || f.startsWith('clipry_proklamasi_'))
      .forEach(f => fs.unlinkSync(path.join(tempDir, f)))
  } catch (err) {
    console.error('Failed to cleanup temp:', err)
  }
})