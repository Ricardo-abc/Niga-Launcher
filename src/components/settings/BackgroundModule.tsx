import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Alert, AppState } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { AppSettings } from '../../types/settings';
import SettingModule from './SettingModule';
import { SettingItem, SettingToggle, SettingSelector, SettingMultiSelector, SettingSliderItem, SettingSubModule } from './SettingItems';
import { getEffectNames, getEffect } from '../../effects/registry';
import { setWallpaper, isLiveWallpaperActive, openLiveWallpaperSettings } from '../../modules/WallpaperBridge';
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

  const [isServiceActive, setIsServiceActive] = React.useState(false);

  const getDimmingTargetValue = (target: 'always' | ('scrub' | 'appList')[]) => {
    if (target === 'always') return 'always';
    if (target.includes('scrub') && target.includes('appList')) return 'both';
    if (target.includes('scrub')) return 'scrub';
    if (target.includes('appList')) return 'appList';
    return 'always';
  };

  const handleDimmingTargetChange = (val: string) => {
    if (val === 'always') {
      onUpdate('wallpaperDimmingTarget', 'always');
    } else if (val === 'both') {
      onUpdate('wallpaperDimmingTarget', ['scrub', 'appList']);
    } else if (val === 'scrub') {
      onUpdate('wallpaperDimmingTarget', ['scrub']);
    } else if (val === 'appList') {
      onUpdate('wallpaperDimmingTarget', ['appList']);
    }
  };

  React.useEffect(() => {
    let isMounted = true;
    const checkService = async () => {
      const active = await isLiveWallpaperActive();
      if (isMounted) setIsServiceActive(active);
    };
    checkService();

    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (nextAppState === 'active') {
        checkService();
      }
    });

    return () => {
      isMounted = false;
      subscription.remove();
    };
  }, []);

  const handleEnableService = async () => {
    try {
      await openLiveWallpaperSettings();
    } catch (e) {
      Alert.alert('错误', '无法打开壁纸设置');
    }
  };


  const handleAddWallpaper = async () => {
    try {
      // Request media library permission explicitly before opening picker
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('权限不足', '需要相册访问权限才能选择壁纸。请在系统设置中启用该权限。');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
        base64: false,
        allowsMultipleSelection: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) return;

      const dir = `${FileSystem.documentDirectory}wallpapers/`;
      await FileSystem.makeDirectoryAsync(dir, { intermediates: true });

      const newUris: string[] = [];
      const now = Date.now();

      for (let i = 0; i < result.assets.length; i++) {
        const asset = result.assets[i];
        if (asset.uri) {
          const filename = `wallpaper_${now}_${i}.jpg`;
          const destUri = `${dir}${filename}`;
          await FileSystem.copyAsync({
            from: asset.uri,
            to: destUri,
          });
          newUris.push(destUri);
        }
      }

      if (newUris.length === 0) return;

      const newList = [...settings.wallpapers, ...newUris];
      onUpdate('wallpapers', newList);

      if (settings.wallpapers.length === 0) {
        onUpdate('enableBackgroundImage', true);
        onUpdate('currentWallpaperIndex', 0);
        setWallpaper(newUris[0]);
      }
    } catch (e: any) {
      console.error('[Wallpaper] Add failed:', e);
      Alert.alert('错误', `添加壁纸失败: ${e?.message || e}`);
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



  const currentSettingsBgEffect = settings.settingsBgEffect ? getEffect(settings.settingsBgEffect) : null;
  const settingsBgIntensity = currentSettingsBgEffect
    ? { min: currentSettingsBgEffect.minIntensity, max: currentSettingsBgEffect.maxIntensity }
    : { min: 10, max: 80 };

  return (
    <SettingModule
      title="背景与效果"
      icon="🖼️"
      summary={bgEnabled ? settings.wallpapers.length + '张壁纸' : '默认'}
    >
      <SettingSubModule title="壁纸选择 (Wallpaper Setup)">
        <SettingItem label="壁纸库">
          <View style={styles.buttonRow}>
            <TouchableOpacity style={styles.pickButton} onPress={handleAddWallpaper} activeOpacity={0.7}>
              <Text style={styles.pickButtonText}>+ 相册</Text>
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
            <SettingItem label="原生壁纸服务">
              <View style={styles.buttonRow}>
                {isServiceActive ? (
                  <Text style={styles.serviceActiveText}>🟢 运行中（壁纸由系统底层渲染，极省内存）</Text>
                ) : (
                  <TouchableOpacity style={styles.serviceButton} onPress={handleEnableService} activeOpacity={0.7}>
                    <Text style={styles.serviceButtonText}>激活原生壁纸</Text>
                  </TouchableOpacity>
                )}
              </View>
            </SettingItem>
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
      </SettingSubModule>

      <SettingSubModule title="壁纸暗度调节 (Wallpaper Dimming)">
        <SettingToggle
          label="壁纸暗度自动适配"
          value={settings.enableAutoDimming}
          onChange={(v) => onUpdate('enableAutoDimming', v)}
        />
        {!settings.enableAutoDimming && (
          <SettingSliderItem
            label="壁纸暗化程度"
            value={settings.wallpaperDimming}
            min={0}
            max={0.8}
            step={0.05}
            unit=""
            themeColor={settings.themeColor === 'auto' ? (settings.currentWallpaperDominantColor || '#3b82f6') : settings.themeColor}
            onChange={(v) => onUpdate('wallpaperDimming', v)}
            formatValue={(v) => Math.round(v * 100) + '%'}
          />
        )}
        <SettingSelector
          label="暗化应用范围"
          options={[
            { label: "总是应用", value: "always" },
            { label: "仅聚焦滑动时", value: "scrub" },
            { label: "仅列表滚动时", value: "appList" },
            { label: "滑动与滚动时", value: "both" },
          ]}
          value={getDimmingTargetValue(settings.wallpaperDimmingTarget)}
          onChange={handleDimmingTargetChange}
        />
        <SettingSelector
          label="暗化遮罩颜色"
          options={[
            { label: "黑色", value: "black" },
            { label: "跟随主题色", value: "theme" },
            { label: "壁纸自适应", value: "auto" },
          ]}
          value={settings.wallpaperDimmingColor}
          onChange={(v) => onUpdate('wallpaperDimmingColor', v)}
        />
      </SettingSubModule>


    </SettingModule>
  );
};

const styles = StyleSheet.create({
  buttonRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  pickButton: { backgroundColor: '#F2F2F7', paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1, borderColor: '#3b82f6' },
  pickButtonText: { color: '#3b82f6', fontSize: 14, fontWeight: '600' },
  serviceButton: { backgroundColor: '#F2F2F7', paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, borderWidth: 1, borderColor: '#3b82f6' },
  serviceButtonText: { color: '#3b82f6', fontSize: 13, fontWeight: '600' },
  serviceActiveText: { color: '#34C759', fontSize: 13, fontWeight: '500', flex: 1 },

  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E5E5EA', marginVertical: 12 },
  sectionHint: { color: '#8E8E93', fontSize: 12, marginBottom: 8 },
  timerOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timerOption: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 8, backgroundColor: '#F2F2F7', borderWidth: 1, borderColor: 'transparent' },
  timerOptionActive: { borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.12)' },
  timerOptionText: { color: '#555', fontSize: 13, fontWeight: '500' },
  timerOptionTextActive: { color: "#3b82f6", fontWeight: "600" },
  hintText: { color: "#8E8E93", fontSize: 12, marginTop: 4, marginLeft: 4 },
});

export default BackgroundModule;
