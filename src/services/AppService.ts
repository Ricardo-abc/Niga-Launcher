import { InstalledApps, RNLauncherKitHelper } from 'react-native-launcher-kit';
import { pinyin } from 'pinyin-pro';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALPHABET } from '../constants/defaultSettings';
import { STORAGE_KEYS } from '../constants/storageKeys';
import { AppInfo, AppCustomization, AppCustomizations, FlatItem, FlatListResult } from '../types/settings';
export { FlatItem };
import * as FileSystem from 'expo-file-system/legacy';

const ICON_DIR = `${FileSystem.documentDirectory}app_icons/`;

/**
 * 根据名称计算首字母（支持中文拼音转换）
 */
const calculateLetter = (name: string): string => {
  if (!name) return '#';
  const char = name.charAt(0);
  if (/[a-zA-Z]/.test(char)) {
    return char.toUpperCase();
  } else if (/[\u4e00-\u9fa5]/.test(char)) {
    try {
      const pinyinStr = pinyin(char, { pattern: 'first', toneType: 'none' });
      const letter = pinyinStr.charAt(0).toUpperCase();
      return ALPHABET.includes(letter) ? letter : '#';
    } catch {
      return '#';
    }
  }
  return '#';
};

/**
 * 格式化单个 app 数据
 */
const formatApp = (app: any): AppInfo => {
  const label = app.label || '';
  const iconUri = app.icon || '';

  return {
    id: app.packageName,
    name: label,
    packageName: app.packageName,
    letter: calculateLetter(label),
    icon: iconUri,
  };
};

/**
 * 从 AsyncStorage 读取缓存的应用列表
 */
export const loadCachedApps = async (): Promise<AppInfo[]> => {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.APP_LIST_CACHE);
    if (cached) {
      const apps = JSON.parse(cached);
      if (Array.isArray(apps) && apps.length > 0) {
        console.log(`[Cache] Loaded ${apps.length} apps from cache`);
        return apps;
      }
    }
  } catch (e) {
    console.warn('[Cache] Load failed:', e);
  }
  return [];
};

/**
 * 保存应用列表到缓存
 */
const saveCache = async (apps: AppInfo[]) => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.APP_LIST_CACHE, JSON.stringify(apps));
    console.log(`[Cache] Saved ${apps.length} apps`);
  } catch (e) {
    console.warn('[Cache] Save failed:', e);
  }
};

export const cacheAppIcons = async (apps: AppInfo[]): Promise<AppInfo[]> => {
  try {
    await FileSystem.makeDirectoryAsync(ICON_DIR, { intermediates: true });
    
    const updatedApps = await Promise.all(
      apps.map(async (app) => {
        if (app.icon && (app.icon.startsWith('data:image') || app.icon.length > 500)) {
          try {
            const filename = `${app.packageName}.png`;
            const destUri = `${ICON_DIR}${filename}`;
            
            // Extract pure base64 data
            const base64Data = app.icon.includes(',') 
              ? app.icon.substring(app.icon.indexOf(',') + 1) 
              : app.icon;
            
            await FileSystem.writeAsStringAsync(destUri, base64Data, {
              encoding: FileSystem.EncodingType.Base64,
            });
            
            return {
              ...app,
              icon: destUri,
            };
          } catch (err) {
            console.warn(`[AppService] Failed to cache icon for ${app.packageName}:`, err);
            return app;
          }
        }
        return app;
      })
    );

    // Asynchronously clean up old icons that are no longer installed
    cleanUnusedIcons(updatedApps).catch(() => {});

    return updatedApps;
  } catch (e) {
    console.error('[AppService] cacheAppIcons error:', e);
    return apps;
  }
};

const cleanUnusedIcons = async (activeApps: AppInfo[]) => {
  try {
    const dirInfo = await FileSystem.readDirectoryAsync(ICON_DIR);
    const activePackages = new Set(activeApps.map(a => `${a.packageName}.png`));
    for (const filename of dirInfo) {
      if (!activePackages.has(filename)) {
        await FileSystem.deleteAsync(`${ICON_DIR}${filename}`, { idempotent: true });
      }
    }
  } catch (e) {
    console.warn('[AppService] cleanUnusedIcons error:', e);
  }
};

