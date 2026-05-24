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
  Animated,
  Easing,
  BackHandler,
  InteractionManager,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';

import AppItem from './src/components/AppItem';
import LetterRail from './src/components/LetterRail';
import AlphabetBubble from './src/components/AlphabetBubble';
import FavoritesHeader from './src/components/FavoritesHeader';
import SettingsView from './src/components/SettingsView';
import AppContextMenu from './src/components/AppContextMenu';
import EditAppDialog from './src/components/EditAppDialog';
import WallpaperBackground from './src/components/WallpaperBackground';
import EffectLayer from './src/effects/EffectLayer';
import {
  loadInstalledApps,
  loadCachedApps,
  hasAppListChanged,
  launchApplication,
  buildFlatList,
  loadFavorites,
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

  // ===== State =====
  const [isSliding, setIsSliding] = useState(false);
  const [slideSide, setSlideSide] = useState<'left' | 'right'>('right');
  const [railTop, setRailTop] = useState(height - settings.railHeight - RAIL_BOTTOM_PADDING);
  const [showSettings, setShowSettings] = useState(false);
  const [cachedApps, setCachedApps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const { alphabet: activeAlphabet } = useRailAlphabet(cachedApps);
  const [scrollOffset, setScrollOffset] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [favoritesHeight, setFavoritesHeight] = useState(
    settings.favoritesHeightMode === 'fixed' ? settings.favoritesFixedHeight : 300
  );
  const [scrubItems, setScrubItems] = useState<FlatItem[]>([]);
  const scrubOpacity = useRef(new Animated.Value(0)).current;
  const scrubLetterRef = useRef<string | null>(null);

  // ===== Context Menu & Edit Dialog State =====
  const [contextMenuVisible, setContextMenuVisible] = useState(false);
  const [contextMenuApp, setContextMenuApp] = useState<AppInfo | null>(null);
  const [editDialogVisible, setEditDialogVisible] = useState(false);
  const [editDialogApp, setEditDialogApp] = useState<AppInfo | null>(null);
  const [favorites, setFavorites] = useState<AppInfo[]>([]);
  const [customizations, setCustomizations] = useState<AppCustomizations>({});
  const [favoritesRefreshKey, setFavoritesRefreshKey] = useState(0);

  // ===== Refs =====
  const activeLetterRef = useRef<string | null>(null);
  const activeIndexRef = useRef(0);
  const isSlidingRef = useRef(false);
  const railHeightRef = useRef(settings.railHeight);
  const railTopRef = useRef(height - settings.railHeight - RAIL_BOTTOM_PADDING);
  const lastVibrateTime = useRef(0);
  const lastVibratedIndex = useRef(-1);
  const lastTouchY = useRef(0);
  const lastTouchTime = useRef(0);
  const touchVelocity = useRef(0);
  const flatListRef = useRef<FlatList>(null);
  const bubbleYAnim = useRef(new Animated.Value(0)).current;
  const activeIndexAnim = useRef(new Animated.Value(0)).current;
  const listOpacity = useRef(new Animated.Value(1)).current;
  const pullXAnim = useRef(new Animated.Value(0)).current;
  const favoritesHeightRef = useRef(favoritesHeight);
  const animationVersionRef = useRef(0);
  const [colorSource, setColorSource] = useState<'rail' | 'list'>('list');
  const scrollOffsetRef = useRef(0);
  const settingsRef = useRef(settings);
  const activeAlphabetRef = useRef(activeAlphabet);

  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  useEffect(() => {
    activeAlphabetRef.current = activeAlphabet;
  }, [activeAlphabet]);

  useEffect(() => { railHeightRef.current = settings.railHeight; }, [settings.railHeight]);
  useEffect(() => { favoritesHeightRef.current = favoritesHeight; }, [favoritesHeight]);

  const fixedRailTop = useMemo(() => height - settings.railHeight - RAIL_BOTTOM_PADDING, [settings.railHeight]);
  const fixedRailTopRef = useRef(fixedRailTop);
  useEffect(() => { fixedRailTopRef.current = fixedRailTop; }, [fixedRailTop]);

  // ===== 预计算列表数据 =====
  const { flatItems, letterIndexMap, itemOffsets } = useMemo(() => {
    const result = buildFlatList(cachedApps, favoritesHeight);
    return {
      flatItems: result.items,
      letterIndexMap: result.letterIndices,
      itemOffsets: result.offsets,
    };
  }, [cachedApps, favoritesHeight]);

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
      if (settings.enableBackToFavorites && scrollOffset > 0) {
        flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
        return true;
      }
      return false;
    });
    return () => handler.remove();
  }, [showSettings, scrollOffset, settings.enableBackToFavorites, contextMenuVisible, editDialogVisible]);

  useEffect(() => {
    Animated.timing(listOpacity, { toValue: 1, duration: 180, useNativeDriver: true }).start();
  }, []);

  // ===== 核心 handleTouch =====
  const handleTouchRef = useRef<(y: number, currentRailTop: number) => void>();

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
    
    setColorSource('rail');
    setActiveIndex(idx);
    activeIndexAnim.setValue(idx);
    
    bubbleYAnim.setValue(yPosition);

    // 字母变化时震动反馈
    if (settings.enableVibration && idx !== lastVibratedIndex.current) {
      lastVibratedIndex.current = idx;
      triggerHaptic(settings.vibrationEffect, settings.vibrationIntensity);
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
        setScrubItems(data.items);
        setScrubOffsets(data.offsets);
      } else {
        setScrubItems([]);
        setScrubOffsets([]);
      }
    }
  };

  const handleGrantRef = useRef<(y: number, side: 'left' | 'right') => void>();

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
    
    setColorSource('rail');
    setActiveIndex(idx);
    activeIndexAnim.setValue(idx);
    
    bubbleYAnim.setValue(y0);
    
    // 首次选中时强震动反馈
    if (settings.enableVibration) {
      triggerHaptic(settings.vibrationEffect, 5);
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
        setScrubItems(data.items);
        setScrubOffsets(data.offsets);
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
        handleGrantRef.current?.(gs.y0, side);
      },
      onPanResponderMove: (_, gs) => {
        handleTouchRef.current?.(gs.moveY, railTopRef.current);
        const maxPull = width - 100;
        const defaultPull = 80;
        const pull = side === 'right'
          ? Math.max(0, -gs.dx)
          : Math.max(0, gs.dx);
        const swipeThreshold = 40;
        const finalPull = pull > swipeThreshold ? Math.min(defaultPull + pull - swipeThreshold, maxPull) : defaultPull;
        pullXAnim.setValue(finalPull);
      },
      onPanResponderRelease: () => {
        isSlidingRef.current = false;
        const currentVersion = animationVersionRef.current;

        // 退出 Scrub：淡出 overlay
        if (scrubLetterRef.current) {
          scrubLetterRef.current = null;
          Animated.parallel([
            Animated.timing(scrubOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(listOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
          ]).start(() => {
            setScrubItems([]);
            setScrubOffsets([]);
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
        const currentVersion = animationVersionRef.current;

        // 退出 Scrub
        if (scrubLetterRef.current) {
          scrubLetterRef.current = null;
          Animated.parallel([
            Animated.timing(scrubOpacity, { toValue: 0, duration: 180, useNativeDriver: true }),
            Animated.timing(listOpacity, { toValue: 1, duration: 180, useNativeDriver: true }),
          ]).start(() => {
            setScrubItems([]);
            setScrubOffsets([]);
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
        setColorSource('list');
        setActiveIndex(idx);
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
            <Text style={[styles.sectionLetter, { color: settings.themeColor }]}>#</Text>
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
          <Text style={[styles.sectionLetter, { color: settings.themeColor }]}>{item.letter}</Text>
          {settings.showHeaderDivider && <View style={styles.sectionLine} />}
        </View>
      );
    }
    if (item._type === 'app') {
      const appItem = item as any as AppInfo;
      return (
        <View>
          <AppItem
            item={appItem}
            onPress={onLaunchApp}
            onLongPress={handleLongPressApp}
            customization={customizations[appItem.packageName]}
          />
          {settings.showDivider && <View style={styles.divider} />}
        </View>
      );
    }
    return null;
  }, [onLaunchApp, handleLongPressApp, customizations, settings.themeColor, settings.showDivider, settings.showHeaderDivider]);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: flatItems[index]?._type === 'header' ? HEADER_HEIGHT : settings.appItemHeight,
    offset: itemOffsets[index] || 0,
    index,
  }), [flatItems, itemOffsets, settings.appItemHeight]);

  const keyExtractor = useCallback((item: FlatItem) => item.id, []);

  const getScrubItemLayout = useCallback((_: any, index: number) => ({
    length: scrubItems[index]?._type === 'header' ? HEADER_HEIGHT : settings.appItemHeight,
    offset: scrubOffsets[index] || 0,
    index,
  }), [scrubItems, scrubOffsets, settings.appItemHeight]);

  // ===== Render =====
  if (loading || !isLoaded) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator size="large" color={settings.themeColor} />
        <Text style={styles.hintText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const bgEnabled = settings.enableBackgroundImage && settings.wallpapers.length > 0;
  const containerBg = bgEnabled ? 'transparent' : '#06060c';
  const listBg = bgEnabled ? `rgba(6,6,12,${settings.listBgOpacity})` : 'transparent';

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      <StatusBar barStyle="light-content" backgroundColor="#06060c" />
      <WallpaperBackground />

      {settings.showTouchZone && (
        <>
          <View style={[styles.touchZoneDebug, { left: 0 }]} />
          <View style={[styles.touchZoneDebug, { right: 0 }]} />
        </>
      )}

      <View style={styles.gestureStripLeft} {...leftPanResponder.panHandlers} />

      <View style={[styles.appArea, { backgroundColor: listBg }]}>
        <Animated.View style={[styles.listContainer, { opacity: listOpacity }]}>
          <FlatList
            ref={flatListRef}
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
                  if (settings.favoritesHeightMode === 'auto') {
                    setFavoritesHeight(h);
                  }
                }}
                onLongPressApp={handleLongPressApp}
                customizations={customizations}
                refreshKey={favoritesRefreshKey}
              />
            }
            onScroll={(e) => {
              const y = e.nativeEvent.contentOffset.y;
              setScrollOffset(y);
              scrollOffsetRef.current = y;
            }}
            scrollEventThrottle={16}
          />
        </Animated.View>
      </View>

      {/* Scrub 遮罩 */}
      {scrubItems.length > 0 && (
        <Animated.View style={[styles.scrubOverlay, { opacity: scrubOpacity }]} pointerEvents="none">
          <View style={{ flex: 1 }}>
            <FlatList
              data={scrubItems}
              keyExtractor={keyExtractor}
              renderItem={renderItem}
              getItemLayout={getScrubItemLayout}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: height * settings.focusScrollRatio }}
            />
          </View>
        </Animated.View>
      )}

      <View style={styles.gestureStripRight} {...rightPanResponder.panHandlers} />

      {isSliding && (
        <AlphabetBubble
          activeIndexAnim={activeIndexAnim}
          railTop={railTop}
          railHeight={settings.railHeight}
          pullX={pullXAnim}
          side={settings.railSide}
          apps={cachedApps}
        />
      )}

      <LetterRail
        activeIndex={activeIndex}
        activeIndexAnim={activeIndexAnim}
        isSliding={isSliding}
        colorSource={colorSource}
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
        onClose={handleCloseContextMenu}
        onToggleFavorite={handleToggleFavorite}
        onEdit={handleOpenEdit}
      />

      {/* Edit Dialog */}
      <EditAppDialog
        visible={editDialogVisible}
        app={editDialogApp}
        existingCustomization={editDialogApp ? customizations[editDialogApp.packageName] : undefined}
        onClose={() => setEditDialogVisible(false)}
        onSave={handleSaveCustomization}
      />
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
  listContainer: { flex: 1 },
  listContent: { paddingBottom: 80 },
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
});
