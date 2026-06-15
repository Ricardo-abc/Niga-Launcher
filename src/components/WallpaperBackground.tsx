import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Animated, View, AppState } from 'react-native';
import { useSettingsContext } from '../context/SettingsContext';
import { isLiveWallpaperActive } from '../modules/WallpaperBridge';
import { resolveDimmingColor } from '../hooks/useSettings';

interface WallpaperBackgroundProps {
  scrollY?: Animated.Value;
  scrubOpacity?: Animated.Value;
  isEditing?: boolean;
}

const WallpaperBackground: React.FC<WallpaperBackgroundProps> = ({ scrollY, scrubOpacity, isEditing = false }) => {
  const { settings } = useSettingsContext();
  const [isServiceActive, setIsServiceActive] = useState(false);
  // 使用 React.useRef 保存动画值，防止重新创建
  const editDimVal = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(editDimVal, {
      toValue: isEditing ? 1 : 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isEditing]);

  useEffect(() => {
    let isMounted = true;
    const checkService = async () => {
      const active = await isLiveWallpaperActive();
      if (isMounted) setIsServiceActive(active);
    };
    checkService();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkService();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, [settings.currentWallpaperIndex, settings.wallpapers]);

  // Compute final dimming opacity dynamically based on auto-dimming settings
  const maxDimming = settings.enableAutoDimming
    ? (settings.currentWallpaperIsDark ? 0.2 : 0.55)
    : settings.wallpaperDimming;

  const dimmingTarget = settings.wallpaperDimmingTarget;
  const isAlways = dimmingTarget === 'always';
  const isScrub = !isAlways && Array.isArray(dimmingTarget) && dimmingTarget.includes('scrub');
  const isAppList = !isAlways && Array.isArray(dimmingTarget) && dimmingTarget.includes('appList');

  const finalOpacity = (() => {
    if (maxDimming === 0) {
      return 0;
    }

    if (isAlways) {
      return maxDimming;
    }

    if (isScrub && isAppList && scrubOpacity && scrollY) {
      const scrubPart = scrubOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [0, maxDimming],
      });
      const scrollPart = scrollY.interpolate({
        inputRange: [40, 200],
        outputRange: [0, maxDimming],
        extrapolate: 'clamp',
      });
      const combined = Animated.add(scrubPart, scrollPart);
      return combined.interpolate({
        inputRange: [0, maxDimming, maxDimming * 2],
        outputRange: [0, maxDimming, maxDimming],
        extrapolate: 'clamp',
      });
    }

    if (isScrub && scrubOpacity) {
      return scrubOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [0, maxDimming],
      });
    }

    if (isAppList && scrollY) {
      return scrollY.interpolate({
        inputRange: [40, 200],
        outputRange: [0, maxDimming],
        extrapolate: 'clamp',
      });
    }

    return 0;
  })();

  // 融合编辑模式的暗化：编辑时直接平滑过渡到用户设定的最大暗度 maxDimming，非编辑时使用 base 动态值
  const inverseEditDim = Animated.subtract(1, editDimVal);
  const basePart = Animated.multiply(finalOpacity as any, inverseEditDim);
  const editPart = Animated.multiply(editDimVal, maxDimming);
  const combinedOpacity = Animated.add(basePart, editPart);

  const overlayColor = resolveDimmingColor(settings);

  // If our live wallpaper service is rendering the wallpaper, we shouldn't draw the background image in JS.
  // However, we still need to draw the semi-transparent black overlay for 'scrub' and 'appList' modes.
  if (isServiceActive) {
    if (isAlways) return null;
    return (
      <View style={styles.container} pointerEvents="none">
        <Animated.View style={[styles.darkOverlay, { opacity: combinedOpacity, backgroundColor: overlayColor }]} />
      </View>
    );
  }

  // If using custom background image, render the image background with the overlay
  if (settings.enableBackgroundImage && settings.wallpapers.length > 0) {
    const safeIndex = Math.min(settings.currentWallpaperIndex, settings.wallpapers.length - 1);
    const currentUri = settings.wallpapers[safeIndex];
    if (!currentUri) return null;

    return (
      <View style={styles.container} pointerEvents="none">
        <Animated.Image
          source={{ uri: currentUri }}
          style={styles.image}
          resizeMode="cover"
        />
        <Animated.View style={[styles.darkOverlay, { opacity: combinedOpacity, backgroundColor: overlayColor }]} />
      </View>
    );
  }

  // If using system wallpaper (default), only render the dark overlay to dim the transparent window background
  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.darkOverlay, { opacity: combinedOpacity, backgroundColor: overlayColor }]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default WallpaperBackground;
