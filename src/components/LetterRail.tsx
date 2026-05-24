import React, { useMemo } from 'react';
import { StyleSheet, View, Animated } from 'react-native';
import { useRailAlphabet } from '../hooks/useActiveAlphabet';
import { useSettingsContext } from '../context/SettingsContext';
import { AppInfo } from '../types/settings';

interface LetterRailProps {
  activeIndex: number;
  activeIndexAnim: Animated.Value;
  isSliding: boolean;
  colorSource: 'rail' | 'list';
  top: number;
  height: number;
  side: 'left' | 'right';
  pullX: Animated.Value;
  showList: boolean;
  apps: AppInfo[];
}

const LetterRail: React.FC<LetterRailProps> = React.memo(({
  activeIndex, activeIndexAnim, isSliding, colorSource, top, height, side, pullX, showList, apps,
}) => {
  const { alphabet, hasAppSet } = useRailAlphabet(apps);
  const { settings } = useSettingsContext();
  const directionMultiplier = side === 'right' ? -1 : 1;
  const { 
    waveIntensity, waveDecay, bubbleSize, bubbleOffset, 
    railColor, railActiveColor, themeColor, 
    enableRailColorChange, enableListColorChange, 
    enableMotionBlur, motionBlurIntensity,
    railFontFamily, railFontWeight, railFontSize
  } = settings;

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
      <View style={[styles.letterContainer, { height: settings.railLength }]}>
        {alphabet.map((letter, index) => {
          const dist = Math.abs(index - activeIndex);

          // Wave Factor
          const factor = waveFactorTable[dist] || 0;

          // Color calculation
          const colorEnabled = colorSource === 'rail' ? enableRailColorChange : enableListColorChange;
          const color = colorEnabled && showList && index === activeIndex
            ? themeColor
            : (letter === '*' ? themeColor : railColor);

          // Motion Blur & Scale calculations
          const blurFactor = dist === 0 ? 0 : Math.exp(-dist * dist * 0.15) * motionBlurIntensity;
          const scaleFactor = dist === 0 ? 0 : Math.exp(-dist * dist * 0.1) * motionBlurIntensity * 0.15;

          const dimOpacity = settings.emptyLetterMode === 'dim' && !hasAppSet.has(letter) ? 0.15 : 1;

          const motionBlurOpacity = (enableMotionBlur && isSliding
            ? 1 - blurFactor
            : 1) * dimOpacity;

          const motionBlurScale = enableMotionBlur && isSliding
            ? 1 - scaleFactor
            : 1;

          const waveTranslateX = isSliding
            ? Animated.multiply(pullX, factor * directionMultiplier)
            : 0;

          const transforms: any[] = [];
          if (waveTranslateX) transforms.push({ translateX: waveTranslateX });
          if (enableMotionBlur && isSliding) transforms.push({ scale: motionBlurScale });

          return (
            <Animated.View
              key={letter}
              style={[
                transforms.length > 0 ? { transform: transforms } : undefined,
                { opacity: motionBlurOpacity },
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
    </View>
  );
});

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
});

export default LetterRail;