/**
 * 从原生 API 读取完整应用列表
 */
export const loadInstalledApps = async (): Promise<AppInfo[]> => {
  try {
    console.log('[Native] Requesting apps...');

    let installedApps = await InstalledApps.getApps();

    if (!installedApps || installedApps.length === 0) {
      console.warn('[Native] First attempt returned 0, retrying...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      installedApps = await InstalledApps.getApps();
    }

    if (!installedApps || !Array.isArray(installedApps)) {
      console.warn('[Native] Returned non-array:', typeof installedApps);
      return [];
    }

    console.log(`[Native] Got ${installedApps.length} apps`);

    if (installedApps.length > 0) {
      const s = installedApps[0];
      console.log('[Native] Sample:', s.label, '| icon:', s.icon?.substring(0, 80));
    }

    const formattedApps = installedApps.map(formatApp);
    formattedApps.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

    // Cache the base64 icons to local files to dramatically reduce AsyncStorage size
    const cachedApps = await cacheAppIcons(formattedApps);

    saveCache(cachedApps);

    return cachedApps;
  } catch (error) {
    console.error('[Native] Error:', error);
    return [];
  }
};

/**
 * 对比两个应用列表
 */
export const hasAppListChanged = (oldApps: AppInfo[], newApps: AppInfo[]): boolean => {
  if (oldApps.length !== newApps.length) return true;
  const oldIds = new Set(oldApps.map(a => a.packageName));
  for (const app of newApps) {
    if (!oldIds.has(app.packageName)) return true;
  }
  return false;
};

/**
 * 构建分组数据（用于连续列表）
 * @param apps 应用列表
 * @param favoritesHeight 收藏区域高度偏移
 * @param headerHeight 字母分组标题高度
 * @param customizations 自定义名称/图标配置
 */
export const buildFlatList = (apps: AppInfo[], favoritesHeight: number = 0, headerHeight: number = 44, customizations: AppCustomizations = {}): FlatListResult => {
  const ITEM_HEIGHT = 64;
  const items: FlatItem[] = [];
  const letterIndices: Record<string, number> = {};
  const offsets: number[] = [];
  let currentOffset = favoritesHeight;

  // 应用自定义名称，重新计算 letter (拼音解析剪枝优化：如果无更名则直接复用已保存的 letter，避免高开销)
  const displayApps = apps.map(app => {
    const custom = customizations[app.packageName];
    if (custom?.customName) {
      return {
        ...app,
        name: custom.customName,
        letter: calculateLetter(custom.customName),
      };
    }
    return app;
  });

  // 按自定义名称排序
  displayApps.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  ALPHABET.forEach(letter => {
    const letterApps = displayApps.filter(a => a.letter === letter);
    if (letterApps.length === 0 && letter !== '#') return;

    letterIndices[letter] = items.length;
    items.push({ _type: 'header', letter, id: `header_${letter}` });
    offsets.push(currentOffset);
    currentOffset += headerHeight;

    letterApps.forEach(app => {
      items.push({
        _type: 'app',
        letter: app.letter,
        id: app.id,
        name: app.name,
        packageName: app.packageName,
        icon: app.icon,
      });
      offsets.push(currentOffset);
      currentOffset += ITEM_HEIGHT;
    });
  });

  return { items, letterIndices, offsets };
};

/**
 * 构建单字母过滤列表（Niagara 动态临时过滤）
 * @param apps 全量应用列表
 * @param letter 目标字母
 * @param headerHeight 字母分组标题高度
 * @param customizations 自定义名称/图标配置
 */
export const buildFilteredList = (apps: AppInfo[], letter: string, headerHeight: number = 44, customizations: AppCustomizations = {}): FlatListResult => {
  const ITEM_HEIGHT = 64;
  const items: FlatItem[] = [];
  const offsets: number[] = [];
  let currentOffset = 0;

  // 只添加一个 header
  items.push({ _type: 'header', letter, id: `header_${letter}` });
  offsets.push(currentOffset);
  currentOffset += headerHeight;

  // 应用自定义名称，重新计算 letter (拼音解析剪枝)
  const displayApps = apps.map(app => {
    const custom = customizations[app.packageName];
    if (custom?.customName) {
      return {
        ...app,
        name: custom.customName,
        letter: calculateLetter(custom.customName),
      };
    }
    return app;
  });

  // 按自定义名称排序
  displayApps.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));

  // 只添加该字母的应用
  const letterApps = displayApps.filter(a => a.letter === letter);
  letterApps.forEach(app => {
    items.push({
      _type: 'app',
      letter: app.letter,
      id: app.id,
      name: app.name,
      packageName: app.packageName,
      icon: app.icon,
    });
    offsets.push(currentOffset);
    currentOffset += ITEM_HEIGHT;
  });

  return {
    items,
    letterIndices: { [letter]: 0 },
    offsets,
  };
};

