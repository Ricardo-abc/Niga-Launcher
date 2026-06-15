import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  LayoutChangeEvent,
  Dimensions,
  ScrollView,
  PanResponder,
  Animated,
  LayoutAnimation,
  UIManager,
  Platform,
  AppState,
  Vibration,
} from 'react-native';
const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');
import { loadFavorites, launchApplication, getFrequentlyUsedApps, requestUsageStatsPermission } from '../services/AppService';
import { useSettingsContext } from '../context/SettingsContext';
import { AppInfo, AppCustomizations } from '../types/settings';
import { LETTER_COLORS } from '../constants/defaultSettings';
import { t } from '../i18n';

// 启用 Android LayoutAnimation 实验性功能
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface FavoritesHeaderProps {
  onLayout?: (height: number) => void;
  onLongPressApp?: (app: AppInfo) => void;
  customizations?: AppCustomizations;
  refreshKey?: number;
  // 新增编辑状态相关属性
  isEditing?: boolean;
  favorites?: AppInfo[];
  tempFavorites?: AppInfo[];
  allApps?: AppInfo[];
  onToggleFavorite?: (app: AppInfo) => void;
  onOrderChange?: (newFavs: AppInfo[]) => void;
  onCloseEdit?: () => void;
  onCancelEdit?: () => void;
}

