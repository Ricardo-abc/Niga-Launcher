import { NativeModules, Platform } from 'react-native';

interface WallpaperBridgeType {
  setWallpaper(uriOrBase64: string): Promise<boolean>;
  syncAllWallpapers(uris: string[]): Promise<boolean>;
  syncWallpaperMeta(mode: string, index: number, count: number): Promise<boolean>;
  getSystemWallpaper(): Promise<string | null>;
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

export async function syncWallpaperMeta(mode: string, index: number, count: number): Promise<boolean> {
  if (Platform.OS !== 'android' || !WallpaperBridge) return false;
  return WallpaperBridge.syncWallpaperMeta(mode, index, count);
}

export async function getSystemWallpaper(): Promise<string | null> {
  if (Platform.OS !== 'android' || !WallpaperBridge) return null;
  return WallpaperBridge.getSystemWallpaper();
}
