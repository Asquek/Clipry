import { useState, useRef, useEffect } from 'react'
import './App.css'

function formatSize(bytes) {
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function formatDate(ms) {
  return new Date(ms).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(sec) {
  const m = Math.floor(sec / 60).toString().padStart(2, '0')
  const s = Math.floor(sec % 60).toString().padStart(2, '0')
  return `${m}:${s}`
}

function TrimSlider({ duration, trimStart, trimEnd, onStartChange, onEndChange, videoPath }) {
  const [preview, setPreview] = useState(null)
  const [previewPos, setPreviewPos] = useState(0)
  const [dragging, setDragging] = useState(null)
  const [thumbCache, setThumbCache] = useState({})
  const sliderRef = useRef(null)

  function getPosFromEvent(e) {
    const rect = sliderRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width))
    return (x / rect.width) * duration
  }

  async function getThumbAt(time) {
    const key = Math.floor(time)
    if (thumbCache[key]) return thumbCache[key]
    try {
      const p = await window.api.getThumbnailAt(videoPath, key)
      const url = `media://${p}`
      setThumbCache(prev => ({ ...prev, [key]: url }))
      return url
    } catch { return null }
  }

  async function onMouseDown(e, handle) {
    e.preventDefault()
    setDragging(handle)
    const time = getPosFromEvent(e)
    setPreviewPos(e.clientX)
    const thumb = await getThumbAt(Math.floor(time))
    setPreview(thumb)
  }

  useEffect(() => {
    async function onMouseMove(e) {
      if (!dragging || !sliderRef.current) return
      const time = getPosFromEvent(e)
      setPreviewPos(e.clientX)
      if (dragging === 'start' && time < trimEnd) onStartChange(time)
      if (dragging === 'end' && time > trimStart) onEndChange(time)
      const thumb = await getThumbAt(Math.floor(time))
      setPreview(thumb)
    }
    function onMouseUp() { setDragging(null); setPreview(null) }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
  }, [dragging, trimStart, trimEnd, duration])

  const startPct = duration > 0 ? (trimStart / duration) * 100 : 0
  const endPct = duration > 0 ? (trimEnd / duration) * 100 : 100

  // Generate ruler ticks
  function getRulerTicks() {
    if (!duration) return []
    const ticks = []
    // aim for ~10 labels
    const intervals = [5, 10, 15, 20, 30, 60, 120, 300]
    const interval = intervals.find(i => duration / i <= 15) || 300
    for (let t = 0; t <= duration; t += interval) {
      ticks.push(t)
    }
    return ticks
  }

  const ticks = getRulerTicks()

  return (
    <div style={{ position: 'relative', userSelect: 'none', width: '100%' }}>

      {/* Preview thumbnail */}
      {preview && sliderRef.current && (
        <div style={{
          position: 'fixed',
          left: previewPos - 80,
          top: sliderRef.current.getBoundingClientRect().top - 115,
          width: 160, height: 90,
          borderRadius: 6, overflow: 'hidden',
          border: '2px solid #00bcd4',
          zIndex: 999, pointerEvents: 'none',
          boxShadow: '0 4px 16px rgba(0,0,0,0.7)'
        }}>
          <img src={preview} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}

      {/* Ruler */}
      <div style={{ position: 'relative', height: 24, marginBottom: 2 }}>
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

      {/* Track */}
      <div
        ref={sliderRef}
        style={{
          position: 'relative',
          height: 36,
          background: '#0a2a2a',
          borderRadius: 4,
          border: '1px solid #1a4a4a',
          cursor: 'pointer',
          overflow: 'hidden',
        }}
      >
        {/* Dimmed left */}
        <div style={{
          position: 'absolute', left: 0, top: 0,
          width: `${startPct}%`, height: '100%',
          background: 'rgba(0,0,0,0.5)',
        }} />

        {/* Active range */}
        <div style={{
          position: 'absolute',
          left: `${startPct}%`,
          width: `${endPct - startPct}%`,
          height: '100%',
          background: 'rgba(0,188,212,0.15)',
          borderTop: '2px solid #00bcd4',
          borderBottom: '2px solid #00bcd4',
        }} />

        {/* Dimmed right */}
        <div style={{
          position: 'absolute', left: `${endPct}%`, top: 0,
          width: `${100 - endPct}%`, height: '100%',
          background: 'rgba(0,0,0,0.5)',
        }} />

        {/* Start handle */}
        <div
          onMouseDown={e => onMouseDown(e, 'start')}
          style={{
            position: 'absolute',
            left: `${startPct}%`,
            top: 0, bottom: 0,
            width: 3,
            background: '#00bcd4',
            cursor: 'ew-resize',
            zIndex: 3,
            transform: 'translateX(-50%)',
          }}
        >
          {/* Top grip */}
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 10, height: 8, background: '#00bcd4', borderRadius: '0 0 3px 3px'
          }} />
          {/* Bottom grip */}
          <div style={{
            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: 10, height: 8, background: '#00bcd4', borderRadius: '3px 3px 0 0'
          }} />
        </div>

        {/* End handle */}
        <div
          onMouseDown={e => onMouseDown(e, 'end')}
          style={{
            position: 'absolute',
            left: `${endPct}%`,
            top: 0, bottom: 0,
            width: 3,
            background: '#00bcd4',
            cursor: 'ew-resize',
            zIndex: 3,
            transform: 'translateX(-50%)',
          }}
        >
          <div style={{
            position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)',
            width: 10, height: 8, background: '#00bcd4', borderRadius: '0 0 3px 3px'
          }} />
          <div style={{
            position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)',
            width: 10, height: 8, background: '#00bcd4', borderRadius: '3px 3px 0 0'
          }} />
        </div>
      </div>

      {/* Time labels */}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#4a9a9a', marginTop: 6 }}>
        <span>Start: {formatTime(trimStart)}</span>
        <span>Duration: {formatTime(trimEnd - trimStart)}</span>
        <span>End: {formatTime(trimEnd)}</span>
      </div>
    </div>
  )
}

