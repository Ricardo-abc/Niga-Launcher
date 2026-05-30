import React, { useMemo } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { useRailAlphabet } from '../hooks/useActiveAlphabet';
import { useSettingsContext } from '../context/SettingsContext';
import { AppInfo } from '../types/settings';

export interface LetterRailRef {
  setActiveIndex: (idx: number) => void;
  setColorSource: (source: 'rail' | 'list') => void;
}

interface LetterRailProps {
  activeIndexAnim: Animated.Value;
  isSliding: boolean;
  isDragging: boolean;
  top: number;
  height: number;
  side: 'left' | 'right';
  pullX: Animated.Value;
  showList: boolean;
  apps: AppInfo[];
}

const LetterBubble: React.FC<{
  letter: string;
  index: number;
  isLast: boolean;
  activeIndexAnim: Animated.Value;
}> = React.memo(({ letter, index, isLast, activeIndexAnim }) => {
  const opacity = React.useMemo(() =>
    activeIndexAnim.interpolate({
      inputRange: [index - 0.5, index, index + 0.5],
      outputRange: [0, 1, 0],
      extrapolate: 'clamp',
    }),
    [activeIndexAnim, index]
  );

  return (
    <Animated.Text
      style={[
        styles.bubbleText,
        { opacity, position: isLast ? 'relative' : 'absolute' },
      ]}
    >
      {letter}
    </Animated.Text>
  );
});

interface AlphabetBubbleProps {
  activeIndexAnim: Animated.Value;
  railHeight: number;
  pullX: Animated.Value;
  side: 'left' | 'right';
  alphabet: string[];
}

const AlphabetBubble: React.FC<AlphabetBubbleProps> = React.memo(({
  activeIndexAnim, railHeight, pullX, side, alphabet
}) => {
  const { settings } = useSettingsContext();
  const { bubbleSize, bubbleOffset, waveIntensity, bubbleOpacity, shadowIntensity } = settings;
  const themeColor = settings.themeColor === 'auto' ? (settings.currentWallpaperDominantColor || '#3b82f6') : settings.themeColor;

  const letterFontSize = 11;
  const lineHeightMultiplier = 1.2;
  const letterHeight = letterFontSize * lineHeightMultiplier;
  const totalLetterHeight = alphabet.length * letterHeight;
  const gap = (railHeight - totalLetterHeight) / (alphabet.length - 1);

  // 用 translateY 代替 top 布局属性，使动画完全运行在 Native GPU 驱动上，防止卡顿和不跟随问题
  const bubbleY = React.useMemo(() => {
    return activeIndexAnim.interpolate({
      inputRange: Array.from({ length: alphabet.length }, (_, i) => i),
      outputRange: Array.from({ length: alphabet.length }, (_, i) => {
        const letterCenter = letterHeight / 2 + i * (letterHeight + gap);
        return letterCenter - bubbleSize / 2;
      }),
      extrapolate: 'clamp',
    });
  }, [activeIndexAnim, alphabet.length, letterHeight, gap, bubbleSize]);

  const cappedPull = React.useMemo(() => {
    return pullX.interpolate({
      inputRange: [0, settings.waveShapeCap],
      outputRange: [0, settings.waveShapeCap],
      extrapolate: 'clamp',
    });
  }, [pullX, settings.waveShapeCap]);

  const wholeShift = React.useMemo(() => {
    return pullX.interpolate({
      inputRange: [0, settings.waveShapeCap, settings.waveShapeCap + 1000],
      outputRange: [0, 0, 1000],
      extrapolate: 'clamp',
    });
  }, [pullX, settings.waveShapeCap]);

  const waveFactor = 1.3 * waveIntensity;
  const directionMultiplier = side === 'left' ? 1 : -1;

  const bubbleX = React.useMemo(() => {
    if (settings.disableAnimation) {
      return new Animated.Value(0);
    }
    const bubbleShift = Animated.add(
      Animated.multiply(cappedPull, waveFactor),
      wholeShift
    );
    return Animated.multiply(bubbleShift, directionMultiplier);
  }, [cappedPull, waveFactor, wholeShift, directionMultiplier, settings.disableAnimation]);

  const bubbleStyle = React.useMemo(() => ({
    width: bubbleSize,
    height: bubbleSize,
    borderRadius: bubbleSize / 2,
    backgroundColor: themeColor,
    opacity: bubbleOpacity,
    shadowColor: themeColor,
    shadowOpacity: shadowIntensity,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  }), [bubbleSize, themeColor, bubbleOpacity, shadowIntensity]);

  const transforms = [
    { translateX: bubbleX },
    { translateY: bubbleY }
  ] as any;

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        bubbleStyle,
        { top: 0 },
        side === 'left' ? { left: -bubbleSize } : { right: bubbleOffset },
        { transform: transforms },
      ]}
    >
      {alphabet.map((letter, index) => (
        <LetterBubble
          key={letter}
          letter={letter}
          index={index}
          isLast={index === 0}
          activeIndexAnim={activeIndexAnim}
        />
      ))}
    </Animated.View>
  );
});

