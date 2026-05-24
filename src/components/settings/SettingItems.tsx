import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
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
  <View>
    <SettingItem label={label}>
      <View style={styles.colorRow}>
        {colors.map((color) => (
          <TouchableOpacity
            key={color}
            style={[
              styles.colorItem,
              { backgroundColor: color },
              value === color && styles.colorItemActive,
            ]}
            onPress={() => onChange(color)}
            activeOpacity={0.7}
          >
            {value === color && <Text style={styles.colorCheck}>✓</Text>}
          </TouchableOpacity>
        ))}
      </View>
    </SettingItem>
    {description && <Text style={styles.description}>{description}</Text>}
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
    color: '#fff',
    fontSize: 15,
    flex: 1,
    marginRight: 12,
  },
  toggle: {
    width: 51,
    height: 31,
    borderRadius: 16,
    backgroundColor: '#39393D',
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
    shadowOpacity: 0.2,
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
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: 'transparent',
    minHeight: 38,
    minWidth: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionActive: {
    borderColor: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  optionText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: '500',
  },
  optionTextActive: {
    color: '#3b82f6',
    fontWeight: '600',
  },
  colorRow: {
    flexDirection: 'row',
    gap: 12,
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  colorItem: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  colorItemActive: {
    borderColor: '#fff',
  },
  colorCheck: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  description: {
    color: '#888',
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
});

export default SettingItem;
