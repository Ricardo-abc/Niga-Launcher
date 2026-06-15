import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  PanResponder, 
  Dimensions, 
  FlatList,
  StatusBar,
  Vibration,
  ActivityIndicator,
  TouchableOpacity,
  Easing,
  BackHandler,
  InteractionManager,
} from 'react-native';
import { AppAnimated as Animated } from './src/services/AnimationService';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { BlurView } from 'expo-blur';

import AppItem from './src/components/AppItem';
import LetterRail, { LetterRailRef } from './src/components/LetterRail';
import ScrubOverlay, { ScrubOverlayRef } from './src/components/ScrubOverlay';

import FavoritesHeader from './src/components/FavoritesHeader';
import SettingsView from './src/components/SettingsView';
import AppContextMenu from './src/components/AppContextMenu';
import EditAppDialog from './src/components/EditAppDialog';
import WallpaperBackground from './src/components/WallpaperBackground';
import SearchView from './src/components/SearchView';
import EffectLayer from './src/effects/EffectLayer';
import {
  loadInstalledApps,
  loadCachedApps,
  hasAppListChanged,
  launchApplication,
  buildFlatList,
  loadFavorites,
  saveFavorites,
  addToFavorites,
  removeFromFavorites,
  isFavorite,
  loadCustomizations,
  saveCustomizations,
  FlatItem,
} from './src/services/AppService';
import { SettingsProvider, useSettingsContext } from './src/context/SettingsContext';
import { AppInfo, AppCustomization, AppCustomizations, AppSettings } from './src/types/settings';
import { ALPHABET, GESTURE_STRIP_WIDTH, HEADER_HEIGHT, ITEM_HEIGHT, RAIL_BOTTOM_PADDING } from './src/constants/defaultSettings';
import { useRailAlphabet } from './src/hooks/useActiveAlphabet';
import { t } from './src/i18n';

const { height, width } = Dimensions.get('window');

const hapticOptions = {
  enableVibrateFallback: true,
  ignoreAndroidSystemSettings: false,
};

function triggerHaptic(effect: AppSettings['vibrationEffect'], intensity: number = 3) {
  if (effect === 'system') {
    Vibration.vibrate(4 * intensity);
    return;
  }
  ReactNativeHapticFeedback.trigger(effect, hapticOptions);
}