// 拖拽排序单个 Item 子组件
const DraggableFavoriteItem: React.FC<{
  app: AppInfo;
  index: number;
  favorites: AppInfo[];
  customizations: AppCustomizations;
  onOrderChange?: (newFavs: AppInfo[]) => void;
  onToggleFavorite?: (app: AppInfo) => void;
  themeColor: string;
  settings: any;
}> = ({ app, index, favorites, customizations, onOrderChange, onToggleFavorite, themeColor, settings }) => {
  const translateY = useRef(new Animated.Value(0)).current;
  const itemOpacity = useRef(new Animated.Value(1)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const [isDragging, setIsDragging] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);

  // 记录开始拖动时的 index 和拖动中的当前 index，避免 closure 闭包数据过期
  const startIndexRef = useRef(index);
  const currentIndexRef = useRef(index);

  const propsRef = useRef({ favorites, index, onOrderChange, app });
  propsRef.current = { favorites, index, onOrderChange, app };

  useEffect(() => {
    if (!isDragging) {
      startIndexRef.current = index;
      currentIndexRef.current = index;
    }
  }, [index, isDragging]);

  const dragActiveRef = useRef(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handleTouchStart = (e: any) => {
    if (isRemoving) return;
    const pageX = e.nativeEvent.pageX;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    const handleThreshold = SCREEN_WIDTH - 80; // 右侧 80px 为手柄判定区
    if (pageX >= handleThreshold) {
      // 瞬间激活手柄拖拽
      dragActiveRef.current = true;
      setIsDragging(true);
      if (settings.enableVibration) {
        Vibration.vibrate(12);
      }
      Animated.spring(dragScale, {
        toValue: 1.04,
        useNativeDriver: true,
        tension: 300,
        friction: 20,
      }).start();
    } else {
      // 长按 220ms 激活卡片主体拖拽
      dragActiveRef.current = false;
      longPressTimerRef.current = setTimeout(() => {
        dragActiveRef.current = true;
        setIsDragging(true);
        if (settings.enableVibration) {
          Vibration.vibrate(12);
        }
        Animated.spring(dragScale, {
          toValue: 1.04,
          useNativeDriver: true,
          tension: 300,
          friction: 20,
        }).start();
      }, 220);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isRemoving && dragActiveRef.current,
      onMoveShouldSetPanResponder: (evt, gestureState) => {
        if (isRemoving) return false;
        if (!dragActiveRef.current) {
          // 在长按未激活前，如果用户手指移动超过 8px，说明意图是滑动列表，立刻放弃手势并清除定时器
          if (Math.abs(gestureState.dx) > 8 || Math.abs(gestureState.dy) > 8) {
            if (longPressTimerRef.current) {
              clearTimeout(longPressTimerRef.current);
              longPressTimerRef.current = null;
            }
          }
          return false;
        }
        return true;
      },
      onPanResponderTerminationRequest: () => !dragActiveRef.current,
      onPanResponderGrant: () => {
        startIndexRef.current = propsRef.current.index;
        currentIndexRef.current = propsRef.current.index;
      },
      onPanResponderMove: (_, gestureState) => {
        if (!dragActiveRef.current) return;

        const { favorites: currentFavs, app: currentApp, onOrderChange: triggerOrderChange } = propsRef.current;
        const dy = gestureState.dy;
        const itemHeightVal = 64;
        const swapCount = Math.round(dy / itemHeightVal);
        const targetIndex = Math.max(0, Math.min(currentFavs.length - 1, startIndexRef.current + swapCount));

        // 计算当前项相对新 Layout 位置的视觉偏移量
        const currentOffset = dy - (targetIndex - startIndexRef.current) * itemHeightVal;
        translateY.setValue(currentOffset);

        if (targetIndex !== currentIndexRef.current) {
          const newFavs = [...currentFavs];
          const curIdx = newFavs.indexOf(currentApp);
          if (curIdx !== -1 && targetIndex !== curIdx) {
            newFavs.splice(curIdx, 1);
            newFavs.splice(targetIndex, 0, currentApp);
            
            // 每次交换位置时进行微震反馈
            if (settings.enableVibration) {
              Vibration.vibrate(8);
            }
            
            currentIndexRef.current = targetIndex;
            // 实时应用过渡动画并回调父组件
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
            triggerOrderChange?.(newFavs);
          }
        }
      },
      onPanResponderRelease: () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        dragActiveRef.current = false;
        setIsDragging(false);
        Animated.parallel([
          Animated.spring(dragScale, {
            toValue: 1,
            useNativeDriver: true,
            tension: 200,
            friction: 15,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 200,
            friction: 15,
          })
        ]).start();
      },
      onPanResponderTerminate: () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
        dragActiveRef.current = false;
        setIsDragging(false);
        Animated.parallel([
          Animated.spring(dragScale, {
            toValue: 1,
            useNativeDriver: true,
          }),
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          })
        ]).start();
      },
    })
  ).current;

  const handleRemove = () => {
    setIsRemoving(true);
    if (settings.enableVibration) {
      Vibration.vibrate(10);
    }
    Animated.parallel([
      Animated.timing(dragScale, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(itemOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start(() => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      onToggleFavorite?.(app);
    });
  };

  const custom = customizations[app.packageName] || {};
  const displayName = custom.customName || app.name;
  const displayIcon = custom.customIcon || app.icon;
  const hasIcon = !!displayIcon && displayIcon.length > 5;
  const bgColor = LETTER_COLORS[app.letter] || '#6366f1';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';

  return (
    <Animated.View
      style={[
        styles.dragItem,
        {
          opacity: itemOpacity,
          transform: [{ translateY }, { scale: dragScale }],
          zIndex: isDragging ? 10 : 1,
          backgroundColor: isDragging ? 'rgba(255, 255, 255, 0.12)' : 'transparent',
          borderRadius: isDragging ? 12 : 0,
          shadowColor: isDragging ? '#000' : 'transparent',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: isDragging ? 0.3 : 0,
          shadowRadius: isDragging ? 10 : 0,
          elevation: isDragging ? 8 : 0,
          overflow: 'hidden',
        },
      ]}
    >
      <TouchableOpacity
        style={styles.dragItemRemove}
        onPress={handleRemove}
        activeOpacity={0.6}
        disabled={isRemoving || isDragging}
      >
        <View style={styles.removeCircle}>
          <Text style={styles.removeText}>−</Text>
        </View>
      </TouchableOpacity>

      <View
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        {...panResponder.panHandlers}
        style={styles.dragItemMain}
      >
        {hasIcon ? (
          <Image source={{ uri: displayIcon }} style={[styles.dragItemIcon, { borderRadius: settings.iconBorderRadius }]} />
        ) : (
          <View style={[styles.dragItemIcon, styles.dragItemFallbackIcon, { backgroundColor: bgColor, borderRadius: settings.iconBorderRadius }]}>
            <Text style={styles.dragItemFallbackText}>{initial}</Text>
          </View>
        )}

        <Text style={styles.dragItemName} numberOfLines={1}>
          {displayName}
        </Text>

        <View style={styles.dragHandle}>
          <Text style={styles.dragHandleText}>☰</Text>
        </View>
      </View>
    </Animated.View>
  );
};

const FavoritesHeader: React.FC<FavoritesHeaderProps> = ({
  onLayout,
  onLongPressApp,
  customizations = {},
  refreshKey,
  isEditing = false,
  favorites: favoritesProp,
  tempFavorites,
  allApps = [],
  onToggleFavorite,
  onOrderChange,
  onCloseEdit,
  onCancelEdit,
}) => {
  const { settings } = useSettingsContext();
  const [internalFavorites, setInternalFavorites] = useState<AppInfo[]>([]);
  const [time, setTime] = useState(new Date());

  // 推荐应用与系统访问权限状态
  const [frequentApps, setFrequentApps] = useState<AppInfo[]>([]);
  const [hasUsagePermission, setHasUsagePermission] = useState(false);

  const themeColor = settings.themeColor === 'auto' ? (settings.currentWallpaperDominantColor || '#3b82f6') : settings.themeColor;

  useEffect(() => {
    if (favoritesProp === undefined) {
      loadFavorites().then(setInternalFavorites);
    }
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (refreshKey !== undefined && favoritesProp === undefined) {
      loadFavorites().then(setInternalFavorites);
    }
  }, [refreshKey, favoritesProp]);

  const favorites = favoritesProp !== undefined ? favoritesProp : internalFavorites;

  // 加载频繁使用推荐应用
  const loadFrequentApps = async () => {
    if (!allApps || allApps.length === 0) return;
    const { apps, hasPermission } = await getFrequentlyUsedApps(allApps, 8);
    setFrequentApps(apps);
    setHasUsagePermission(hasPermission);
  };

  useEffect(() => {
    if (isEditing) {
      loadFrequentApps();
    }
  }, [isEditing, allApps, favorites]);

  // 当从系统设置返回时重新加载权限与数据
  useEffect(() => {
    if (isEditing) {
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'active') {
          loadFrequentApps();
        }
      });
      return () => subscription.remove();
    }
  }, [isEditing, allApps]);

  const handleRequestPermission = () => {
    requestUsageStatsPermission();
  };

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  const dateStr = time.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const handleLaunchApp = (app: AppInfo) => {
    launchApplication(app.packageName);
  };

  const handleLongPress = (app: AppInfo) => {
    onLongPressApp?.(app);
  };

  const handleLayout = (e: LayoutChangeEvent) => {
    if (onLayout) {
      onLayout(e.nativeEvent.layout.height);
    }
  };

  const favIconSize = settings.favIconSize;
  const numColumns = settings.favColumns;

  // 将收藏应用按列分组 (非编辑状态下网格布局用)
  const rows: AppInfo[][] = [];
  for (let i = 0; i < favorites.length; i += numColumns) {
    rows.push(favorites.slice(i, i + numColumns));
  }

  const getDisplayInfo = (app: AppInfo) => {
    const custom = customizations[app.packageName];
    return {
      name: custom?.customName || app.name,
      icon: custom?.customIcon || app.icon,
    };
  };

  const renderNormalListItem = (app: AppInfo) => {
    const display = getDisplayInfo(app);
    const iconSize = settings.iconSize;
    const itemHeight = settings.appItemHeight;
    const borderRadius = settings.iconBorderRadius;
    const bgColor = LETTER_COLORS[app.letter] || '#6366f1';
    const hasIcon = !!display.icon && display.icon.length > 5;

    return (
      <TouchableOpacity
        key={app.id}
        style={[styles.listItem, { height: itemHeight }]}
        onPress={() => handleLaunchApp(app)}
        onLongPress={() => handleLongPress(app)}
        delayLongPress={400}
        activeOpacity={0.5}
      >
        {hasIcon ? (
          <Image
            source={{ uri: display.icon }}
            style={[styles.listIcon, { width: iconSize, height: iconSize, borderRadius }]}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.listFallbackIcon, { width: iconSize, height: iconSize, borderRadius, backgroundColor: bgColor }]}>
            <Text style={[styles.listFallbackText, { fontSize: iconSize * 0.43 }]}>{display.name.charAt(0).toUpperCase()}</Text>
          </View>
        )}
        <Text style={[styles.listAppName, { fontSize: settings.appNameFontSize * settings.fontScale }]} numberOfLines={1}>{display.name}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <View
      style={[
        styles.container,
        { minHeight: SCREEN_HEIGHT }
      ]}
      onLayout={handleLayout}
    >
      {isEditing ? (
        <View style={{ height: 48, marginBottom: 24 }} />
      ) : (
        <View style={styles.topSection}>
          <Text style={[styles.clockText, { fontSize: 64 * settings.fontScale }]}>{hours}:{minutes}</Text>
          <Text style={styles.dateText}>{dateStr}</Text>
          <Text style={styles.hintText}>{t('favorites.hint')}</Text>
        </View>
      )}

      {isEditing && (
        <View style={styles.recommendSection}>
          <Text style={styles.recommendTitle}>最近7天频繁使用推荐</Text>
          
          {!hasUsagePermission && (
            <View style={styles.permissionPrompt}>
              <Text style={styles.permissionPromptText}>💡 授权读取系统使用记录以推荐常用应用</Text>
              <TouchableOpacity
                onPress={handleRequestPermission}
                style={[styles.permissionBtn, { backgroundColor: themeColor }]}
                activeOpacity={0.7}
              >
                <Text style={styles.permissionBtnText}>去授权</Text>
              </TouchableOpacity>
            </View>
          )}

          {frequentApps.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recommendList}>
              {frequentApps.map((app) => {
                const display = getDisplayInfo(app);
                const checkList = tempFavorites || favorites;
                const isFav = checkList.some(fav => fav.packageName === app.packageName);
                const hasIcon = !!display.icon && display.icon.length > 5;
                const bgColor = LETTER_COLORS[app.letter] || '#6366f1';
                
                return (
                  <TouchableOpacity
                    key={`rec-${app.packageName}`}
                    style={styles.recommendCard}
                    onPress={() => onToggleFavorite?.(app)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recommendIconContainer}>
                      {hasIcon ? (
                        <Image
                          source={{ uri: display.icon }}
                          style={[styles.recommendIcon, { borderRadius: settings.iconBorderRadius }]}
                        />
                      ) : (
                        <View style={[styles.recommendIcon, styles.recommendFallbackIcon, { backgroundColor: bgColor, borderRadius: settings.iconBorderRadius }]}>
                          <Text style={[styles.recommendFallbackText, { fontSize: 20 }]}>{display.name.charAt(0).toUpperCase()}</Text>
                        </View>
                      )}
                      
                      <View style={[
                        styles.recommendBadge,
                        {
                          backgroundColor: isFav ? themeColor : 'rgba(0, 0, 0, 0.5)',
                          borderColor: isFav ? themeColor : 'rgba(255, 255, 255, 0.4)',
                        }
                      ]}>
                        {isFav && <Text style={styles.recommendBadgeText}>✓</Text>}
                      </View>
                    </View>
                    <Text style={styles.recommendAppName} numberOfLines={1}>{display.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <Text style={styles.noRecommendText}>暂无推荐应用</Text>
          )}
        </View>
      )}

      {isEditing ? (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>拖动 ☰ 调整顺序</Text>
          {favorites.length > 0 ? (
            <View style={styles.dragList}>
              {favorites.map((app, index) => (
                <DraggableFavoriteItem
                  key={`drag-${app.packageName}`}
                  app={app}
                  index={index}
                  favorites={favorites}
                  customizations={customizations}
                  onOrderChange={onOrderChange}
                  onToggleFavorite={onToggleFavorite}
                  themeColor={themeColor}
                  settings={settings}
                />
              ))}
            </View>
          ) : (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>{t('favorites.emptyText')}</Text>
            </View>
          )}
        </View>
      ) : favorites.length > 0 ? (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>{t('favorites.sectionTitle')}</Text>
          {settings.favoritesDisplayStyle === 'list' ? (
            <View style={styles.favoritesList}>
              {favorites.map((app) => renderNormalListItem(app))}
            </View>
          ) : (
            <View style={styles.favoritesGrid}>
              {rows.map((row, rowIndex) => (
                <View key={rowIndex} style={styles.favoritesRow}>
                  {row.map((app) => {
                    const display = getDisplayInfo(app);
                    return (
                      <TouchableOpacity
                        key={app.id}
                        style={[styles.favoriteItem, { width: `${100 / numColumns}%` as any }]}
                        onPress={() => handleLaunchApp(app)}
                        onLongPress={() => handleLongPress(app)}
                        delayLongPress={400}
                        activeOpacity={0.7}
                      >
                        {display.icon ? (
                          <Image source={{ uri: display.icon }} style={[styles.appIcon, { width: favIconSize, height: favIconSize }]} />
                        ) : (
                          <View style={[styles.appIcon, styles.fallbackIcon, { width: favIconSize, height: favIconSize }]}>
                            <Text style={[styles.fallbackText, { fontSize: favIconSize * 0.42 }]}>{display.name.charAt(0)}</Text>
                          </View>
                        )}
                        <Text style={[styles.appName, { fontSize: 11 * settings.fontScale }]} numberOfLines={1}>{display.name}</Text>
                      </TouchableOpacity>
                    );
                  })}
                  {row.length < numColumns && Array.from({ length: numColumns - row.length }).map((_, i) => (
                    <View key={`empty-${i}`} style={[styles.favoriteItem, { width: `${100 / numColumns}%` as any }]} />
                  ))}
                </View>
              ))}
            </View>
          )}
        </View>
      ) : (
        <View style={styles.emptySection}>
          <Text style={styles.emptyIcon}>{t('favorites.emptyIcon')}</Text>
          <Text style={styles.emptyText}>{t('favorites.emptyText')}</Text>
          <Text style={styles.emptyHint}>{t('favorites.emptyHint')}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 60,
    paddingBottom: 20,
    justifyContent: 'flex-start',
  },
  topSection: {
    marginBottom: 20,
  },
  clockText: {
    color: '#fff',
    fontWeight: '200',
    letterSpacing: 2,
  },
  dateText: {
    fontSize: 16,
    color: '#888',
    marginTop: 8,
    fontWeight: '400',
  },
  hintText: {
    fontSize: 14,
    color: '#444',
    marginTop: 24,
    fontStyle: 'italic',
  },
  favoritesSection: {
    width: '100%',
  },
  sectionTitle: {
    color: '#888',
    fontSize: 14,
    marginBottom: 12,
    fontWeight: '600',
  },
  favoritesGrid: {
    paddingHorizontal: 4,
  },
  favoritesRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  favoriteItem: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  appIcon: {
    borderRadius: 12,
    marginBottom: 6,
  },
  fallbackIcon: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  appName: {
    color: '#ccc',
    textAlign: 'center',
  },
  emptySection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  emptyIcon: {
    fontSize: 48,
    color: '#333',
    marginBottom: 16,
  },
  emptyText: {
    color: '#666',
    fontSize: 16,
    marginBottom: 8,
  },
  emptyHint: {
    color: '#444',
    fontSize: 12,
  },
  favoritesList: {
    paddingHorizontal: 4,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  listIcon: {
    marginRight: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  listFallbackIcon: {
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listFallbackText: {
    color: '#fff',
    fontWeight: '700',
  },
  listAppName: {
    flex: 1,
    color: '#e0e0e0',
    fontWeight: '500',
  },

  // 编辑模式 Header
  editHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
    marginBottom: 24,
  },
  editHeaderBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  cancelBtnText: {
    color: '#aaa',
    fontSize: 16,
    fontWeight: '500',
  },
  editHeaderTitle: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  editHeaderRight: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedCountText: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
  },

  // Draggable Item Styles
  dragList: {
    marginVertical: 4,
  },
  dragItem: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  dragItemMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
  },
  dragItemRemove: {
    marginRight: 12,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  removeCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    lineHeight: 18,
  },
  dragItemIcon: {
    width: 40,
    height: 40,
    marginRight: 14,
  },
  dragItemFallbackIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragItemFallbackText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dragItemName: {
    flex: 1,
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  dragHandle: {
    paddingHorizontal: 16,
    paddingVertical: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dragHandleText: {
    color: '#888',
    fontSize: 18,
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: 'center',
  },

  // 推荐区域样式
  recommendSection: {
    marginBottom: 24,
  },
  recommendTitle: {
    color: '#888',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  recommendList: {
    paddingVertical: 4,
  },
  recommendCard: {
    width: 70,
    alignItems: 'center',
    marginRight: 14,
  },
  recommendIconContainer: {
    position: 'relative',
    marginBottom: 6,
  },
  recommendIcon: {
    width: 48,
    height: 48,
  },
  recommendFallbackIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  recommendFallbackText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  recommendBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#000',
  },
  recommendBadgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    lineHeight: 12,
  },
  recommendAppName: {
    color: '#aaa',
    fontSize: 11,
    textAlign: 'center',
    width: '100%',
  },
  noRecommendText: {
    color: '#555',
    fontSize: 13,
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  permissionPrompt: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  permissionPromptText: {
    flex: 1,
    color: '#aaa',
    fontSize: 13,
  },
  permissionBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  permissionBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
});

export default FavoritesHeader;
