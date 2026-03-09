/**
 * Desktop Tools — Desktop Automation via Sidecar RPC
 *
 * 8 tools for controlling desktop applications via the Go sidecar.
 * Each tool accepts a `target` parameter to route to a specific sidecar.
 * Uses the same routeToSidecar() pattern as run_command and read_file.
 */

import type { ToolDefinition, ToolResult } from './registry.ts';
import { routeToSidecar } from './sidecar-route.ts';

// --- Tool definitions ---

export const desktopListWindowsTool: ToolDefinition = {
  name: 'desktop_list_windows',
  description: 'List all visible windows on the desktop. Returns window titles, PIDs, class names, and positions. Use the PID with other desktop tools to target a specific window.',
  category: 'desktop',
  parameters: {
    target: {
      type: 'string',
      description: 'Sidecar name or ID to route this command to',
      required: false,
    },
  },
  execute: async (params) => {
    const target = params.target as string | undefined;
    if (target) {
      return routeToSidecar(target, 'list_windows', params, 'desktop');
    }
    // TODO: Local execution — implement per-platform AppController
    return 'Error: Desktop tools require a target sidecar. Specify a target parameter.';
  },
};

export const desktopSnapshotTool: ToolDefinition = {
  name: 'desktop_snapshot',
  description: 'Get the UI element tree of a window (like browser_snapshot but for desktop apps). Each element has an [id] you can use with desktop_click and desktop_type. If no pid is given, snapshots the active (focused) window.',
  category: 'desktop',
  parameters: {
    target: {
      type: 'string',
      description: 'Sidecar name or ID to route this command to',
      required: false,
    },
    pid: {
      type: 'number',
      description: 'Process ID of the window (from desktop_list_windows). Omit for the active window.',
      required: false,
    },
  },
  execute: async (params) => {
    const target = params.target as string | undefined;
    if (target) {
      return routeToSidecar(target, 'get_window_tree', params, 'desktop');
    }
    return 'Error: Desktop tools require a target sidecar. Specify a target parameter.';
  },
};

export const desktopClickTool: ToolDefinition = {
  name: 'desktop_click',
  description: 'Click a UI element by its [id] from the last desktop_snapshot. After clicking, use desktop_snapshot to see the updated state.',
  category: 'desktop',
  parameters: {
    target: {
      type: 'string',
      description: 'Sidecar name or ID to route this command to',
      required: false,
    },
    element_id: {
      type: 'number',
      description: 'The [id] of the element to click (from desktop_snapshot)',
      required: true,
    },
  },
  execute: async (params) => {
    const target = params.target as string | undefined;
    if (target) {
      return routeToSidecar(target, 'click_element', params, 'desktop');
    }
    return 'Error: Desktop tools require a target sidecar. Specify a target parameter.';
  },
};

export const desktopTypeTool: ToolDefinition = {
  name: 'desktop_type',
  description: 'Type text into a UI element. Optionally provide an element_id to click and focus it first. Without element_id, types into whatever is currently focused.',
  category: 'desktop',
  parameters: {
    target: {
      type: 'string',
      description: 'Sidecar name or ID to route this command to',
      required: false,
    },
    text: {
      type: 'string',
      description: 'The text to type',
      required: true,
    },
    element_id: {
      type: 'number',
      description: 'Optional [id] of element to click before typing (from desktop_snapshot)',
      required: false,
    },
  },
  execute: async (params) => {
    const target = params.target as string | undefined;
    if (target) {
      return routeToSidecar(target, 'type_text', params, 'desktop');
    }
    return 'Error: Desktop tools require a target sidecar. Specify a target parameter.';
  },
};

export const desktopPressKeysTool: ToolDefinition = {
  name: 'desktop_press_keys',
  description: 'Press a keyboard shortcut or key combination. Keys are pressed simultaneously (e.g., "ctrl,s" for save, "alt,f4" to close). Single keys also work: "enter", "tab", "escape".',
  category: 'desktop',
  parameters: {
    target: {
      type: 'string',
      description: 'Sidecar name or ID to route this command to',
      required: false,
    },
    keys: {
      type: 'string',
      description: 'Comma-separated key names (e.g., "ctrl,s" or "alt,f4" or "enter"). Modifiers: ctrl, alt, shift, win.',
      required: true,
    },
  },
  execute: async (params) => {
    const target = params.target as string | undefined;
    if (target) {
      return routeToSidecar(target, 'press_keys', params, 'desktop');
    }
    return 'Error: Desktop tools require a target sidecar. Specify a target parameter.';
  },
};

export const desktopLaunchAppTool: ToolDefinition = {
  name: 'desktop_launch_app',
  description: 'Launch an application by executable path or name (e.g., "notepad.exe", "calc.exe"). Returns the PID of the launched process.',
  category: 'desktop',
  parameters: {
    target: {
      type: 'string',
      description: 'Sidecar name or ID to route this command to',
      required: false,
    },
    executable: {
      type: 'string',
      description: 'Application executable path or name',
      required: true,
    },
    args: {
      type: 'string',
      description: 'Optional command-line arguments',
      required: false,
    },
  },
  execute: async (params) => {
    const target = params.target as string | undefined;
    if (target) {
      return routeToSidecar(target, 'launch_app', params, 'desktop');
    }
    return 'Error: Desktop tools require a target sidecar. Specify a target parameter.';
  },
};

export const desktopScreenshotTool: ToolDefinition = {
  name: 'desktop_screenshot',
  description: 'Take a screenshot of the entire desktop or a specific window. The image is sent directly to the AI for visual analysis. Useful for complex UIs, graphics apps, or when the element tree is insufficient.',
  category: 'desktop',
  parameters: {
    target: {
      type: 'string',
      description: 'Sidecar name or ID to route this command to',
      required: false,
    },
    pid: {
      type: 'number',
      description: 'Process ID of window to capture. Omit for full desktop screenshot.',
      required: false,
    },
  },
  execute: async (params) => {
    const target = params.target as string | undefined;
    if (target) {
      return routeToSidecar(target, 'capture_screen', params, 'screenshot');
    }
    return 'Error: Desktop tools require a target sidecar. Specify a target parameter.';
  },
};

export const desktopFocusWindowTool: ToolDefinition = {
  name: 'desktop_focus_window',
  description: 'Bring a window to the foreground by its PID (from desktop_list_windows). Use this before interacting with a background window.',
  category: 'desktop',
  parameters: {
    target: {
      type: 'string',
      description: 'Sidecar name or ID to route this command to',
      required: false,
    },
    pid: {
      type: 'number',
      description: 'Process ID of the window to focus',
      required: true,
    },
  },
  execute: async (params) => {
    const target = params.target as string | undefined;
    if (target) {
      return routeToSidecar(target, 'focus_window', params, 'desktop');
    }
    return 'Error: Desktop tools require a target sidecar. Specify a target parameter.';
  },
};

/**
 * All desktop tools in a single array.
 */
export const DESKTOP_TOOLS: ToolDefinition[] = [
  desktopListWindowsTool,
  desktopSnapshotTool,
  desktopClickTool,
  desktopTypeTool,
  desktopPressKeysTool,
  desktopLaunchAppTool,
  desktopScreenshotTool,
  desktopFocusWindowTool,
];