function AppContent() {
  const { settings, isLoaded } = useSettingsContext();
  const themeColor = settings.themeColor === 'auto' ? (settings.currentWallpaperDominantColor || '#3b82f6') : settings.themeColor;

  // ===== State =====
  const [isSliding, setIsSliding] = useState(false);
  const [slideSide, setSlideSide] = useState<'left' | 'right'>('right');
  const [railTop, setRailTop] = useState(height - settings.railHeight - RAIL_BOTTOM_PADDING);
  const [showSettings, setShowSettings] = useState(false);
  const [cachedApps, setCachedApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { alphabet: activeAlphabet } = useRailAlphabet(cachedApps);
  const [isDragging, setIsDragging] = useState(false);
  const [favoritesHeight, setFavoritesHeight] = useState(height);
  const scrubOpacity = useRef(new Animated.Value(0)).current;
  const scrubLetterRef = useRef<string | null>(null);

  // ===== Context Menu & Edit Dialog State =====
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuApp, setContextMenuApp] = useState<AppInfo | null>(null);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editDialogApp, setEditDialogApp] = useState<AppInfo | null>(null);
  const [favorites, setFavorites] = useState<AppInfo[]>([]);
  const [tempFavorites, setTempFavorites] = useState<AppInfo[]>([]);
  const [customizations, setCustomizations] = useState<AppCustomizations>({});
  const [favoritesRefreshKey, setFavoritesRefreshKey] = useState(0);

  // 一体化编辑模式状态
  const [isEditingFavorites, setIsEditingFavorites] = useState(false);
  const [favoritesBackup, setFavoritesBackup] = useState<AppInfo[]>([]);

  const isEditingFavoritesRef = useRef(isEditingFavorites);
  isEditingFavoritesRef.current = isEditingFavorites;

  const tempFavoritesRef = useRef<AppInfo[]>([]);
  tempFavoritesRef.current = tempFavorites;

  const favoritesRef = useRef<AppInfo[]>([]);
  favoritesRef.current = favorites;

  const handleStartEditFavorites = useCallback(() => {
    setFavoritesBackup([...favorites]);
    setTempFavorites([...favorites]);
    setIsEditingFavorites(true);
  }, [favorites]);

  const handleCancelEditFavorites = useCallback(async () => {
    setFavorites(favoritesBackup);
    setTempFavorites(favoritesBackup);
    setIsEditingFavorites(false);
    await saveFavorites(favoritesBackup);
    setFavoritesRefreshKey(k => k + 1);
  }, [favoritesBackup]);

  const handleDoneEditFavorites = useCallback(async () => {
    setIsEditingFavorites(false);
    setFavorites(tempFavoritesRef.current);
    await saveFavorites(tempFavoritesRef.current);
    setFavoritesRefreshKey(k => k + 1);
  }, []);

  const handleToggleAppFavorite = useCallback(async (app: AppInfo) => {
    let newTemp: AppInfo[];
    if (tempFavoritesRef.current.some(fav => fav.packageName === app.packageName)) {
      newTemp = tempFavoritesRef.current.filter(fav => fav.packageName !== app.packageName);
    } else {
      newTemp = [...tempFavoritesRef.current, app];
    }
    setTempFavorites(newTemp);
    await saveFavorites(newTemp);

    // 如果当前滚动位置接近顶部，或者不在编辑模式，立即同步 favorites 状态
    if (scrollOffsetRef.current < 10 || !isEditingFavoritesRef.current) {
      setFavorites(newTemp);
      setFavoritesRefreshKey(k => k + 1);
    }
  }, []);

  const handleOrderChange = useCallback((newFavs: AppInfo[]) => {
    setFavorites(newFavs);
    setTempFavorites(newFavs);
  }, []);

  // ===== Refs =====
  const scrollYAnim = useRef(new Animated.Value(0)).current;
  const letterRailRef = useRef<LetterRailRef>(null);
  const scrubOverlayRef = useRef<ScrubOverlayRef>(null);
  const activeLetterRef = useRef<string | null>(null);
  const activeIndexRef = useRef(0);
  const isSlidingRef = useRef(false);
  const railHeightRef = useRef(settings.railHeight);
  const railTopRef = useRef(height - settings.railHeight - RAIL_BOTTOM_PADDING);
  const lastVibrateTime = useRef(0);
  const lastVibratedIndex = useRef(-1);
  const vibrateTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (vibrateTimeoutRef.current) {
        clearTimeout(vibrateTimeoutRef.current);
      }
    };
  }, []);
  const lastTouchY = useRef(0);
  const lastTouchTime = useRef(0);
  const touchVelocity = useRef(0);
  const flatListRef = useRef<FlatList>(null);
  const bubbleYAnim = useRef(new Animated.Value(0)).current;
  const activeIndexAnim = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(0)).current;
  const pullXAnim = useRef(new Animated.Value(0)).current;
  const favoritesHeightRef = useRef(favoritesHeight);
  const animationVersionRef = useRef(0);
  const scrollOffsetRef = useRef(0);
  const settingsRef = useRef(settings);
  const activeAlphabetRef = useRef(activeAlphabet);

  const [searchActive, setSearchActive] = useState(false);
  const searchActiveRef = useRef(searchActive);
  searchActiveRef.current = searchActive;

  const [searchPullThresholdPassed, setSearchPullThresholdPassed] = useState(false);
  const searchPullAnim = useRef(new Animated.Value(0)).current;
  const searchPullThresholdPassedRef = useRef(false);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    activeAlphabetRef.current = activeAlphabet;
  }, [activeAlphabet]);

  useEffect(() => { railHeightRef.current = settings.railHeight; }, [settings.railHeight]);
  useEffect(() => { favoritesHeightRef.current = favoritesHeight; }, [favoritesHeight]);

  const fixedRailTop = useMemo(() => Math.max(20, height - settings.railHeight - RAIL_BOTTOM_PADDING), [settings.railHeight]);
  const fixedRailTopRef = useRef(fixedRailTop);
  useEffect(() => { fixedRailTopRef.current = fixedRailTop; }, [fixedRailTop]);

  // ===== 预计算列表数据 =====
  const { flatItems, letterIndexMap, itemOffsets } = useMemo(() => {
    const result = buildFlatList(cachedApps, favoritesHeight, 44, customizations);
    return {
      flatItems: result.items,
      letterIndexMap: result.letterIndices,
      itemOffsets: result.offsets,
    };
  }, [cachedApps, favoritesHeight, customizations]);

  const letterIndexMapRef = useRef(letterIndexMap);
  const itemOffsetsRef = useRef(itemOffsets);
  useEffect(() => {
    letterIndexMapRef.current = letterIndexMap;
    itemOffsetsRef.current = itemOffsets;
  }, [letterIndexMap, itemOffsets]);

  // ===== Scrub 辅助 =====
  const flatItemsRef = useRef(flatItems);
  const [scrubOffsets, setScrubOffsets] = useState<number[]>([]);

  useEffect(() => { flatItemsRef.current = flatItems; }, [flatItems]);

  // 预计算每个字母对应的 Scrub 数据 (只保留能展示在屏幕内的最大数量条目)
  const scrubDataMap = useMemo(() => {
    const map: Record<string, { items: FlatItem[]; offsets: number[] }> = {};
    const maxVisibleItems = Math.ceil((height * (1 - settings.focusScrollRatio)) / settings.appItemHeight) + 2;

    ALPHABET.forEach(letter => {
      const startIdx = letterIndexMap[letter];
      if (startIdx !== undefined) {
        let endIdx = flatItems.length;
        for (let i = startIdx + 1; i < flatItems.length; i++) {
          if (flatItems[i]._type === 'header') {
            endIdx = i;
            break;
          }
        }
        const sliced = flatItems.slice(startIdx, Math.min(startIdx + maxVisibleItems, endIdx));
        const offsets: number[] = [];
        let off = 0;
        for (const item of sliced) {
          offsets.push(off);
          off += item._type === 'header' ? HEADER_HEIGHT : settings.appItemHeight;
        }
        map[letter] = { items: sliced, offsets };
      }
    });
    return map;
  }, [flatItems, letterIndexMap, settings.focusScrollRatio, settings.appItemHeight]);

  const scrubDataMapRef = useRef(scrubDataMap);
  useEffect(() => {
    scrubDataMapRef.current = scrubDataMap;
  }, [scrubDataMap]);

  // ===== 初始化 =====
  useEffect(() => {
    (async () => {
      try {
        const [cached, favs, custs] = await Promise.all([
          loadCachedApps(),
          loadFavorites(),
          loadCustomizations(),
        ]);
        
        setFavorites(favs);
        setCustomizations(custs);

        if (cached.length > 0) {
          setCachedApps(cached);
          setLoading(false);
          InteractionManager.runAfterInteractions(async () => {
            const fresh = await loadInstalledApps();
            if (fresh.length > 0 && hasAppListChanged(cached, fresh)) {
              setCachedApps(fresh);
            }
          });
        } else {
          const apps = await loadInstalledApps();
          setCachedApps(apps);
          setLoading(false);
        }
      } catch (e) {
        console.error('Init error:', e);
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const handler = BackHandler.addEventListener('hardwareBackPress', () => {
      if (editDialogVisible) { setEditDialogVisible(false); return true; }
      if (contextMenuVisible) { setContextMenuVisible(false); return true; }
      if (showSettings) { setShowSettings(false); return true; }
      if (searchActive) { setSearchActive(false); return true; }
      if (isEditingFavorites) {
        // 返回键双击优化：若列表向下滚动过，第一次返回先回到顶部，第二次返回才保存退出
        if (scrollOffsetRef.current > 15) {
          flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        } else {
          handleDoneEditFavorites();
        }
        return true;
      }
      if (settings.enableBackToFavorites && scrollOffsetRef.current > 0) {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        return true;
      }
      return false;
    });

    return () => handler.remove();
  }, [showSettings, settings.enableBackToFavorites, contextMenuVisible, editDialogVisible, searchActive, isEditingFavorites, handleDoneEditFavorites]);

  useEffect(() => {
    if (!loading && isLoaded) {
      Animated.timing(listOpacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
    }
  }, [loading, isLoaded]);

  // ===== 核心 handleTouch =====
  const handleTouchRef = useRef<(y: number, currentRailTop: number) => void>(undefined);

  handleTouchRef.current = (yPosition: number, currentRailTop: number) => {
    const rh = railHeightRef.current;
    const relativeY = yPosition - currentRailTop;
    
    // 使用 space-between 方式计算：第一个字母在顶部，最后一个在底部
    const step = rh / (activeAlphabet.length - 1);
    let idx = Math.round(relativeY / step);
    idx = Math.max(0, Math.min(idx, activeAlphabet.length - 1));
    const newLetter = activeAlphabet[idx];

    // 计算滑动速度（像素/毫秒）
    const now = Date.now();
    const dt = now - lastTouchTime.current;
    if (dt > 0) {
      const dy = Math.abs(yPosition - lastTouchY.current);
      touchVelocity.current = dy / dt;
    }
    lastTouchY.current = yPosition;
    lastTouchTime.current = now;

    activeLetterRef.current = newLetter;
    activeIndexRef.current = idx;
    
    letterRailRef.current?.setColorSource('rail');
    letterRailRef.current?.setActiveIndex(idx);
    activeIndexAnim.setValue(idx);
    
    bubbleYAnim.setValue(yPosition);

    // 字母变化时震动反馈
    if (settings.enableVibration && idx !== lastVibratedIndex.current) {
      if (vibrateTimeoutRef.current) {
        clearTimeout(vibrateTimeoutRef.current);
        vibrateTimeoutRef.current = null;
      }

      const timeDiff = now - lastVibrateTime.current;
      if (timeDiff >= 40) {
        lastVibratedIndex.current = idx;
        lastVibrateTime.current = now;
        triggerHaptic(settings.vibrationEffect, settings.vibrationIntensity);
      } else {
        const delay = 40 - timeDiff;
        vibrateTimeoutRef.current = setTimeout(() => {
          if (isSlidingRef.current && idx !== lastVibratedIndex.current) {
            lastVibratedIndex.current = idx;
            lastVibrateTime.current = Date.now();
            triggerHaptic(settings.vibrationEffect, settings.vibrationIntensity);
          }
        }, delay);
      }
    }

    // 直接滚动全量列表到目标字母位置
    const targetIdx = letterIndexMapRef.current[newLetter];
    if (targetIdx !== undefined) {
      const targetOffset = itemOffsetsRef.current[targetIdx];
      if (targetOffset !== undefined) {
        const adjustedOffset = Math.max(0, targetOffset - height * settings.focusScrollRatio);
        flatListRef.current?.scrollToOffset({ offset: adjustedOffset, animated: false });
      }
    }

    // 更新 Scrub 数据（A-Z 且字母变化时，且开关开启）
    if (settings.enableScrubMode && newLetter >= 'A' && newLetter <= 'Z' && scrubLetterRef.current !== newLetter) {
      scrubLetterRef.current = newLetter;
      const data = scrubDataMapRef.current[newLetter];
      if (data) {
        scrubOverlayRef.current?.setItems(data.items, data.offsets);
      } else {
        scrubOverlayRef.current?.setItems([], []);
      }
    }
  };

  const handleGrantRef = useRef<(y: number, side: 'left' | 'right') => void>(undefined);

  handleGrantRef.current = (y0: number, side: 'left' | 'right') => {
    const rh = railHeightRef.current;
    const fixedTop = fixedRailTopRef.current;
    const fixedBottom = fixedTop + rh;

    // 判断点击位置是否在固定轨道区域内
    let newRailTop: number;
    let idx: number;
    
    if (y0 >= fixedTop && y0 <= fixedBottom) {
      // 点击固定轨道区域：使用固定位置，根据点击位置计算字母索引
      newRailTop = fixedTop;
      const relativeY = y0 - fixedTop;
      const step = rh / (activeAlphabet.length - 1);
      idx = Math.round(relativeY / step);
    } else if (y0 > fixedBottom) {
      // 点击 # 下方空白区域
      if (settings.enableBottomRailSelect) {
        // 选中 #，不移动轨道
        newRailTop = fixedTop;
        idx = activeAlphabet.length - 1;
      } else {
        // 原有行为：轨道移动 + 跳转 A
        newRailTop = Math.max(20, Math.min(y0, height - rh - 20));
        idx = 0;
      }
    } else {
      // 点击 * 上方空白区域
      if (settings.enableTopRailSelect) {
        // 选中 *，不移动轨道
        newRailTop = fixedTop;
        idx = 0;
      } else {
        // 原有行为：轨道移动 + 跳转 A/*
        newRailTop = Math.max(20, Math.min(y0, height - rh - 20));
        idx = 0;
      }
    }

    // 更新轨道位置
    railTopRef.current = newRailTop;
    setRailTop(newRailTop);
    setSlideSide(side);

    // 边界检查
    idx = Math.max(0, Math.min(idx, activeAlphabet.length - 1));
    const newLetter = activeAlphabet[idx];

    // 初始化滑动速度追踪
    lastTouchY.current = y0;
    lastTouchTime.current = Date.now();
    touchVelocity.current = 0;

    activeLetterRef.current = newLetter;
    activeIndexRef.current = idx;
    
    letterRailRef.current?.setColorSource('rail');
    letterRailRef.current?.setActiveIndex(idx);
    activeIndexAnim.setValue(idx);
    
    bubbleYAnim.setValue(y0);
    
    // 首次选中时强震动反馈
    if (settings.enableVibration) {
      if (vibrateTimeoutRef.current) {
        clearTimeout(vibrateTimeoutRef.current);
        vibrateTimeoutRef.current = null;
      }
      triggerHaptic(settings.vibrationEffect, 5);
      lastVibrateTime.current = Date.now();
      lastVibratedIndex.current = idx;
    }

    const defaultPull = 80;
    Animated.timing(pullXAnim, {
      toValue: defaultPull,
      duration: settings.animationDuration,
      easing: Easing.bezier(0.25, 0.1, 0.25, 1),
      useNativeDriver: true,
    }).start();

    // 直接滚动全量列表到目标字母位置
    const targetIdx = letterIndexMapRef.current[newLetter];
    if (targetIdx !== undefined) {
      const targetOffset = itemOffsetsRef.current[targetIdx];
      if (targetOffset !== undefined) {
        const adjustedOffset = Math.max(0, targetOffset - height * settings.focusScrollRatio);
        flatListRef.current?.scrollToOffset({ offset: adjustedOffset, animated: false });
      }
    }

    // 进入 Scrub（开关开启且 A-Z 才触发）
    if (settings.enableScrubMode && newLetter >= 'A' && newLetter <= 'Z') {
      scrubLetterRef.current = newLetter;
      const data = scrubDataMapRef.current[newLetter];
      if (data) {
        scrubOverlayRef.current?.setItems(data.items, data.offsets);
        Animated.parallel([
          Animated.timing(scrubOpacity, { toValue: 1, duration: 150, useNativeDriver: true }),
          Animated.timing(listOpacity, { toValue: 0, duration: 150, useNativeDriver: true }),
        ]).start();
      }
    }
  };

  // ===== PanResponder =====
  const createPanHandler = (side: 'left' | 'right') =>
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,
      onPanResponderTerminationRequest: () => false,
      onPanResponderGrant: (_, gs) => {
        pullXAnim.stopAnimation();
        animationVersionRef.current++;
        isSlidingRef.current = true;
        setIsSliding(true);
        setIsDragging(true);
        handleGrantRef.current?.(gs.y0, side);
      },
      onPanResponderMove: (_, gs) => {
        handleTouchRef.current?.(gs.moveY, railTopRef.current);
        const intensity = settings.waveIntensity > 0 ? settings.waveIntensity : 0.1;
        const maxPull = (width - 20 - settings.bubbleOffset - settings.bubbleSize) / (1.3 * intensity);
        const defaultPull = 80;
        const pull = side === 'right'
          ? Math.max(0, -gs.dx)
          : Math.max(0, gs.dx);
        const swipeThreshold = 40;
        const finalPull = pull > swipeThreshold ? Math.min(defaultPull + pull - swipeThreshold, maxPull) : defaultPull;
        pullXAnim.setValue(Math.max(0, finalPull));
      },
      onPanResponderRelease: () => {
        isSlidingRef.current = false;
        setIsDragging(false);
        const currentVersion = animationVersionRef.current;

        if (vibrateTimeoutRef.current) {
          clearTimeout(vibrateTimeoutRef.current);
          vibrateTimeoutRef.current = null;
        }

        if (settings.enableVibration && activeIndexRef.current !== lastVibratedIndex.current) {
          lastVibratedIndex.current = activeIndexRef.current;
          lastVibrateTime.current = Date.now();
          triggerHaptic(settings.vibrationEffect, settings.vibrationIntensity);
        }

        // 退出 Scrub：淡出 overlay
        if (scrubLetterRef.current) {
          scrubLetterRef.current = null;
          Animated.parallel([
            Animated.timing(scrubOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(listOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
          ]).start(() => {
            scrubOverlayRef.current?.setItems([], []);
          });
        }

        // 直接滚动全量列表到目标字母位置
        const targetLetter = activeLetterRef.current;
        const targetIdx = letterIndexMapRef.current[targetLetter!];
        if (targetIdx !== undefined) {
          const targetOffset = itemOffsetsRef.current[targetIdx];
          if (targetOffset !== undefined) {
            const adjustedOffset = Math.max(0, targetOffset - height * settings.focusScrollRatio);
            flatListRef.current?.scrollToOffset({ offset: adjustedOffset, animated: false });
          }
        }

        Animated.spring(pullXAnim, {
          toValue: 0,
          friction: settings.springFriction,
          tension: settings.springTension,
          useNativeDriver: true,
        }).start(() => {
          if (currentVersion === animationVersionRef.current) {
            setIsSliding(false);
          }
        });

        // 轨道恢复到固定位置
        const fixedTop = fixedRailTopRef.current;
        railTopRef.current = fixedTop;
        setRailTop(fixedTop);
      },
      onPanResponderTerminate: () => {
        isSlidingRef.current = false;
        setIsDragging(false);
        const currentVersion = animationVersionRef.current;

        if (vibrateTimeoutRef.current) {
          clearTimeout(vibrateTimeoutRef.current);
          vibrateTimeoutRef.current = null;
        }

        // 退出 Scrub
        if (scrubLetterRef.current) {
          scrubLetterRef.current = null;
          Animated.parallel([
            Animated.timing(scrubOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(listOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
          ]).start(() => {
            scrubOverlayRef.current?.setItems([], []);
          });
        }

        pullXAnim.setValue(0);

        if (currentVersion === animationVersionRef.current) {
          setIsSliding(false);
        }

        const fixedTop = fixedRailTopRef.current;
        railTopRef.current = fixedTop;
        setRailTop(fixedTop);
      },
    });

  const rightPanResponder = useRef(createPanHandler('right')).current;
  const leftPanResponder = useRef(createPanHandler('left')).current;

  const searchPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onStartShouldSetPanResponderCapture: () => false,
      onMoveShouldSetPanResponder: (_, gs) => {
        return (
          !searchActiveRef.current &&
          !isEditingFavoritesRef.current &&
          scrollOffsetRef.current <= 1 &&
          gs.dy > 3 &&
          Math.abs(gs.dx) < Math.abs(gs.dy)
        );
      },
      onMoveShouldSetPanResponderCapture: (_, gs) => {
        return (
          !searchActiveRef.current &&
          !isEditingFavoritesRef.current &&
          scrollOffsetRef.current <= 1 &&
          gs.dy > 3 &&
          Math.abs(gs.dx) < Math.abs(gs.dy)
        );
      },
      onPanResponderGrant: () => {
        searchPullThresholdPassedRef.current = false;
        setSearchPullThresholdPassed(false);
      },
      onPanResponderMove: (_, gs) => {
        const dy = gs.dy;
        const pullDistance = Math.max(0, dy / (1 + dy / 300));
        searchPullAnim.setValue(pullDistance);

        const threshold = 70;
        if (pullDistance >= threshold && !searchPullThresholdPassedRef.current) {
          searchPullThresholdPassedRef.current = true;
          setSearchPullThresholdPassed(true);
          triggerHaptic(settingsRef.current.vibrationEffect, settingsRef.current.vibrationIntensity);
        } else if (pullDistance < threshold && searchPullThresholdPassedRef.current) {
          searchPullThresholdPassedRef.current = false;
          setSearchPullThresholdPassed(false);
        }
      },
      onPanResponderRelease: () => {
        if (searchPullThresholdPassedRef.current) {
          setSearchActive(true);
        }
        
        Animated.spring(searchPullAnim, {
          toValue: 0,
          friction: 8,
          tension: 200,
          useNativeDriver: true,
        }).start();

        searchPullThresholdPassedRef.current = false;
        setSearchPullThresholdPassed(false);
      },
      onPanResponderTerminate: () => {
        Animated.spring(searchPullAnim, {
          toValue: 0,
          friction: 8,
          tension: 200,
          useNativeDriver: true,
        }).start();

        searchPullThresholdPassedRef.current = false;
        setSearchPullThresholdPassed(false);
      },
    })
  ).current;

  // ===== 列表滚动跟踪字母 =====
  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (isSlidingRef.current) return;
    if (!viewableItems || viewableItems.length === 0) return;
    
    const currentOffsets = itemOffsetsRef.current;
    const currentItems = flatItemsRef.current;
    const currentSettings = settingsRef.current;
    
    // 基于 focusScrollRatio 位置计算变色
    const focusPosition = scrollOffsetRef.current + height * currentSettings.focusScrollRatio;
    
    // 找到在 focusPosition 位置的字母
    let focusedLetter = null;
    for (let i = 0; i < currentOffsets.length; i++) {
      if (currentOffsets[i] >= focusPosition) {
        // 找到对应的 header
        for (let j = i; j >= 0; j--) {
          if (currentItems[j]?._type === 'header') {
            focusedLetter = currentItems[j].letter;
            break;
          }
        }
        break;
      }
    }
    
    // 如果没有找到，使用第一个可见的 header
    if (!focusedLetter) {
      const firstHeader = viewableItems.find((v: any) => v.item?._type === 'header');
      if (firstHeader) {
        focusedLetter = firstHeader.item.letter;
      }
    }
    
    if (focusedLetter && activeLetterRef.current !== focusedLetter) {
      activeLetterRef.current = focusedLetter;
      const idx = activeAlphabetRef.current.indexOf(focusedLetter);
      if (idx >= 0) {
        activeIndexRef.current = idx;
        letterRailRef.current?.setColorSource('list');
        letterRailRef.current?.setActiveIndex(idx);
        activeIndexAnim.setValue(idx);
      }
    }
  }).current;

  const viewabilityConfig = useRef({ itemVisiblePercentThreshold: 30 }).current;

  const onLaunchApp = useCallback((packageName: string) => {
    if (settings.enableVibration) {
      triggerHaptic(settings.vibrationEffect, 5);
    }
    launchApplication(packageName);
  }, [settings.enableVibration, settings.vibrationEffect]);

  // ===== Context Menu Handlers =====
  const handleLongPressApp = useCallback((app: AppInfo) => {
    setContextMenuApp(app);
    setContextMenuVisible(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenuVisible(false);
  }, []);

  const handleToggleFavorite = useCallback(async () => {
    if (!contextMenuApp) return;
    let newFavorites: AppInfo[];
    if (isFavorite(contextMenuApp.packageName, favorites)) {
      newFavorites = await removeFromFavorites(contextMenuApp.packageName, favorites);
    } else {
      newFavorites = await addToFavorites(contextMenuApp, favorites);
    }
    setFavorites(newFavorites);
    setFavoritesRefreshKey(k => k + 1);
  }, [contextMenuApp, favorites]);

  const handleOpenEdit = useCallback(() => {
    if (!contextMenuApp) return;
    setEditDialogApp(contextMenuApp);
    setEditDialogVisible(true);
  }, [contextMenuApp]);

  const handleSaveCustomization = useCallback(async (packageName: string, customization: AppCustomization) => {
    const newCustomizations = { ...customizations };
    if (customization.customName || customization.customIcon) {
      newCustomizations[packageName] = customization;
    } else {
      delete newCustomizations[packageName];
    }
    setCustomizations(newCustomizations);
    await saveCustomizations(newCustomizations);
    setFavoritesRefreshKey(k => k + 1);
  }, [customizations]);

  // ===== 渲染函数 =====
  const renderItem = useCallback(({ item }: { item: FlatItem }) => {
    if (item._type === 'header') {
      if (item.letter === '#') {
        return (
          <View style={[styles.sectionHeader, { height: HEADER_HEIGHT }]}>
            <Text style={[styles.sectionLetter, { color: themeColor }]}>#</Text>
            {settings.showHeaderDivider && <View style={styles.sectionLine} />}
            <TouchableOpacity
              style={styles.settingsLink}
              onPress={() => setShowSettings(true)}
            >
              <Text style={styles.settingsLinkText}>⚙ {t('settings.title')}</Text>
            </TouchableOpacity>
          </View>
        );
      }
      return (
        <View style={[styles.sectionHeader, { height: HEADER_HEIGHT }]}>
          <Text style={[styles.sectionLetter, { color: themeColor }]}>{item.letter}</Text>
          {settings.showHeaderDivider && <View style={styles.sectionLine} />}
        </View>
      );
    }
    if (item._type === 'app') {
      const appItem = item as any as AppInfo;
      const isFav = (isEditingFavorites ? tempFavorites : favorites).some(fav => fav.packageName === appItem.packageName);
      return (
        <View>
          <AppItem
            item={appItem}
            onPress={isEditingFavorites ? () => handleToggleAppFavorite(appItem) : onLaunchApp}
            onLongPress={handleLongPressApp}
            customization={customizations[appItem.packageName]}
            isEditing={isEditingFavorites}
            isFavorite={isFav}
          />
          {settings.showDivider && <View style={styles.divider} />}
        </View>
      );
    }
    return null;
  }, [onLaunchApp, handleLongPressApp, customizations, themeColor, settings.showDivider, settings.showHeaderDivider, isEditingFavorites, favorites, tempFavorites, handleToggleAppFavorite]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: flatItems[index]?._type === 'header' ? HEADER_HEIGHT : settings.appItemHeight,
    offset: itemOffsets[index] || 0,
    index,
  }), [flatItems, itemOffsets, settings.appItemHeight]);

  const keyExtractor = useCallback((item: FlatItem) => item.id, []);



  const containerBg = 'transparent';
  const listBg = 'transparent';

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />
      <WallpaperBackground scrollY={scrollYAnim} scrubOpacity={scrubOpacity} isEditing={isEditingFavorites} />

      {settings.showTouchZone && (
        <>
          <View style={[styles.touchZoneDebug, { left: 0 }]} />
          <View style={[styles.touchZoneDebug, { right: 0 }]} />
        </>
      )}

      <View style={styles.gestureStripLeft} {...leftPanResponder.panHandlers} />

      <View style={[styles.appArea, { backgroundColor: listBg }]} {...searchPanResponder.panHandlers}>
        {/* 下拉搜索预览 */}
        <Animated.View
          style={[
            styles.searchPreviewContainer,
            {
              opacity: searchPullAnim.interpolate({
                inputRange: [0, 60],
                outputRange: [0, 1],
                extrapolate: 'clamp',
              }),
              transform: [
                {
                  scale: searchPullAnim.interpolate({
                    inputRange: [0, 70],
                    outputRange: [0.92, 1],
                    extrapolate: 'clamp',
                  }),
                },
                {
                  translateY: searchPullAnim.interpolate({
                    inputRange: [0, 100],
                    outputRange: [10, 35],
                    extrapolate: 'clamp',
                  }),
                },
              ],
            },
          ]}
        >
          <Text style={styles.searchPreviewIcon}>🔍</Text>
          <Text style={styles.searchPreviewText}>
            {searchPullThresholdPassed ? t('search.releaseHint') : t('search.pullHint')}
          </Text>
        </Animated.View>

        <Animated.View
          style={[
            styles.listContainer,
            {
              opacity: listOpacity,
              transform: [{ translateY: searchPullAnim }],
            },
          ]}
        >
          <Animated.FlatList
            ref={flatListRef as any}
            data={flatItems}
            keyExtractor={keyExtractor}
            renderItem={renderItem}
            getItemLayout={getItemLayout}
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={viewabilityConfig}
            showsVerticalScrollIndicator={false}
            initialNumToRender={20}
            maxToRenderPerBatch={15}
            windowSize={7}
            removeClippedSubviews={true}
            contentContainerStyle={styles.listContent}
            ListHeaderComponent={
              <FavoritesHeader
                onLayout={(h) => {
                  setFavoritesHeight(h);
                }}
                onLongPressApp={handleLongPressApp}
                customizations={customizations}
                refreshKey={favoritesRefreshKey}
                isEditing={isEditingFavorites}
                favorites={favorites}
                tempFavorites={tempFavorites}
                allApps={cachedApps}
                onToggleFavorite={handleToggleAppFavorite}
                onOrderChange={handleOrderChange}
                onCloseEdit={handleDoneEditFavorites}
                onCancelEdit={handleCancelEditFavorites}
              />
            }
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { y: scrollYAnim } } }],
              {
                useNativeDriver: true,
                listener: (e: any) => {
                  const y = e.nativeEvent.contentOffset.y;
                  scrollOffsetRef.current = y;
                  
                  if (isEditingFavoritesRef.current && y < favoritesHeightRef.current + 200) {
                    const temp = tempFavoritesRef.current;
                    const favs = favoritesRef.current;
                    const isDifferent = temp.length !== favs.length ||
                      temp.some((tApp, idx) => favs[idx]?.packageName !== tApp.packageName);
                    
                    if (isDifferent) {
                      setFavorites(temp);
                      setFavoritesRefreshKey(k => k + 1);
                    }
                  }
                },
              }
            )}
            scrollEventThrottle={16}
          />
        </Animated.View>
      </View>

      {/* Scrub 遮罩 */}
      <ScrubOverlay
        ref={scrubOverlayRef}
        renderItem={renderItem}
        focusScrollRatio={settings.focusScrollRatio}
        scrubOpacity={scrubOpacity}
        appItemHeight={settings.appItemHeight}
      />

      <View style={styles.gestureStripRight} {...rightPanResponder.panHandlers} />



      <LetterRail
        ref={letterRailRef}
        activeIndexAnim={activeIndexAnim}
        isSliding={isSliding}
        isDragging={isDragging}
        top={railTop}
        height={settings.railHeight}
        side={settings.railSide}
        pullX={pullXAnim}
        showList={true}
        apps={cachedApps}
      />

      {settings.showRailBounds && (
        <View style={[styles.railBoundsDebug, { top: 0, bottom: 0, [settings.railSide]: 0 }]} />
      )}

      {showSettings && (
        <SettingsView onClose={() => setShowSettings(false)} />
      )}

      {/* Context Menu */}
      <AppContextMenu
        visible={contextMenuVisible}
        app={contextMenuApp}
        isFavorite={contextMenuApp ? isFavorite(contextMenuApp.packageName, favorites) : false}
        customizations={customizations}
        onClose={handleCloseContextMenu}
        onEditFavorites={handleStartEditFavorites}
        onEdit={handleOpenEdit}
        onSaveCustomization={handleSaveCustomization}
      />

      {/* Edit Dialog */}
      <EditAppDialog
        visible={editDialogVisible}
        app={editDialogApp}
        existingCustomization={editDialogApp ? customizations[editDialogApp.packageName] : undefined}
        onClose={() => setEditDialogVisible(false)}
        onSave={handleSaveCustomization}
      />

      {/* Search Overlay */}
      {searchActive && (
        <SearchView
          visible={searchActive}
          onClose={() => setSearchActive(false)}
          apps={cachedApps}
          customizations={customizations}
          onLaunchApp={onLaunchApp}
          onLongPressApp={handleLongPressApp}
          themeColor={themeColor}
        />
      )}

      {isEditingFavorites && (
        <>
          <BlurView
            intensity={35}
            tint="dark"
            style={[
              styles.floatingHeader,
              {
                top: (StatusBar.currentHeight || 24) + 10,
              }
            ]}
          >
            <TouchableOpacity onPress={handleCancelEditFavorites} style={styles.headerBtn} activeOpacity={0.6}>
              <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{t('contextMenu.editFavorites')}</Text>
            <View style={styles.headerRight}>
              <Text style={styles.selectedCountText}>{tempFavorites.length} 已选</Text>
            </View>
          </BlurView>

          <TouchableOpacity
            style={[
              styles.floatingDoneButton,
              {
                backgroundColor: themeColor,
                right: settings.railSide === 'right' ? GESTURE_STRIP_WIDTH + 16 : 20,
              }
            ]}
            onPress={handleDoneEditFavorites}
            activeOpacity={0.8}
          >
            <Text style={styles.floatingDoneIcon}>✓</Text>
            <Text style={styles.floatingDoneText}>{t('common.confirm')}</Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
}

export default function App() {
  return (
    <SettingsProvider>
      <AppContent />
    </SettingsProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  gestureStripLeft: {
    position: 'absolute', left: 0, top: 0, bottom: 0,
    width: GESTURE_STRIP_WIDTH, zIndex: 10,
  },
  gestureStripRight: {
    position: 'absolute', right: 0, top: 0, bottom: 0,
    width: GESTURE_STRIP_WIDTH, zIndex: 10,
  },
  appArea: {
    flex: 1,
    paddingLeft: GESTURE_STRIP_WIDTH + 8,
    paddingRight: GESTURE_STRIP_WIDTH + 8,
    zIndex: 5,
  },
  listContainer: { flex: 1, zIndex: 2 },
  listContent: { paddingBottom: 80 },
  searchPreviewContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
    flexDirection: 'row',
  },
  searchPreviewIcon: {
    fontSize: 16,
    marginRight: 6,
    opacity: 0.8,
  },
  searchPreviewText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '500',
  },
  scrubOverlay: {
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    paddingLeft: GESTURE_STRIP_WIDTH + 8,
    paddingRight: GESTURE_STRIP_WIDTH + 8,
    zIndex: 8,
  },
  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', paddingTop: 12,
  },
  sectionLetter: { fontSize: 20, fontWeight: '800', width: 32 },
  sectionLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.06)' },
  settingsLink: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  settingsLinkText: {
    color: '#888',
    fontSize: 14,
  },
  hintText: { fontSize: 16, color: '#666', marginTop: 10 },
  divider: {
    height: 0.5,
    backgroundColor: 'rgba(255,255,255,0.08)',
    marginLeft: 56,
  },
  touchZoneDebug: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: GESTURE_STRIP_WIDTH,
    backgroundColor: 'rgba(255, 0, 0, 0.15)',
    zIndex: 1,
  },
  railBoundsDebug: {
    position: 'absolute',
    width: 40,
    backgroundColor: 'rgba(0, 255, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 0, 0.3)',
    zIndex: 1,
  },
  floatingDoneButton: {
    position: 'absolute',
    bottom: 30,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 6,
    zIndex: 99,
  },
  floatingDoneIcon: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  floatingDoneText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
  },
  floatingHeader: {
    position: 'absolute',
    left: 16,
    right: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 99,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
    overflow: 'hidden',
  },
  headerBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  cancelBtnText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
  },
  headerTitle: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  headerRight: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  selectedCountText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
});
