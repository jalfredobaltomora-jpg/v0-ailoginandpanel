/**
 * JARVIS Command System
 * Advanced command handling similar to JARVIS from Iron Man
 * Allows JAB to control system functions across all platforms
 */

import {
  getDeviceInfo,
  copyToClipboard,
  readClipboard,
  takeScreenshot,
  getBatteryStatus,
  getLocation,
  openURL,
  launchApp,
  executeCommand,
  readFile,
  writeFile,
  listFiles,
  requestPermissions,
  isCapabilityAvailable,
  detectPlatform,
} from './device-api';

export interface JARVISCommand {
  name: string;
  description: string;
  handler: (...args: any[]) => Promise<any>;
  requiresPermission?: string[];
  platform?: ('web' | 'electron' | 'capacitor')[];
}

// ─── System Information Commands ───
export const systemCommands = {
  // Get comprehensive system status
  status: async (): Promise<string> => {
    const info = await getDeviceInfo();
    const battery = await getBatteryStatus();
    const platform = detectPlatform();

    let status = `🖥️ **SYSTEM STATUS** (${platform})\n\n`;
    status += `**Platform**: ${info.platform}\n`;
    status += `**OS**: ${info.systemInfo?.os || 'Unknown'}\n`;
    status += `**User Agent**: ${info.userAgent.substring(0, 50)}...\n`;
    status += `**Network**: ${info.network?.online ? '✅ Online' : '❌ Offline'} (${info.network?.type})\n`;

    if (battery) {
      status += `**Battery**: ${battery.level}% ${battery.charging ? '🔌 Charging' : '🔋 Discharging'}\n`;
    }

    status += `\n**Available Capabilities**:\n`;
    info.capabilities.forEach(cap => {
      status += `  • ${cap}\n`;
    });

    return status;
  },

  // Get battery info
  battery: async (): Promise<string> => {
    const battery = await getBatteryStatus();
    if (!battery) return 'Battery information not available on this platform.';
    return `🔋 Battery: ${battery.level}% ${battery.charging ? '(Charging 🔌)' : '(Discharging)'}`;
  },

  // Get current location
  location: async (): Promise<string> => {
    const loc = await getLocation();
    if (!loc) return 'Location not available. Permission may be required.';
    return `📍 Location: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`;
  },
};

// ─── File Management Commands ───
export const fileCommands = {
  // List files in a directory
  ls: async (dir: string = '/'): Promise<string> => {
    const files = await listFiles(dir);
    if (files.length === 0) return `No files found in ${dir}`;
    return `📁 Files in ${dir}:\n${files.map(f => `  • ${f}`).join('\n')}`;
  },

  // Read a file
  cat: async (path: string): Promise<string> => {
    const content = await readFile(path);
    if (!content) return `Could not read file: ${path}`;
    return content.substring(0, 2000) + (content.length > 2000 ? '\n... (truncated)' : '');
  },

  // Write to a file
  write: async (path: string, content: string): Promise<string> => {
    const success = await writeFile(path, content);
    return success ? `✅ File written: ${path}` : `❌ Failed to write file: ${path}`;
  },
};

// ─── Clipboard Commands ───
export const clipboardCommands = {
  // Copy to clipboard
  copy: async (text: string): Promise<string> => {
    const success = await copyToClipboard(text);
    return success ? `✅ Copied to clipboard (${text.length} chars)` : '❌ Failed to copy';
  },

  // Read from clipboard
  paste: async (): Promise<string> => {
    const content = await readClipboard();
    if (!content) return 'Clipboard is empty or not accessible';
    return `📋 Clipboard:\n${content.substring(0, 500)}${content.length > 500 ? '\n... (truncated)' : ''}`;
  },
};

// ─── Screen Commands ───
export const screenCommands = {
  // Take screenshot
  screenshot: async (): Promise<string> => {
    const blob = await takeScreenshot();
    if (!blob) return '❌ Screenshot not available on this platform';
    return `📸 Screenshot captured (${(blob.size / 1024).toFixed(2)} KB)`;
  },
};

// ─── Application Launch Commands ───
export const appCommands = {
  // Open URL in browser
  open: async (url: string): Promise<string> => {
    if (!url.startsWith('http')) url = 'https://' + url;
    const success = await openURL(url);
    return success ? `🔗 Opening: ${url}` : `❌ Failed to open: ${url}`;
  },

  // Launch application (desktop/mobile)
  launch: async (appName: string, args?: string[]): Promise<string> => {
    const success = await launchApp(appName, args);
    return success ? `🚀 Launched: ${appName}` : `❌ Failed to launch: ${appName}`;
  },

  // Execute system command (DISABLED for security)
  exec: async (_command: string): Promise<string> => {
    return '❌ Ejecución de comandos del sistema deshabilitada por razones de seguridad.';
  },
};

