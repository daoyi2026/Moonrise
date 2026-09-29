(() => {
  const SOUNDTRACK_VOLUME = 0.82;
  const SYNC_THRESHOLD_SECONDS = 0.14;
  const START_RETRY_DELAY_MS = 120;

  const scriptUrl = new URL(document.currentScript.src, window.location.href);
  const soundtrackUrl = new URL("./audio/moonrise.m4a", scriptUrl);

  const soundtrack = new Audio();
  soundtrack.src = soundtrackUrl.href;
  soundtrack.preload = "auto";
  soundtrack.autoplay = true;
  soundtrack.loop = false;
  soundtrack.volume = SOUNDTRACK_VOLUME;
  soundtrack.playsInline = true;

  let audioEnabled = false;
  let startInFlight = false;
  let sceneReady = false;
  let autoplayAttempted = false;

  window.__moonriseAudio = soundtrack;
  window.__moonriseAudioState = {
    get enabled() {
      return audioEnabled;
    },
    get ready() {
      return sceneReady;
    },
    get paused() {
      return soundtrack.paused;
    },
  };

  const originalResetScene =
    typeof window.resetScene === "function"
      ? window.resetScene
      : null;

  function sceneIsReady() {
    return (
      document.querySelector("canvas") &&
      typeof window.millis === "function"
    );
  }

  function setAudioToZero() {
    try {
      soundtrack.currentTime = 0;
    } catch (_) {}
  }

  function restartAudioFromZero() {
    if (!audioEnabled) return;

    setAudioToZero();

    soundtrack.play().catch(() => {
      audioEnabled = false;
    });
  }

  if (originalResetScene) {
    window.resetScene = function syncedResetScene(...args) {
      const result = originalResetScene.apply(this, args);
      restartAudioFromZero();
      return result;
    };
  }

  async function startAudioAndAnimationTogether() {
    if (
      audioEnabled ||
      startInFlight ||
      !sceneIsReady()
    ) {
      return false;
    }

    startInFlight = true;

    try {
      soundtrack.volume = SOUNDTRACK_VOLUME;
      setAudioToZero();

      await soundtrack.play();

      audioEnabled = true;

      // If the picture was already moving while the browser decided whether
      // audio could autoplay, restart the ORIGINAL visual clock now so sound
      // and picture begin together from exactly 0.
      if (originalResetScene) {
        originalResetScene();
      }

      setAudioToZero();

      if (soundtrack.paused) {
        await soundtrack.play();
      }

      return true;
    } catch (_) {
      // Expected on browsers that block audible autoplay.
      // Stay visually clean: no button or overlay is shown.
      // The first natural user gesture anywhere on the experience retries.
      audioEnabled = false;
      return false;
    } finally {
      startInFlight = false;
    }
  }

  function isExitControl(target) {
    return Boolean(
      target &&
      target.closest &&
      target.closest(".experience-exit")
    );
  }

  function handleUserGesture(event) {
    if (audioEnabled || startInFlight || !sceneReady) return;
    if (isExitControl(event && event.target)) return;

    startAudioAndAnimationTogether();
  }

  // Keep the artwork visually untouched. These listeners are only a silent
  // fallback for browsers that reject the initial audible autoplay attempt.
  window.addEventListener("pointerdown", handleUserGesture, { passive: true });
  window.addEventListener("touchstart", handleUserGesture, { passive: true });
  window.addEventListener("mousedown", handleUserGesture, { passive: true });
  window.addEventListener("click", handleUserGesture);
  window.addEventListener("keydown", handleUserGesture);

  const readyTimer = window.setInterval(() => {
    if (!sceneIsReady()) return;

    sceneReady = true;
    window.clearInterval(readyTimer);

    // Best-effort audible autoplay on page open.
    autoplayAttempted = true;
    soundtrack.load();

    window.setTimeout(() => {
      startAudioAndAnimationTogether();
    }, START_RETRY_DELAY_MS);
  }, 50);

  soundtrack.addEventListener("playing", () => {
    audioEnabled = true;
  });

  soundtrack.addEventListener("pause", () => {
    if (
      sceneReady &&
      autoplayAttempted &&
      soundtrack.currentTime > 0 &&
      soundtrack.currentTime < soundtrack.duration
    ) {
      // Do not force playback here; a browser may have intentionally paused it.
      // The next user gesture will retry if needed.
    }
  });

  function correctDrift(force = false) {
    if (
      !audioEnabled ||
      !sceneReady ||
      soundtrack.paused ||
      soundtrack.readyState < 2
    ) {
      return;
    }

    try {
      if (
        typeof window.millis !== "function" ||
        typeof startMs !== "number" ||
        typeof LOOP_TIME !== "number"
      ) {
        return;
      }

      const sceneTime = (window.millis() - startMs) / 1000;

      if (sceneTime < 0 || sceneTime >= LOOP_TIME) {
        return;
      }

      const maxAudioTime = Math.max(
        0,
        (Number.isFinite(soundtrack.duration)
          ? soundtrack.duration
          : LOOP_TIME) - 0.03
      );

      const targetTime = Math.min(sceneTime, maxAudioTime);
      const drift = soundtrack.currentTime - targetTime;

      if (force || Math.abs(drift) > SYNC_THRESHOLD_SECONDS) {
        soundtrack.currentTime = targetTime;
      }
    } catch (_) {}
  }

  window.setInterval(() => {
    correctDrift(false);
  }, 500);

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      window.setTimeout(() => {
        if (audioEnabled && soundtrack.paused) {
          soundtrack.play().catch(() => {
            audioEnabled = false;
          });
        }
        correctDrift(true);
      }, 80);
    }
  });

  soundtrack.addEventListener("ended", () => {
    if (!audioEnabled) return;

    try {
      if (
        typeof startMs === "number" &&
        typeof window.millis === "function" &&
        typeof LOOP_TIME === "number"
      ) {
        const sceneTime = (window.millis() - startMs) / 1000;

        if (sceneTime < LOOP_TIME - 0.2) {
          soundtrack.currentTime = Math.max(0, sceneTime);
          soundtrack.play().catch(() => {
            audioEnabled = false;
          });
        }
      }
    } catch (_) {}
  });
})();