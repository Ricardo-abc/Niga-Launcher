import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface DevModeTriggerProps {
  devMode: boolean;
  clickCount: number;
  onPress: () => void;
}

const DevModeTrigger: React.FC<DevModeTriggerProps> = ({ devMode, clickCount, onPress }) => {
  const remaining = Math.max(0, 5 - clickCount);

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={styles.container}>
      <Text style={styles.title}>设置</Text>
      {devMode && (
        <View style={styles.devBadge}>
          <Text style={styles.devText}>开发者</Text>
        </View>
      )}
      {!devMode && remaining < 10 && remaining > 0 && (
        <Text style={styles.hint}>{remaining}</Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#1C1C1E',
    fontSize: 17,
    fontWeight: '600',
  },
  devBadge: {
    marginLeft: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    backgroundColor: 'rgba(48, 209, 88, 0.2)',
    borderRadius: 4,
  },
  devText: {
    color: '#30D158',
    fontSize: 11,
    fontWeight: '600',
  },
  hint: {
    color: '#8E8E93',
    fontSize: 12,
    marginLeft: 6,
  },
});

export default DevModeTrigger;
