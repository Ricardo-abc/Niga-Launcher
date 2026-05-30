import React, { useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { StyleSheet, View, Animated, Dimensions, FlatList } from 'react-native';
import { FlatItem } from '../services/AppService';
import { GESTURE_STRIP_WIDTH, HEADER_HEIGHT } from '../constants/defaultSettings';

import { useSettingsContext } from '../context/SettingsContext';

const { height } = Dimensions.get('window');

export interface ScrubOverlayRef {
  setItems: (items: FlatItem[], offsets: number[]) => void;
}

interface ScrubOverlayProps {
  renderItem: ({ item }: { item: FlatItem }) => React.ReactElement | null;
  focusScrollRatio: number;
  scrubOpacity: Animated.Value;
  appItemHeight: number;
}

const ScrubOverlay = React.memo(forwardRef<ScrubOverlayRef, ScrubOverlayProps>(({
  renderItem,
  focusScrollRatio,
  scrubOpacity,
  appItemHeight,
}, ref) => {
  const { settings } = useSettingsContext();
  const [items, setItems] = useState<FlatItem[]>([]);
  const [offsets, setOffsets] = useState<number[]>([]);

  useImperativeHandle(ref, () => ({
    setItems: (newItems: FlatItem[], newOffsets: number[]) => {
      setItems(newItems);
      setOffsets(newOffsets);
    },
  }));

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: items[index]?._type === 'header' ? HEADER_HEIGHT : appItemHeight,
    offset: offsets[index] || 0,
    index,
  }), [items, offsets, appItemHeight]);

  const keyExtractor = useCallback((item: FlatItem) => item.id, []);

  if (items.length === 0) return null;

  const scrubBgColor = `rgba(6, 6, 12, ${settings.scrubBgOpacity})`;

  return (
    <Animated.View style={[styles.scrubOverlay, { opacity: scrubOpacity, backgroundColor: scrubBgColor }]} pointerEvents="none">
      <View style={{ flex: 1 }}>
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          getItemLayout={getItemLayout}
          scrollEnabled={false}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingTop: height * focusScrollRatio }}
        />
      </View>
    </Animated.View>
  );
}));

const styles = StyleSheet.create({
  scrubOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    paddingLeft: GESTURE_STRIP_WIDTH + 8,
    paddingRight: GESTURE_STRIP_WIDTH + 8,
    zIndex: 8,
  },
});

export default ScrubOverlay;
