import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { getEffect } from './registry';

interface EffectLayerProps {
  effectKey: string;
  intensity?: number;
  children?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

const EffectLayer: React.FC<EffectLayerProps> = ({ effectKey, intensity, children, style }) => {
  const effect = effectKey ? getEffect(effectKey) : undefined;

  if (!effect) {
    if (style) {
      return <View style={style}>{children}</View>;
    }
    return <>{children}</>;
  }

  const EffectComponent = effect.component;
  const resolvedIntensity = intensity ?? effect.defaultIntensity;

  return (
    <EffectComponent intensity={resolvedIntensity} style={style}>
      {children}
    </EffectComponent>
  );
};

export default EffectLayer;
