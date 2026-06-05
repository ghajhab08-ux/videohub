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
  const hideControlsTimer = useRef(null);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [buffered, setBuffered] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [showVolume, setShowVolume] = useState(false);

  const src = options?.sources?.[0]?.src;
  const poster = options?.poster;

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current);
    if (playing) {
      hideControlsTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [playing]);

  useEffect(() => {
    resetHideTimer();
    return () => { if (hideControlsTimer.current) clearTimeout(hideControlsTimer.current); };
  }, [playing, resetHideTimer]);

  // Load source when it changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    video.src = src;
    if (poster) video.poster = poster;
    video.load();
    setCurrentTime(0);
    setDuration(0);
    setIsLoading(true);
    setPlaying(false);
  }, [src, poster]);

  // Autoplay
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;
    if (options?.autoplay) {
      video.play().catch(() => {});
    }
  }, [src, options?.autoplay]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };
    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onVolumeChange = () => {
      setVolume(video.volume);
      setMuted(video.muted);
    };

    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('waiting', onWaiting);
    video.addEventListener('canplay', onCanPlay);
    video.addEventListener('volumechange', onVolumeChange);

    return () => {
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('waiting', onWaiting);
      video.removeEventListener('canplay', onCanPlay);
      video.removeEventListener('volumechange', onVolumeChange);
    };
  }, []);

  // Fullscreen change detection
  useEffect(() => {
    const onFSChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', onFSChange);
    return () => document.removeEventListener('fullscreenchange', onFSChange);
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  };

  const handleSeek = (e) => {
    const video = videoRef.current;
    const bar = progressRef.current;
    if (!video || !bar || !duration) return;
    const rect = bar.getBoundingClientRect();
    const ratio = Math.min(Math.max((e.clientX - rect.left) / rect.width, 0), 1);
    video.currentTime = ratio * duration;
    setCurrentTime(ratio * duration);
  };

  const handleVolume = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const val = parseFloat(e.target.value);
    video.volume = val;
    video.muted = val === 0;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !video.muted;
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen();
    else document.exitFullscreen();
  };

  const skip = (seconds) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    video.currentTime = Math.min(Math.max(video.currentTime + seconds, 0), duration);
  };

  const playedPct = duration ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration ? (buffered / duration) * 100 : 0;

  const volumeIcon = muted || volume === 0 ? '🔇' : volume < 0.5 ? '🔉' : '🔊';

  return (
    <div
      ref={containerRef}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => playing && setShowControls(false)}
      onClick={togglePlay}
      onContextMenu={(e) => e.preventDefault()}
      style={{
        position: 'relative',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        borderRadius: '12px',
        overflow: 'hidden',
        cursor: showControls ? 'default' : 'none',
        userSelect: 'none',
      }}
    >
      {/* Native video element */}
      <video
        ref={videoRef}
        style={{ width: '100%', height: '100%', display: 'block', objectFit: 'contain' }}
        preload="auto"
        playsInline
      />

      {/* Loading spinner */}
      {isLoading && (
        <div style={S.spinnerWrap}>
          <div style={S.spinner} />
        </div>
      )}

      {/* Controls overlay */}
      <div
        style={{
          ...S.controls,
          opacity: showControls ? 1 : 0,
          pointerEvents: showControls ? 'auto' : 'none',
          transition: 'opacity 0.3s ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient fade */}
        <div style={S.gradient} />

        {/* Progress bar */}
        <div
          ref={progressRef}
          style={S.progressBar}
          onClick={handleSeek}
          onMouseDown={(e) => {
            handleSeek(e);
            const onMove = (ev) => handleSeek(ev);
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        >
          {/* Buffered */}
          <div style={{ ...S.progressFill, width: `${bufferedPct}%`, backgroundColor: 'rgba(255,255,255,0.3)' }} />
          {/* Played */}
          <div style={{ ...S.progressFill, width: `${playedPct}%`, backgroundColor: 'var(--accent-color, #ff9000)' }} />
          {/* Thumb */}
          <div style={{ ...S.thumb, left: `${playedPct}%` }} />
        </div>

        {/* Bottom controls row */}
        <div style={S.row}>
          {/* Left: play, skip, time */}
          <div style={S.left}>
            <button style={S.btn} onClick={togglePlay} title={playing ? 'Pause' : 'Play'}>
              {playing ? <PauseIcon /> : <PlayIcon />}
            </button>
            <button style={S.btn} onClick={() => skip(-10)} title="Rewind 10s">
              <RewindIcon />
            </button>
            <button style={S.btn} onClick={() => skip(10)} title="Forward 10s">
              <ForwardIcon />
            </button>

            {/* Volume */}
            <div
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '6px' }}
              onMouseEnter={() => setShowVolume(true)}
              onMouseLeave={() => setShowVolume(false)}
            >
              <button style={S.btn} onClick={toggleMute} title="Toggle mute">
                <span style={{ fontSize: '16px' }}>{volumeIcon}</span>
              </button>
              <div style={{
                ...S.volumeSliderWrap,
                width: showVolume ? '80px' : '0',
                opacity: showVolume ? 1 : 0,
                overflow: 'hidden',
                transition: 'width 0.2s, opacity 0.2s',
              }}>
                <input
                  type="range"
                  min="0" max="1" step="0.02"
                  value={muted ? 0 : volume}
                  onChange={handleVolume}
                  style={S.volumeInput}
                />
              </div>
            </div>

            <span style={S.time}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          {/* Right: fullscreen */}
          <div style={S.right}>
            <button style={S.btn} onClick={toggleFullscreen} title="Fullscreen">
              {isFullscreen ? <ExitFSIcon /> : <FSIcon />}
            </button>
          </div>
        </div>
      </div>

      {/* Big play button in center when paused */}
      {!playing && !isLoading && (
        <div style={S.bigPlayWrap} onClick={togglePlay}>
          <div style={S.bigPlay}>
            <PlayIcon size={32} />
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

/* ── Inline SVG icons ─────────────────────────── */
const PlayIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <polygon points="5,3 19,12 5,21" />
  </svg>
);
const PauseIcon = ({ size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
    <rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" />
  </svg>
);
const RewindIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/>
  </svg>
);
const ForwardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
    <path d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/>
  </svg>
);
const FSIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/>
    <line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>
  </svg>
);
const ExitFSIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="8 3 3 3 3 8"/><polyline points="21 8 21 3 16 3"/>
    <polyline points="3 16 3 21 8 21"/><polyline points="16 21 21 21 21 16"/>
  </svg>
);

