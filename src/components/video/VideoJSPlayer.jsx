import React, { useEffect, useRef, useState, useCallback } from 'react';

const formatTime = (secs) => {
  if (!secs || isNaN(secs) || !isFinite(secs)) return '0:00';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = Math.floor(secs % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const VideoJSPlayer = ({ options }) => {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const progressRef = useRef(null);
  const hideTimer = useRef(null);
  const isDragging = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showVolSlider, setShowVolSlider] = useState(false);

  const src = options?.sources?.[0]?.src;
  const poster = options?.poster;

  /* ── helpers ─────────────────────────────────── */
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3000);
  }, []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused || v.ended) { v.play().catch(() => {}); }
    else { v.pause(); }
  }, []);

  /* ── load source ─────────────────────────────── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !src) return;
    v.src = src;
    if (poster) v.poster = poster;
    v.load();
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setPlaying(false);
    if (options?.autoplay) {
      const onCanPlay = () => { v.play().catch(() => {}); v.removeEventListener('canplay', onCanPlay); };
      v.addEventListener('canplay', onCanPlay);
    }
  }, [src]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── video events ────────────────────────────── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay       = () => setPlaying(true);
    const onPause      = () => setPlaying(false);
    const onEnded      = () => setPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(v.currentTime);
      if (v.buffered.length) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onMeta    = () => { setDuration(v.duration); setIsLoading(false); };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onVolume  = () => { setVolume(v.volume); setMuted(v.muted); };

    v.addEventListener('play',        onPlay);
    v.addEventListener('pause',       onPause);
    v.addEventListener('ended',       onEnded);
    v.addEventListener('timeupdate',  onTimeUpdate);
    v.addEventListener('loadedmetadata', onMeta);
    v.addEventListener('waiting',     onWaiting);
    v.addEventListener('canplay',     onCanPlay);
    v.addEventListener('volumechange', onVolume);

    return () => {
      v.removeEventListener('play',        onPlay);
      v.removeEventListener('pause',       onPause);
      v.removeEventListener('ended',       onEnded);
      v.removeEventListener('timeupdate',  onTimeUpdate);
      v.removeEventListener('loadedmetadata', onMeta);
      v.removeEventListener('waiting',     onWaiting);
      v.removeEventListener('canplay',     onCanPlay);
      v.removeEventListener('volumechange', onVolume);
    };
  }, []);

  /* ── keyboard shortcuts ──────────────────────── */
  useEffect(() => {
    const onKey = (e) => {
      const v = videoRef.current;
      if (!v) return;
      if (['Space','ArrowLeft','ArrowRight','ArrowUp','ArrowDown','KeyF','KeyM'].includes(e.code)) {
        e.preventDefault();
      }
      if (e.code === 'Space')       togglePlay();
      if (e.code === 'ArrowLeft')   v.currentTime = Math.max(v.currentTime - 10, 0);
      if (e.code === 'ArrowRight')  v.currentTime = Math.min(v.currentTime + 10, v.duration || 0);
      if (e.code === 'ArrowUp')     v.volume = Math.min(v.volume + 0.1, 1);
      if (e.code === 'ArrowDown')   v.volume = Math.max(v.volume - 0.1, 0);
      if (e.code === 'KeyM')        v.muted = !v.muted;
      if (e.code === 'KeyF')        toggleFullscreen();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePlay]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── fullscreen detection ────────────────────── */
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  /* ── seeking helpers ─────────────────────────── */
  const seekTo = (e) => {
    const v = videoRef.current;
    const bar = progressRef.current;
    if (!v || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min((e.clientX - rect.left) / rect.width, 1));
    v.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const onProgressMouseDown = (e) => {
    e.stopPropagation();
    isDragging.current = true;
    seekTo(e);
    const onMove = (ev) => { if (isDragging.current) seekTo(ev); };
    const onUp   = () => { isDragging.current = false; document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup',   onUp);
  };

  const skip = (s) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.currentTime + s, duration || 0));
  };

  const toggleMute = () => { const v = videoRef.current; if (v) v.muted = !v.muted; };

  const handleVolumeChange = (e) => {
    const v = videoRef.current;
    if (!v) return;
    const val = parseFloat(e.target.value);
    v.volume = val;
    v.muted  = val === 0;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) containerRef.current?.requestFullscreen();
    else document.exitFullscreen();
  };

  /* ── derived values ──────────────────────────── */
  const playedPct   = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered   / duration) * 100 : 0;
  const volIcon = muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';

  /* ── render ──────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', width: '100%', height: '100%', backgroundColor: '#000', borderRadius: '12px', overflow: 'hidden', userSelect: 'none' }}
      onMouseMove={showControls}
      onMouseEnter={showControls}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Native <video> – no browser controls, click handled below */}
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain', cursor: 'pointer' }}
        preload="auto"
        playsInline
        onClick={togglePlay}
      />

      {/* Loading spinner */}
      {isLoading && (
        <div style={S.spinnerWrap}>
          <div style={S.spinner} />
        </div>
      )}

      {/* Large centered play/pause overlay (click-through area) */}
      {!isLoading && (
        <div
          style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2, pointerEvents: 'none' }}
        >
          {!playing && (
            <div style={S.bigPlay}>
              <PlayIcon size={36} />
            </div>
          )}
        </div>
      )}

      {/* Controls bar – always above video, stop propagation so it doesn't toggle play */}
      <div
        style={{ ...S.controlsWrap, opacity: controlsVisible ? 1 : 0, transition: 'opacity 0.3s' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Dark gradient */}
        <div style={S.gradient} />

        {/* Progress / seek bar */}
        <div
          ref={progressRef}
          style={S.progressTrack}
          onMouseDown={onProgressMouseDown}
        >
          <div style={{ ...S.bar, width: `${bufferedPct}%`, background: 'rgba(255,255,255,0.25)' }} />
          <div style={{ ...S.bar, width: `${playedPct}%`,   background: 'var(--accent-color,#ff9000)' }} />
          <div style={{ ...S.thumb, left: `${playedPct}%` }} />
        </div>

        {/* Bottom row */}
        <div style={S.row}>
          {/* Left */}
          <div style={S.side}>
            <button style={S.btn} onClick={togglePlay} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button style={S.btn} onClick={() => skip(-10)} title="Back 10s (←)">
              <RewindIcon />
            </button>
            <button style={S.btn} onClick={() => skip(10)} title="Forward 10s (→)">
              <ForwardIcon />
            </button>

            {/* Volume */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}
              onMouseEnter={() => setShowVolSlider(true)}
              onMouseLeave={() => setShowVolSlider(false)}>
              <button style={S.btn} onClick={toggleMute} title="Mute (M)">
                <span style={{ fontSize: 16 }}>{volIcon}</span>
              </button>
              <div style={{ width: showVolSlider ? 72 : 0, overflow: 'hidden', transition: 'width .2s' }}>
                <input type="range" min="0" max="1" step="0.02"
                  value={muted ? 0 : volume} onChange={handleVolumeChange}
                  style={{ width: 70, accentColor: 'var(--accent-color,#ff9000)', cursor: 'pointer' }} />
              </div>
            </div>

            <span style={S.time}>{formatTime(currentTime)} / {formatTime(duration)}</span>
          </div>

          {/* Right */}
          <div style={S.side}>
            <button style={S.btn} onClick={toggleFullscreen} title="Fullscreen (F)">
              {isFullscreen ? <ExitFSIcon /> : <FSIcon />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes vhSpin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

/* ── SVG icons ───────────────────────────────── */
const PlayIcon  = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="5,3 19,12 5,21"/></svg>;
const PauseIcon = ({ size = 20 }) => <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>;
const RewindIcon  = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M11 18V6l-8.5 6 8.5 6zm.5-6 8.5 6V6l-8.5 6z"/></svg>;
const ForwardIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>;
const FSIcon    = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>;
const ExitFSIcon= () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="8 3 3 3 3 8"/><polyline points="21 8 21 3 16 3"/><polyline points="3 16 3 21 8 21"/><polyline points="16 21 21 21 21 16"/></svg>;

/* ── Styles ──────────────────────────────────── */
const S = {
  controlsWrap: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: 6, zIndex: 10,
    pointerEvents: 'auto',
  },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 130,
    background: 'linear-gradient(to top, rgba(0,0,0,0.9) 0%, transparent 100%)',
    pointerEvents: 'none', zIndex: -1,
  },
  progressTrack: {
    position: 'relative', height: 5, borderRadius: 3,
    background: 'rgba(255,255,255,0.15)', cursor: 'pointer', marginBottom: 2,
  },
  bar: { position: 'absolute', top: 0, left: 0, height: '100%', borderRadius: 3, pointerEvents: 'none' },
  thumb: {
    position: 'absolute', top: '50%', transform: 'translate(-50%,-50%)',
    width: 14, height: 14, borderRadius: '50%',
    background: 'var(--accent-color,#ff9000)',
    boxShadow: '0 0 5px rgba(0,0,0,.7)', pointerEvents: 'none',
  },
  row:  { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  side: { display: 'flex', alignItems: 'center', gap: 2 },
  btn: {
    background: 'none', border: 'none', color: '#fff', cursor: 'pointer',
    padding: '6px', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
  time: { color: '#fff', fontSize: 13, marginLeft: 6, whiteSpace: 'nowrap' },
  spinnerWrap: { position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 5 },
  spinner: {
    width: 46, height: 46, borderRadius: '50%',
    border: '4px solid rgba(255,255,255,0.15)',
    borderTop: '4px solid var(--accent-color,#ff9000)',
    animation: 'vhSpin .8s linear infinite',
  },
  bigPlay: {
    width: 76, height: 76, borderRadius: '50%',
    background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
    border: '2px solid rgba(255,255,255,0.25)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff',
  },
};

export default VideoJSPlayer;