const LetterRail = React.memo(React.forwardRef<LetterRailRef, LetterRailProps>(({
  activeIndexAnim, isSliding, isDragging, top, height, side, pullX, showList, apps,
}, ref) => {
  const { alphabet, hasAppSet } = useRailAlphabet(apps);
  const { settings } = useSettingsContext();
  const directionMultiplier = side === 'right' ? -1 : 1;
  const { 
    waveIntensity, waveDecay, waveShapeCap, waveVerticalSpread, bubbleSize, bubbleOffset, 
    railColor, 
    enableRailColorChange, enableListColorChange, 
    railFontFamily, railFontWeight, railFontSize
  } = settings;
  const themeColor = settings.themeColor === 'auto' ? (settings.currentWallpaperDominantColor || '#3b82f6') : settings.themeColor;

  const [activeIndex, setActiveIndex] = React.useState(0);
  const [colorSource, setColorSource] = React.useState<'rail' | 'list'>('list');

  React.useImperativeHandle(ref, () => ({
    setActiveIndex: (idx: number) => {
      setActiveIndex(idx);
    },
    setColorSource: (source: 'rail' | 'list') => {
      setColorSource(source);
    },
  }));

  // 预计算波浪因子表：每个字母距离为 dist 时的因子值
  const waveFactorTable = useMemo(() => {
    const len = alphabet.length;
    const table: number[] = [];
    for (let dist = 0; dist < len; dist++) {
      const gaussian = Math.exp(-dist * dist * waveDecay);
      const secondaryWave = Math.exp(-dist * dist * waveDecay * 0.25) * 0.3;
      table.push((gaussian + secondaryWave) * waveIntensity);
    }
    return table;
  }, [alphabet.length, waveDecay, waveIntensity]);

  // 预计算纵向展开因子表：依赖于当前 activeIndex
  const cumulativeSpreadTable = useMemo(() => {
    const table = new Array(alphabet.length).fill(0);
    if (activeIndex < 0) return table;

    // activeIndex 以上的字母：向上推 (负位移)
    let sumUp = 0;
    for (let i = activeIndex - 1; i >= 0; i--) {
      const dist = activeIndex - i;
      const factor = waveFactorTable[dist] || 0;
      sumUp += factor;
      table[i] = -sumUp;
    }

    // activeIndex 以下的字母：向下推 (正位移)
    let sumDown = 0;
    for (let i = activeIndex + 1; i < alphabet.length; i++) {
      const dist = i - activeIndex;
      const factor = waveFactorTable[dist] || 0;
      sumDown += factor;
      table[i] = sumDown;
    }

    return table;
  }, [activeIndex, alphabet.length, waveFactorTable]);

  // 声明式插值：限制弯曲幅度，超出部分作为整体平移
  const cappedPull = useMemo(() => {
    return pullX.interpolate({
      inputRange: [0, waveShapeCap],
      outputRange: [0, waveShapeCap],
      extrapolate: 'clamp',
    });
  }, [pullX, waveShapeCap]);

  const wholeShift = useMemo(() => {
    return pullX.interpolate({
      inputRange: [0, waveShapeCap, waveShapeCap + 1000],
      outputRange: [0, 0, 1000],
      extrapolate: 'clamp',
    });
  }, [pullX, waveShapeCap]);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.rail,
        { top, height },
        side === 'left'
          ? { left: isSliding ? bubbleSize + bubbleOffset : 2 }
          : { right: 2 },
      ]}
    >
      <View style={[styles.letterContainer, { height: settings.railHeight }]}>
        {alphabet.map((letter, index) => {
          const dist = Math.abs(index - activeIndex);

          // Wave Factor
          const factor = waveFactorTable[dist] || 0;

          // Color calculation
          const isRailActive = colorSource === 'rail' && isDragging;
          const isListActive = colorSource === 'list';
          const colorEnabled = isRailActive ? enableRailColorChange : (isListActive ? enableListColorChange : false);

          const color = colorEnabled && showList && index === activeIndex
            ? themeColor
            : (letter === '*' ? themeColor : railColor);

          const dimOpacity = settings.emptyLetterMode === 'dim' && !hasAppSet.has(letter) ? 0.15 : 1;

          // 弯曲上限与整体平移
          const letterShift = Animated.add(
            Animated.multiply(cappedPull, factor),
            wholeShift
          );

          const waveTranslateX = isSliding && !settings.disableAnimation
            ? Animated.multiply(letterShift, directionMultiplier)
            : 0;

          const cumulativeFactor = cumulativeSpreadTable[index] || 0;
          const waveTranslateY = isSliding && waveVerticalSpread > 0 && !settings.disableAnimation
            ? Animated.multiply(pullX, cumulativeFactor * waveVerticalSpread)
            : 0;

          const transforms: any[] = [];
          if (waveTranslateX) transforms.push({ translateX: waveTranslateX });
          if (waveTranslateY) transforms.push({ translateY: waveTranslateY });

          return (
            <Animated.View
              key={letter}
              style={[
                transforms.length > 0 ? { transform: transforms } : undefined,
                { opacity: dimOpacity },
              ]}
            >
              <Animated.Text
                style={[
                  styles.letter,
                  { 
                    color,
                    fontFamily: railFontFamily === 'system' ? undefined : railFontFamily,
                    fontWeight: railFontWeight,
                    fontSize: railFontSize,
                  },
                ]}
              >
                {letter}
              </Animated.Text>
            </Animated.View>
          );
        })}
      </View>

      {isSliding && (
        <AlphabetBubble
          activeIndexAnim={activeIndexAnim}
          railHeight={height}
          pullX={pullX}
          side={side}
          alphabet={alphabet}
        />
      )}
    </View>
  );
}));

const styles = StyleSheet.create({
  rail: {
    position: 'absolute',
    width: 40,
    alignItems: 'center',
    zIndex: 15,
  },
  letterContainer: {
    width: 40,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  letter: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  bubble: {
    position: 'absolute',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  bubbleText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default LetterRail;
