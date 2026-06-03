import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { Platform, AppState } from 'react-native';
import { AppSettings, SettingKey } from '../types/settings';
import { DEFAULT_SETTINGS } from '../constants/defaultSettings';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { setWallpaper, syncWallpaperMeta, syncAllWallpapers, getWallpaperColors, getSystemWallpaper } from '../modules/WallpaperBridge';
import { setGlobalDisableAnimation } from '../services/AnimationService';

export function resolveDimmingColor(settings: AppSettings): string {
  const color = settings.wallpaperDimmingColor || 'black';
  if (color === 'black') return '#000000';
  if (color === 'theme') {
    return settings.themeColor === 'auto'
      ? (settings.currentWallpaperDominantColor || '#3b82f6')
      : settings.themeColor;
  }
  if (color === 'auto') {
    return settings.currentWallpaperDominantColor || '#3b82f6';
  }
  return color;
}

function syncMeta(settings: AppSettings) {
  if (settings.enableBackgroundImage && settings.wallpapers.length > 0) {
    const baseDimming = settings.enableAutoDimming
      ? (settings.currentWallpaperIsDark ? 0.2 : 0.55)
      : settings.wallpaperDimming;
    const resolvedDimming = settings.wallpaperDimmingTarget === 'always' ? baseDimming : 0;
    const resolvedColor = resolveDimmingColor(settings);
    syncWallpaperMeta(
      settings.wallpaperMode,
      settings.currentWallpaperIndex,
      settings.wallpapers.length,
      resolvedDimming,
      resolvedColor
    ).catch(() => {});
    syncAllWallpapers(settings.wallpapers).catch(() => {});
  } else {
    // Background image disabled or no wallpapers: sync 0 dimming to native side
    syncWallpaperMeta(
      settings.wallpaperMode,
      settings.currentWallpaperIndex,
      settings.wallpapers.length,
      0,
      '#000000'
    ).catch(() => {});
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
          setGlobalDisableAnimation(merged.disableAnimation);

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

  const updateColorsForWallpaper = useCallback(async (uris: string[], index: number) => {
    const idx = Math.min(index, uris.length - 1);
    const uri = uris[idx];
    if (uri && Platform.OS === 'android') {
      try {
        const colors = await getWallpaperColors(uri);
        if (colors) {
          return {
            currentWallpaperIsDark: colors.isDark,
            currentWallpaperDominantColor: colors.dominantColor,
          };
        }
      } catch (e) {
        console.warn('[Settings] Failed to extract colors:', e);
      }
    }
    return null;
  }, []);

  // 更新单个设置项
  const updateSetting = useCallback(<K extends SettingKey>(key: K, value: AppSettings[K]) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      
      if (key === 'disableAnimation') {
        setGlobalDisableAnimation(value as boolean);
      }

      if (key === 'currentWallpaperIndex' || key === 'wallpapers') {
        const idx = key === 'currentWallpaperIndex' ? (value as number) : newSettings.currentWallpaperIndex;
        const uris = key === 'wallpapers' ? (value as string[]) : newSettings.wallpapers;
        
        updateColorsForWallpaper(uris, idx).then(colors => {
          if (colors) {
            setSettings(prevColors => {
              const updated = { ...prevColors, ...colors };
              saveSettings(updated);
              syncMeta(updated);
              return updated;
            });
          }
        });
      }

      saveSettings(newSettings);
      if (
        key === 'wallpaperMode' ||
        key === 'currentWallpaperIndex' ||
        key === 'wallpapers' ||
        key === 'wallpaperDimming' ||
        key === 'enableAutoDimming' ||
        key === 'wallpaperDimmingTarget' ||
        key === 'wallpaperDimmingColor' ||
        key === 'enableBackgroundImage'
      ) {
        syncMeta(newSettings);
      }
      return newSettings;
    });
  }, [saveSettings, updateColorsForWallpaper]);

  // 批量更新设置
  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings(prev => {
      const newSettings = { ...prev, ...partial };
      if (partial.disableAnimation !== undefined) {
        setGlobalDisableAnimation(partial.disableAnimation);
      }
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
    setGlobalDisableAnimation(DEFAULT_SETTINGS.disableAnimation);
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

  const updateSystemWallpaperColors = useCallback(async () => {
    try {
      const systemWallpaperUri = await getSystemWallpaper();
      if (systemWallpaperUri && Platform.OS === 'android') {
        const colors = await getWallpaperColors(systemWallpaperUri);
        if (colors) {
          setSettings(prev => {
            if (prev.wallpapers.length > 0) return prev;
            const updated = {
              ...prev,
              currentWallpaperIsDark: colors.isDark,
              currentWallpaperDominantColor: colors.dominantColor,
            };
            saveSettings(updated);
            return updated;
          });
        }
      }
    } catch (e) {
      console.warn('[Settings] Failed to fetch system wallpaper colors:', e);
    }
  }, [saveSettings]);

  // AppState listener to refresh system wallpaper colors when using default system wallpaper
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active' && settings.wallpapers.length === 0) {
        updateSystemWallpaperColors().catch(() => {});
      }
    });
    return () => {
      subscription.remove();
    };
  }, [settings.wallpapers.length, updateSystemWallpaperColors]);

  // Initial fetch on load
  useEffect(() => {
    if (isLoaded && settings.wallpapers.length === 0) {
      updateSystemWallpaperColors().catch(() => {});
    }
  }, [isLoaded, settings.wallpapers.length, updateSystemWallpaperColors]);

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
