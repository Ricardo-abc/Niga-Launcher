import React, { useMemo } from 'react';
import { StyleSheet, Animated, Dimensions } from 'react-native';
import { useSettingsContext } from '../context/SettingsContext';
import { useRailAlphabet } from '../hooks/useActiveAlphabet';
import { AppInfo } from '../types/settings';

const { width: screenWidth } = Dimensions.get('window');

interface AlphabetBubbleProps {
  activeIndexAnim: Animated.Value;
  railTop: number;
  railHeight: number;
  pullX: Animated.Value;
  side: 'left' | 'right';
  apps: AppInfo[];
}

const LetterBubble: React.FC<{
  letter: string;
  index: number;
  isLast: boolean;
  activeIndexAnim: Animated.Value;
}> = React.memo(({ letter, index, isLast, activeIndexAnim }) => {
  const opacity = useMemo(() =>
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

const AlphabetBubble: React.FC<AlphabetBubbleProps> = ({
  activeIndexAnim, railTop, railHeight, pullX, side, apps,
}) => {
  const { settings } = useSettingsContext();
  const { alphabet } = useRailAlphabet(apps);
  const { bubbleSize, bubbleOffset, waveIntensity, themeColor, bubbleOpacity, shadowIntensity, railLength } = settings;

  const letterFontSize = 11;
  const lineHeightMultiplier = 1.2;
  const letterHeight = letterFontSize * lineHeightMultiplier;
  const totalLetterHeight = alphabet.length * letterHeight;
  const gap = (railLength - totalLetterHeight) / (alphabet.length - 1);

  const bubbleY = activeIndexAnim.interpolate({
    inputRange: Array.from({ length: alphabet.length }, (_, i) => i),
    outputRange: Array.from({ length: alphabet.length }, (_, i) => {
      const letterCenter = letterHeight / 2 + i * (letterHeight + gap);
      return railTop + letterCenter - bubbleSize / 2;
    }),
    extrapolate: 'clamp',
  });

  // 选中字母的波浪因子（dist=0 时）：1.3 * waveIntensity
  const waveFactor = 1.3 * waveIntensity;
  const bubbleX = useMemo(() =>
    side === 'left'
      ? Animated.multiply(pullX, waveFactor)
      : Animated.multiply(Animated.multiply(pullX, waveFactor), -1),
    [pullX, waveFactor, side]
  );

  const bubbleStyle = useMemo(() => ({
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

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.bubble,
        bubbleStyle,
        { top: bubbleY },
        side === 'left' ? { left: bubbleOffset } : { right: bubbleOffset },
        { transform: [{ translateX: bubbleX }] },
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
};

const styles = StyleSheet.create({
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

export default AlphabetBubble;
