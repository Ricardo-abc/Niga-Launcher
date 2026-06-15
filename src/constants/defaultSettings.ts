import { AppSettings } from '../types/settings';

export const DEFAULT_SETTINGS: AppSettings = {
  // 普通用户 - 无极调节
  railHeight: 450,
  railLength: 480,
  bubbleSize: 36,
  bubbleOffset: 30,
  iconSize: 42,
  appItemHeight: 64,
  favIconSize: 48,
  favColumns: 4,
  fontScale: 1.0,
  focusScrollRatio: 0.33,  // 聚焦滚动位置：屏幕1/3处

  // 普通用户 - 选择项
  railSide: 'right',
  themeColor: '#3b82f6',
  railColor: '#ffffff',

  displayMode: 'list',
  showDivider: false,      // 默认关闭分割线
  showHeaderDivider: true, // 默认显示字母分组分割线
  appNameFontSize: 16,     // 默认应用名称字体大小
  headerHeight: 44,        // 默认字母分组标题高度
  enableRailColorChange: true,  // 默认开启字母轨道变色
  enableListColorChange: true,  // 默认开启应用列表变色
  enableScrubMode: true,        // 默认开启轨道滑动聚焦
  enableVibration: true,        // 默认开启轨道震动
  vibrationEffect: 'keyboardTap', // 默认键盘点击感
  vibrationIntensity: 5,        // 默认最大强度
  enableBottomRailSelect: true, // 默认开启 #下方点击选中#
  enableTopRailSelect: false,   // 默认关闭 *上方点击选中*
  emptyLetterMode: 'hide',     // 默认隐藏无应用字母
  railFontFamily: 'system',
  railFontWeight: 'bold',
  railFontSize: 13,

  // 收藏区域
  favoritesHeightMode: 'auto',
  favoritesFixedHeight: 300,
  favoritesDisplayStyle: 'list',
  letterScrollTarget: 'appList',
  enableBackToFavorites: true,

  // 背景与效果
  wallpapers: [],
  currentWallpaperIndex: 0,
  wallpaperMode: 'fixed',
  enableBackgroundImage: false,
  overlayEffect: 'frosted-glass',
  overlayEffectIntensity: 40,
  settingsBgEffect: 'frosted-glass',
  settingsBgEffectIntensity: 80,
  wallpaperTimerInterval: 60,
  listBgOpacity: 0.6,
  scrubBgOpacity: 0,
  wallpaperDimming: 0.3,
  enableAutoDimming: true,
  wallpaperDimmingTarget: ['scrub'],
  wallpaperDimmingColor: 'black',
  currentWallpaperIsDark: true,
  currentWallpaperDominantColor: '#3b82f6',

  // 开发者模式
  devMode: false,
  devClickCount: 0,
  waveIntensity: 1.0,
  waveDecay: 0.02,
  waveShapeCap: 100,
  waveVerticalSpread: 0.0,

  activeScale: 1.8,
  neighborScale: 1.3,
  animationDuration: 130,
  springFriction: 6,
  springTension: 180,
  disableAnimation: false,
  bubbleOpacity: 1.0,
  shadowIntensity: 0.4,
  iconBorderRadius: 11,
  showTouchZone: false,
  showRailBounds: false,
  searchAiSuggestions: false,
  searchContacts: false,
  searchCalculator: true,
  searchAiAppPackage: "",
  logLevel: 'off',
};

export const THEME_COLORS = [
  'auto',    // 自适应壁纸色彩
  '#3b82f6', // 蓝色
  '#ef4444', // 红色
  '#22c55e', // 绿色
  '#a855f7', // 紫色
  '#f97316', // 橙色
  '#ec4899', // 粉色
  '#06b6d4', // 青色
  '#eab308', // 黄色
];

export const RAIL_COLORS = [
  '#ffffff', // 白色
  '#888888', // 中灰
  '#444444', // 深灰
  '#ef4444', // 红色
  '#f97316', // 橙色
  '#eab308', // 黄色
  '#22c55e', // 绿色
  '#06b6d4', // 青色
  '#3b82f6', // 蓝色
  '#a855f7', // 紫色
  '#ec4899', // 粉色
];



export const ALPHABET = '*ABCDEFGHIJKLMNOPQRSTUVWXYZ#'.split('');

export const LETTER_COLORS: Record<string, string> = {
  A: '#ef4444', B: '#f97316', C: '#f59e0b', D: '#eab308',
  E: '#84cc16', F: '#22c55e', G: '#10b981', H: '#14b8a6',
  I: '#06b6d4', J: '#0ea5e9', K: '#3b82f6', L: '#6366f1',
  M: '#8b5cf6', N: '#a855f7', O: '#d946ef', P: '#ec4899',
  Q: '#f43f5e', R: '#fb7185', S: '#38bdf8', T: '#2dd4bf',
  U: '#a3e635', V: '#fbbf24', W: '#c084fc', X: '#818cf8',
  Y: '#34d399', Z: '#f472b6', '#': '#64748b',
};

export const HEADER_HEIGHT = 44;
export const ITEM_HEIGHT = 64;
export const RAIL_BOTTOM_PADDING = 60;
export const GESTURE_STRIP_WIDTH = 50;
