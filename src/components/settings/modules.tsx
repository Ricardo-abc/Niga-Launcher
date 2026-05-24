import React from 'react';
import { AppSettings } from '../../types/settings';
import { THEME_COLORS, RAIL_COLORS, RAIL_ACTIVE_COLORS } from '../../constants/defaultSettings';
import SettingModule from './SettingModule';
import { SettingItem, SettingToggle, SettingSelector, SettingColor, SettingSliderItem, SettingToggleWithAction } from './SettingItems';
import { t } from '../../i18n';

interface AppearanceModuleProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const AppearanceModule: React.FC<AppearanceModuleProps> = ({ settings, onUpdate }) => (
  <SettingModule
    title={t('settings.appearance.title')}
    icon="🎨"
    summary={settings.themeColor}
  >
    <SettingColor
      label={t('settings.appearance.themeColor')}
      colors={THEME_COLORS}
      value={settings.themeColor}
      onChange={(v) => onUpdate('themeColor', v)}
      description={t('settings.appearance.themeColorDesc')}
    />
    <SettingSliderItem
      label={t('settings.appearance.fontScale')}
      value={settings.fontScale}
      min={0.8}
      max={1.4}
      step={0.05}
      unit="x"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('fontScale', v)}
    />
  </SettingModule>
);

interface RailModuleProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
  onNavigateToVibration?: () => void;
}

export const RailModule: React.FC<RailModuleProps> = ({ settings, onUpdate, onNavigateToVibration }) => (
  <SettingModule
    title={t('settings.rail.title')}
    icon="📱"
    summary={settings.railSide === 'left' ? t('settings.rail.positionLeft') : t('settings.rail.positionRight')}
  >
    <SettingSliderItem
      label={t('settings.rail.height')}
      value={settings.railHeight}
      min={150}
      max={800}
      step={10}
      unit="dp"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('railHeight', v)}
    />
    <SettingSliderItem
      label={t('settings.rail.length')}
      value={settings.railLength}
      min={0}
      max={800}
      step={5}
      unit="dp"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('railLength', v)}
    />
    <SettingSelector
      label={t('settings.rail.position')}
      options={[
        { label: t('settings.rail.positionLeft'), value: 'left' },
        { label: t('settings.rail.positionRight'), value: 'right' },
      ]}
      value={settings.railSide}
      onChange={(v) => onUpdate('railSide', v as 'left' | 'right')}
    />
    <SettingSelector
      label={t('settings.rail.emptyLetter')}
      options={[
        { label: t('settings.rail.emptyLetterHide'), value: 'hide' },
        { label: t('settings.rail.emptyLetterDim'), value: 'dim' },
      ]}
      value={settings.emptyLetterMode}
      onChange={(v) => onUpdate('emptyLetterMode', v as 'hide' | 'dim')}
    />

    <SettingSelector
      label={t('settings.rail.font')}
      options={[
        { label: t('settings.rail.fontSystem'), value: 'system' },
        { label: t('settings.rail.fontMonospace'), value: 'monospace' },
        { label: t('settings.rail.fontSerif'), value: 'serif' },
        { label: t('settings.rail.fontSansSerif'), value: 'sans-serif' },
      ]}
      value={settings.railFontFamily || 'system'}
      onChange={(v) => onUpdate('railFontFamily', v as any)}
    />
    <SettingSelector
      label={t('settings.rail.fontWeight')}
      options={[
        { label: t('settings.rail.fontWeightNormal'), value: 'normal' },
        { label: t('settings.rail.fontWeightMedium'), value: '500' },
        { label: t('settings.rail.fontWeightBold'), value: 'bold' },
      ]}
      value={settings.railFontWeight || 'bold'}
      onChange={(v) => onUpdate('railFontWeight', v as any)}
    />
    <SettingSliderItem
      label={t('settings.rail.fontSize')}
      value={settings.railFontSize !== undefined ? settings.railFontSize : 11}
      min={8}
      max={18}
      step={0.5}
      unit="px"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('railFontSize', v)}
    />
    <SettingColor
      label={t('settings.rail.defaultColor')}
      colors={RAIL_COLORS}
      value={settings.railColor}
      onChange={(v) => onUpdate('railColor', v)}
      description={t('settings.rail.defaultColorDesc')}
    />
    <SettingColor
      label={t('settings.rail.activeColor')}
      colors={RAIL_ACTIVE_COLORS}
      value={settings.railActiveColor}
      onChange={(v) => onUpdate('railActiveColor', v)}
      description={t('settings.rail.activeColorDesc')}
    />

    <SettingToggle
      label={t('settings.rail.colorChange')}
      value={settings.enableRailColorChange}
      onChange={(v) => onUpdate('enableRailColorChange', v)}
    />
    <SettingToggleWithAction
      label={t('settings.rail.vibration')}
      value={settings.enableVibration}
      onToggle={(v) => onUpdate('enableVibration', v)}
      onAction={() => onNavigateToVibration?.()}
    />
    <SettingToggle
      label={t('settings.rail.motionBlur')}
      value={settings.enableMotionBlur}
      onChange={(v) => onUpdate('enableMotionBlur', v)}
    />
    {settings.enableMotionBlur && (
      <SettingSliderItem
        label="模糊强度"
        value={settings.motionBlurIntensity}
        min={0}
        max={1}
        step={0.05}
        unit=""
        themeColor={settings.themeColor}
        onChange={(v) => onUpdate('motionBlurIntensity', v)}
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />
    )}
    <SettingToggle
      label="#下方选中#"
      value={settings.enableBottomRailSelect}
      onChange={(v) => onUpdate('enableBottomRailSelect', v)}
    />
    <SettingToggle
      label="*上方选中*"
      value={settings.enableTopRailSelect}
      onChange={(v) => onUpdate('enableTopRailSelect', v)}
    />
  </SettingModule>
);

