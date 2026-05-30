import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { AppAnimated as Animated } from '../../services/AnimationService';
import SettingSlider from '../SettingSlider';

interface SettingItemProps {
  label: string;
  children: React.ReactNode;
}

export const SettingItem: React.FC<SettingItemProps> = ({ label, children }) => (
  <View style={styles.item}>
    <Text style={styles.label}>{label}</Text>
    {children}
  </View>
);

interface SettingToggleProps {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

export const SettingToggle: React.FC<SettingToggleProps> = ({ label, value, onChange }) => (
  <SettingItem label={label}>
    <TouchableOpacity
      style={[styles.toggle, value && styles.toggleActive]}
      onPress={() => onChange(!value)}
      activeOpacity={0.7}
    >
      <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
    </TouchableOpacity>
  </SettingItem>
);

interface SettingSelectorProps {
  label: string;
  options: { label: string; value: string }[];
  value: string;
  onChange: (value: string) => void;
}

export const SettingSelector: React.FC<SettingSelectorProps> = ({ label, options, value, onChange }) => (
  <SettingItem label={label}>
    <View style={styles.selector}>
      {options.map((option) => (
        <TouchableOpacity
          key={option.value}
          style={[styles.option, value === option.value && styles.optionActive]}
          onPress={() => onChange(option.value)}
          activeOpacity={0.7}
        >
          <Text style={[styles.optionText, value === option.value && styles.optionTextActive]}>
            {option.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  </SettingItem>
);

interface SettingColorProps {
  label: string;
  colors: string[];
  value: string;
  onChange: (color: string) => void;
  description?: string;
}

export const SettingColor: React.FC<SettingColorProps> = ({ label, colors, value, onChange, description }) => (
  <View style={styles.colorSection}>
    <Text style={styles.colorLabel}>{label}</Text>
    <View style={styles.colorGrid}>
      {colors.map((color) => {
        const isAuto = color === 'auto';
        const isLight = !isAuto && (color.toLowerCase() === '#ffffff' || color.toLowerCase() === '#fff' || color.toLowerCase() === '#eab308' || color.toLowerCase() === '#ccc' || color.toLowerCase() === '#eee');
        const isSelected = value === color;
        return (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorItem,
              { 
                backgroundColor: isAuto ? '#F2F2F7' : color,
                borderColor: isSelected 
                  ? (isLight ? '#000' : (color === 'auto' ? '#3b82f6' : '#fff')) 
                  : 'rgba(0, 0, 0, 0.15)'
              },
            ]}
            onPress={() => onChange(color)}
            activeOpacity={0.7}
          >
            {isAuto ? (
              <Text style={{ color: isSelected ? '#3b82f6' : '#1C1C1E', fontSize: 10, fontWeight: 'bold' }}>Auto</Text>
            ) : isSelected ? (
              <Text style={[styles.colorCheck, isLight && { color: '#000' }]}>✓</Text>
            ) : null}
          </TouchableOpacity>
        );
      })}
    </View>
    {description && <Text style={styles.colorDescription}>{description}</Text>}
  </View>
);

interface SettingToggleWithActionProps {
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
  onAction: () => void;
  actionIcon?: string;
}

export const SettingToggleWithAction: React.FC<SettingToggleWithActionProps> = ({
  label,
  value,
  onToggle,
  onAction,
  actionIcon = '⚙️',
}) => (
  <View style={styles.item}>
    <Text style={styles.label}>{label}</Text>
    <View style={styles.toggleWithActionRow}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={onAction}
        activeOpacity={0.7}
      >
        <Text style={styles.actionIcon}>{actionIcon}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.toggle, value && styles.toggleActive]}
        onPress={() => onToggle(!value)}
        activeOpacity={0.7}
      >
        <View style={[styles.toggleKnob, value && styles.toggleKnobActive]} />
      </TouchableOpacity>
    </View>
  </View>
);

interface SettingSliderItemProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  themeColor: string;
  onChange: (value: number) => void;
  formatValue?: (value: number) => string;
}

