import React, { useEffect, useRef } from 'react';
import videojs from 'video.js';
import 'video.js/dist/video-js.css';

const VideoJSPlayer = (props) => {
  const videoRef = useRef(null);
  const playerRef = useRef(null);
  const { options, onReady } = props;

  useEffect(() => {
    // Make sure Video.js player is only initialized once
    if (!playerRef.current) {
      // The Video.js player needs to be _inside_ the component el for React 18 Strict Mode. 
      const videoElement = document.createElement("video-js");

      videoElement.classList.add('vjs-big-play-centered');
      videoRef.current.appendChild(videoElement);

      const player = playerRef.current = videojs(videoElement, options, () => {
        videojs.log('player is ready');
        onReady && onReady(player);
      });

      // Disable right click on the player
      player.on('contextmenu', (e) => {
        e.preventDefault();
      });

      // You could update an existing player in the `else` block here
      // on prop change, for example:
    } else {
      const player = playerRef.current;
      player.autoplay(options.autoplay);
      player.src(options.sources);
      if (options.poster) {
        player.poster(options.poster);
      }
    }
  }, [options, videoRef]);

  // Dispose the player on unmount
  useEffect(() => {
    const player = playerRef.current;

    return () => {
      if (player && !player.isDisposed()) {
        player.dispose();
        playerRef.current = null;
      }
    };
  }, [playerRef]);

  return (
    <div data-vjs-player style={{ width: '100%', height: '100%', borderRadius: '12px', overflow: 'hidden' }}>
      <div ref={videoRef} />
      <style>{`
        .video-js {
          width: 100%;
          height: 100%;
          border-radius: 12px;
        }
        .vjs-control-bar {
          background-color: rgba(0, 0, 0, 0.7);
        }
        /* Hide the default big play button for a cleaner look if desired, 
           but user asked for exact UI preserve. Standard vjs looks good. */
      `}</style>
    </div>
  );
}

export default VideoJSPlayer;
