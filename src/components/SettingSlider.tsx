import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';

interface SettingSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  themeColor?: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

const SettingSlider: React.FC<SettingSliderProps> = ({
  label,
  value,
  min,
  max,
  step = 0,
  unit = '',
  themeColor = '#3b82f6',
  onChange,
  formatValue,
}) => {
  const displayValue = formatValue 
    ? formatValue(value) 
    : step >= 1 
      ? Math.round(value).toString() 
      : value.toFixed(1);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.label}>{label}</Text>
        <Text style={[styles.value, { color: themeColor }]}>
          {displayValue}{unit}
        </Text>
      </View>
      <Slider
        style={styles.slider}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={themeColor}
        maximumTrackTintColor="#E5E5EA"
        thumbTintColor={themeColor}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  label: {
    color: '#1C1C1E',
    fontSize: 15,
    fontWeight: '400',
  },
  value: {
    fontSize: 15,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  slider: {
    width: '100%',
    height: 44,
  },
});

export default SettingSlider;
