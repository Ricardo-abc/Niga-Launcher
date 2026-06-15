import React, { useState, useRef } from 'react';
import { StyleSheet, Text, TouchableOpacity, Image, View, Animated } from 'react-native';
import { useSettingsContext } from '../context/SettingsContext';
import { LETTER_COLORS } from '../constants/defaultSettings';
import { AppInfo, AppCustomization } from '../types/settings';

interface AppItemProps {
  item: AppInfo;
  onPress: (packageName: string) => void;
  onLongPress?: (item: AppInfo) => void;
  customization?: AppCustomization;
  isEditing?: boolean;
  isFavorite?: boolean;
}

const AppItem: React.FC<AppItemProps> = React.memo(({ item, onPress, onLongPress, customization, isEditing = false, isFavorite = false }) => {
  const { settings } = useSettingsContext();
  const [iconError, setIconError] = useState(false);

  // 点击微动效 Animated Values
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const bgOpacityAnim = useRef(new Animated.Value(0)).current;

  const themeColor = settings.themeColor === 'auto' ? (settings.currentWallpaperDominantColor || '#3b82f6') : settings.themeColor;
  const displayName = customization?.customName || item.name;
  const displayIcon = customization?.customIcon || item.icon;
  const hasIcon = !!displayIcon && displayIcon.length > 5 && !iconError;
  const bgColor = LETTER_COLORS[item.letter] || '#6366f1';
  const initial = displayName ? displayName.charAt(0).toUpperCase() : '?';
  const iconSize = settings.iconSize;
  const itemHeight = settings.appItemHeight;
  const borderRadius = settings.iconBorderRadius;

  const handlePressIn = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0.8,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      }),
      Animated.timing(bgOpacityAnim, {
        toValue: 1,
        duration: 90,
        useNativeDriver: true,
      })
    ]).start();
  };

  const handlePressOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 250,
        useNativeDriver: true,
      }),
      Animated.spring(opacityAnim, {
        toValue: 1,
        friction: 8,
        tension: 250,
        useNativeDriver: true,
      }),
      Animated.spring(rotateAnim, {
        toValue: 0,
        friction: 6,
        tension: 200,
        useNativeDriver: true,
      }),
      Animated.spring(bgOpacityAnim, {
        toValue: 0,
        friction: 8,
        tension: 250,
        useNativeDriver: true,
      })
    ]).start();
  };

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '-1.5deg'],
  });

  return (
    <TouchableOpacity
      style={[styles.appItem, { height: itemHeight }]}
      activeOpacity={1}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      onPress={() => onPress(item.packageName!)}
      onLongPress={() => !isEditing && onLongPress?.(item)}
      delayLongPress={400}
    >
      <Animated.View
        style={[
          styles.pressBg,
          {
            opacity: bgOpacityAnim,
          }
        ]}
      />
      <Animated.View
        style={[
          styles.innerContainer,
          {
            transform: [
              { scale: scaleAnim },
              { rotate }
            ],
            opacity: opacityAnim,
          }
        ]}
      >
        {hasIcon ? (
          <Image
            source={{ uri: displayIcon }}
            style={[styles.appIcon, { width: iconSize, height: iconSize, borderRadius }]}
            onError={() => setIconError(true)}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.fallbackIcon, { width: iconSize, height: iconSize, borderRadius, backgroundColor: bgColor }]}>
            <Text style={[styles.fallbackText, { fontSize: iconSize * 0.43 }]}>{initial}</Text>
          </View>
        )}
        <Text style={[styles.appName, { fontSize: settings.appNameFontSize * settings.fontScale }]} numberOfLines={1}>{displayName}</Text>
      </Animated.View>

      {isEditing && (
        <View
          style={[
            styles.checkbox,
            isFavorite
              ? { backgroundColor: themeColor, borderColor: themeColor }
              : { borderColor: 'rgba(255, 255, 255, 0.3)' }
          ]}
        >
          {isFavorite && <Text style={styles.checkmark}>✓</Text>}
        </View>
      )}
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  appItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  pressBg: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
    borderRadius: 12,
  },
  innerContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  appIcon: {
    marginRight: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  fallbackIcon: {
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#fff',
    fontWeight: '700',
  },
  appName: {
    flex: 1,
    color: '#e0e0e0',
    fontWeight: '500',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkmark: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold',
    lineHeight: 15,
  },
});

export default AppItem;
