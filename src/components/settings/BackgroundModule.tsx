import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, Platform, PermissionsAndroid } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { AppSettings } from '../../types/settings';
import SettingModule from './SettingModule';
import { SettingItem, SettingToggle, SettingSelector, SettingSliderItem } from './SettingItems';
import { getEffectNames, getEffect } from '../../effects/registry';
import { getSystemWallpaper, setWallpaper } from '../../modules/WallpaperBridge';
import WallpaperCarousel from '../WallpaperCarousel';

interface BackgroundModuleProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

const TIMER_OPTIONS = [
  { label: '30分钟', value: 30 },
  { label: '1小时', value: 60 },
  { label: '3小时', value: 180 },
  { label: '6小时', value: 360 },
  { label: '12小时', value: 720 },
  { label: '24小时', value: 1440 },
];

const BackgroundModule: React.FC<BackgroundModuleProps> = ({ settings, onUpdate }) => {
  const effectOptions = [
    { label: '无', value: '' },
    ...getEffectNames().map(e => ({ label: e.name, value: e.key })),
  ];

  const requestMediaPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      if (Platform.Version >= 33) {
        const result = await PermissionsAndroid.request(
          'android.permission.READ_MEDIA_IMAGES' as any
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const result = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        return result === PermissionsAndroid.RESULTS.GRANTED;
      }
    } catch {
      return false;
    }
  };

  const handleAddWallpaper = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: false,
      });

      if (result.canceled || !result.assets[0]?.uri) return;

      const sourceUri = result.assets[0].uri;
      const dir = `${FileSystem.documentDirectory}wallpapers/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      const filename = `wallpaper_${Date.now()}.jpg`;
      const destUri = `${dir}${filename}`;

      await FileSystem.copyAsync({
        from: sourceUri,
        to: destUri,
      });

      const newList = [...settings.wallpapers, destUri];
      onUpdate('wallpapers', newList);

      if (newList.length === 1) {
        onUpdate('enableBackgroundImage', true);
        onUpdate('currentWallpaperIndex', 0);
        setWallpaper(destUri);
      }
    } catch (e) {
      console.error('[Wallpaper] Add failed:', e);
      Alert.alert('错误', '添加壁纸失败');
    }
  };

  const handleAddSystemWallpaper = async () => {
    try {
      const hasPermission = await requestMediaPermission();
      if (!hasPermission) {
        Alert.alert('权限不足', '需要存储权限才能读取系统壁纸');
        return;
      }

      const dataUri = await getSystemWallpaper();
      if (!dataUri) {
        Alert.alert('提示', '无法获取系统壁纸');
        return;
      }
      const newList = [...settings.wallpapers, dataUri];
      onUpdate('wallpapers', newList);
      if (newList.length === 1) {
        onUpdate('enableBackgroundImage', true);
        onUpdate('currentWallpaperIndex', 0);
      }
      setWallpaper(dataUri);
    } catch (e) {
      console.error('[Wallpaper] System wallpaper failed:', e);
      Alert.alert('错误', '获取系统壁纸失败');
    }
  };

  const handleSelectWallpaper = (index: number) => {
    onUpdate('currentWallpaperIndex', index);
    const uri = settings.wallpapers[index];
    if (uri) setWallpaper(uri);
  };

  const handleReorder = (fromIndex: number, toIndex: number) => {
    const newList = [...settings.wallpapers];
    const [moved] = newList.splice(fromIndex, 1);
    newList.splice(toIndex, 0, moved);

    let newCurrentIndex = settings.currentWallpaperIndex;
    if (settings.currentWallpaperIndex === fromIndex) {
      newCurrentIndex = toIndex;
    } else if (fromIndex < settings.currentWallpaperIndex && toIndex >= settings.currentWallpaperIndex) {
      newCurrentIndex--;
    } else if (fromIndex > settings.currentWallpaperIndex && toIndex <= settings.currentWallpaperIndex) {
      newCurrentIndex++;
    }

    onUpdate('wallpapers', newList);
    onUpdate('currentWallpaperIndex', newCurrentIndex);
  };

  const handleDeleteWallpaper = (index: number) => {
    Alert.alert('删除壁纸', '确定删除这张壁纸？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          const uri = settings.wallpapers[index];
          const newList = settings.wallpapers.filter((_, i) => i !== index);
          let newIndex = settings.currentWallpaperIndex;
          if (newList.length === 0) {
            newIndex = 0;
            onUpdate('enableBackgroundImage', false);
          } else if (newIndex >= newList.length) {
            newIndex = newList.length - 1;
          } else if (index < newIndex) {
            newIndex--;
          }
          onUpdate('wallpapers', newList);
          onUpdate('currentWallpaperIndex', newIndex);

          if (uri && uri.startsWith('file://')) {
            FileSystem.deleteAsync(uri, { idempotent: true }).catch(err => {
              console.error('[Wallpaper] File delete failed:', err);
            });
          }
        },
      },
    ]);
  };

  const hasWallpapers = settings.wallpapers.length > 0;
  const bgEnabled = settings.enableBackgroundImage && hasWallpapers;

  const currentOverlayEffect = settings.overlayEffect ? getEffect(settings.overlayEffect) : null;
  const overlayIntensity = currentOverlayEffect
    ? { min: currentOverlayEffect.minIntensity, max: currentOverlayEffect.maxIntensity }
    : { min: 10, max: 80 };

  return (
    <SettingModule
      title="背景与效果"
      icon="🖼️"
      summary={bgEnabled ? settings.wallpapers.length + '张壁纸' : '默认'}
    >
      <SettingItem label="壁纸库">
        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.pickButton} onPress={handleAddWallpaper} activeOpacity={0.7}>
            <Text style={styles.pickButtonText}>+ 相册</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.systemButton} onPress={handleAddSystemWallpaper} activeOpacity={0.7}>
            <Text style={styles.systemButtonText}>系统壁纸</Text>
          </TouchableOpacity>
        </View>
      </SettingItem>

      {hasWallpapers && (
        <WallpaperCarousel
          wallpapers={settings.wallpapers}
          currentIndex={settings.currentWallpaperIndex}
          onSelect={handleSelectWallpaper}
          onReorder={handleReorder}
          onDelete={handleDeleteWallpaper}
        />
      )}

      {hasWallpapers && (
        <>
          <SettingToggle
            label="启用壁纸"
            value={settings.enableBackgroundImage}
            onChange={(v) => {
              onUpdate('enableBackgroundImage', v);
              if (v) {
                const uri = settings.wallpapers[settings.currentWallpaperIndex];
                if (uri) setWallpaper(uri);
              }
            }}
          />
          <SettingSelector
            label="壁纸模式"
            options={[
              { label: "固定", value: "fixed" },
              { label: "随机", value: "shuffle" },
              { label: "顺序轮换", value: "sequential" },
              { label: "定时切换", value: "timer" },
              { label: "每次解锁", value: "onUnlock" },
            ]}
            value={settings.wallpaperMode}
            onChange={(v) => onUpdate('wallpaperMode', v as any)}
          />
          {settings.wallpaperMode === 'timer' && (
            <SettingItem label="切换间隔">
              <View style={styles.timerOptions}>
                {TIMER_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    style={[styles.timerOption, settings.wallpaperTimerInterval === opt.value && styles.timerOptionActive]}
                    onPress={() => onUpdate('wallpaperTimerInterval', opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.timerOptionText, settings.wallpaperTimerInterval === opt.value && styles.timerOptionTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </SettingItem>
          )}
          {settings.wallpaperMode === "onUnlock" && (
            <Text style={styles.hintText}>每次解锁屏幕时自动切换下一张壁纸</Text>
          )}
        </>
      )}

      <View style={styles.divider} />

      <Text style={styles.sectionHint}>
        {bgEnabled ? '毛玻璃效果需要壁纸才能看到' : '先添加壁纸再设置效果'}
      </Text>

      <SettingSelector
        label="覆盖层效果"
        options={effectOptions}
        value={settings.overlayEffect}
        onChange={(v) => onUpdate('overlayEffect', v)}
      />

      {settings.overlayEffect ? (
        <SettingSliderItem
          label="覆盖层强度"
          value={settings.overlayEffectIntensity}
          min={overlayIntensity.min}
          max={overlayIntensity.max}
          step={1}
          unit=""
          themeColor={settings.themeColor}
          onChange={(v) => onUpdate('overlayEffectIntensity', v)}
        />
      ) : null}

      <SettingSliderItem
        label="列表背景透明度"
        value={settings.listBgOpacity}
        min={0}
        max={1}
        step={0.05}
        unit=""
        themeColor={settings.themeColor}
        onChange={(v) => onUpdate('listBgOpacity', v)}
        formatValue={(v) => Math.round(v * 100) + '%'}
      />
    </SettingModule>
  );
};

const styles = StyleSheet.create({
  buttonRow: { flexDirection: 'row', gap: 8 },
  pickButton: { backgroundColor: '#2C2C2E', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#3b82f6' },
  pickButtonText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  systemButton: { backgroundColor: '#2C2C2E', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#34C759' },
  systemButtonText: { color: '#34C759', fontSize: 14, fontWeight: '600' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,255,255,0.08)', marginVertical: 12 },
  sectionHint: { color: '#666', fontSize: 12, marginBottom: 8 },
  timerOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timerOption: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#2C2C2E', borderWidth: 1, borderColor: 'transparent' },
  timerOptionActive: { borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.15)' },
  timerOptionText: { color: '#ccc', fontSize: 13, fontWeight: '500' },
  timerOptionTextActive: { color: "#3b82f6", fontWeight: "600" },
  hintText: { color: "#888", fontSize: 12, marginTop: 4, marginLeft: 4 },
});

export default BackgroundModule;
