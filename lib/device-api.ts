/**
 * Device/System Integration API
 * Provides JARVIS-like access to system functions across Web, Desktop (Electron), and Mobile (Capacitor)
 */

type DeviceCapability = 
  | 'microphone'
  | 'camera'
  | 'files'
  | 'clipboard'
  | 'screen'
  | 'notification'
  | 'system-info'
  | 'battery'
  | 'network'
  | 'location'
  | 'screenshot';

interface DeviceInfo {
  platform: 'web' | 'electron' | 'capacitor' | 'unknown';
  userAgent: string;
  capabilities: DeviceCapability[];
  systemInfo?: {
    os: string;
    arch?: string;
    cpuCount?: number;
    totalMemory?: number;
    freeMemory?: number;
    battery?: number;
    batteryCharging?: boolean;
  };
  network?: {
    online: boolean;
    type?: string;
  };
}

// ─── Platform Detection ───
export const detectPlatform = (): 'web' | 'electron' | 'capacitor' | 'unknown' => {
  if (typeof window === 'undefined') return 'unknown';
  
  // Check for Capacitor (mobile app)
  if ((window as any).Capacitor) return 'capacitor';
  
  // Check for Electron (desktop app)
  if ((window as any).electronAPI || (process as any).type === 'renderer') return 'electron';
  
  // Default to web
  return 'web';
};

// ─── Device Information ───
export const getDeviceInfo = async (): Promise<DeviceInfo> => {
  const platform = detectPlatform();
  const capabilities: DeviceCapability[] = [];

  // Detect capabilities based on platform
  if (navigator.mediaDevices) capabilities.push('microphone');
  if (navigator.permissions) capabilities.push('camera');
  if (navigator.clipboard) capabilities.push('clipboard');
  if ((window as any).Capacitor) {
    capabilities.push('files', 'notification', 'system-info', 'battery', 'network', 'location');
  }
  if ((window as any).electronAPI) {
    capabilities.push('files' as DeviceCapability, 'notification' as DeviceCapability, 'system-info' as DeviceCapability, 'screenshot' as DeviceCapability);
  }

  const deviceInfo: DeviceInfo = {
    platform,
    userAgent: navigator.userAgent,
    capabilities,
  };

  // Get system info if available
  try {
    if (platform === 'capacitor') {
      const { Device } = await import('@capacitor/device');
      const info = await Device.getInfo();
      deviceInfo.systemInfo = {
        os: info.platform || 'mobile',
        arch: info.operatingSystem,
      };
    } else if (platform === 'electron') {
      // Would query Electron's main process
      const api = (window as any).electronAPI;
      if (api?.getSystemInfo) {
        deviceInfo.systemInfo = await api.getSystemInfo();
      }
    }
  } catch (error) {
    console.warn('Could not get system info:', error);
  }

  // Get network info
  try {
    const connection: any = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    deviceInfo.network = {
      online: navigator.onLine,
      type: connection?.effectiveType || connection?.type || 'unknown',
    };
  } catch {}

  return deviceInfo;
};

// ─── File System Access (Capacitor/Electron) ───
export const readFile = async (path: string): Promise<string | null> => {
  const platform = detectPlatform();

  try {
    if (platform === 'capacitor') {
      const { Filesystem } = await import('@capacitor/filesystem');
      const result = await Filesystem.readFile({ path, directory: (Filesystem as any).Directory.Documents });
      return typeof result.data === 'string' ? result.data : new TextDecoder().decode(new Uint8Array(result.data as any as ArrayBuffer));
    } else if (platform === 'electron') {
      const api = (window as any).electronAPI;
      if (api?.readFile) return await api.readFile(path);
    }
  } catch (error) {
    console.error('File read error:', error);
  }

  return null;
};

export const writeFile = async (path: string, content: string): Promise<boolean> => {
  const platform = detectPlatform();

  try {
    if (platform === 'capacitor') {
      const { Filesystem } = await import('@capacitor/filesystem');
      await Filesystem.writeFile({
        path,
        data: content,
        directory: (Filesystem as any).Directory.Documents,
      });
      return true;
    } else if (platform === 'electron') {
      const api = (window as any).electronAPI;
      if (api?.writeFile) return await api.writeFile(path, content);
    }
  } catch (error) {
    console.error('File write error:', error);
  }

  return false;
};

