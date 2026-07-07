import { useState, useRef, useEffect } from 'react'
import './App.css'

function formatSize(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(ms) {
  return new Date(ms).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function TrimSlider({ duration, trimStart, trimEnd, currentTime, onStartChange, onEndChange, onPlayheadChange }) {
  const [dragging, setDragging] = useState(null)
  const sliderRef = useRef(null)

  function getPosFromEvent(e) {
    const rect = sliderRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    return (x / rect.width) * duration
  }

  function onMouseDown(e, handle) {
    e.preventDefault()
    setDragging(handle)
  }

  function handleTrackClick(e) {
    if (e.target.closest('[data-handle]')) return
    const time = getPosFromEvent(e)
    onPlayheadChange(time)
  }

  useEffect(() => {
    function onMouseMove(e) {
      if (!dragging || !sliderRef.current) return
      const time = getPosFromEvent(e)
      if (dragging === 'start' && time < trimEnd) onStartChange(time)
      if (dragging === 'end' && time > trimStart) onEndChange(time)
      if (dragging === 'playhead') onPlayheadChange(time)
    }
    function onMouseUp() { setDragging(null) }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragging, trimStart, trimEnd, duration])

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0
  const endPct = duration > 0 ? (trimEnd / duration) * 100 : 100
  const currentPct = duration > 0 ? (currentTime / duration) * 100 : 0

  function getRulerTicks() {
    if (!duration) return []
    const ticks = []
    const intervals = [5, 10, 15, 20, 30, 60, 120, 300]
    const interval = intervals.find(i => duration / i <= 15) || 300
    for (let t = 0; t <= duration; t += interval) {
      ticks.push(t)
    }
    return ticks
  }

  const ticks = getRulerTicks()

  return (
    <div style={{ position: 'relative', userSelect: 'none', width: '100%', flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <div style={{ position: 'relative', height: 24, marginBottom: 6 }}>
        {ticks.map(t => (
          <div key={t} style={{
            position: 'absolute',
            left: `${(t / duration) * 100}%`,
            transform: 'translateX(-50%)',
            fontSize: 10,
            color: '#4a9a9a',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2
          }}>
            <span>{formatTime(t)}</span>
            <div style={{ width: 1, height: 4, background: '#4a9a9a' }} />
          </div>
        ))}
      </div>

      <div
        ref={sliderRef}
        onClick={handleTrackClick}
        style={{
          position: 'relative',
          height: 60,
          background: '#0a2a2a',
          borderRadius: 6,
          border: '1px solid #1a4a4a',
          cursor: 'pointer',
        }}
      >
        <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${startPct}%`, background: 'rgba(0,0,0,0.65)', borderRadius: '6px 0 0 6px' }} />
        <div style={{ position: 'absolute', left: `${startPct}%`, width: `${endPct - startPct}%`, height: '100%', background: 'rgba(0,188,212,0.1)', borderTop: '2px solid #00bcd4', borderBottom: '2px solid #00bcd4' }} />
        <div style={{ position: 'absolute', left: `${endPct}%`, top: 0, bottom: 0, width: `${100 - endPct}%`, background: 'rgba(0,0,0,0.65)', borderRadius: '0 6px 6px 0' }} />

        <div style={{ position: 'absolute', left: `${currentPct}%`, top: 0, bottom: 0, width: 2, background: '#ff5722', zIndex: 2, pointerEvents: 'none', boxShadow: '0 0 8px #ff5722' }}>
          <div style={{ position: 'absolute', top: -3, left: -4, width: 10, height: 6, background: '#ff5722', borderRadius: 2 }} />
        </div>

        <div
          data-handle="start"
          onMouseDown={e => onMouseDown(e, 'start')}
          style={{ position: 'absolute', left: `${startPct}%`, top: 0, bottom: 0, width: 4, background: '#00bcd4', cursor: 'ew-resize', zIndex: 3, transform: 'translateX(-50%)' }}
        >
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 12, height: 10, background: '#00bcd4', borderRadius: '0 0 3px 3px' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 12, height: 10, background: '#00bcd4', borderRadius: '3px 3px 0 0' }} />
        </div>

        <div
          data-handle="end"
          onMouseDown={e => onMouseDown(e, 'end')}
          style={{ position: 'absolute', left: `${endPct}%`, top: 0, bottom: 0, width: 4, background: '#00bcd4', cursor: 'ew-resize', zIndex: 3, transform: 'translateX(-50%)' }}
        >
          <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 12, height: 10, background: '#00bcd4', borderRadius: '0 0 3px 3px' }} />
          <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 12, height: 10, background: '#00bcd4', borderRadius: '3px 3px 0 0' }} />
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a9a9a', marginTop: 8 }}>
        <span>Start: {formatTime(trimStart)}</span>
        <span style={{ color: '#ff5722', fontWeight: 'bold' }}>Position: {formatTime(currentTime)}</span>
        <span>End: {formatTime(trimEnd)}</span>
      </div>
    </div>
  )
}

function ClipCard({ clip, onClick, isSelected, isSelectMode, isMultiSelected, onCheckboxToggle, onSingleDelete }) {
  const [thumb, setThumb] = useState(null)
  const [duration, setDuration] = useState(null)
  const [visible, setVisible] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const cardRef = useRef(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setVisible(true) },
      { threshold: 0.1 }
    )
    if (cardRef.current) observer.observe(cardRef.current)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    if (!visible) return
    window.api.getThumbnail(clip.path).then(p => setThumb(`media://${p}`)).catch(() => {})
    window.api.getVideoDuration(clip.path).then(d => setDuration(d)).catch(() => {})
  }, [visible, clip.path])

  function handleCardClick(e) {
    if (isSelectMode) {
      e.stopPropagation()
      onCheckboxToggle(clip.path)
    } else {
      onClick()
    }
  }

  return (
    <div
      ref={cardRef}
      onClick={handleCardClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#1e1e1e',
        border: isMultiSelected ? '2px solid #23a559' : isSelected ? '2px solid #5865F2' : '2px solid transparent',
        transition: 'border 0.1s, transform 0.15s ease',
        transform: isHovered && !isSelectMode ? 'translateY(-2px)' : 'none',
        position: 'relative'
      }}
    >
      {isSelectMode && (
        <div 
          onClick={(e) => { e.stopPropagation(); onCheckboxToggle(clip.path); }}
          style={{
            position: 'absolute', top: 8, left: 8, zIndex: 10,
            width: 20, height: 20, borderRadius: 4,
            background: isMultiSelected ? '#23a559' : 'rgba(0,0,0,0.6)',
            border: isMultiSelected ? '2px solid #23a559' : '2px solid #fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11
          }}
        >
          {isMultiSelected && '✓'}
        </div>
      )}

      {isHovered && !isSelectMode && (
        <button
          onClick={(e) => { e.stopPropagation(); onSingleDelete(clip.path); }}
          title="Delete Permanently"
          style={{
            position: 'absolute', top: 8, right: 8, zIndex: 12,
            width: 28, height: 28, borderRadius: '50%',
            background: 'rgba(244, 67, 54, 0.85)',
            border: 'none', color: '#fff', fontSize: 12,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#f44336'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(244, 67, 54, 0.85)'}
        >
          🗑️
        </button>
      )}

      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
        {thumb ? (
          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 24 }}>🎬</div>
        )}
        {duration !== null && (
          <div style={{ position: 'absolute', bottom: 6, right: 6, background: 'rgba(0,0,0,0.75)', borderRadius: 4, padding: '2px 6px', fontSize: 11, color: '#fff', fontWeight: 600 }}>
            {formatTime(duration)}
          </div>
        )}
      </div>
      <div style={{ padding: '8px 10px' }}>
        <div style={{ fontSize: 12, color: '#fff', fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{clip.name}</div>
        <div style={{ fontSize: 11, color: '#666', marginTop: 3 }}>{formatDate(clip.mtime)} · {formatSize(clip.size)}</div>
      </div>
    </div>
  )
}

export default function App() {
  const [folder, setFolder] = useState(null)
  const [gamefolders, setGamefolders] = useState([])
  const [activeFolder, setActiveFolder] = useState(null)
  const [selected, setSelected] = useState(null)
  const [duration, setDuration] = useState(0)
  const [trimStart, setTrimStart] = useState(0)
  const [trimEnd, setTrimEnd] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [compressing, setCompressing] = useState(false)
  const [status, setStatus] = useState(null)
  const [view, setView] = useState('grid')
  
  const [isPlaying, setIsPlaying] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [volume, setVolume] = useState(1)

  const [isEditingName, setIsEditingName] = useState(false)
  const [newNameInput, setNewNameInput] = useState('')
  const [compressedPath, setCompressedPath] = useState(null)

  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedPaths, setSelectedPaths] = useState([])
  const [cardWidth, setCardWidth] = useState(230)

  const videoRef = useRef(null)
  const audioCtxRef = useRef(null)
  const gainNodeRef = useRef(null)
  const sourceRef = useRef(null)

  useEffect(() => {
    const savedFolder = localStorage.getItem('clipry_saved_folder')
    if (savedFolder) {
      loadFolderData(savedFolder)
    }
    const savedWidth = localStorage.getItem('clipry_card_width')
    if (savedWidth) {
      setCardWidth(parseInt(savedWidth, 10))
    }
    
    const styleId = 'clipry-modern-scrollbar'
    if (!document.getElementById(styleId)) {
      const styleNode = document.createElement('style')
      styleNode.id = styleId
      styleNode.innerHTML = `
        .modern-scroll::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .modern-scroll::-webkit-scrollbar-track {
          background: transparent;
        }
        .modern-scroll::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.08);
          border-radius: 10px;
        }
        .modern-scroll::-webkit-scrollbar-thumb:hover {
          background: rgba(88, 101, 242, 0.5);
        }
      `
      document.head.appendChild(styleNode)
    }
  }, [])

  useEffect(() => {
    if (selected && duration > 0) {
      const data = { start: trimStart, end: trimEnd }
      localStorage.setItem(`trim_${selected.path}`, JSON.stringify(data))
    }
  }, [trimStart, trimEnd, selected, duration])

  async function loadFolderData(folderPath) {
    setFolder(folderPath)
    const folders = await window.api.scanFolder(folderPath)
    setGamefolders(folders)
    setActiveFolder(prev => prev || (folders.length > 0 ? 'All Videos' : null))
  }

  // 🔄 FUNGSI REFRESH BARU
  async function handleRefresh() {
    if (!folder) return
    setStatus('Refreshing library...')
    try {
      const folders = await window.api.scanFolder(folder)
      setGamefolders(folders)
      setStatus('✅ Library updated!')
      setTimeout(() => setStatus(null), 3000)
    } catch (err) {
      setStatus(`❌ Refresh failed: ${err}`)
    }
  }

  async function openFolder() {
    const p = await window.api.selectFolder()
    if (!p) return
    localStorage.setItem('clipry_saved_folder', p)
    setFolder(p)
    const folders = await window.api.scanFolder(p)
    setGamefolders(folders)
    setActiveFolder(folders.length > 0 ? 'All Videos' : null)
    setSelected(null)
    setStatus(null)
    setIsSelectMode(false)
    setSelectedPaths([])
    setView('grid')
  }

  function selectClip(clip) {
    setSelected(clip)
    setCompressedPath(null)
    setDuration(0)
    
    const savedMetadata = localStorage.getItem(`trim_${clip.path}`)
    if (savedMetadata) {
      const { start, end } = JSON.parse(savedMetadata)
      setTrimStart(start)
      setTrimEnd(end)
      setCurrentTime(start)
    } else {
      setTrimStart(0)
      setTrimEnd(0)
      setCurrentTime(0)
    }

    setIsPlaying(false)
    setIsMuted(false)
    setVolume(1)
    setStatus(null)
    setNewNameInput(clip.name)
    setIsEditingName(false)
    setView('player')
  }

  function onVideoLoaded() {
    const dur = videoRef.current?.duration || 0
    setDuration(dur)
    
    const savedMetadata = localStorage.getItem(`trim_${selected.path}`)
    if (savedMetadata) {
      const { start, end } = JSON.parse(savedMetadata)
      setTrimStart(start)
      setTrimEnd(end)
      videoRef.current.currentTime = start
      setCurrentTime(start)
    } else {
      setTrimStart(0)
      setTrimEnd(dur)
      setCurrentTime(0)
    }

    setIsPlaying(false)
    if (videoRef.current) videoRef.current.volume = volume
  }

  function handleTimeUpdate() {
    if (!videoRef.current || duration === 0) return
    const current = videoRef.current.currentTime
    setCurrentTime(current)

    if (current >= trimEnd) {
      videoRef.current.pause()
      videoRef.current.currentTime = trimEnd
      setCurrentTime(trimEnd)
      setIsPlaying(false)
    }
  }

  function togglePlay() {
    if (!videoRef.current) return
    
    if (videoRef.current.currentTime >= trimEnd - 0.1) {
      videoRef.current.currentTime = trimStart
      setCurrentTime(trimStart)
      videoRef.current.play()
      setIsPlaying(true)
      return
    }

    if (isPlaying) {
      videoRef.current.pause()
      setIsPlaying(false)
    } else {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  function toggleMute() {
    if (!videoRef.current) return
    const nextMute = !isMuted
    videoRef.current.muted = nextMute
    setIsMuted(nextMute)
    
    if (gainNodeRef.current) {
      // Jika di-mute set gain ke 0, jika di-unmute kembalikan ke nilai state volume
      gainNodeRef.current.gain.value = nextMute ? 0 : volume
    }
  }

  function handleVolumeChange(e) {
    const val = parseFloat(e.target.value) // Nilai dari slider (0 sampai 3)
    setVolume(val)
    
    if (!videoRef.current) return

    // Inisialisasi Web Audio API saat pertama kali slider digerakkan (Lazy Init)
    if (!audioCtxRef.current) {
      const AudioContext = window.Context || window.webkitAudioContext
      const ctx = new AudioContext()
      const gainNode = ctx.createGain()
      
      // Hubungkan video ke Audio Context
      const source = ctx.createMediaElementSource(videoRef.current)
      source.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      // Simpan ke Ref agar tidak ter-reset saat re-render
      audioCtxRef.current = ctx
      gainNodeRef.current = gainNode
      sourceRef.current = source
    }

    // Atur amplifikasi suara lewat Gain Node (bukan lewat video.volume standar lagi)
    if (gainNodeRef.current) {
      gainNodeRef.current.gain.value = val // Nilai 1 = normal, 2 = 200%, 3 = 300%
    }

    // Sinkronisasi status mute
    if (val > 0 && isMuted) {
      videoRef.current.muted = false
      setIsMuted(false)
    } else if (val === 0 && !isMuted) {
      videoRef.current.muted = true
      setIsMuted(true)
    }
  }

  async function doCompress() {
    if (!selected) return
    setCompressing(true)
    setCompressedPath(null)
    setStatus('Compressing... (including trimmed parts)')
    try {
      const ext = selected.name.split('.').pop()
      const baseName = selected.name.replace(`.${ext}`, '')
      
      const targetName = `${baseName}_discord.mp4`
      const absoluteTempPath = await window.api.compressVideoWithTrim(selected.path, targetName, trimStart, trimEnd)
      
      setCompressedPath(absoluteTempPath)
      setStatus(`✅ Compression Complete! Drag the box below to Discord.`)
    } catch (err) {
      setStatus(`❌ Error: ${err}`)
    }
    setCompressing(false)
  }

  function handleNativeDragStart(e) {
    e.preventDefault()
    if (compressedPath) {
      window.api.startDrag(compressedPath)
    }
  }

  async function deleteSelectedVideos(pathsToDelete) {
    if (!pathsToDelete || pathsToDelete.length === 0) return
    
    const confirmMsg = pathsToDelete.length === 1 
      ? "Are you sure you want to delete this video clip permanently from your computer?"
      : `Are you sure you want to delete ${pathsToDelete.length} selected video clips permanently from your computer?`
      
    if (!confirm(confirmMsg)) return

    try {
      // 🛠️ LANGKAH KRUSIAL: Lepas lock file dengan mematikan video player jika file yang sedang dibuka ingin dihapus
      if (selected && pathsToDelete.includes(selected.path)) {
        setIsPlaying(false);
        if (videoRef.current) {
          videoRef.current.pause();
          videoRef.current.src = ""; // 🧹 Kosongkan src untuk melepaskan locked resource di Windows
          videoRef.current.load();
        }
      }

      setStatus('Deleting physical files...');
      await window.api.deleteVideos(pathsToDelete)
      pathsToDelete.forEach(p => localStorage.removeItem(`trim_${p}`))
      
      setStatus(`✅ Successfully deleted ${pathsToDelete.length} video(s).`)
      setSelectedPaths([])
      setIsSelectMode(false)
      setSelected(null)
      setCompressedPath(null) // Ikut bersihkan path hasil kompresi temporer
      setView('grid')

      if (folder) {
        const folders = await window.api.scanFolder(folder)
        setGamefolders(folders)
      }
    } catch (err) {
      setStatus(`❌ Failed to delete file: ${err}`)
    }
  }

  function handleCheckboxToggle(path) {
    setSelectedPaths(prev => 
      prev.includes(path) ? prev.filter(p => p !== path) : [...prev, path]
    )
  }

  function changeCardWidthPreset(width) {
    setCardWidth(width)
    localStorage.setItem('clipry_card_width', width)
  }

  async function handleRenameSubmit() {
    if (!selected || !newNameInput.trim() || newNameInput === selected.name) {
      setIsEditingName(false)
      return
    }
    try {
      if (window.api.renameVideo) {
        const updatedClip = await window.api.renameVideo(selected.path, newNameInput.trim())
        setSelected(updatedClip)
      } else {
        setSelected(prev => ({ ...prev, name: newNameInput.trim() }))
        setStatus('⚠️ Physical rename function hasn\'t been handled in electron.cjs')
      }
      setIsEditingName(false)
      const folders = await window.api.scanFolder(folder)
      setGamefolders(folders)
    } catch (err) {
      setStatus(`❌ Rename Failed: ${err}`)
    }
  }

  const activeClips = activeFolder === 'All Videos'
    ? gamefolders.reduce((acc, folder) => [...acc, ...folder.files], []).sort((a, b) => b.mtime - a.mtime)
    : gamefolders.find(f => f.name === activeFolder)?.files || []

  const getBtnStyle = (width) => ({
    padding: '4px 8px',
    background: cardWidth === width ? '#5865F2' : '#2a2a32',
    border: cardWidth === width ? '1px solid #5865F2' : '1px solid #3d3d4d',
    color: '#fff',
    borderRadius: 4,
    fontSize: 11,
    cursor: 'pointer',
    fontWeight: cardWidth === width ? 600 : 400,
    transition: 'all 0.15s ease'
  })

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#111', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: 220, minWidth: 220, background: '#161616', display: 'flex', flexDirection: 'column', borderRight: '1px solid #2a2a2a' }}>
        <div style={{ padding: '14px 12px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎬</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>Clipry</span>
        </div>
        <button onClick={openFolder} style={{ margin: '10px 10px 6px', padding: '8px', background: '#5865F2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}>
          + Choose Folder
        </button>
        
        <div className="modern-scroll" style={{ flex: 1, overflowY: 'auto' }}>
          {gamefolders.length > 0 && (
            <div
              onClick={() => { setActiveFolder('All Videos'); setSelected(null); setIsSelectMode(false); setSelectedPaths([]); setView('grid') }}
              style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: activeFolder === 'All Videos' ? '#2a2a3a' : 'transparent', borderLeft: activeFolder === 'All Videos' ? '3px solid #5865F2' : '3px solid transparent', color: activeFolder === 'All Videos' ? '#fff' : '#999' }}
            >
              <span style={{ fontWeight: 600 }}>🌐 All Videos</span>
              <span style={{ fontSize: 11, color: '#555', marginLeft: 6, flexShrink: 0 }}>
                {gamefolders.reduce((acc, f) => acc + f.files.length, 0)}
              </span>
            </div>
          )}

          {gamefolders.length > 0 && <div style={{ height: 1, background: '#2a2a2a', margin: '4px 0' }} />}

          {gamefolders.map(gf => (
            <div
              key={gf.name}
              onClick={() => { setActiveFolder(gf.name); setSelected(null); setIsSelectMode(false); setSelectedPaths([]); setView('grid') }}
              style={{ padding: '8px 14px', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: activeFolder === gf.name ? '#2a2a3a' : 'transparent', borderLeft: activeFolder === gf.name ? '3px solid #5865F2' : '3px solid transparent', color: activeFolder === gf.name ? '#fff' : '#999' }}
            >
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>🎮 {gf.name}</span>
              <span style={{ fontSize: 11, color: '#555', marginLeft: 6, flexShrink: 0 }}>{gf.files.length}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {view === 'player' && (
              <button onClick={() => setView('grid')} style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 18, padding: 0 }}>←</button>
            )}
            <span style={{ fontSize: 13, color: '#aaa' }}>
              {view === 'grid' ? `${activeFolder || '—'} (${activeClips.length} clips)` : selected?.name}
            </span>
            {/* Teks Status Notifikasi Kecil di sebelah nama folder */}
            {status && (view === 'grid') && (
              <span style={{ fontSize: 12, color: '#5865F2', marginLeft: 10 }}>{status}</span>
            )}
          </div>

          {view === 'grid' && activeClips.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e1e24', padding: '4px 6px', borderRadius: 6, border: '1px solid #2d2d3d' }}>
                <span style={{ fontSize: 11, color: '#aaa', marginRight: 4, marginLeft: 2 }}>Thumbnails Size:</span>
                <button onClick={() => changeCardWidthPreset(160)} style={getBtnStyle(160)}>Small</button>
                <button onClick={() => changeCardWidthPreset(230)} style={getBtnStyle(230)}>Medium</button>
                <button onClick={() => changeCardWidthPreset(320)} style={getBtnStyle(320)}>Large</button>
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                {/* 🔄 TOMBOL REFRESH BARU */}
                <button 
                  onClick={handleRefresh}
                  style={{ padding: '4px 12px', background: '#2a2a32', border: '1px solid #3d3d4d', color: '#fff', borderRadius: 4, fontSize: 12, cursor: 'pointer', fontWeight: 500 }}
                >
                  🔄 Refresh
                </button>

                {isSelectMode ? (
                  <>
                    <button 
                      onClick={() => deleteSelectedVideos(selectedPaths)}
                      disabled={selectedPaths.length === 0}
                      style={{ padding: '4px 12px', background: selectedPaths.length === 0 ? '#444' : '#f44336', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: selectedPaths.length === 0 ? 'not-allowed' : 'pointer', fontWeight: 600 }}
                    >
                      🗑️ Delete Selected ({selectedPaths.length})
                    </button>
                    <button 
                      onClick={() => { setIsSelectMode(false); setSelectedPaths([]); }}
                      style={{ padding: '4px 12px', background: '#333', color: '#fff', border: 'none', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button 
                    onClick={() => setIsSelectMode(true)}
                    style={{ padding: '4px 12px', background: '#2a2a3a', border: '1px solid #5865F2', color: '#fff', borderRadius: 4, fontSize: 12, cursor: 'pointer' }}
                  >
                    ✓ Select Videos
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Grid View */}
        {view === 'grid' && (
          <div className="modern-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {activeClips.length === 0 ? (
              <div style={{ color: '#444', textAlign: 'center', marginTop: 80 }}>
                <div style={{ fontSize: 48 }}>🎬</div>
                <div style={{ marginTop: 8 }}>Select a game folder from the sidebar</div>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(auto-fill, minmax(${cardWidth}px, 1fr))`, gap: 14 }}>
                {activeClips.map(clip => (
                  <ClipCard 
                    key={clip.path} 
                    clip={clip} 
                    onClick={() => selectClip(clip)} 
                    isSelected={selected?.path === clip.path}
                    isSelectMode={isSelectMode}
                    isMultiSelected={selectedPaths.includes(clip.path)}
                    onCheckboxToggle={handleCheckboxToggle}
                    onSingleDelete={(path) => deleteSelectedVideos([path])}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Player View */}
        {view === 'player' && selected && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* AREA ATAS */}
            <div style={{ flex: 1, display: 'flex', overflow: 'hidden', padding: '20px 20px 10px 20px', gap: 20 }}>
              
              {/* SISI KIRI: Video Player */}
              <div style={{ flex: 1.8, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
                <div style={{ flex: 1, background: '#000', borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <video
                    ref={videoRef}
                    key={selected.path}
                    src={`media://${selected.path}`}
                    controls={false}
                    onLoadedMetadata={onVideoLoaded}
                    onTimeUpdate={handleTimeUpdate}
                    onClick={togglePlay}
                    style={{ width: '100%', height: '100%', objectFit: 'contain', cursor: 'pointer' }}
                  />
                </div>
              </div>

              {/* SISI KANAN: Side Panel */}
              <div className="modern-scroll" style={{ width: 300, minWidth: 300, display: 'flex', flexDirection: 'column', gap: 14, overflowY: 'auto' }}>
                
                {/* Panel Detail Video */}
                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 16, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 14, color: '#ccc', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>ℹ️</span> Video details
                    </div>
                    <button 
                      onClick={() => deleteSelectedVideos([selected.path])}
                      title="Delete this video permanently"
                      style={{ background: 'none', border: 'none', color: '#ff4d4d', cursor: 'pointer', fontSize: 14, padding: '2px 6px', borderRadius: 4 }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 77, 77, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                    >
                      🗑️
                    </button>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, fontSize: 13 }}>
                    <div>
                      <div style={{ color: '#666', fontSize: 11, marginBottom: 3 }}>TITLE</div>
                      {isEditingName ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <input
                            type="text"
                            value={newNameInput}
                            onChange={e => setNewNameInput(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setIsEditingName(false) }}
                            autoFocus
                            style={{ flex: 1, background: '#2a2a2a', color: '#fff', border: '1px solid #5865F2', borderRadius: 4, padding: '4px 8px', fontSize: 13 }}
                          />
                        </div>
                      ) : (
                        <div 
                          onClick={() => setIsEditingName(true)} 
                          style={{ color: '#fff', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.02)', padding: '4px 6px', borderRadius: 4 }}
                          title="Click to change file name"
                        >
                          <span style={{ wordBreak: 'break-all' }}>{selected.name}</span>
                        </div>
                      )}
                    </div>

                    <div>
                      <div style={{ color: '#666', fontSize: 11, marginBottom: 2 }}>DATE</div>
                      <div style={{ color: '#aaa', fontWeight: 500 }}>{formatDate(selected.mtime)}</div>
                    </div>

                    <div>
                      <div style={{ color: '#666', fontSize: 11, marginBottom: 2 }}>FILE SIZE</div>
                      <div style={{ color: '#aaa', fontWeight: 500 }}>{formatSize(selected.size)}</div>
                    </div>
                  </div>
                </div>

                {/* Panel Discord Compressor */}
                <div style={{ background: '#1a1a1a', borderRadius: 8, padding: 16, border: '1px solid #2a2a2a' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#ccc', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>🚀</span> COMPRESS
                  </div>
                  <div style={{ fontSize: 11, color: '#666', marginBottom: 14 }}>
                    Automatically compress video file size to under 10MB target.
                  </div>
                  <button onClick={doCompress} disabled={compressing} style={{ width: '100%', padding: '10px', background: compressing ? '#444' : '#23a559', color: '#fff', border: 'none', borderRadius: 6, cursor: compressing ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 600 }}>
                    {compressing ? 'Compressing...' : 'Compress Trimmed Section'}
                  </button>
                  
                  {status && (
                    <div style={{ marginTop: 12, padding: '8px 10px', borderRadius: 4, fontSize: 12, background: status.startsWith('✅') ? 'rgba(76,175,80,0.1)' : status.startsWith('❌') ? 'rgba(244,67,54,0.1)' : 'rgba(255,255,255,0.05)', color: status.startsWith('✅') ? '#4caf50' : status.startsWith('❌') ? '#f44336' : '#aaa', border: `1px solid ${status.startsWith('✅') ? '#4caf50' : status.startsWith('❌') ? '#f44336' : '#333'}` }}>
                      {status}
                    </div>
                  )}

                  {compressedPath && (
                    <div
                      draggable="true"
                      onDragStart={handleNativeDragStart}
                      style={{
                        marginTop: 14,
                        padding: '16px',
                        background: 'rgba(35, 165, 89, 0.15)',
                        border: '2px dashed #23a559',
                        borderRadius: 6,
                        textAlign: 'center',
                        cursor: 'grab',
                        userSelect: 'none',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(35, 165, 89, 0.25)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(35, 165, 89, 0.15)'}
                    >
                      <div style={{ fontSize: 24, marginBottom: 4 }}>🔥</div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#23a559' }}>READY TO DRAG & DROP</div>
                      <div style={{ fontSize: 11, color: '#aaa', marginTop: 2 }}>Click & Hold this box, then drag it directly anywhere</div>
                    </div>
                  )}
                </div>

              </div>
            </div>

            {/* AREA BAWAH: Timeline Editor */}
            <div style={{ background: '#161616', borderTop: '1px solid #2a2a2a', padding: '16px 20px 24px 20px', display: 'flex', flexDirection: 'column', gap: 14, flexShrink: 0, height: 160 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#ccc', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span>✂️</span> Timeline Editor
                  </div>
                  
                  <button 
                    onClick={togglePlay} 
                    style={{ background: '#2d2d3d', border: '1px solid #3d3d4d', color: '#fff', padding: '4px 12px', borderRadius: 4, fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <span>{isPlaying ? '⏸️ Pause' : '▶️ Play'}</span>
                  </button>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#1e1e24', padding: '4px 8px', borderRadius: 4, border: '1px solid #2d2d3d' }}>
                    <button onClick={toggleMute} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 13, cursor: 'pointer', padding: 0, display: 'flex', alignItems: 'center' }}>
                      {isMuted || volume === 0 ? '🔇' : '🔊'}
                    </button>
                    <input 
                      type="range" 
                      min="0" 
                      max="3" 
                      step="0.1" 
                      value={isMuted ? 0 : volume}
                      onChange={handleVolumeChange}
                      style={{ width: 70, height: 4, cursor: 'pointer', accentColor: '#5865F2', background: '#444' }}
                    />
                  </div>

                  <span style={{ fontSize: 12, color: '#888', fontFamily: 'monospace', marginLeft: 4 }}>
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </span>
                </div>
              </div>
              
              <TrimSlider
                duration={duration}
                trimStart={trimStart}
                trimEnd={trimEnd}
                currentTime={currentTime}
                onStartChange={v => { setTrimStart(v); if (videoRef.current) { videoRef.current.pause(); setIsPlaying(false); videoRef.current.currentTime = v } }}
                onEndChange={v => { setTrimEnd(v); if (videoRef.current) { videoRef.current.pause(); setIsPlaying(false); videoRef.current.currentTime = v } }}
                onPlayheadChange={v => { setCurrentTime(v); if (videoRef.current) videoRef.current.currentTime = v }}
                videoPath={selected.path}
              />
            </div>

          </div>
        )}
      </div>
    </div>
  )
}