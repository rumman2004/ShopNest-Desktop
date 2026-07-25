/**
 * ShopNest Desktop IPC Bridge (Tauri v2)
 * Provides seamless communication between the React UI and Tauri native Rust backend.
 * Gracefully falls back to browser console log in web/development mode.
 */

// Check if running inside Tauri native runtime
export const isDesktop = () => {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
};

/**
 * Safely invoke a native Tauri command.
 * @param {string} cmd - The Rust command name (e.g., 'print_receipt', 'sync_sales_batch')
 * @param {object} args - Arguments to pass to the Rust backend
 */
export const invokeNative = async (cmd, args = {}) => {
  if (!isDesktop()) {
    console.warn(`[Tauri Bridge Offline] Would invoke native command: "${cmd}" with args:`, args);
    return null;
  }

  try {
    const { invoke } = await import('@tauri-apps/api/core');
    const result = await invoke(cmd, args);
    return result;
  } catch (error) {
    console.error(`[Tauri Bridge Error] Failed executing "${cmd}":`, error);
    throw error;
  }
};

/**
 * Window control helper methods for custom window styling and kiosk mode.
 */
export const windowControls = {
  minimize: async () => {
    if (!isDesktop()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().minimize();
  },
  maximize: async () => {
    if (!isDesktop()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().toggleMaximize();
  },
  close: async () => {
    if (!isDesktop()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().close();
  },
  setFullscreen: async (fullscreen) => {
    if (!isDesktop()) return;
    const { getCurrentWindow } = await import('@tauri-apps/api/window');
    await getCurrentWindow().setFullscreen(fullscreen);
  }
};