// ─── Permission Management ───
export const permissionCommands = {
  // Request specific permissions
  requestPermissions: async (perms: string[]): Promise<string> => {
    const granted = await requestPermissions(perms as any);
    let result = '🔐 Permission Status:\n';
    Object.entries(granted).forEach(([perm, isGranted]) => {
      result += `  ${isGranted ? '✅' : '❌'} ${perm}\n`;
    });
    return result;
  },

  // Check if capability is available
  canUse: async (capability: string): Promise<string> => {
    const available = await isCapabilityAvailable(capability as any);
    return available
      ? `✅ ${capability} is available`
      : `❌ ${capability} is not available`;
  },
};

// ─── Command Registry ───
export const commandRegistry: Record<string, JARVISCommand> = {
  // System
  'status': {
    name: 'status',
    description: 'Get comprehensive system status and capabilities',
    handler: systemCommands.status,
  },
  'battery': {
    name: 'battery',
    description: 'Get battery status',
    handler: systemCommands.battery,
    requiresPermission: ['battery'],
  },
  'location': {
    name: 'location',
    description: 'Get current location (GPS)',
    handler: systemCommands.location,
    requiresPermission: ['location'],
  },

  // Files
  'ls': {
    name: 'ls',
    description: 'List files in directory',
    handler: (dir: string) => fileCommands.ls(dir),
    requiresPermission: ['files'],
    platform: ['electron', 'capacitor'],
  },
  'cat': {
    name: 'cat',
    description: 'Read file contents',
    handler: (path: string) => fileCommands.cat(path),
    requiresPermission: ['files'],
    platform: ['electron', 'capacitor'],
  },
  'write': {
    name: 'write',
    description: 'Write to file',
    handler: (path: string, content: string) => fileCommands.write(path, content),
    requiresPermission: ['files'],
    platform: ['electron', 'capacitor'],
  },

  // Clipboard
  'copy': {
    name: 'copy',
    description: 'Copy text to clipboard',
    handler: (text: string) => clipboardCommands.copy(text),
  },
  'paste': {
    name: 'paste',
    description: 'Read clipboard contents',
    handler: clipboardCommands.paste,
  },

  // Screen
  'screenshot': {
    name: 'screenshot',
    description: 'Take a screenshot',
    handler: screenCommands.screenshot,
  },

  // Apps
  'open': {
    name: 'open',
    description: 'Open URL in browser',
    handler: (url: string) => appCommands.open(url),
  },
  'launch': {
    name: 'launch',
    description: 'Launch an application',
    handler: (app: string) => appCommands.launch(app),
    platform: ['electron', 'capacitor'],
  },
  'exec': {
    name: 'exec',
    description: 'Execute system command',
    handler: (cmd: string) => appCommands.exec(cmd),
    platform: ['electron'],
  },

  // Permissions
  'permissions': {
    name: 'permissions',
    description: 'Request specific permissions',
    handler: (perms: string[]) => permissionCommands.requestPermissions(perms),
  },
  'canuse': {
    name: 'canuse',
    description: 'Check if capability is available',
    handler: (cap: string) => permissionCommands.canUse(cap),
  },
};

// ─── Command Parser & Executor ───
export const parseCommand = (text: string): { command: string; args: string[] } | null => {
  const trimmed = text.toLowerCase().trim();
  
  // Match patterns like "jarvis status", "jab exec npm start", etc.
  const match = trimmed.match(/^(?:jarvis|jab)\s+(\w+)(?:\s+(.+))?$/i);
  if (!match) return null;

  const [, command, argsStr] = match;
  const args = argsStr ? argsStr.match(/(?:[^\s"]+|"[^"]*")+/g)?.map(s => s.replace(/^"|"$/g, '')) || [] : [];

  return { command, args };
};

export const executeJARVISCommand = async (text: string): Promise<string | null> => {
  const parsed = parseCommand(text);
  if (!parsed) return null;

  const { command, args } = parsed;
  const cmd = commandRegistry[command.toLowerCase()];

  if (!cmd) {
    return `❌ Unknown command: ${command}\n\n📖 Available commands:\n${
      Object.keys(commandRegistry)
        .map(k => `  • ${k}: ${commandRegistry[k].description}`)
        .join('\n')
    }`;
  }

  try {
    // Check platform compatibility
    if (cmd.platform && !cmd.platform.includes(detectPlatform() as 'web' | 'electron' | 'capacitor')) {
      return `❌ Command "${command}" not available on this platform`;
    }

    // Check permissions if needed
    if (cmd.requiresPermission) {
      const available = await Promise.all(
        cmd.requiresPermission.map(p => isCapabilityAvailable(p as any))
      );
      if (!available.some(Boolean)) {
        return `⚠️ Required permissions not available for "${command}"`;
      }
    }

    // Execute command
    const result = await cmd.handler(...args);
    return result;
  } catch (error) {
    return `❌ Command execution error: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
};
