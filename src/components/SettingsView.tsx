import React, { useState, useRef } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Animated, Dimensions } from 'react-native';
import { useSettingsContext } from '../context/SettingsContext';
import { DevModeTrigger, GeneralSettings, DevSettings, VibrationSettings } from './settings';
import { EffectLayer } from '../effects';
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

  const bgEnabled = settings.enableBackgroundImage && settings.wallpapers.length > 0;
  const containerBg = bgEnabled ? 'transparent' : 'rgba(0,0,0,0.92)';

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
      <EffectLayer
        effectKey={bgEnabled ? settings.overlayEffect : ''}
        intensity={settings.overlayEffectIntensity}
        style={styles.effectLayer}
      >
        <VibrationSettings
          settings={settings}
          onUpdate={updateSetting}
          onConfirm={() => setShowVibrationSettings(false)}
          onBack={() => setShowVibrationSettings(false)}
        />
      </EffectLayer>
    );
  }

  return (
    <EffectLayer
      effectKey={bgEnabled ? settings.overlayEffect : ''}
      intensity={settings.overlayEffectIntensity}
      style={styles.effectLayer}
    >
      <View style={[styles.container, { backgroundColor: containerBg }]}>
      {/* 顶部导航栏 */}
      <View style={styles.header}>
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
        <View style={styles.tabBar}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'general' && styles.tabActive]}
            onPress={() => switchTab('general')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'general' && styles.tabTextActive]}>
              {t('settings.general')}
            </Text>
            {activeTab === 'general' && <View style={styles.tabIndicator} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'dev' && styles.tabActive]}
            onPress={() => switchTab('dev')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'dev' && styles.tabTextActive]}>
              {t('settings.developer')}
            </Text>
            {activeTab === 'dev' && <View style={styles.tabIndicator} />}
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
    </EffectLayer>
  );
};

const styles = StyleSheet.create({
  effectLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
  },
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 60,
    paddingHorizontal: 16,
    paddingBottom: 8,
    backgroundColor: '#000',
  },
  headerRight: {
    width: 32,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2C2C2E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeIcon: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    backgroundColor: '#000',
    borderBottomWidth: 0.5,
    borderBottomColor: '#38383A',
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
    color: '#fff',
    fontWeight: '600',
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 2,
    backgroundColor: '#fff',
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
