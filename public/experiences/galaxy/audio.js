(() => {
  const SOUNDTRACK_VOLUME = 0.82;
  const SYNC_THRESHOLD_SECONDS = 0.14;

  const scriptUrl = new URL(document.currentScript.src, window.location.href);
  const soundtrackUrl = new URL("./audio/moonrise.m4a", scriptUrl);

  const soundtrack = new Audio(soundtrackUrl.href);
  soundtrack.preload = "auto";
  soundtrack.loop = false;
  soundtrack.volume = SOUNDTRACK_VOLUME;
  soundtrack.playsInline = true;

  let audioEnabled = false;
  let startInFlight = false;
  let sceneReady = false;

  window.__moonriseAudio = soundtrack;

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

  function restartAudioFromZero() {
    if (!audioEnabled) return;

    try {
      soundtrack.currentTime = 0;
    } catch (_) {}

    if (soundtrack.paused) {
      soundtrack.play().catch(() => {});
    }
  }

  if (originalResetScene) {
    window.resetScene = function syncedResetScene(...args) {
      const result = originalResetScene.apply(this, args);
      restartAudioFromZero();
      return result;
    };
  }

  async function startAudioAndAnimationTogether() {
    if (audioEnabled || startInFlight || !sceneIsReady()) {
      return;
    }

    startInFlight = true;

    try {
      soundtrack.currentTime = 0;
      await soundtrack.play();

      audioEnabled = true;

      // The animation may already have been running silently while the browser
      // waited for a user gesture. Reset once, then start both clocks at zero.
      if (originalResetScene) {
        originalResetScene();
      }

      soundtrack.currentTime = 0;

      if (soundtrack.paused) {
        await soundtrack.play();
      }
    } catch (_) {
      // Autoplay can be blocked. The next pointer/key gesture will retry.
    } finally {
      startInFlight = false;
    }
  }

  function handleUserGesture(event) {
    const target = event && event.target;

    if (
      target &&
      target.closest &&
      target.closest(".experience-exit")
    ) {
      return;
    }

    startAudioAndAnimationTogether();
  }

  window.addEventListener("pointerdown", handleUserGesture, {
    passive: true,
  });

  window.addEventListener("keydown", handleUserGesture);

  const readyTimer = window.setInterval(() => {
    if (!sceneIsReady()) return;

    sceneReady = true;
    window.clearInterval(readyTimer);

    // Try once without interaction. If the browser blocks autoplay,
    // the first user gesture will start and re-sync the animation.
    startAudioAndAnimationTogether();
  }, 80);

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
        correctDrift(true);
      }, 80);
    }
  });

  soundtrack.addEventListener("ended", () => {
    // The visual loop owns the reset. This fallback prevents silence if a
    // browser reports the media end a few frames before resetScene().
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
          soundtrack.play().catch(() => {});
        }
      }
    } catch (_) {}
  });
})();