/* ── Styles ────────────────────────────────────── */
const S = {
  controls: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: '0 12px 10px',
    display: 'flex', flexDirection: 'column', gap: '6px',
  },
  gradient: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: '120px',
    background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)',
    pointerEvents: 'none', zIndex: -1,
  },
  progressBar: {
    position: 'relative', height: '4px', borderRadius: '2px',
    backgroundColor: 'rgba(255,255,255,0.2)',
    cursor: 'pointer', marginBottom: '2px',
    transition: 'height 0.15s',
  },
  progressFill: {
    position: 'absolute', top: 0, left: 0, height: '100%',
    borderRadius: '2px', pointerEvents: 'none',
  },
  thumb: {
    position: 'absolute', top: '50%', transform: 'translate(-50%, -50%)',
    width: '13px', height: '13px', borderRadius: '50%',
    backgroundColor: 'var(--accent-color, #ff9000)',
    boxShadow: '0 0 4px rgba(0,0,0,0.6)',
    pointerEvents: 'none',
  },
  row: {
    display: 'flex', alignItems: 'center',
    justifyContent: 'space-between', gap: '8px',
  },
  left: { display: 'flex', alignItems: 'center', gap: '4px' },
  right: { display: 'flex', alignItems: 'center', gap: '4px' },
  btn: {
    background: 'none', border: 'none', color: '#fff',
    cursor: 'pointer', padding: '6px', display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    opacity: 1, borderRadius: '4px',
  },
  time: { color: '#fff', fontSize: '13px', marginLeft: '4px', whiteSpace: 'nowrap' },
  volumeSliderWrap: { display: 'flex', alignItems: 'center' },
  volumeInput: { width: '100%', accentColor: 'var(--accent-color, #ff9000)', cursor: 'pointer' },
  spinnerWrap: {
    position: 'absolute', inset: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 5,
  },
  spinner: {
    width: '44px', height: '44px', borderRadius: '50%',
    border: '4px solid rgba(255,255,255,0.2)',
    borderTop: '4px solid var(--accent-color, #ff9000)',
    animation: 'spin 0.8s linear infinite',
  },
  bigPlayWrap: {
    position: 'absolute', inset: 0, display: 'flex',
    alignItems: 'center', justifyContent: 'center',
    cursor: 'pointer', zIndex: 3,
  },
  bigPlay: {
    width: '72px', height: '72px', borderRadius: '50%',
    backgroundColor: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    border: '2px solid rgba(255,255,255,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff',
    transition: 'transform 0.15s, background 0.15s',
  },
};

export default VideoJSPlayer;
