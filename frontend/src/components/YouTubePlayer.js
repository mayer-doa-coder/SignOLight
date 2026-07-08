import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import "./YouTubePlayer.css";

let ytApiLoaded = false;

const YouTubePlayer = forwardRef(({ videoId, onTimeUpdate, onStateChange }, ref) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => {
      playerRef.current?.seekTo(seconds, true);
    },
    getCurrentTime: () => {
      return playerRef.current?.getCurrentTime() || 0;
    },
    pause: () => playerRef.current?.pauseVideo(),
    play: () => playerRef.current?.playVideo(),
  }));

  useEffect(() => {
    if (!window.YT) {
      if (!ytApiLoaded) {
        ytApiLoaded = true;
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.head.appendChild(tag);
      }

      const onReady = () => initPlayer();
      window.onYouTubeIframeAPIReady = onReady;
    } else {
      initPlayer();
    }

    return () => {
      clearInterval(intervalRef.current);
      if (playerRef.current) {
        try { playerRef.current.destroy(); } catch {}
      }
    };
  }, [videoId]);

  function initPlayer() {
    if (!containerRef.current) return;

    playerRef.current = new window.YT.Player(containerRef.current, {
      videoId,
      playerVars: {
        autoplay: 0,
        cc_load_policy: 1,
        cc_lang_pref: "en",
        rel: 0,
        modestbranding: 1,
        fs: 1,
        origin: window.location.origin,
      },
      events: {
        onReady: () => {
          // Poll time every 100ms — reduces max avatar lag from 250ms to 100ms
          intervalRef.current = setInterval(() => {
            if (playerRef.current?.getCurrentTime) {
              const t = playerRef.current.getCurrentTime();
              if (onTimeUpdate) onTimeUpdate(t);
            }
          }, 100);
        },
        onStateChange: (e) => {
          // YT.PlayerState: ENDED=0, PLAYING=1, PAUSED=2, BUFFERING=3, CUED=5
          if (onStateChange) onStateChange(e.data);
        },
      },
    });
  }

  return (
    <div className="yt-wrapper">
      <div ref={containerRef} className="yt-player" />
    </div>
  );
});

YouTubePlayer.displayName = "YouTubePlayer";
export default YouTubePlayer;
