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

  if (app.isPackaged) {
    win.loadFile(path.join(__dirname, 'dist/index.html'))
  } else {
    win.loadURL('http://localhost:5173')
  }
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

ipcMain.handle('rename-video', async (_, oldPath, newName) => {
  const path = require('path');
  const fs = require('fs');
  
  const dir = path.dirname(oldPath);
  const ext = path.extname(oldPath);
  
  // Pastikan ekstensi file (.mp4, .mkv, dll) tidak hilang
  let finalizedName = newName;
  if (!newName.endsWith(ext)) {
    finalizedName = newName + ext;
  }
  
  const newPath = path.join(dir, finalizedName);
  
  // Lakukan penggantian nama file fisik
  fs.renameSync(oldPath, newPath);
  
  // Ambil data stats terbaru berkas yang telah diubah untuk dikembalikan ke React
  const stats = fs.statSync(newPath);
  return {
    name: finalizedName,
    path: newPath,
    size: stats.size,
    mtime: stats.mtimeMs
  }
})

// Ganti handler 'compress-video-with-trim' di electron.cjs kamu menjadi:
ipcMain.handle('compress-video-with-trim', async (_, input, outputName, start, end) => {
  return new Promise((resolve, reject) => {
    const ffmpeg = require('fluent-ffmpeg');
    const os = require('os');
    const path = require('path');
    
    // 📂 KITA ALIHKAN OUTPUT KE FOLDER SYSTEM TEMP (Bukan folder library game)
    const tempDir = os.tmpdir();
    const uniqueOutputName = `clipry_dist_${Date.now()}_${outputName}`;
    const absoluteOutputPath = path.join(tempDir, uniqueOutputName);
    
    const trimDuration = end - start;
    const targetSizeBits = 8.5 * 1024 * 1024 * 8;
    const audioBitrateBits = 128 * 1024 * trimDuration;
    const videoBitrateBits = targetSizeBits - audioBitrateBits;
    
    let calcVideoBitrateKbps = Math.floor((videoBitrateBits / trimDuration) / 1024);
    if (calcVideoBitrateKbps > 4000) calcVideoBitrateKbps = 4000;
    if (calcVideoBitrateKbps < 200) calcVideoBitrateKbps = 200; 

    ffmpeg(input)
      .setStartTime(start)
      .setDuration(trimDuration)
      .videoBitrate(calcVideoBitrateKbps)
      .audioCodec('aac')
      .audioBitrate(128)
      .outputOptions([
        '-map_metadata -1',
        '-pix_fmt yuv420p',
        '-movflags +faststart'
      ])
      .output(absoluteOutputPath)
      .on('end', () => resolve(absoluteOutputPath)) // Kirim path temp absolut ke frontend
      .on('error', (err) => reject(err.message))
      .run();
  });
});

// Perbarui juga handler 'start-drag' agar langsung menghapus berkas sesaat setelah di-drop
ipcMain.handle('start-drag', (event, filePath) => {
  const absolutePath = path.resolve(filePath);
  
  if (!fs.existsSync(absolutePath)) return false;

  // Jalankan native drag
  event.sender.startDrag({
    file: absolutePath,
    icon: path.join(__dirname, 'drag-icon-dummy.png')
  });

  // 🧹 AUTO-DELETE: Berikan delay pendek (sekitar 3 detik) setelah kursor dilepas 
  // untuk memberi waktu Discord membaca & menyalin berkas tersebut ke server mereka sebelum dihapus fisik
  setTimeout(() => {
    try {
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log("File kompresi temporer berhasil dibersihkan:", absolutePath);
      }
    } catch (err) {
      console.error("Gagal membersihkan file kompresi:", err);
    }
  }, 3000);
  
  return true;
});

// Tambahkan ini ke dalam file electron.cjs kamu
ipcMain.handle('delete-videos', async (_, filePaths) => {
  const fs = require('fs');
  const path = require('path');
  
  let deletedCount = 0;
  let errors = [];

  for (const filePath of filePaths) {
    try {
      const absolutePath = path.resolve(filePath);
      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath); // Menghapus file secara permanen
        deletedCount++;
        
        // Opsional: Hapus juga data trim di localStorage dari sisi backend jika diperlukan,
        // namun lebih bersih kita handle pembersihan localStorage di sisi frontend React saja.
      }
    } catch (err) {
      errors.push(`Gagal menghapus ${path.basename(filePath)}: ${err.message}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
  
  return deletedCount;
})