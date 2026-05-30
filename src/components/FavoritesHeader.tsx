import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, LayoutChangeEvent, Dimensions } from 'react-native';
const { height: SCREEN_HEIGHT } = Dimensions.get('window');
import { loadFavorites, launchApplication } from '../services/AppService';
import { useSettingsContext } from '../context/SettingsContext';
import { AppInfo, AppCustomizations } from '../types/settings';
import { LETTER_COLORS } from '../constants/defaultSettings';
import { t } from '../i18n';

interface FavoritesHeaderProps {
  onLayout?: (height: number) => void;
  onLongPressApp?: (app: AppInfo) => void;
  customizations?: AppCustomizations;
  refreshKey?: number;
}

const FavoritesHeader: React.FC<FavoritesHeaderProps> = ({
  onLayout,
  onLongPressApp,
  customizations = {},
  refreshKey,
}) => {
  const { settings } = useSettingsContext();
  const [favorites, setFavorites] = useState<AppInfo[]>([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    loadFavorites().then(setFavorites);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (refreshKey !== undefined) {
      loadFavorites().then(setFavorites);
    }
  }, [refreshKey]);

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


  // 将收藏应用按列分组
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

  const renderListItem = (app: AppInfo) => {
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
      <View style={styles.topSection}>
        <Text style={[styles.clockText, { fontSize: 64 * settings.fontScale }]}>{hours}:{minutes}</Text>
        <Text style={styles.dateText}>{dateStr}</Text>
        <Text style={styles.hintText}>{t('favorites.hint')}</Text>
      </View>

      {favorites.length > 0 ? (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>{t('favorites.sectionTitle')}</Text>
          {settings.favoritesDisplayStyle === 'list' ? (
            <View style={styles.favoritesList}>
              {favorites.map((app) => renderListItem(app))}
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
                  {/* 填充空位 */}
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
});

export default FavoritesHeader;