export const listFiles = async (dir: string = '/'): Promise<string[]> => {
  const platform = detectPlatform();

  try {
    if (platform === 'capacitor') {
      const { Filesystem } = await import('@capacitor/filesystem');
      const result = await Filesystem.readdir({
        path: dir,
        directory: (Filesystem as any).Directory.Documents,
      });
      return result.files.map(f => f.name);
    } else if (platform === 'electron') {
      const api = (window as any).electronAPI;
      if (api?.listFiles) return await api.listFiles(dir);
    }
  } catch (error) {
    console.error('Directory read error:', error);
  }

  return [];
};

// ─── Clipboard Access ───
export const copyToClipboard = async (text: string): Promise<boolean> => {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else if ((window as any).electronAPI?.copyToClipboard) {
      return await (window as any).electronAPI.copyToClipboard(text);
    }
  } catch (error) {
    console.error('Clipboard copy error:', error);
  }
  return false;
};

export const readClipboard = async (): Promise<string | null> => {
  try {
    if (navigator.clipboard?.readText) {
      return await navigator.clipboard.readText();
    } else if ((window as any).electronAPI?.readClipboard) {
      return await (window as any).electronAPI.readClipboard();
    }
  } catch (error) {
    console.error('Clipboard read error:', error);
  }
  return null;
};

// ─── Notifications ───
export const sendNotification = async (title: string, options?: NotificationOptions): Promise<boolean> => {
  const platform = detectPlatform();

  try {
    if (platform === 'capacitor') {
      const { LocalNotifications } = await import('@capacitor/local-notifications');
      await LocalNotifications.schedule({
        notifications: [{
          id: Date.now(),
          title,
          body: options?.body || '',
          smallIcon: 'res://drawable/ic_notification',
        }],
      });
      return true;
    } else if (platform === 'electron' && (window as any).electronAPI?.notify) {
      (window as any).electronAPI.notify(title, options);
      return true;
    } else if (Notification.permission === 'granted') {
      new Notification(title, options);
      return true;
    }
  } catch (error) {
    console.error('Notification error:', error);
  }

  return false;
};

// ─── Screenshot Capture ───
export const takeScreenshot = async (): Promise<Blob | null> => {
  const platform = detectPlatform();

  try {
    if (platform === 'capacitor') {
      // @ts-expect-error - optional Capacitor plugin
      const { ScreenCapture } = await import('@capacitor-community/screen-capture');
      const result = await ScreenCapture.takeScreenshot();
      return new Blob([result.base64], { type: 'image/png' });
    } else if (platform === 'electron' && (window as any).electronAPI?.screenshot) {
      const buffer = await (window as any).electronAPI.screenshot();
      return new Blob([buffer], { type: 'image/png' });
    } else if (typeof (window as any).html2canvas !== 'undefined') {
      // Fallback to html2canvas for web
      const canvas = await (window as any).html2canvas(document.body);
      return new Promise((resolve) => {
        (canvas as HTMLCanvasElement).toBlob(resolve as (blob: Blob | null) => void, 'image/png');
      });
    }
  } catch (error) {
    console.error('Screenshot error:', error);
  }

  return null;
};

// ─── Battery Status ───
export const getBatteryStatus = async (): Promise<{ level: number; charging: boolean } | null> => {
  const platform = detectPlatform();

  try {
    if (platform === 'capacitor') {
      // @ts-expect-error - optional Capacitor plugin
      const { Battery } = await import('@capacitor/battery');
      const status = await Battery.getBatteryInfo();
      return {
        level: status.level || 0,
        charging: status.isCharging || false,
      };
    } else if ((navigator as any).getBattery) {
      const battery = await (navigator as any).getBattery();
      return {
        level: Math.round(battery.level * 100),
        charging: battery.charging,
      };
    }
  } catch (error) {
    console.error('Battery status error:', error);
  }

  return null;
};

