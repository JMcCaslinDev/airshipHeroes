/**
 * Pointer lock on the game canvas; fullscreen on document so HUD stays visible.
 */

export function createPointerLockManager(lockTarget, options = {}) {
  const shouldCapture = options.shouldCapture || (() => true);
  const fullscreenElement = options.fullscreenElement || document.documentElement;

  function request() {
    if (!lockTarget || !shouldCapture()) {
      return;
    }

    if (fullscreenElement.requestFullscreen && document.fullscreenElement !== fullscreenElement) {
      fullscreenElement.requestFullscreen().catch(() => {});
    }

    lockTarget.requestPointerLock?.();
  }

  function release() {
    if (document.pointerLockElement === lockTarget) {
      document.exitPointerLock();
    }
    if (document.fullscreenElement === fullscreenElement && document.exitFullscreen) {
      document.exitFullscreen().catch(() => {});
    }
  }

  function onClick() {
    if (shouldCapture() && document.pointerLockElement !== lockTarget) {
      request();
    }
  }

  lockTarget?.addEventListener('click', onClick);

  return {
    request,
    release,
    isLocked: () => document.pointerLockElement === lockTarget,
    destroy() {
      lockTarget?.removeEventListener('click', onClick);
    }
  };
}
