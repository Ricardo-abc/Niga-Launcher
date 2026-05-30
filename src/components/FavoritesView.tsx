import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList, Image, Alert } from 'react-native';
import { loadFavorites, removeFromFavorites, launchApplication } from '../services/AppService';
import { useSettingsContext } from '../context/SettingsContext';

import { AppInfo } from '../types/settings';

interface FavoritesViewProps {
  onOpenSettings?: () => void;
  onShowAllApps?: () => void;
}

const FavoritesView: React.FC<FavoritesViewProps> = () => {
  const { settings } = useSettingsContext();
  const [favorites, setFavorites] = useState<AppInfo[]>([]);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    loadFavorites().then(setFavorites);
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const hours = time.getHours().toString().padStart(2, '0');
  const minutes = time.getMinutes().toString().padStart(2, '0');

  const dateStr = time.toLocaleDateString('zh-CN', {
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  });

  const handleRemoveFavorite = (app: AppInfo) => {
    Alert.alert(
      '移除收藏',
      `确定要从收藏中移除 "${app.name}" 吗？`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '移除',
          style: 'destructive',
          onPress: async () => {
            const newFavorites = await removeFromFavorites(app.packageName, favorites);
            setFavorites(newFavorites);
          },
        },
      ]
    );
  };

  const handleLaunchApp = (app: AppInfo) => {
    launchApplication(app.packageName);
  };

  const favIconSize = settings.favIconSize;
  const numColumns = settings.favColumns;
  const itemWidth = `${100 / numColumns}%` as any;

  const renderFavoriteItem = ({ item }: { item: AppInfo }) => (
    <TouchableOpacity
      style={[styles.favoriteItem, { width: itemWidth }]}
      onPress={() => handleLaunchApp(item)}
      onLongPress={() => handleRemoveFavorite(item)}
      activeOpacity={0.7}
    >
      {item.icon ? (
        <Image source={{ uri: item.icon }} style={[styles.appIcon, { width: favIconSize, height: favIconSize }]} />
      ) : (
        <View style={[styles.appIcon, styles.fallbackIcon, { width: favIconSize, height: favIconSize }]}>
          <Text style={[styles.fallbackText, { fontSize: favIconSize * 0.42 }]}>{item.name.charAt(0)}</Text>
        </View>
      )}
      <Text style={[styles.appName, { fontSize: 11 * settings.fontScale }]} numberOfLines={1}>{item.name}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.topSection}>
        <Text style={[styles.clockText, { fontSize: 64 * settings.fontScale }]}>{hours}:{minutes}</Text>
        <Text style={styles.dateText}>{dateStr}</Text>
        <Text style={styles.hintText}>★ 收藏常用应用，长按可移除</Text>
      </View>

      {favorites.length > 0 ? (
        <View style={styles.favoritesSection}>
          <Text style={styles.sectionTitle}>收藏的应用</Text>
          <FlatList
            data={favorites}
            renderItem={renderFavoriteItem}
            keyExtractor={(item) => item.id}
            numColumns={numColumns}
            contentContainerStyle={styles.favoritesGrid}
          />
        </View>
      ) : (
        <View style={styles.emptySection}>
          <Text style={styles.emptyIcon}>★</Text>
          <Text style={styles.emptyText}>还没有收藏的应用</Text>
          <Text style={styles.emptyHint}>在全部应用中长按应用可添加到收藏</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 100,
  },
  topSection: {
    flex: 1,
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
    marginBottom: 20,
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
  favoriteItem: {
    alignItems: 'center',
    marginBottom: 20,
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
});

export default FavoritesView;
