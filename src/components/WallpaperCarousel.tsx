import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Image,
  Text,
  TouchableOpacity,
  PanResponder,
  Dimensions,
  Alert,
  Vibration,
} from 'react-native';
import { AppAnimated as Animated } from '../services/AnimationService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_WIDTH = SCREEN_WIDTH - 80;
const PREVIEW_HEIGHT = 200;

interface WallpaperCarouselProps {
  wallpapers: string[];
  currentIndex: number;
  onSelect: (index: number) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onDelete: (index: number) => void;
}

const WallpaperCarousel: React.FC<WallpaperCarouselProps> = ({
  wallpapers,
  currentIndex,
  onSelect,
  onReorder,
  onDelete,
}) => {
  const scrollX = useRef(new Animated.Value(currentIndex)).current;
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef(0);
  const touchStartTime = useRef(0);

  // Sync scrollX when currentIndex changes from parent
  useEffect(() => {
    Animated.spring(scrollX, {
      toValue: currentIndex,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  }, [currentIndex, scrollX]);

  const animateTo = useCallback(
    (index: number) => {
      Animated.spring(scrollX, {
        toValue: index,
        friction: 8,
        tension: 60,
        useNativeDriver: true,
      }).start();
    },
    [scrollX]
  );

  // Main image pan responder - handles swipe + long press
  const imagePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 10,
      onPanResponderGrant: (_, gs) => {
        touchStartX.current = gs.x0;
        touchStartTime.current = Date.now();
        // Start long press timer
        longPressTimer.current = setTimeout(() => {
          Vibration.vibrate(15);
          // Will be handled by the closure - need to use ref
        }, 500);
      },
      onPanResponderMove: (_, gs) => {
        // Cancel long press on move
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }
        const offset = -gs.dx / PREVIEW_WIDTH;
        scrollX.setValue(currentIndex + offset);
      },
      onPanResponderRelease: (_, gs) => {
        // Cancel long press timer
        if (longPressTimer.current) {
          clearTimeout(longPressTimer.current);
          longPressTimer.current = null;
        }

        const dt = Date.now() - touchStartTime.current;
        const dx = Math.abs(gs.dx);
        const dy = Math.abs(gs.dy);

        // Long press detection (held for 500ms without much movement)
        if (dt > 500 && dx < 10 && dy < 10) {
          Vibration.vibrate(15);
          Alert.alert('删除壁纸', '确定删除这张壁纸？', [
            { text: '取消', style: 'cancel' },
            { text: '删除', style: 'destructive', onPress: () => onDelete(currentIndex) },
          ]);
          animateTo(currentIndex);
          return;
        }

        // Swipe detection
        const threshold = PREVIEW_WIDTH * 0.25;
        let newIndex = currentIndex;
        if (gs.dx < -threshold && currentIndex < wallpapers.length - 1) {
          newIndex = currentIndex + 1;
        } else if (gs.dx > threshold && currentIndex > 0) {
          newIndex = currentIndex - 1;
        }
        animateTo(newIndex);
        if (newIndex !== currentIndex) {
          onSelect(newIndex);
        }
      },
    })
  ).current;

  // Dots pan responder - handles swipe + tap on dots area
  const dotsTouchStartX = useRef(0);
  const dotsTouchStartTime = useRef(0);
  const dotsStartIndex = useRef(0);

  const dotsPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dx) > 5,
      onPanResponderGrant: (_, gs) => {
        dotsTouchStartX.current = gs.x0;
        dotsTouchStartTime.current = Date.now();
        dotsStartIndex.current = currentIndex;
      },
      onPanResponderMove: (_, gs) => {
        // Calculate which dot the finger is closest to
        const dotWidth = 24; // dot width + gap
        const offset = Math.round(gs.dx / dotWidth);
        const targetIndex = Math.max(0, Math.min(dotsStartIndex.current + offset, wallpapers.length - 1));
        scrollX.setValue(targetIndex);
      },
      onPanResponderRelease: (_, gs) => {
        const dt = Date.now() - dotsTouchStartTime.current;
        const dx = Math.abs(gs.dx);

        if (dt < 300 && dx < 10) {
          // Tap detection - calculate which dot was tapped
          const dotsAreaWidth = wallpapers.length * 24;
          const dotsStartX = (SCREEN_WIDTH - dotsAreaWidth) / 2;
          const relativeX = gs.x0 - dotsStartX;
          const dotIndex = Math.floor(relativeX / 24);
          const clampedIndex = Math.max(0, Math.min(dotIndex, wallpapers.length - 1));
          animateTo(clampedIndex);
          onSelect(clampedIndex);
        } else {
          // Swipe - snap to nearest
          const dotWidth = 24;
          const offset = Math.round(gs.dx / dotWidth);
          const targetIndex = Math.max(0, Math.min(dotsStartIndex.current + offset, wallpapers.length - 1));
          animateTo(targetIndex);
          if (targetIndex !== dotsStartIndex.current) {
            onSelect(targetIndex);
          }
        }
      },
    })
  ).current;

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      onReorder(currentIndex, currentIndex - 1);
    }
  }, [currentIndex, onReorder]);

  const handleNext = useCallback(() => {
    if (currentIndex < wallpapers.length - 1) {
      onReorder(currentIndex, currentIndex + 1);
    }
  }, [currentIndex, wallpapers.length, onReorder]);

  if (wallpapers.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* Large Preview */}
      <View style={styles.previewContainer} {...imagePanResponder.panHandlers}>
        {wallpapers.map((uri, index) => {
          const translateX = scrollX.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [PREVIEW_WIDTH, 0, -PREVIEW_WIDTH],
            extrapolate: 'clamp',
          });

          const scale = scrollX.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [0.9, 1, 0.9],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange: [index - 1, index - 0.5, index, index + 0.5, index + 1],
            outputRange: [0, 0.5, 1, 0.5, 0],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.previewImage,
                {
                  transform: [{ translateX }, { scale }],
                  opacity,
                },
              ]}
            >
              <Image source={{ uri }} style={styles.image} resizeMode="cover" />
            </Animated.View>
          );
        })}
      </View>

      {/* Page Dots - swipeable + clickable */}
      <View style={styles.dotsContainer} {...dotsPanResponder.panHandlers}>
        {wallpapers.map((_, index) => {
          const dotScale = scrollX.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [0.8, 1.3, 0.8],
            extrapolate: 'clamp',
          });
          const dotOpacity = scrollX.interpolate({
            inputRange: [index - 1, index, index + 1],
            outputRange: [0.3, 1, 0.3],
            extrapolate: 'clamp',
          });

          return (
            <Animated.View
              key={index}
              style={[
                styles.dot,
                {
                  transform: [{ scale: dotScale }],
                  opacity: dotOpacity,
                },
              ]}
            />
          );
        })}
      </View>

      {/* Bottom Arrows + Counter */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.arrowBtn, currentIndex === 0 && styles.arrowBtnDisabled]}
          onPress={handlePrev}
          disabled={currentIndex === 0}
          activeOpacity={0.6}
        >
          <Text style={[styles.arrowText, currentIndex === 0 && styles.arrowTextDisabled]}>◀</Text>
        </TouchableOpacity>

        <Text style={styles.counter}>
          {currentIndex + 1} / {wallpapers.length}
        </Text>

        <TouchableOpacity
          style={[styles.arrowBtn, currentIndex === wallpapers.length - 1 && styles.arrowBtnDisabled]}
          onPress={handleNext}
          disabled={currentIndex === wallpapers.length - 1}
          activeOpacity={0.6}
        >
          <Text style={[styles.arrowText, currentIndex === wallpapers.length - 1 && styles.arrowTextDisabled]}>▶</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginVertical: 8,
  },
  previewContainer: {
    width: PREVIEW_WIDTH,
    height: PREVIEW_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#1C1C1E',
  },
  previewImage: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3b82f6',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    gap: 20,
  },
  arrowBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  arrowBtnDisabled: {
    opacity: 0.3,
  },
  arrowText: {
    color: '#fff',
    fontSize: 14,
  },
  arrowTextDisabled: {
    color: '#666',
  },
  counter: {
    color: '#888',
    fontSize: 14,
    fontWeight: '500',
    minWidth: 40,
    textAlign: 'center',
  },
});

export default WallpaperCarousel;
