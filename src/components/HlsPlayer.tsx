import Hls, { HlsConfig } from "hls.js";
import { useEffect, useRef, useCallback, useState } from "react";

import { useStreamStore } from "../store/streamStore";
import { OlympicStream, StreamManifest } from "../types";

interface HlsPlayerProps {
  stream: OlympicStream;
  isAudioActive: boolean;
  volume: number;
  onError: (error: string) => void;
  onLoad: () => void;
  onManifestLoaded?: (manifest: StreamManifest) => void;
}

const HlsPlayer = ({
  stream,
  isAudioActive,
  volume,
  onError,
  onLoad,
  onManifestLoaded,
}: HlsPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const getStreamManifest = useStreamStore((state) => state.getStreamManifest);

  // Store callbacks in refs to avoid re-creating the HLS instance when
  // parent re-renders with new inline function references.
  // This is critical: without stable refs, onLoad() triggers a parent re-render,
  // which gives us new onLoad/onError refs, which recreates initializePlayer,
  // which destroys the HLS instance mid-decryption (killing the MediaSource).
  const onErrorRef = useRef(onError);
  const onLoadRef = useRef(onLoad);
  const onManifestLoadedRef = useRef(onManifestLoaded);
  onErrorRef.current = onError;
  onLoadRef.current = onLoad;
  onManifestLoadedRef.current = onManifestLoaded;

  const [manifestUrl, setManifestUrl] = useState<string | null>(null);
  const [isLoadingManifest, setIsLoadingManifest] = useState(true);
  const [manifestError, setManifestError] = useState<string | null>(null);

  // Refs for monitoring playback health
  const lastPlaybackTimeRef = useRef<number>(0);
  const frozenCheckCountRef = useRef<number>(0);
  const healthCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const videoListenersRef = useRef<Array<() => void>>([]);

  // Fetch the manifest when stream changes
  useEffect(() => {
    let isCancelled = false;

    const fetchManifest = async () => {
      setIsLoadingManifest(true);
      setManifestError(null);
      setManifestUrl(null);

      try {
        const manifest = await getStreamManifest(stream.stream_url);

        if (isCancelled) return;

        if (manifest.error_code !== 0) {
          setManifestError(manifest.message || "Failed to load stream manifest");
          onErrorRef.current(manifest.message || "Failed to load stream manifest");
          return;
        }

        setManifestUrl(manifest.url);
        onManifestLoadedRef.current?.(manifest);
      } catch (error) {
        if (isCancelled) return;

        const errorMessage =
          error instanceof Error ? error.message : "Failed to fetch stream manifest";
        setManifestError(errorMessage);
        onErrorRef.current(errorMessage);
      } finally {
        if (!isCancelled) {
          setIsLoadingManifest(false);
        }
      }
    };

    fetchManifest();

    return () => {
      isCancelled = true;
    };
  }, [stream.stream_url, getStreamManifest]);

  const isVodStream = useCallback((url: string): boolean => {
    // VOD streams have startTime and endTime parameters (archive streams)
    return url.includes("startTime=") && url.includes("endTime=");
  }, []);

  const initializePlayer = useCallback(() => {
    if (!videoRef.current || !manifestUrl) return;

    const video = videoRef.current;
    const isVod = isVodStream(manifestUrl);

    console.log(`[HlsPlayer] Initializing player - Stream type: ${isVod ? "VOD" : "LIVE"}`);

    if (Hls.isSupported()) {
      let mediaRecoveryAttempts = 0;
      const MAX_RECOVERY_ATTEMPTS = 3;

      const hlsConfig: Partial<HlsConfig> = isVod
        ? {
            enableWorker: true,
            lowLatencyMode: false,
            maxBufferLength: 60,
            maxMaxBufferLength: 120,
            maxBufferSize: 60 * 1000 * 1000,
            backBufferLength: 30,
            appendErrorMaxRetry: 5,
            emeEnabled: true,
          }
        : {
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            emeEnabled: true,
          };

      const hls = new Hls(hlsConfig);
      hlsRef.current = hls;

      // VOD playback state - declared here so MEDIA_ATTACHED can reset them
      let vodStarted = false;
      let vodTimeoutId: ReturnType<typeof setTimeout> | null = null;
      let vodFallbackId: ReturnType<typeof setTimeout> | null = null;

      // Track media attach - this fires on initial attach AND after each recoverMediaError
      hls.on(Hls.Events.MEDIA_ATTACHED, () => {
        console.log("[HlsPlayer] Media attached to video element");
        // Reset VOD playback state so stop-load-seek logic can retry after recovery
        vodStarted = false;
        if (vodTimeoutId) {
          clearTimeout(vodTimeoutId);
          vodTimeoutId = null;
        }
        if (vodFallbackId) {
          clearTimeout(vodFallbackId);
          vodFallbackId = null;
        }
      });

      hls.on(Hls.Events.MANIFEST_PARSED, (_event, data) => {
        console.log(`[HlsPlayer] Manifest parsed (${isVod ? "VOD" : "LIVE"})`);
        console.log(`[HlsPlayer] Available quality levels: ${data.levels.length}`);

        onLoadRef.current();
      });

      // Diagnostic: track video element state transitions
      video.addEventListener("loadeddata", () => {
        console.log(`[HlsPlayer] loadeddata: readyState=${video.readyState}`);
      });
      video.addEventListener("canplay", () => {
        console.log(`[HlsPlayer] canplay: readyState=${video.readyState}`);
      });
      video.addEventListener("playing", () => {
        console.log(
          `[HlsPlayer] playing: readyState=${video.readyState}, currentTime=${video.currentTime.toFixed(2)}`,
        );
      });
      video.addEventListener("seeked", () => {
        console.log(
          `[HlsPlayer] seeked: readyState=${video.readyState}, currentTime=${video.currentTime.toFixed(2)}`,
        );
      });

      // Log video element stall/buffer events for debugging
      const handleWaiting = () => {
        console.log(`[HlsPlayer] Video waiting event - buffering`);
      };

      const handleStalled = () => {
        console.log(`[HlsPlayer] Video stalled event - possible network issue`);
      };

      const handleVideoError = () => {
        const error = video.error;
        if (error) {
          console.error(
            `[HlsPlayer] Video element error: code=${error.code}, message=${error.message}`,
          );
        }
      };

      video.addEventListener("waiting", handleWaiting);
      video.addEventListener("stalled", handleStalled);
      video.addEventListener("error", handleVideoError);

      // Store cleanup functions
      videoListenersRef.current.push(() => {
        video.removeEventListener("waiting", handleWaiting);
        video.removeEventListener("stalled", handleStalled);
        video.removeEventListener("error", handleVideoError);
      });

      // Playback health monitoring - logs when currentTime stops advancing
      if (!isVod) {
        lastPlaybackTimeRef.current = video.currentTime;
        frozenCheckCountRef.current = 0;

        healthCheckIntervalRef.current = setInterval(() => {
          if (!video || video.paused || video.ended) return;

          const currentTime = video.currentTime;
          const lastTime = lastPlaybackTimeRef.current;

          if (currentTime === lastTime) {
            frozenCheckCountRef.current++;
            console.log(
              `[HlsPlayer] Health check WARNING: currentTime not advancing (${frozenCheckCountRef.current} consecutive checks), currentTime=${currentTime.toFixed(2)}`,
            );
          } else {
            if (frozenCheckCountRef.current > 0) {
              console.log("[HlsPlayer] Health check: Playback resumed");
            }
            frozenCheckCountRef.current = 0;
            lastPlaybackTimeRef.current = currentTime;
          }
        }, 2000);
      }

      // For VOD on WebKitGTK: the buffer starts at ~1.40s (first keyframe offset),
      // leaving a gap at 0. WebKitGTK won't advance readyState or complete seeks
      // while SourceBuffers are updating. Strategy: accumulate enough buffer, stop
      // loading so SourceBuffers go idle, then seek to buffer start and play.
      if (isVod) {
        hls.on(Hls.Events.BUFFER_APPENDED, () => {
          if (vodStarted) return;
          if (video.buffered.length === 0) return;

          const bufferStart = video.buffered.start(0);
          const bufferEnd = video.buffered.end(0);
          const bufferedAmount = bufferEnd - bufferStart;
          console.log(
            `[HlsPlayer] VOD buffer: ${bufferStart.toFixed(2)}s - ${bufferEnd.toFixed(2)}s (${bufferedAmount.toFixed(1)}s), currentTime: ${video.currentTime.toFixed(2)}s, readyState: ${video.readyState}`,
          );

          // Wait for at least 10s of buffer before attempting playback
          if (bufferedAmount < 10) return;
          vodStarted = true;

          // Stop loading so SourceBuffers finish updating and go idle
          console.log("[HlsPlayer] VOD: Stopping load to let SourceBuffers settle...");
          hls.stopLoad();

          // Give SourceBuffers time to finish pending updates, then seek & play
          vodTimeoutId = setTimeout(() => {
            vodTimeoutId = null;
            if (!vodStarted) return; // was reset by recovery

            const seekTarget =
              video.buffered.length > 0 ? video.buffered.start(0) + 0.1 : video.currentTime;
            console.log(
              `[HlsPlayer] VOD: SourceBuffers settled. Seeking to ${seekTarget.toFixed(2)}s, readyState: ${video.readyState}`,
            );
            video.currentTime = seekTarget;

            // Wait for seek to complete, then play and resume loading
            const onSeeked = () => {
              video.removeEventListener("seeked", onSeeked);
              console.log(
                `[HlsPlayer] VOD: Seek completed! readyState: ${video.readyState}, currentTime: ${video.currentTime.toFixed(2)}`,
              );
              video
                .play()
                .then(() => {
                  console.log("[HlsPlayer] VOD: Playback started! Resuming fragment loading...");
                  hls.startLoad(video.currentTime);
                })
                .catch((err) => {
                  console.error(`[HlsPlayer] VOD: play() failed: ${err.message}`);
                  hls.startLoad(video.currentTime);
                });
            };
            video.addEventListener("seeked", onSeeked);

            // Fallback: if seeked never fires after 2s, resume loading for another attempt
            vodFallbackId = setTimeout(() => {
              vodFallbackId = null;
              if (!video.paused) return; // already playing
              console.log(
                `[HlsPlayer] VOD: Seeked timeout - readyState: ${video.readyState}, currentTime: ${video.currentTime.toFixed(2)}, paused: ${video.paused}`,
              );
              video.removeEventListener("seeked", onSeeked);
              // Resume loading - don't set vodStarted=false here, MEDIA_ATTACHED will reset it if recovery happens
              video.play().catch((err) => {
                console.error(`[HlsPlayer] VOD: Fallback play() failed: ${err.message}`);
              });
              hls.startLoad(video.currentTime);
            }, 2000);
          }, 500);
        });
      }

      hls.on(Hls.Events.FRAG_LOADED, (_event, data) => {
        console.log(
          `[HlsPlayer] Fragment loaded - #${data.frag.sn}, level: ${data.frag.level}, ${data.frag.duration.toFixed(2)}s`,
        );
      });

      hls.on(Hls.Events.BUFFER_CODECS, (_event, data) => {
        console.log(`[HlsPlayer] Buffer codecs:`, JSON.stringify(data, null, 2));
      });

      hls.on(Hls.Events.LEVEL_SWITCHING, (_event, data) => {
        console.log(`[HlsPlayer] Level switching to ${data.level}`);
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        // Log detailed error info including the underlying DOMException
        const errorDetail = data.error
          ? `${data.error.name}: ${data.error.message}`
          : "no underlying error";
        console.error(
          `[HlsPlayer] HLS Error - Type: ${data.type}, Details: ${data.details}, Fatal: ${data.fatal}, Error: ${errorDetail}`,
        );

        // Log buffer stalled errors (non-fatal but causes frozen playback)
        if (data.details === "bufferStalledError") {
          console.warn(
            `[HlsPlayer] Buffer stalled error - currentTime=${videoRef.current?.currentTime.toFixed(2)}, readyState=${videoRef.current?.readyState}`,
          );
        }

        // For bufferAppendError, log SourceBuffer state
        if (data.details === "bufferAppendError") {
          try {
            const mediaSource =
              (hls as any).media?.mediaSource || (hls as any).bufferController?.mediaSource;
            if (mediaSource) {
              console.log(`[HlsPlayer] MediaSource state: ${mediaSource.readyState}`);
              const sbs = mediaSource.sourceBuffers;
              for (let i = 0; i < sbs.length; i++) {
                console.log(
                  `[HlsPlayer] SourceBuffer[${i}]: updating=${sbs[i].updating}, mode=${sbs[i].mode}, buffered ranges=${sbs[i].buffered.length}`,
                );
              }
            }
          } catch (e) {
            console.log("[HlsPlayer] Could not inspect MediaSource state");
          }
        }

        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.log("[HlsPlayer] Network error, attempting recovery...");
              onErrorRef.current("Network error - trying to recover");
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              if (mediaRecoveryAttempts < MAX_RECOVERY_ATTEMPTS) {
                mediaRecoveryAttempts++;
                console.log(
                  `[HlsPlayer] Media error: ${data.details}, recovery attempt ${mediaRecoveryAttempts}/${MAX_RECOVERY_ATTEMPTS}`,
                );
                hls.recoverMediaError();
              } else {
                console.error(
                  `[HlsPlayer] Media error: ${data.details}, max recovery attempts reached. Destroying player.`,
                );
                onErrorRef.current(`Playback failed: ${data.details}`);
                hls.destroy();
              }
              break;
            default:
              console.error(`[HlsPlayer] Fatal error: ${data.details}`);
              onErrorRef.current(`Fatal error: ${data.details}`);
              hls.destroy();
              break;
          }
        }
      });

      console.log("[HlsPlayer] Loading manifest...");
      hls.loadSource(manifestUrl);
      hls.attachMedia(video);
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      console.log("[HlsPlayer] Using native HLS support");
      video.src = manifestUrl;
      video.addEventListener("loadedmetadata", onLoad, { once: true });
    } else {
      console.error("[HlsPlayer] HLS not supported in this browser");
      onErrorRef.current("HLS not supported in this browser");
    }
  }, [manifestUrl, isVodStream]);

  useEffect(() => {
    if (!manifestUrl) return;

    initializePlayer();

    return () => {
      // Clean up video listeners
      videoListenersRef.current.forEach((cleanup) => cleanup());
      videoListenersRef.current = [];

      // Clean up health check interval
      if (healthCheckIntervalRef.current) {
        clearInterval(healthCheckIntervalRef.current);
        healthCheckIntervalRef.current = null;
      }

      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [initializePlayer, manifestUrl]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = !isAudioActive;
    }
  }, [isAudioActive]);

  useEffect(() => {
    if (videoRef.current && isAudioActive) {
      videoRef.current.volume = volume;
    }
  }, [volume, isAudioActive]);

  // Show loading state while fetching manifest
  if (isLoadingManifest) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black">
        <div className="text-center">
          <div className="mb-2 animate-spin text-2xl text-white">⟳</div>
          <p className="text-sm text-slate-400">Loading stream...</p>
        </div>
      </div>
    );
  }

  // Show error state
  if (manifestError) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-black p-4">
        <div className="text-center">
          <p className="text-sm text-red-400">{manifestError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full">
      <video
        ref={videoRef}
        className="h-full w-full bg-black object-contain outline-none"
        playsInline
        autoPlay
        muted={!isAudioActive}
        controls={true}
      />
    </div>
  );
};

export { HlsPlayer };
