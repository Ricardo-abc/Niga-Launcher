import React, { useState, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  FlatList,
  PanResponder,
  Dimensions,
  Vibration,
} from 'react-native';
import { AppAnimated as Animated } from '../../services/AnimationService';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import { AppSettings } from '../../types/settings';
import { ALPHABET } from '../../constants/defaultSettings';
import { t } from '../../i18n';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface VibrationSettingsProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onConfirm: () => void;
  onBack: () => void;
}

const getHapticEffects = (): { label: string; value: AppSettings['vibrationEffect']; category: string }[] => [
  { label: t('settings.vibration.effects.keyboardTap'), value: 'keyboardTap', category: t('settings.vibration.categories.basic') },
  { label: t('settings.vibration.effects.selection'), value: 'selection', category: t('settings.vibration.categories.basic') },
  { label: t('settings.vibration.effects.soft'), value: 'soft', category: t('settings.vibration.categories.basic') },
  { label: t('settings.vibration.effects.rigid'), value: 'rigid', category: t('settings.vibration.categories.basic') },
  { label: t('settings.vibration.effects.longPress'), value: 'longPress', category: t('settings.vibration.categories.basic') },
  { label: t('settings.vibration.effects.effectTick'), value: 'effectTick', category: t('settings.vibration.categories.tick') },
  { label: t('settings.vibration.effects.segmentTick'), value: 'segmentTick', category: t('settings.vibration.categories.tick') },
  { label: t('settings.vibration.effects.segmentFrequentTick'), value: 'segmentFrequentTick', category: t('settings.vibration.categories.tick') },
  { label: t('settings.vibration.effects.clockTick'), value: 'clockTick', category: t('settings.vibration.categories.tick') },
  { label: t('settings.vibration.effects.impactLight'), value: 'impactLight', category: t('settings.vibration.categories.impact') },
  { label: t('settings.vibration.effects.impactMedium'), value: 'impactMedium', category: t('settings.vibration.categories.impact') },
  { label: t('settings.vibration.effects.impactHeavy'), value: 'impactHeavy', category: t('settings.vibration.categories.impact') },
  { label: t('settings.vibration.effects.effectClick'), value: 'effectClick', category: t('settings.vibration.categories.effect') },
  { label: t('settings.vibration.effects.effectDoubleClick'), value: 'effectDoubleClick', category: t('settings.vibration.categories.effect') },
  { label: t('settings.vibration.effects.effectHeavyClick'), value: 'effectHeavyClick', category: t('settings.vibration.categories.effect') },
  { label: t('settings.vibration.effects.notificationSuccess'), value: 'notificationSuccess', category: t('settings.vibration.categories.notification') },
  { label: t('settings.vibration.effects.notificationWarning'), value: 'notificationWarning', category: t('settings.vibration.categories.notification') },
  { label: t('settings.vibration.effects.notificationError'), value: 'notificationError', category: t('settings.vibration.categories.notification') },
  { label: t('settings.vibration.effects.confirm'), value: 'confirm', category: t('settings.vibration.categories.confirm') },
  { label: t('settings.vibration.effects.reject'), value: 'reject', category: t('settings.vibration.categories.confirm') },
  { label: t('settings.vibration.effects.gestureStart'), value: 'gestureStart', category: t('settings.vibration.categories.gesture') },
  { label: t('settings.vibration.effects.gestureEnd'), value: 'gestureEnd', category: t('settings.vibration.categories.gesture') },
  { label: t('settings.vibration.effects.dragStart'), value: 'dragStart', category: t('settings.vibration.categories.gesture') },
  { label: t('settings.vibration.effects.gestureThresholdActivate'), value: 'gestureThresholdActivate', category: t('settings.vibration.categories.gesture') },
  { label: t('settings.vibration.effects.gestureThresholdDeactivate'), value: 'gestureThresholdDeactivate', category: t('settings.vibration.categories.gesture') },
  { label: t('settings.vibration.effects.toggleOn'), value: 'toggleOn', category: t('settings.vibration.categories.toggle') },
  { label: t('settings.vibration.effects.toggleOff'), value: 'toggleOff', category: t('settings.vibration.categories.toggle') },
  { label: t('settings.vibration.effects.keyboardPress'), value: 'keyboardPress', category: t('settings.vibration.categories.keyboard') },
  { label: t('settings.vibration.effects.keyboardRelease'), value: 'keyboardRelease', category: t('settings.vibration.categories.keyboard') },
  { label: t('settings.vibration.effects.contextClick'), value: 'contextClick', category: t('settings.vibration.categories.keyboard') },
  { label: t('settings.vibration.effects.textHandleMove'), value: 'textHandleMove', category: t('settings.vibration.categories.keyboard') },
  { label: t('settings.vibration.effects.virtualKey'), value: 'virtualKey', category: t('settings.vibration.categories.virtual') },
  { label: t('settings.vibration.effects.virtualKeyRelease'), value: 'virtualKeyRelease', category: t('settings.vibration.categories.virtual') },
  { label: t('settings.vibration.effects.system'), value: 'system', category: t('settings.vibration.categories.system') },
];

