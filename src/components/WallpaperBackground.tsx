import React, { useState, useEffect } from 'react';
import { StyleSheet, Animated, View, AppState } from 'react-native';
import { useSettingsContext } from '../context/SettingsContext';
import { isLiveWallpaperActive } from '../modules/WallpaperBridge';
import { resolveDimmingColor } from '../hooks/useSettings';

interface WallpaperBackgroundProps {
  scrollY?: Animated.Value;
  scrubOpacity?: Animated.Value;
}

const WallpaperBackground: React.FC<WallpaperBackgroundProps> = ({ scrollY, scrubOpacity }) => {
  const { settings } = useSettingsContext();
  const [isServiceActive, setIsServiceActive] = useState(false);

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

    const animParts: Animated.Animated[] = [];

    if (isScrub && scrubOpacity) {
      animParts.push(scrubOpacity.interpolate({
        inputRange: [0, 1],
        outputRange: [0, maxDimming],
      }));
    } else {
      animParts.push(new Animated.Value(0));
    }

    if (isAppList && scrollY) {
      animParts.push(scrollY.interpolate({
        inputRange: [40, 200],
        outputRange: [0, maxDimming],
        extrapolate: 'clamp',
      }));
    } else {
      animParts.push(new Animated.Value(0));
    }

    const combined = Animated.add(animParts[0], animParts[1]);
    return combined.interpolate({
      inputRange: [0, maxDimming, maxDimming * 2],
      outputRange: [0, maxDimming, maxDimming],
      extrapolate: 'clamp',
    });
  })();

  const overlayColor = resolveDimmingColor(settings);

  // If our live wallpaper service is rendering the wallpaper, we shouldn't draw the background image in JS.
  // However, we still need to draw the semi-transparent black overlay for 'scrub' and 'appList' modes.
  if (isServiceActive) {
    if (isAlways) return null;
    return (
      <View style={styles.container} pointerEvents="none">
        <Animated.View style={[styles.darkOverlay, { opacity: finalOpacity, backgroundColor: overlayColor }]} />
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
        <Animated.View style={[styles.darkOverlay, { opacity: finalOpacity, backgroundColor: overlayColor }]} />
      </View>
    );
  }

  // If using system wallpaper (default), only render the dark overlay to dim the transparent window background
  return (
    <View style={styles.container} pointerEvents="none">
      <Animated.View style={[styles.darkOverlay, { opacity: finalOpacity, backgroundColor: overlayColor }]} />
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