function ClipCard({ clip, onClick, isSelected }) {
  const [thumb, setThumb] = useState(null)
  const [duration, setDuration] = useState(null)
  const [visible, setVisible] = useState(false)
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

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      style={{
        borderRadius: 8,
        overflow: 'hidden',
        cursor: 'pointer',
        background: '#1e1e1e',
        border: isSelected ? '2px solid #5865F2' : '2px solid transparent',
        transition: 'border 0.1s',
      }}
    >
      <div style={{ position: 'relative', aspectRatio: '16/9', background: '#000' }}>
        {thumb ? (
          <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#333', fontSize: 24 }}>🎬</div>
        )}
        {duration !== null && (
          <div style={{
            position: 'absolute', bottom: 6, right: 6,
            background: 'rgba(0,0,0,0.75)', borderRadius: 4,
            padding: '2px 6px', fontSize: 11, color: '#fff', fontWeight: 600
          }}>
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
  const [trimming, setTrimming] = useState(false)
  const [compressing, setCompressing] = useState(false)
  const [status, setStatus] = useState(null)
  const [view, setView] = useState('grid')
  const videoRef = useRef(null)

  async function openFolder() {
    const p = await window.api.selectFolder()
    if (!p) return
    setFolder(p)
    const folders = await window.api.scanFolder(p)
    setGamefolders(folders)
    setActiveFolder(folders[0]?.name || null)
    setSelected(null)
    setStatus(null)
    setView('grid')
  }

  function selectClip(clip) {
    setSelected(clip)
    setTrimStart(0)
    setTrimEnd(0)
    setStatus(null)
    setView('player')
  }

  function onVideoLoaded() {
    const dur = videoRef.current?.duration || 0
    setDuration(dur)
    setTrimStart(0)
    setTrimEnd(dur)
  }

  async function doTrim() {
    if (!selected) return
    setTrimming(true)
    setStatus('Trimming...')
    try {
      const ext = selected.name.split('.').pop()
      const baseName = selected.name.replace(`.${ext}`, '')
      const output = selected.path.replace(selected.name, `${baseName}_trimmed.${ext}`)
      await window.api.trimVideo(selected.path, output, trimStart, trimEnd)
      setStatus(`✅ Tersimpan: ${baseName}_trimmed.${ext}`)
      const folders = await window.api.scanFolder(folder)
      setGamefolders(folders)
    } catch (err) {
      setStatus(`❌ Error: ${err}`)
    }
    setTrimming(false)
  }

  async function doCompress() {
    if (!selected) return
    setCompressing(true)
    setStatus('Compressing... (mungkin agak lama)')
    try {
      const ext = selected.name.split('.').pop()
      const baseName = selected.name.replace(`.${ext}`, '')
      const output = selected.path.replace(selected.name, `${baseName}_discord.mp4`)
      await window.api.compressVideo(selected.path, output)
      setStatus(`✅ Siap kirim Discord: ${baseName}_discord.mp4`)
      const folders = await window.api.scanFolder(folder)
      setGamefolders(folders)
    } catch (err) {
      setStatus(`❌ Error: ${err}`)
    }
    setCompressing(false)
  }

  const activeClips = gamefolders.find(f => f.name === activeFolder)?.files || []

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: '#111', color: '#fff', fontFamily: 'sans-serif', overflow: 'hidden' }}>

      {/* Sidebar */}
      <div style={{ width: 220, minWidth: 220, background: '#161616', display: 'flex', flexDirection: 'column', borderRight: '1px solid #2a2a2a' }}>
        <div style={{ padding: '14px 12px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18 }}>🎬</span>
          <span style={{ fontWeight: 700, fontSize: 15 }}>ClipLib</span>
        </div>
        <button
          onClick={openFolder}
          style={{ margin: '10px 10px 6px', padding: '8px', background: '#5865F2', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          + Pilih Folder
        </button>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {gamefolders.map(gf => (
            <div
              key={gf.name}
              onClick={() => { setActiveFolder(gf.name); setSelected(null); setView('grid') }}
              style={{
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 13,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: activeFolder === gf.name ? '#2a2a3a' : 'transparent',
                borderLeft: activeFolder === gf.name ? '3px solid #5865F2' : '3px solid transparent',
                color: activeFolder === gf.name ? '#fff' : '#999',
              }}
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
        <div style={{ padding: '10px 16px', borderBottom: '1px solid #2a2a2a', display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
          {view === 'player' && (
            <button
              onClick={() => setView('grid')}
              style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 18, padding: 0 }}
            >←</button>
          )}
          <span style={{ fontSize: 13, color: '#aaa' }}>
            {view === 'grid'
              ? `${activeFolder || '—'} (${activeClips.length} clips)`
              : selected?.name}
          </span>
        </div>

        {/* Grid */}
        {view === 'grid' && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {activeClips.length === 0 ? (
              <div style={{ color: '#444', textAlign: 'center', marginTop: 80 }}>
                <div style={{ fontSize: 48 }}>🎬</div>
                <div style={{ marginTop: 8 }}>Pilih folder game di sidebar</div>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
                gap: 14,
              }}>
                {activeClips.map(clip => (
                  <ClipCard
                    key={clip.path}
                    clip={clip}
                    onClick={() => selectClip(clip)}
                    isSelected={selected?.path === clip.path}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Player */}
        {view === 'player' && selected && (
          <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
            <video
              ref={videoRef}
              key={selected.path}
              src={`media://${selected.path}`}
              controls
              onLoadedMetadata={onVideoLoaded}
              style={{ width: '100%', maxHeight: '50vh', background: '#000', borderRadius: 8 }}
            />
            <div style={{ marginTop: 10, fontSize: 13, color: '#aaa' }}>{selected.name} · {formatSize(selected.size)}</div>

        {/* Trim */}
        <div style={{ marginTop: 16, background: '#1a1a1a', borderRadius: 8, padding: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 16, color: '#ccc' }}>✂️ Trim</div>
          <TrimSlider
            duration={duration}
            trimStart={trimStart}
            trimEnd={trimEnd}
            onStartChange={v => { setTrimStart(v); if (videoRef.current) videoRef.current.currentTime = v }}
            onEndChange={v => { setTrimEnd(v); if (videoRef.current) videoRef.current.currentTime = v }}
            videoPath={selected.path}
          />
          <button onClick={doTrim} disabled={trimming || compressing}
            style={{ marginTop: 16, padding: '8px 20px', background: trimming ? '#444' : '#5865F2', color: '#fff', border: 'none', borderRadius: 6, cursor: trimming ? 'not-allowed' : 'pointer', fontSize: 13 }}>
            {trimming ? 'Trimming...' : 'Simpan Trim'}
          </button>
        </div>

            {/* Compress */}
            <div style={{ marginTop: 12, background: '#1a1a1a', borderRadius: 8, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: '#ccc' }}>🚀 Share Discord</div>
              <div style={{ fontSize: 12, color: '#666', marginBottom: 12 }}>Auto compress ke &lt;10MB</div>
              <button onClick={doCompress} disabled={trimming || compressing}
                style={{ padding: '8px 20px', background: compressing ? '#444' : '#23a559', color: '#fff', border: 'none', borderRadius: 6, cursor: compressing ? 'not-allowed' : 'pointer', fontSize: 13 }}>
                {compressing ? 'Compressing...' : 'Compress & Siapkan'}
              </button>
              {status && (
                <div style={{ marginTop: 10, fontSize: 12, color: status.startsWith('✅') ? '#4caf50' : status.startsWith('C') || status.startsWith('T') ? '#888' : '#f44336' }}>
                  {status}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}