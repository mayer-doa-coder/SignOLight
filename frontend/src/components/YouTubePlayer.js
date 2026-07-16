import React, {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  forwardRef,
} from "react";
import "./YouTubePlayer.css";

let ytApiLoaded = false;

const YouTubePlayer = forwardRef(({ videoId, onTimeUpdate, onStateChange }, ref) => {
  const containerRef = useRef(null);
  const playerRef = useRef(null);
  const intervalRef = useRef(null);
  const onTimeUpdateRef = useRef(onTimeUpdate);
  const onStateChangeRef = useRef(onStateChange);

  useEffect(() => {
    onTimeUpdateRef.current = onTimeUpdate;
  }, [onTimeUpdate]);

  useEffect(() => {
    onStateChangeRef.current = onStateChange;
  }, [onStateChange]);

  useImperativeHandle(ref, () => ({
    seekTo: (seconds) => {
      playerRef.current?.seekTo(seconds, true);
    },
    getCurrentTime: () => playerRef.current?.getCurrentTime() || 0,
    pause: () => playerRef.current?.pauseVideo(),
    play: () => playerRef.current?.playVideo(),
    setPlaybackRate: (rate) => playerRef.current?.setPlaybackRate?.(rate),
  }), []);

  const destroyPlayer = useCallback(() => {
    clearInterval(intervalRef.current);
    intervalRef.current = null;

    if (playerRef.current) {
      try {
        playerRef.current.destroy();
      } catch {
        // Ignore iframe cleanup issues from stale instances.
      }
      playerRef.current = null;
    }
  }, []);

  const initPlayer = useCallback(() => {
    if (!containerRef.current || !window.YT?.Player) return;

    destroyPlayer();

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
          intervalRef.current = setInterval(() => {
            if (playerRef.current?.getCurrentTime) {
              onTimeUpdateRef.current?.(playerRef.current.getCurrentTime());
            }
          }, 100);
        },
        onStateChange: (event) => {
          onStateChangeRef.current?.(event.data);
        },
      },
    });
  }, [destroyPlayer, videoId]);

  useEffect(() => {
    if (window.YT?.Player) {
      initPlayer();
      return destroyPlayer;
    }

    if (!ytApiLoaded) {
      ytApiLoaded = true;
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
    }

    const previousReady = window.onYouTubeIframeAPIReady;
    const readyHandler = () => {
      previousReady?.();
      initPlayer();
    };
    window.onYouTubeIframeAPIReady = readyHandler;

    return () => {
      destroyPlayer();
      if (window.onYouTubeIframeAPIReady === readyHandler) {
        window.onYouTubeIframeAPIReady = previousReady;
      }
    };
  }, [destroyPlayer, initPlayer]);

  return (
    <div className="yt-wrapper">
      <div ref={containerRef} className="yt-player" />
    </div>
  );
});

YouTubePlayer.displayName = "YouTubePlayer";
export default YouTubePlayer;
