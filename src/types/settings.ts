export interface AppSettings {
  // 普通用户 - 无极调节
  railHeight: number;           // 范围: 150~800, 默认: 450
  railLength: number;           // 范围: 0~800, 默认: 480 轨道长度（字母分布范围）
  bubbleSize: number;           // 范围: 30~80, 默认: 48
  bubbleOffset: number;         // 范围: 0~200, 默认: 30 气泡与边缘的距离
  iconSize: number;             // 范围: 32~64, 默认: 42
  appItemHeight: number;        // 范围: 48~96, 默认: 64
  favIconSize: number;          // 范围: 36~72, 默认: 48
  favColumns: number;           // 范围: 2~6, 默认: 4
  fontScale: number;            // 范围: 0.8~1.4, 默认: 1.0
  focusScrollRatio: number;     // 范围: 0.25~0.5, 默认: 0.33 聚焦滚动位置比例

  // 普通用户 - 选择项
  railSide: 'left' | 'right';  // 默认: 'right'
  themeColor: string;           // 默认: '#3b82f6'
  railColor: string;            // 默认: '#555' 轨道字母颜色

  displayMode: 'list' | 'grid'; // 默认: 'list'
  showDivider: boolean;         // 默认: false 是否显示应用列表分割线
  showHeaderDivider: boolean;   // 默认: true 是否显示字母分组分割线
  appNameFontSize: number;      // 范围: 12~20, 默认: 16 应用名称字体大小
  headerHeight: number;         // 范围: 24~64, 默认: 44 字母分组标题高度
  enableRailColorChange: boolean;  // 默认: true 选中字母变色开关
  enableListColorChange: boolean;  // 默认: true 应用列表变色开关
  enableScrubMode: boolean;        // 默认: true 轨道滑动聚焦模式
  enableVibration: boolean;        // 默认: true 轨道震动开关
  vibrationEffect:
    | 'system'
    | 'keyboardTap' | 'selection' | 'soft' | 'rigid'
    | 'effectTick' | 'segmentTick' | 'segmentFrequentTick'
    | 'impactLight' | 'impactMedium' | 'impactHeavy'
    | 'notificationSuccess' | 'notificationWarning' | 'notificationError'
    | 'confirm' | 'reject'
    | 'gestureStart' | 'gestureEnd'
    | 'toggleOn' | 'toggleOff'
    | 'dragStart'
    | 'gestureThresholdActivate' | 'gestureThresholdDeactivate'
    | 'clockTick' | 'contextClick'
    | 'keyboardPress' | 'keyboardRelease'
    | 'longPress' | 'textHandleMove'
    | 'virtualKey' | 'virtualKeyRelease'
    | 'effectClick' | 'effectDoubleClick' | 'effectHeavyClick';  // 震动特效
  vibrationIntensity: number;      // 范围: 1~5, 默认: 3 震动强度
  enableBottomRailSelect: boolean; // 默认: true #下方点击选中#（不跳转A）
  enableTopRailSelect: boolean;    // 默认: false *上方点击选中*（不跳转）
  emptyLetterMode: 'hide' | 'dim'; // 默认: 'hide' 无应用字母处理模式
  railFontFamily: 'system' | 'monospace' | 'serif' | 'sans-serif'; // 轨道字体
  railFontWeight: 'normal' | '500' | 'bold';                       // 轨道字重
  railFontSize: number;                                             // 轨道字体大小 (范围: 8~18, 默认: 13)

  // 收藏区域
  favoritesHeightMode: 'fixed' | 'auto';  // 默认: 'fixed' 收藏区域高度模式
  favoritesFixedHeight: number;            // 范围: 150~500, 默认: 300 固定高度
  favoritesDisplayStyle: 'grid' | 'list'; // 默认: 'grid' 收藏显示样式
  letterScrollTarget: 'appList' | 'favoritesTop';  // 默认: 'appList' 字母索引滚动目标
  enableBackToFavorites: boolean;          // 默认: true 是否启用返回键回到收藏区域

  // 背景与效果
  wallpapers: string[];              // 壁纸图片 URI 列表
  currentWallpaperIndex: number;     // 当前使用的壁纸索引
  wallpaperMode: 'fixed' | 'shuffle' | 'sequential' | 'timer' | 'onUnlock'; // 固定/随机/顺序/定时/每次解锁
  enableBackgroundImage: boolean;    // 是否启用壁纸背景
  overlayEffect: string;             // 覆盖层效果 key ('' 表示无)
  overlayEffectIntensity: number;    // 覆盖层效果强度
  settingsBgEffect: string;          // 设置界面背景效果 key ('' 表示无)
  settingsBgEffectIntensity: number; // 设置界面背景效果强度
  wallpaperTimerInterval: number;   // 定时切换间隔（分钟）
  listBgOpacity: number;             // 列表背景透明度 (0~1)
  scrubBgOpacity: number;            // 聚焦模式背景透明度 (0~1)
  wallpaperDimming: number;          // 壁纸暗化程度 (0~0.8)
  enableAutoDimming: boolean;        // 是否开启亮度自动适配
  wallpaperDimmingTarget: 'always' | ('scrub' | 'appList')[]; // 暗化应用范围
  wallpaperDimmingColor: string;     // 暗化遮罩颜色: 'black' | 'theme' | 'auto' | hex
  currentWallpaperIsDark: boolean;   // 当前壁纸是否偏暗
  currentWallpaperDominantColor: string; // 当前壁纸的主特征色

  // 开发者模式
  devMode: boolean;
  devClickCount: number;
  waveIntensity: number;        // 范围: 0~3, 默认: 1.0
  waveDecay: number;            // 范围: 0.001~0.5, 默认: 0.02 波浪衰减系数
  waveShapeCap: number;         // 范围: 10~100, 默认: 100 波浪弯曲上限
  waveVerticalSpread: number;   // 范围: 0~2, 默认: 0.0 波浪纵向展开幅度

  activeScale: number;          // 范围: 1.0~2.5, 默认: 1.8 选中字母缩放
  neighborScale: number;        // 范围: 1.0~1.5, 默认: 1.3 相邻字母缩放
  animationDuration: number;    // 范围: 50~500ms, 默认: 130
  springFriction: number;       // 范围: 1~20, 默认: 6
  springTension: number;        // 范围: 50~300, 默认: 180
  disableAnimation: boolean;
  bubbleOpacity: number;        // 范围: 0.3~1.0, 默认: 1.0
  shadowIntensity: number;      // 范围: 0~1, 默认: 0.4
  iconBorderRadius: number;     // 范围: 0~24, 默认: 11
  showTouchZone: boolean;
  showRailBounds: boolean;
  logLevel: 'off' | 'basic' | 'verbose';
}

export type SettingKey = keyof AppSettings;

export interface SettingSliderConfig {
  key: SettingKey;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}

export interface SettingOptionConfig {
  key: SettingKey;
  label: string;
  options: { label: string; value: string | number | boolean }[];
}

export interface AppInfo {
  id: string;
  name: string;
  packageName: string;
  letter: string;
  icon: string;
}

export interface AppCustomization {
  customName?: string;
  customIcon?: string;
}

export type AppCustomizations = Record<string, AppCustomization>;

export interface FlatItem {
  _type: 'header' | 'app';
  letter: string;
  id: string;
  name?: string;
  packageName?: string;
  icon?: string;
}

export interface FlatListResult {
  items: FlatItem[];
  letterIndices: Record<string, number>;
  offsets: number[];
}