export const SettingSliderItem: React.FC<SettingSliderItemProps> = ({
  label, value, min, max, step, unit, themeColor, onChange, formatValue,
}) => (
  <View style={styles.sliderItem}>
    <SettingSlider
      label={label}
      value={value}
      min={min}
      max={max}
      step={step}
      unit={unit}
      themeColor={themeColor}
      onChange={onChange}
      formatValue={formatValue}
    />
  </View>
);

const styles = StyleSheet.create({
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 48,
  },
  label: {
    color: '#1C1C1E',
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#E5E5EA',
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: {
    backgroundColor: '#34C759',
  },
  toggleKnob: {
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleKnobActive: {
    transform: [{ translateX: 20 }],
  },
  selector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
    maxWidth: '70%',
  },
  option: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: '#F2F2F7',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 38,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.12)',
  },
  optionText: {
    color: '#555',
    fontSize: 12,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  colorSection: {
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  colorLabel: {
    color: '#1C1C1E',
    fontSize: 15,
    marginBottom: 12,
    fontWeight: '500',
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    alignItems: 'center',
  },
  colorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2.5,
  },
  colorCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  colorDescription: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: 8,
    paddingLeft: 2,
  },
  description: {
    color: '#8E8E93',
    fontSize: 12,
    marginTop: -6,
    paddingBottom: 10,
    paddingLeft: 2,
  },
  sliderItem: {
    paddingVertical: 10,
  },
  toggleWithActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  actionIcon: {
    fontSize: 18,
  },
  subModule: {
    borderBottomWidth: 0.5,
    borderBottomColor: '#F2F2F7',
    width: '100%',
  },
  subHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    width: '100%',
  },
  subHeaderTitle: {
    color: '#1C1C1E',
    fontSize: 14,
    fontWeight: '600',
  },
  expandArrow: {
    color: '#8E8E93',
    fontSize: 10,
  },
  subContent: {
    paddingLeft: 4,
    paddingBottom: 10,
  },
});

interface SettingSubModuleProps {
  title: string;
  children: React.ReactNode;
  defaultExpanded?: boolean;
}

export const SettingSubModule: React.FC<SettingSubModuleProps> = ({
  title,
  children,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [animation] = useState(new Animated.Value(defaultExpanded ? 1 : 0));

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1;
    Animated.spring(animation, {
      toValue,
      friction: 8,
      tension: 60,
      useNativeDriver: false,
    }).start();
    setExpanded(!expanded);
  };

  const rotateInterpolate = animation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View style={styles.subModule}>
      <TouchableOpacity
        style={styles.subHeader}
        onPress={toggleExpand}
        activeOpacity={0.7}
      >
        <Text style={styles.subHeaderTitle}>{title}</Text>
        <Animated.Text
          style={[
            styles.expandArrow,
            { transform: [{ rotate: rotateInterpolate }] },
          ]}
        >
          ▼
        </Animated.Text>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.subContent}>
          {children}
        </View>
      )}
    </View>
  );
};

interface SettingMultiSelectorProps {
  label: string;
  options: { label: string; value: string }[];
  value: string[];
  onChange: (value: string[]) => void;
}

export const SettingMultiSelector: React.FC<SettingMultiSelectorProps> = ({ label, options, value, onChange }) => (
  <SettingItem label={label}>
    <View style={styles.selector}>
      {options.map((option) => {
        const isSelected = value.includes(option.value);
        return (
          <TouchableOpacity
            key={option.value}
            style={[styles.option, isSelected && styles.optionActive]}
            onPress={() => {
              if (isSelected) {
                onChange(value.filter(v => v !== option.value));
              } else {
                onChange([...value, option.value]);
              }
            }}
            activeOpacity={0.7}
          >
            <Text style={[styles.optionText, isSelected && styles.optionTextActive]}>
              {option.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </SettingItem>
);

export default SettingItem;
