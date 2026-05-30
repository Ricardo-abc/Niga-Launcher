import { Animated } from 'react-native';

let globalDisableAnimation = false;

/**
 * 设置全局动画禁用状态
 */
export const setGlobalDisableAnimation = (disable: boolean) => {
  globalDisableAnimation = disable;
};

/**
 * 获取全局动画禁用状态
 */
export const getGlobalDisableAnimation = () => {
  return globalDisableAnimation;
};

const customTiming = (
  value: Animated.Value | Animated.ValueXY,
  config: Animated.TimingAnimationConfig
): Animated.CompositeAnimation => {
  if (globalDisableAnimation) {
    return Animated.timing(value, {
      ...config,
      duration: 0,
      delay: 0,
    });
  }
  return Animated.timing(value, config);
};

const customSpring = (
  value: Animated.Value | Animated.ValueXY,
  config: Animated.SpringAnimationConfig
): Animated.CompositeAnimation => {
  if (globalDisableAnimation) {
    return Animated.timing(value, {
      toValue: config.toValue as any,
      useNativeDriver: config.useNativeDriver,
      duration: 0,
    });
  }
  return Animated.spring(value, config);
};

const customDecay = (
  value: Animated.Value | Animated.ValueXY,
  config: Animated.DecayAnimationConfig
): Animated.CompositeAnimation => {
  if (globalDisableAnimation) {
    return Animated.timing(value, {
      toValue: (config as any).toValue || 0,
      useNativeDriver: config.useNativeDriver,
      duration: 0,
    });
  }
  return Animated.decay(value, config);
};

/**
 * AppAnimated 代理 React Native 的 Animated 对象，
 * 在开启 disableAnimation 时将 timing、spring 和 decay 动画的时长和延迟置为 0，实现瞬间切换。
 */
export const AppAnimated = new Proxy(Animated, {
  get(target, prop, receiver) {
    if (prop === 'timing') {
      return customTiming;
    }
    if (prop === 'spring') {
      return customSpring;
    }
    if (prop === 'decay') {
      return customDecay;
    }
    return Reflect.get(target, prop, receiver);
  },
}) as typeof Animated;
