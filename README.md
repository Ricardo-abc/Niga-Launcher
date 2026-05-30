# Niga Launcher

[中文](README.md) | [English](README_EN.md)

一个基于 React Native (Expo) 的字母导航启动器应用，支持快速滑动浏览和启动已安装的应用程序。

<!-- 截图占位 - 后续补充 -->
<!-- ![Niga Launcher Screenshot](assets/screenshot.png) -->

## 功能特性

### 核心功能
- **字母索引导航** - 通过左右边缘滑动手势快速定位应用
- **实时字母气泡** - 滑动时显示当前选中的字母，支持触觉反馈
- **应用列表** - 按字母分组显示所有已安装应用，支持中文拼音排序
- **快速启动** - 点击应用图标即可启动

### 收藏夹
- **收藏应用** - 长按应用添加到收藏夹
- **收藏夹视图** - 列表顶部显示收藏的应用，快速访问

### 壁纸与视觉
- **自定义壁纸** - 支持从相册选择壁纸作为启动器背景
- **壁纸轮播** - 内置壁纸选择器，浏览和切换壁纸
- **毛玻璃效果** - 可选的磨砂玻璃视觉效果
- **渐变光晕** - 背景渐变光晕效果

### 设置与自定义
- **设置面板** - 可调节字母轨道高度、振动反馈等
- **应用自定义** - 重命名应用、更换图标
- **开发者模式** - 隐藏的开发者设置面板
- **缓存优化** - 首次加载后缓存应用列表，提升启动速度

### 原生集成
- **壁纸服务** - Android 原生壁纸服务桥接
- **边缘到边缘** - 支持 Android Edge-to-Edge 显示

## 前置条件

- Node.js 18+
- Android Studio (含 Android SDK)
- JDK 17
- Expo CLI (`npm install -g expo-cli`)

## 下载与安装

### 下载 APK

前往 [Releases](https://github.com/Ricardo-abc/Niga-Launcher/releases/latest) 下载最新版本 APK。

### 从源码构建

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm start
```

### 运行 Android

```bash
npm run android
```

### 构建 APK

```bash
npm run apk
```

构建完成后，APK 文件位于 `android/app/build/outputs/apk/release/`。

## 项目结构

```
NigaLauncher/
├── App.tsx                      # 主应用组件（手势处理、状态管理）
├── index.js                     # 入口文件
├── app.json                     # Expo 配置
├── package.json                 # 依赖与脚本
├── LICENSE                      # MIT 许可证
│
├── src/
│   ├── components/              # UI 组件
│   │   ├── AlphabetBubble.tsx       # 字母气泡（滑动时显示）
│   │   ├── AppContextMenu.tsx       # 应用上下文菜单（长按）
│   │   ├── AppItem.tsx              # 应用列表项
│   │   ├── EditAppDialog.tsx        # 编辑应用对话框
│   │   ├── FavoritesHeader.tsx      # 收藏夹头部
│   │   ├── FavoritesView.tsx        # 收藏夹视图
│   │   ├── LetterRail.tsx           # 字母轨道（A-Z + #）
│   │   ├── SettingSlider.tsx        # 滑块控件
│   │   ├── SettingsView.tsx         # 设置面板
│   │   ├── WallpaperBackground.tsx  # 壁纸背景渲染
│   │   ├── WallpaperCarousel.tsx    # 壁纸轮播选择器
│   │   └── settings/               # 设置子模块
│   │       ├── BackgroundModule.tsx     # 背景/壁纸设置
│   │       ├── DevModeTrigger.tsx       # 开发者模式触发器
│   │       ├── DevSettings.tsx          # 开发者设置
│   │       ├── GeneralSettings.tsx      # 通用设置
│   │       ├── SettingItems.tsx         # 设置项组件
│   │       └── SettingModule.tsx        # 设置模块包装器
│   │
│   ├── constants/               # 常量定义
│   │   ├── defaultSettings.ts       # 默认值（字母表、高度等）
│   │   └── storageKeys.ts           # AsyncStorage 键名
│   │
│   ├── context/                 # React Context
│   │   └── SettingsContext.tsx      # 设置状态管理
│   │
│   ├── effects/                 # 视觉效果层
│   │   ├── EffectLayer.tsx          # 效果合成器
│   │   ├── FrostedGlass.tsx         # 毛玻璃效果
│   │   └── GradientGlow.tsx         # 渐变光晕效果
│   │
│   ├── hooks/                   # 自定义 Hooks
│   │   ├── useActiveAlphabet.ts     # 活跃字母计算
│   │   └── useSettings.ts           # 设置持久化
│   │
│   ├── modules/                 # 原生桥接模块
│   │   └── WallpaperBridge.ts       # 壁纸服务桥接
│   │
│   ├── services/                # 业务逻辑服务
│   │   └── AppService.ts            # 应用加载、缓存、启动
│   │
│   └── types/                   # TypeScript 类型定义
│       ├── settings.ts              # 应用信息、设置接口
│       └── index.ts                 # 类型导出
│
├── apk/                         # APK 构建脚本
│   └── compress.js
│
├── assets/                      # 静态资源
│   ├── icon.png
│   ├── adaptive-icon.png
│   ├── splash-icon.png
│   └── favicon.png
│
└── android/                     # Android 原生配置（gitignore）
```

## 手势操作

| 手势 | 功能 |
|------|------|
| 右侧边缘向左滑动 | 打开字母轨道 |
| 左侧边缘向右滑动 | 打开字母轨道 |
| 在字母轨道上下滑动 | 选择字母，快速定位应用 |
| 点击应用 | 启动应用 |
| 长按应用 | 打开上下文菜单（收藏、编辑） |
| 返回按钮 | 回到时钟视图 |

## 配置说明

应用配置在 `app.json` 中：

- `name` - 应用名称
- `android.package` - Android 包名
- `newArchEnabled` - 启用 React Native 新架构
- `edgeToEdgeEnabled` - 启用 Edge-to-Edge 显示

## 技术栈

| 技术 | 版本 |
|------|------|
| React Native | 0.81.5 |
| Expo SDK | 54 |
| React | 19.1.0 |
| TypeScript | - |
| AsyncStorage | 2.1.1 |
| pinyin-pro | 3.28.1 |
| react-native-haptic-feedback | 3.0.0 |
| react-native-launcher-kit | 2.1.0 |

## 许可证

MIT License - 详见 [LICENSE](LICENSE)
