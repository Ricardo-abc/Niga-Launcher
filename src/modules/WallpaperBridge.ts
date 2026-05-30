import { NativeModules, Platform } from 'react-native';

interface WallpaperBridgeType {
  setWallpaper(uriOrBase64: string): Promise<boolean>;
  syncAllWallpapers(uris: string[]): Promise<boolean>;
  syncWallpaperMeta(mode: string, index: number, count: number, dimming: number, dimmingColor: string): Promise<boolean>;
  getSystemWallpaper(): Promise<string | null>;
  isLiveWallpaperActive(): Promise<boolean>;
  openLiveWallpaperSettings(): Promise<boolean>;
  getWallpaperColors(filePath: string): Promise<{ isDark: boolean; averageLuminance: number; dominantColor: string; averageColor: string } | null>;
}

const { WallpaperBridge } = NativeModules as { WallpaperBridge: WallpaperBridgeType | undefined };

export async function setWallpaper(uriOrBase64: string): Promise<boolean> {
  if (Platform.OS !== 'android' || !WallpaperBridge) return false;
  return WallpaperBridge.setWallpaper(uriOrBase64);
}

export async function syncAllWallpapers(uris: string[]): Promise<boolean> {
  if (Platform.OS !== 'android' || !WallpaperBridge) return false;
  return WallpaperBridge.syncAllWallpapers(uris);
}

export async function syncWallpaperMeta(mode: string, index: number, count: number, dimming: number, dimmingColor: string): Promise<boolean> {
  if (Platform.OS !== 'android' || !WallpaperBridge) return false;
  return WallpaperBridge.syncWallpaperMeta(mode, index, count, dimming, dimmingColor);
}

export async function getSystemWallpaper(): Promise<string | null> {
  if (Platform.OS !== 'android' || !WallpaperBridge) return null;
  return WallpaperBridge.getSystemWallpaper();
}

export async function isLiveWallpaperActive(): Promise<boolean> {
  if (Platform.OS !== 'android' || !WallpaperBridge) return false;
  try {
    return await WallpaperBridge.isLiveWallpaperActive();
  } catch {
    return false;
  }
}

export async function openLiveWallpaperSettings(): Promise<boolean> {
  if (Platform.OS !== 'android' || !WallpaperBridge) return false;
  try {
    return await WallpaperBridge.openLiveWallpaperSettings();
  } catch {
    return false;
  }
}

export async function getWallpaperColors(filePath: string): Promise<{ isDark: boolean; averageLuminance: number; dominantColor: string; averageColor: string } | null> {
  if (Platform.OS !== 'android' || !WallpaperBridge) return null;
  try {
    return await WallpaperBridge.getWallpaperColors(filePath);
  } catch {
    return null;
  }
}
