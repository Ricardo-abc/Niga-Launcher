import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';
import { AppSettings, SettingKey } from '../types/settings';
import { DEFAULT_SETTINGS } from '../constants/defaultSettings';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { setWallpaper, syncWallpaperMeta, syncAllWallpapers } from '../modules/WallpaperBridge';

function syncMeta(settings: AppSettings) {
  if (settings.enableBackgroundImage && settings.wallpapers.length > 0) {
    syncWallpaperMeta(
      settings.wallpaperMode,
      settings.currentWallpaperIndex,
      settings.wallpapers.length
    ).catch(() => {});
    syncAllWallpapers(settings.wallpapers).catch(() => {});
  }
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 从 AsyncStorage 加载设置
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEYS.APP_SETTINGS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed.backgroundImage && !parsed.wallpapers) {
            parsed.wallpapers = [parsed.backgroundImage];
            parsed.currentWallpaperIndex = 0;
            parsed.wallpaperMode = 'fixed';
            delete parsed.backgroundImage;
          }
          const merged = { ...DEFAULT_SETTINGS, ...parsed };

          // Migration: convert base64 wallpapers to local files
          let hasMigration = false;
          const migratedWallpapers = await Promise.all(
            (merged.wallpapers || []).map(async (uri: string, index: number) => {
              if (uri && (uri.startsWith('data:image') || uri.includes('base64'))) {
                try {
                  const dir = `${FileSystem.documentDirectory}wallpapers/`;
                  await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
                  const filename = `migrated_wallpaper_${Date.now()}_${index}.jpg`;
                  const destUri = `${dir}${filename}`;
                  
                  const base64Data = uri.split(',')[1] || uri;
                  await FileSystem.writeAsStringAsync(destUri, base64Data, {
                    encoding: FileSystem.EncodingType.Base64,
                  });
                  hasMigration = true;
                  return destUri;
                } catch (e) {
                  console.error('[Settings] Migration failed for uri at index ' + index, e);
                  return uri;
                }
              }
              return uri;
            })
          );

          if (hasMigration) {
            merged.wallpapers = migratedWallpapers;
            await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(merged));
          }

          if (merged.enableBackgroundImage && merged.wallpapers.length > 0) {
            if (merged.wallpaperMode === 'shuffle') {
              merged.currentWallpaperIndex = Math.floor(Math.random() * merged.wallpapers.length);
            } else if (merged.wallpaperMode === 'sequential') {
              merged.currentWallpaperIndex = (merged.currentWallpaperIndex + 1) % merged.wallpapers.length;
            }
          }

          setSettings(merged);

          if (merged.enableBackgroundImage && merged.wallpapers.length > 0) {
            const idx = Math.min(merged.currentWallpaperIndex, merged.wallpapers.length - 1);
            const uri = merged.wallpapers[idx];
            if (uri) {
              setWallpaper(uri).catch(() => {});
            }
            syncMeta(merged);
          }
        }
      } catch (e) {
        console.warn('[Settings] Load failed:', e);
      } finally {
        setIsLoaded(true);
      }
    };
    loadSettings();
  }, []);

  // 定时切换壁纸
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (
      settings.enableBackgroundImage &&
      settings.wallpapers.length > 1 &&
      settings.wallpaperMode === 'timer'
    ) {
      const intervalMs = (settings.wallpaperTimerInterval || 60) * 60 * 1000;
      timerRef.current = setInterval(() => {
        setSettings(prev => {
          if (prev.wallpaperMode !== 'timer' || prev.wallpapers.length <= 1) return prev;
          const nextIndex = (prev.currentWallpaperIndex + 1) % prev.wallpapers.length;
          const newSettings = { ...prev, currentWallpaperIndex: nextIndex };
          const uri = prev.wallpapers[nextIndex];
          if (uri) setWallpaper(uri).catch(() => {});
          syncMeta(newSettings);
          AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(newSettings)).catch(() => {});
          return newSettings;
        });
      }, intervalMs);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [settings.enableBackgroundImage, settings.wallpaperMode, settings.wallpaperTimerInterval, settings.wallpapers.length]);

  // 延迟保存到 AsyncStorage（防抖）
  const saveSettings = useCallback((newSettings: AppSettings) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        await AsyncStorage.setItem(STORAGE_KEYS.APP_SETTINGS, JSON.stringify(newSettings));
      } catch (e) {
        console.warn('[Settings] Save failed:', e);
      }
    }, 300);
  }, []);

  // 更新单个设置项
  const updateSetting = useCallback(<K extends SettingKey>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      saveSettings(newSettings);
      if (key === 'wallpaperMode' || key === 'currentWallpaperIndex' || key === 'wallpapers') {
        syncMeta(newSettings);
      }
      return newSettings;
    });
  }, [saveSettings]);

  // 批量更新设置
  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...partial };
      saveSettings(newSettings);
      syncMeta(newSettings);
      return newSettings;
    });
  }, [saveSettings]);

  // 重置所有设置
  const resetSettings = useCallback(() => {
    const dir = `${FileSystem.documentDirectory}wallpapers/`;
    FileSystem.deleteAsync(dir, { idempotent: true }).catch(() => {});
    setSettings(DEFAULT_SETTINGS);
    saveSettings(DEFAULT_SETTINGS);
  }, [saveSettings]);

  // 开发者模式点击计数（5次触发）
  const handleDevModeClick = useCallback(() => {
    const newCount = settings.devClickCount + 1;
    updateSetting('devClickCount', newCount);
    
    if (newCount >= 5 && !settings.devMode) {
      updateSetting('devMode', true);
      return { enabled: true, remaining: 0 };
    }
    
    return { enabled: settings.devMode, remaining: Math.max(0, 5 - newCount) };
  }, [settings.devClickCount, settings.devMode, updateSetting]);

  // 切换开发者模式
  const toggleDevMode = useCallback(() => {
    updateSetting('devMode', !settings.devMode);
  }, [settings.devMode, updateSetting]);

  return {
    settings,
    isLoaded,
    updateSetting,
    updateSettings,
    resetSettings,
    handleDevModeClick,
    toggleDevMode,
  };
}