// ─── Location Access ───
export const getLocation = async (): Promise<{ latitude: number; longitude: number } | null> => {
  const platform = detectPlatform();

  try {
    if (platform === 'capacitor') {
      const { Geolocation } = await import('@capacitor/geolocation');
      const coordinates = await Geolocation.getCurrentPosition();
      return {
        latitude: coordinates.coords.latitude,
        longitude: coordinates.coords.longitude,
      };
    } else if (navigator.geolocation) {
      return new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          }),
          reject
        );
      });
    }
  } catch (error) {
    console.error('Location error:', error);
  }

  return null;
};

// ─── Open External URL/App ───
export const openURL = async (url: string): Promise<boolean> => {
  const platform = detectPlatform();

  try {
    if (platform === 'capacitor') {
      const { Browser } = await import('@capacitor/browser');
      await Browser.open({ url });
      return true;
    } else if (platform === 'electron' && (window as any).electronAPI?.openURL) {
      return await (window as any).electronAPI.openURL(url);
    } else {
      window.open(url, '_blank');
      return true;
    }
  } catch (error) {
    console.error('Open URL error:', error);
  }

  return false;
};

// ─── Launch App/Command ───
export const launchApp = async (appName: string, args?: string[]): Promise<boolean> => {
  const platform = detectPlatform();

  try {
    if (platform === 'electron' && (window as any).electronAPI?.launchApp) {
      return await (window as any).electronAPI.launchApp(appName, args);
    } else if (platform === 'capacitor') {
      // For Android, you'd use @capacitor-community/app-launcher
      // @ts-expect-error - optional Capacitor plugin
      const { AppLauncher } = await import('@capacitor-community/app-launcher');
      await AppLauncher.canOpenUrl({ url: appName });
      return true;
    }
  } catch (error) {
    console.error('Launch app error:', error);
  }

  return false;
};

// ─── System Command Execution (Electron only - requires IPC) ───
export const executeCommand = async (command: string): Promise<{ stdout: string; stderr: string; exitCode: number } | null> => {
  if (detectPlatform() !== 'electron') {
    console.warn('executeCommand only available on Electron platform');
    return null;
  }

  try {
    const api = (window as any).electronAPI;
    if (api?.executeCommand) {
      return await api.executeCommand(command);
    }
  } catch (error) {
    console.error('Command execution error:', error);
  }

  return null;
};

// ─── Request Storage Permissions ───
export const requestPermissions = async (permissions: DeviceCapability[]): Promise<Record<string, boolean>> => {
  const platform = detectPlatform();
  const granted: Record<string, boolean> = {};

  try {
    if (platform === 'capacitor') {
      // @ts-expect-error - optional Capacitor plugin
      const { Permissions } = await import('@capacitor/permissions');
      
      for (const perm of permissions) {
        let capacitorPerm = '';
        switch (perm) {
          case 'microphone': capacitorPerm = 'microphone'; break;
          case 'camera': capacitorPerm = 'camera'; break;
          case 'files': capacitorPerm = 'storage'; break;
          case 'location': capacitorPerm = 'geolocation'; break;
          default: continue;
        }

        const result = await Permissions.query({ name: capacitorPerm as any });
        granted[perm] = result.state === 'granted' || result.state === 'prompt-ok';

        if (result.state === 'prompt') {
          const reqResult = await Permissions.requestPermissions({ permissions: [capacitorPerm as any] });
          granted[perm] = reqResult.permissions[0]?.state === 'granted';
        }
      }
    } else if (platform === 'electron') {
      const api = (window as any).electronAPI;
      if (api?.requestPermissions) {
        return await api.requestPermissions(permissions);
      }
    } else {
      // Web platform - manual permission requests
      if (permissions.includes('microphone')) {
        try {
          await navigator.mediaDevices.getUserMedia({ audio: true });
          granted.microphone = true;
        } catch {
          granted.microphone = false;
        }
      }
      if (permissions.includes('camera')) {
        try {
          await navigator.mediaDevices.getUserMedia({ video: true });
          granted.camera = true;
        } catch {
          granted.camera = false;
        }
      }
    }
  } catch (error) {
    console.error('Permission request error:', error);
  }

  return granted;
};

// ─── Check Feature Availability ───
export const isCapabilityAvailable = async (capability: DeviceCapability): Promise<boolean> => {
  const info = await getDeviceInfo();
  return info.capabilities.includes(capability);
};
