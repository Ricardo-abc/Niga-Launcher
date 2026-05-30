import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { AppAnimated as Animated } from '../services/AnimationService';
import { useSettingsContext } from '../context/SettingsContext';
import { DevModeTrigger, GeneralSettings, DevSettings, VibrationSettings } from './settings';

import { t } from '../i18n';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface SettingsViewProps {
  onClose: () => void;
}

const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
  const { settings, updateSetting, resetSettings, handleDevModeClick } = useSettingsContext();
  const [activeTab, setActiveTab] = useState<'general' | 'dev'>('general');
  const [showVibrationSettings, setShowVibrationSettings] = useState(false);
  const slideAnim = useRef(new Animated.Value(0)).current;

  const containerBg = '#F2F2F7';
  const headerBg = '#FFFFFF';
  const tabBarBg = '#FFFFFF';
  const themeColor = settings.themeColor === 'auto' ? (settings.currentWallpaperDominantColor || '#3b82f6') : settings.themeColor;

  const switchTab = (tab: 'general' | 'dev') => {
    setActiveTab(tab);
    Animated.spring(slideAnim, {
      toValue: tab === 'general' ? 0 : 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -SCREEN_WIDTH],
  });

  if (showVibrationSettings) {
    return (
      <View style={styles.container}>
        <VibrationSettings
          settings={settings}
          onUpdate={updateSetting}
          onConfirm={() => setShowVibrationSettings(false)}
          onBack={() => setShowVibrationSettings(false)}
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: containerBg }]}>
      {/* 顶部导航栏 */}
      <View style={[styles.header, { backgroundColor: headerBg }]}>
        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
          <Text style={styles.closeIcon}>✕</Text>
        </TouchableOpacity>

        <DevModeTrigger
          devMode={settings.devMode}
          clickCount={settings.devClickCount}
          onPress={handleDevModeClick}
        />

        <View style={styles.headerRight} />
      </View>

      {/* Tab栏 - 仅在开发者模式启用时显示 */}
      {settings.devMode && (
        <View style={[styles.tabBar, { backgroundColor: tabBarBg }]}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'general' && styles.tabActive]}
            onPress={() => switchTab('general')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>
              {t('settings.general')}
            </Text>
            {activeTab === 'general' && <View style={[styles.tabIndicator, { backgroundColor: themeColor }]} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'dev' && styles.tabActive]}
            onPress={() => switchTab('dev')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'dev' && styles.tabTextActive]}>
              {t('settings.developer')}
            </Text>
            {activeTab === 'dev' && <View style={[styles.tabIndicator, { backgroundColor: themeColor }]} />}
          </TouchableOpacity>
        </View>
      )}

      {/* 内容区域 */}
      <View style={styles.contentContainer}>
        {settings.devMode ? (
          <Animated.View
            style={[styles.contentSlider, { transform: [{ translateX }] }]}
          >
            <View style={styles.page}>
              <GeneralSettings
                settings={settings}
                onUpdate={updateSetting}
                onNavigateToVibration={() => setShowVibrationSettings(true)}
              />
            </View>
            <View style={styles.page}>
              <DevSettings settings={settings} onUpdate={updateSetting} onReset={resetSettings} />
            </View>
          </Animated.View>
        ) : (
          <GeneralSettings
            settings={settings}
            onUpdate={updateSetting}
            onNavigateToVibration={() => setShowVibrationSettings(true)}
          />
        )}
      </View>
      </View>
  );
};

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: 'transparent',
  },
  headerRight: {
    width: 32,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2F2F7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#1C1C1E',
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E5E5EA',
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    position: 'relative',
  },
  tabActive: {
    // 激活状态
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 15,
    fontWeight: '500',
  },
  tabTextActive: {
    color: '#1C1C1E',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    borderRadius: 1,
  },
  contentContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  contentSlider: {
    flexDirection: 'row',
    width: SCREEN_WIDTH * 2,
    flex: 1,
  },
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
  },
});

export default SettingsView;
