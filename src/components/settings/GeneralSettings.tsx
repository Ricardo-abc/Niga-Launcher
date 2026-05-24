import React from 'react';
import { StyleSheet, ScrollView, View } from 'react-native';
import { AppSettings } from '../../types/settings';
import {
  AppearanceModule,
  RailModule,
  BubbleModule,
  AppListModule,
  FavoritesModule,
} from './modules';
import BackgroundModule from './BackgroundModule';

interface GeneralSettingsProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onNavigateToVibration?: () => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ settings, onUpdate, onNavigateToVibration }) => {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <BackgroundModule settings={settings} onUpdate={onUpdate} />
      <AppearanceModule settings={settings} onUpdate={onUpdate} />
      <RailModule settings={settings} onUpdate={onUpdate} onNavigateToVibration={onNavigateToVibration} />
      <BubbleModule settings={settings} onUpdate={onUpdate} />
      <AppListModule settings={settings} onUpdate={onUpdate} />
      <FavoritesModule settings={settings} onUpdate={onUpdate} />
      <View style={styles.bottomPadding} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  bottomPadding: {
    height: 40,
  },
});

export default GeneralSettings;