export const launchApplication = (packageName: string) => {
  try {
    RNLauncherKitHelper.launchApplication(packageName);
  } catch (error) {
    console.error('[Launch] Error:', packageName, error);
  }
};

export const openAppDetails = (packageName: string) => {
  try {
    const { NativeModules, Platform } = require('react-native');
    if (Platform.OS === 'android') {
      if (NativeModules.LauncherKit && typeof NativeModules.LauncherKit.openAppDetails === 'function') {
        NativeModules.LauncherKit.openAppDetails(packageName);
      } else {
        console.warn('[AppService] NativeModules.LauncherKit.openAppDetails is not available');
      }
    }
  } catch (error) {
    console.error('[AppService] openAppDetails error:', error);
  }
};

/**
 * 加载收藏的应用列表
 */
export const loadFavorites = async (): Promise<AppInfo[]> => {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.FAVORITES);
    if (cached) {
      const favorites = JSON.parse(cached);
      if (Array.isArray(favorites)) {
        return favorites;
      }
    }
  } catch (e) {
    console.warn('[Favorites] Load failed:', e);
  }
  return [];
};

/**
 * 保存收藏的应用列表
 */
export const saveFavorites = async (favorites: AppInfo[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.FAVORITES, JSON.stringify(favorites));
    console.log(`[Favorites] Saved ${favorites.length} apps`);
  } catch (e) {
    console.warn('[Favorites] Save failed:', e);
  }
};

/**
 * 添加应用到收藏
 */
export const addToFavorites = async (app: AppInfo, currentFavorites: AppInfo[]): Promise<AppInfo[]> => {
  const exists = currentFavorites.some(fav => fav.packageName === app.packageName);
  if (exists) return currentFavorites;
  const newFavorites = [...currentFavorites, app];
  await saveFavorites(newFavorites);
  return newFavorites;
};

/**
 * 从收藏中移除应用
 */
export const removeFromFavorites = async (packageName: string, currentFavorites: AppInfo[]): Promise<AppInfo[]> => {
  const newFavorites = currentFavorites.filter(fav => fav.packageName !== packageName);
  await saveFavorites(newFavorites);
  return newFavorites;
};

/**
 * 检查应用是否已收藏
 */
export const isFavorite = (packageName: string, favorites: AppInfo[]): boolean => {
  return favorites.some(fav => fav.packageName === packageName);
};

/**
 * 加载应用自定义配置（自定义名称/图标）
 */
export const loadCustomizations = async (): Promise<AppCustomizations> => {
  try {
    const cached = await AsyncStorage.getItem(STORAGE_KEYS.APP_CUSTOMIZATIONS);
    if (cached) {
      const data = JSON.parse(cached);
      if (typeof data === 'object' && data !== null) {
        return data;
      }
    }
  } catch (e) {
    console.warn('[Customizations] Load failed:', e);
  }
  return {};
};

/**
 * 保存应用自定义配置
 */
export const saveCustomizations = async (customizations: AppCustomizations): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.APP_CUSTOMIZATIONS, JSON.stringify(customizations));
    console.log(`[Customizations] Saved for ${Object.keys(customizations).length} apps`);
  } catch (e) {
    console.warn('[Customizations] Save failed:', e);
  }
};

/**
 * 获取应用显示信息（合并原始数据与自定义数据）
 */
export const getAppDisplayInfo = (app: AppInfo, customizations: AppCustomizations): AppInfo => {
  const custom = customizations[app.packageName];
  if (!custom) return app;
  return {
    ...app,
    name: custom.customName || app.name,
    icon: custom.customIcon || app.icon,
  };
};

export { ALPHABET };