const triggerHaptic = (effect: AppSettings['vibrationEffect'], intensity: number = 3) => {
  if (effect === 'system') {
    Vibration.vibrate(4 * intensity);
    return;
  }
  ReactNativeHapticFeedback.trigger(effect, { enableVibrateFallback: true, ignoreAndroidSystemSettings: false });
};



const VibrationSettings: React.FC<VibrationSettingsProps> = ({ settings, onUpdate, onConfirm, onBack }) => {
  const [selectedEffect, setSelectedEffect] = useState(settings.vibrationEffect);
  const [intensity, setIntensity] = useState(settings.vibrationIntensity);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isSliding, setIsSliding] = useState(false);

  const HAPTIC_EFFECTS = useMemo(() => getHapticEffects(), []);
  const alphabet = ALPHABET;
  const lastVibratedIndex = useRef(-1);
  const selectedEffectRef = useRef(selectedEffect);
  const intensityRef = useRef(intensity);
  const lastVibrateTime = useRef(0);
  const vibrateTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const activeIndexRef = useRef(0);

  useEffect(() => {
    return () => {
      if (vibrateTimeoutRef.current) {
        clearTimeout(vibrateTimeoutRef.current);
      }
    };
  }, []);

  // 轨道配置 - 与实际轨道一致
  const railHeight = 400;
  const railTop = 80;
  const bubbleSize = settings.bubbleSize;
  const bubbleOffset = settings.bubbleOffset;
  const { 
    themeColor, railColor, enableRailColorChange, waveIntensity, waveDecay, 
    waveShapeCap, waveVerticalSpread,
    railFontFamily, railFontWeight, railFontSize 
  } = settings;

  // 同步 ref
  selectedEffectRef.current = selectedEffect;
  intensityRef.current = intensity;

  // Animated values
  const pullXAnim = useRef(new Animated.Value(0)).current;

  // 波浪因子表 - 与 LetterRail 一致
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

  // 预计算纵向展开因子表：与 LetterRail 一致
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

  // 字母布局计算 - 使用 space-between 方式
  const letterFontSize = 11;
  const lineHeightMultiplier = 1.2;
  const letterHeight = letterFontSize * lineHeightMultiplier;
  const totalLetterHeight = alphabet.length * letterHeight;
  const gap = (railHeight - totalLetterHeight) / (alphabet.length - 1);

  // 获取字母中心位置
  const getLetterCenterY = useCallback((index: number) => {
    return railTop + letterHeight / 2 + index * (letterHeight + gap);
  }, [railTop, letterHeight, gap]);

  const handleSelectEffect = useCallback((effect: AppSettings['vibrationEffect']) => {
    setSelectedEffect(effect);
    triggerHaptic(effect, intensity);
  }, [intensity]);

  const handleConfirm = useCallback(() => {
    onUpdate('vibrationEffect', selectedEffect);
    onUpdate('vibrationIntensity', intensity);
    onConfirm();
  }, [selectedEffect, intensity, onUpdate, onConfirm]);

  // PanResponder - 与实际轨道一致的手感
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsSliding(true);
        if (vibrateTimeoutRef.current) {
          clearTimeout(vibrateTimeoutRef.current);
          vibrateTimeoutRef.current = null;
        }

        const y = evt.nativeEvent.locationY;
        const relativeY = y - 80; // railTop
        const step = 400 / (29 - 1); // railHeight / (alphabet.length - 1)
        let idx = Math.round(relativeY / step);
        idx = Math.max(0, Math.min(idx, 28));

        setActiveIndex(idx);
        activeIndexRef.current = idx;

        // 拉出动画
        Animated.timing(pullXAnim, {
          toValue: 80,
          duration: 130,
          useNativeDriver: true,
        }).start();

        triggerHaptic(selectedEffectRef.current, intensityRef.current);
        lastVibrateTime.current = Date.now();
        lastVibratedIndex.current = idx;
      },
      onPanResponderMove: (evt) => {
        const y = evt.nativeEvent.locationY;
        const relativeY = y - 80;
        const step = 400 / (29 - 1);
        let idx = Math.round(relativeY / step);
        idx = Math.max(0, Math.min(idx, 28));

        if (idx !== lastVibratedIndex.current) {
          setActiveIndex(idx);
          activeIndexRef.current = idx;

          if (vibrateTimeoutRef.current) {
            clearTimeout(vibrateTimeoutRef.current);
            vibrateTimeoutRef.current = null;
          }

          const now = Date.now();
          const timeDiff = now - lastVibrateTime.current;
          if (timeDiff >= 40) {
            lastVibratedIndex.current = idx;
            lastVibrateTime.current = now;
            triggerHaptic(selectedEffectRef.current, intensityRef.current);
          } else {
            const delay = 40 - timeDiff;
            vibrateTimeoutRef.current = setTimeout(() => {
              if (idx !== lastVibratedIndex.current) {
                lastVibratedIndex.current = idx;
                lastVibrateTime.current = Date.now();
                triggerHaptic(selectedEffectRef.current, intensityRef.current);
              }
            }, delay);
          }
        }
      },
      onPanResponderRelease: () => {
        setIsSliding(false);

        if (vibrateTimeoutRef.current) {
          clearTimeout(vibrateTimeoutRef.current);
          vibrateTimeoutRef.current = null;
        }

        if (activeIndexRef.current !== lastVibratedIndex.current) {
          lastVibratedIndex.current = activeIndexRef.current;
          lastVibrateTime.current = Date.now();
          triggerHaptic(selectedEffectRef.current, intensityRef.current);
        }

        // 收回动画
        Animated.timing(pullXAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const renderEffectItem = ({ item }: { item: typeof HAPTIC_EFFECTS[0] }) => {
    const isSelected = selectedEffect === item.value;
    return (
      <TouchableOpacity
        style={[styles.effectItem, isSelected && styles.effectItemSelected]}
        onPress={() => handleSelectEffect(item.value)}
        activeOpacity={0.7}
      >
        <Text style={[styles.effectLabel, isSelected && styles.effectLabelSelected]}>
          {item.label}
        </Text>
        {isSelected && <Text style={styles.checkMark}>✓</Text>}
      </TouchableOpacity>
    );
  };

  const containerBg = '#F2F2F7';
  const headerBg = '#FFFFFF';
  const leftPanelBg = '#FFFFFF';
  const rightPanelBg = '#F2F2F7';

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {/* 顶部栏 */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>←</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('settings.vibration.title')}</Text>
        <TouchableOpacity onPress={handleConfirm} style={styles.confirmButton}>
          <Text style={styles.confirmText}>{t('common.confirm')}</Text>
        </TouchableOpacity>
      </View>

      {/* 内容区域 */}
      <View style={styles.content}>
        {/* 左侧：特效列表 */}
        <View style={[styles.leftPanel, { backgroundColor: leftPanelBg }]}>
          <FlatList
            data={HAPTIC_EFFECTS}
            renderItem={renderEffectItem}
            keyExtractor={(item) => item.value}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.effectList}
          />

          {/* 系统默认时显示强度滑块 */}
          {selectedEffect === 'system' && (
            <View style={styles.intensitySection}>
              <Text style={styles.intensityLabel}>{t('settings.vibration.intensity')}</Text>
              <View style={styles.intensityRow}>
                {[1, 2, 3, 4, 5].map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={[styles.intensityButton, intensity === level && styles.intensityButtonActive]}
                    onPress={() => {
                      setIntensity(level);
                      triggerHaptic('system', level);
                    }}
                  >
                    <Text style={[styles.intensityText, intensity === level && styles.intensityTextActive]}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </View>

        {/* 右侧：轨道预览 - 复刻实际轨道 */}
        <View style={[styles.rightPanel, { backgroundColor: rightPanelBg }]} {...panResponder.panHandlers}>
          {/* 字母轨道 */}
          <View style={[styles.railContainer, { top: railTop, height: railHeight }]}>
            {alphabet.map((letter, index) => {
              const dist = Math.abs(index - activeIndex);

              // 波浪位移 (弯曲上限与整体平移)
              const waveFactor = waveFactorTable[dist] || 0;
              const cappedPull = Math.min(80, waveShapeCap);
              const wholeShift = Math.max(0, 80 - waveShapeCap);
              
              const waveTranslateX = isSliding && !settings.disableAnimation
                ? - (cappedPull * waveFactor + wholeShift)
                : 0;

              // 纵向展开
              const cumulativeFactor = cumulativeSpreadTable[index] || 0;
              const waveTranslateY = isSliding && waveVerticalSpread > 0 && !settings.disableAnimation
                ? 80 * cumulativeFactor * waveVerticalSpread
                : 0;

              // 选中字母颜色
              const color = enableRailColorChange && isSliding && dist === 0
                ? themeColor
                : (letter === '*' ? themeColor : railColor);

              const transforms: any[] = [
                { translateX: waveTranslateX },
              ];
              if (waveTranslateY !== 0) {
                transforms.push({ translateY: waveTranslateY });
              }

              return (
                <View
                  key={letter}
                  style={[
                    styles.letterWrapper,
                    {
                      height: letterHeight + gap,
                      opacity: 1,
                      transform: transforms,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.letter,
                      { 
                        color,
                        fontFamily: railFontFamily === 'system' ? undefined : railFontFamily,
                        fontWeight: railFontWeight as any,
                        fontSize: railFontSize || 11,
                      },
                    ]}
                  >
                    {letter}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* 气泡 */}
          <View
            style={[
              styles.bubble,
              {
                width: bubbleSize,
                height: bubbleSize,
                borderRadius: bubbleSize / 2,
                backgroundColor: themeColor,
                top: getLetterCenterY(activeIndex) - bubbleSize / 2,
                right: bubbleOffset,
                transform: [{
                  translateX: isSliding && !settings.disableAnimation
                    ? - (Math.min(80, waveShapeCap) * 1.3 * waveIntensity + Math.max(0, 80 - waveShapeCap))
                    : 0
                }],
              },
            ]}
          >
            <Text style={styles.bubbleText}>
              {alphabet[activeIndex]}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
  },
  backText: {
    color: '#3b82f6',
    fontSize: 24,
  },
  title: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '600',
  },
  confirmButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  confirmText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    flexDirection: 'row',
  },
  leftPanel: {
    flex: 1,
    backgroundColor: 'transparent',
    borderRightWidth: 0.5,
    borderRightColor: '#E5E5EA',
  },
  effectList: {
    paddingVertical: 8,
  },
  effectItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: '#F2F2F7',
  },
  effectItemSelected: {
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  effectLabel: {
    color: '#1C1C1E',
    fontSize: 15,
  },
  effectLabelSelected: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  checkMark: {
    color: '#3b82f6',
    fontSize: 18,
    fontWeight: 'bold',
  },
  intensitySection: {
    padding: 16,
    borderTopWidth: 0.5,
    borderTopColor: '#E5E5EA',
  },
  intensityLabel: {
    color: '#8E8E93',
    fontSize: 13,
    marginBottom: 12,
  },
  intensityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  intensityButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  intensityButtonActive: {
    backgroundColor: '#3b82f6',
  },
  intensityText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '600',
  },
  intensityTextActive: {
    color: '#fff',
  },
  rightPanel: {
    width: 100,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  railContainer: {
    position: 'absolute',
    width: 40,
    right: 2,
  },
  letterWrapper: {
    justifyContent: 'center',
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
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 12,
  },
  bubbleText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default VibrationSettings;