interface BubbleModuleProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const BubbleModule: React.FC<BubbleModuleProps> = ({ settings, onUpdate }) => (
  <SettingModule
    title="气泡"
    icon="💬"
    summary={`${settings.bubbleSize}px`}
  >
    <SettingSliderItem
      label="气泡大小"
      value={settings.bubbleSize}
      min={30}
      max={80}
      step={1}
      unit="px"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('bubbleSize', v)}
    />
    <SettingSliderItem
      label="气泡偏移"
      value={settings.bubbleOffset}
      min={0}
      max={200}
      step={1}
      unit="px"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('bubbleOffset', v)}
    />
  </SettingModule>
);

interface AppListModuleProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const AppListModule: React.FC<AppListModuleProps> = ({ settings, onUpdate }) => (
  <SettingModule
    title="应用列表"
    icon="📋"
    summary={`${settings.appItemHeight}px`}
  >
    <SettingSliderItem
      label="图标大小"
      value={settings.iconSize}
      min={32}
      max={64}
      step={1}
      unit="px"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('iconSize', v)}
    />
    <SettingSliderItem
      label="列表项高度"
      value={settings.appItemHeight}
      min={48}
      max={96}
      step={1}
      unit="px"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('appItemHeight', v)}
    />
    <SettingSliderItem
      label="滚动位置"
      value={settings.focusScrollRatio}
      min={0.25}
      max={0.5}
      step={0.01}
      unit=""
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('focusScrollRatio', v)}
      formatValue={(v) => `${Math.round(v * 100)}%`}
    />
    <SettingSliderItem
      label="字母分组高度"
      value={settings.headerHeight}
      min={24}
      max={64}
      step={2}
      unit="px"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('headerHeight', v)}
    />
    <SettingSliderItem
      label="应用名称字体大小"
      value={settings.appNameFontSize}
      min={12}
      max={20}
      step={1}
      unit="px"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('appNameFontSize', v)}
    />
    <SettingToggle
      label="列表分割线"
      value={settings.showDivider}
      onChange={(v) => onUpdate('showDivider', v)}
    />
    <SettingToggle
      label="应用列表变色"
      value={settings.enableListColorChange}
      onChange={(v) => onUpdate('enableListColorChange', v)}
    />
    <SettingToggle
      label="轨道滑动聚焦"
      value={settings.enableScrubMode}
      onChange={(v) => onUpdate('enableScrubMode', v)}
    />
    {settings.enableScrubMode && (
      <SettingSliderItem
        label="聚焦背景不透明度"
        value={settings.scrubBgOpacity}
        min={0}
        max={1}
        step={0.05}
        unit=""
        themeColor={settings.themeColor}
        onChange={(v) => onUpdate('scrubBgOpacity', v)}
        formatValue={(v) => `${Math.round(v * 100)}%`}
      />
    )}
  </SettingModule>
);

interface FavoritesModuleProps {
  settings: AppSettings;
  onUpdate: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
}

export const FavoritesModule: React.FC<FavoritesModuleProps> = ({ settings, onUpdate }) => (
  <SettingModule
    title="收藏"
    icon="⭐"
    summary={settings.favoritesHeightMode === 'fixed' ? '固定高度' : '自适应'}
  >
    <SettingSliderItem
      label="收藏图标大小"
      value={settings.favIconSize}
      min={36}
      max={72}
      step={1}
      unit="px"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('favIconSize', v)}
    />
    <SettingSliderItem
      label="收藏列数"
      value={settings.favColumns}
      min={2}
      max={6}
      step={1}
      unit="列"
      themeColor={settings.themeColor}
      onChange={(v) => onUpdate('favColumns', v)}
    />
    <SettingSelector
      label="收藏显示样式"
      options={[
        { label: '网格布局', value: 'grid' },
        { label: '列表布局', value: 'list' },
      ]}
      value={settings.favoritesDisplayStyle}
      onChange={(v) => onUpdate('favoritesDisplayStyle', v as 'grid' | 'list')}
    />
    <SettingSelector
      label="收藏区域高度模式"
      options={[
        { label: '固定高度', value: 'fixed' },
        { label: '自适应', value: 'auto' },
      ]}
      value={settings.favoritesHeightMode}
      onChange={(v) => onUpdate('favoritesHeightMode', v as 'fixed' | 'auto')}
    />
    {settings.favoritesHeightMode === 'fixed' && (
      <SettingSliderItem
        label="固定高度"
        value={settings.favoritesFixedHeight}
        min={150}
        max={500}
        step={10}
        unit="px"
        themeColor={settings.themeColor}
        onChange={(v) => onUpdate('favoritesFixedHeight', v)}
      />
    )}
    <SettingSelector
      label="字母索引滚动目标"
      options={[
        { label: '应用列表', value: 'appList' },
        { label: '收藏顶部', value: 'favoritesTop' },
      ]}
      value={settings.letterScrollTarget}
      onChange={(v) => onUpdate('letterScrollTarget', v as 'appList' | 'favoritesTop')}
    />
    <SettingToggle
      label="返回键回到收藏区域"
      value={settings.enableBackToFavorites}
      onChange={(v) => onUpdate('enableBackToFavorites', v)}
    />
  </SettingModule>
);
