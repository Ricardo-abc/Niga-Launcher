# Niga Launcher

[中文](README.md) | [English](README_EN.md)

An alphabet navigation launcher app based on React Native (Expo), supporting quick scrolling and launching of installed applications.

<!-- Screenshot placeholder -->
<!-- ![Niga Launcher Screenshot](assets/screenshot.png) -->

## Features

### Core Features
- **Alphabet Index Navigation** - Quickly locate apps via left/right edge swipe gestures
- **Real-time Alphabet Bubble** - Displays the currently selected letter while sliding, with haptic feedback
- **App List** - Shows all installed apps grouped by alphabet, supporting Chinese pinyin sorting
- **Quick Launch** - Tap app icon to launch

### Favorites
- **Favorite Apps** - Long press to add apps to favorites
- **Favorites View** - Shows favorited apps at the top of the list for quick access

### Wallpaper & Visuals
- **Custom Wallpaper** - Select wallpaper from gallery as launcher background
- **Wallpaper Carousel** - Built-in wallpaper picker for browsing and switching wallpapers
- **Frosted Glass Effect** - Optional frosted glass visual effect
- **Gradient Glow** - Background gradient glow effect

### Settings & Customization
- **Settings Panel** - Adjust alphabet rail height, vibration feedback, etc.
- **App Customization** - Rename apps, change icons
- **Developer Mode** - Hidden developer settings panel
- **Cache Optimization** - Cache app list after first load for faster startup

### Native Integration
- **Wallpaper Service** - Android native wallpaper service bridge
- **Edge-to-Edge** - Support for Android Edge-to-Edge display

## Prerequisites

- Node.js 18+
- Android Studio (with Android SDK)
- JDK 17
- Expo CLI (`npm install -g expo-cli`)

## Download & Install

### Download APK

Go to [Releases](https://github.com/Ricardo-abc/Niga-Launcher/releases/latest) to download the latest APK.

### Build from Source

### Install Dependencies

```bash
npm install
```

### Generate Native Platform Files (Required for first-time run or build)

Since the native platform folders (`/android`) are excluded by default in `.gitignore`, you must generate the Android native project structure before running or building the APK for the first time:

```bash
npx expo prebuild --platform android
```

### Start Development Server

```bash
npm start
```

### Run Android

```bash
npm run android
```

### Build APK

```bash
npm run apk
```

After the build is complete, the APK file is located at `android/app/build/outputs/apk/release/`.

## Project Structure

```
NigaLauncher/
├── App.tsx                      # Main app component (gesture handling, state management)
├── index.js                     # Entry file
├── app.json                     # Expo configuration
├── package.json                 # Dependencies and scripts
├── LICENSE                      # MIT License
│
├── src/
│   ├── components/              # UI components
│   │   ├── AlphabetBubble.tsx       # Alphabet bubble (shown when sliding)
│   │   ├── AppContextMenu.tsx       # App context menu (long press)
│   │   ├── AppItem.tsx              # App list item
│   │   ├── EditAppDialog.tsx        # Edit app dialog
│   │   ├── FavoritesHeader.tsx      # Favorites header
│   │   ├── FavoritesView.tsx        # Favorites view
│   │   ├── LetterRail.tsx           # Alphabet rail (A-Z + #)
│   │   ├── SettingSlider.tsx        # Slider control
│   │   ├── SettingsView.tsx         # Settings panel
│   │   ├── WallpaperBackground.tsx  # Wallpaper background renderer
│   │   ├── WallpaperCarousel.tsx    # Wallpaper carousel picker
│   │   └── settings/               # Settings submodules
│   │       ├── BackgroundModule.tsx     # Background/wallpaper settings
│   │       ├── DevModeTrigger.tsx       # Developer mode trigger
│   │       ├── DevSettings.tsx          # Developer settings
│   │       ├── GeneralSettings.tsx      # General settings
│   │       ├── SettingItems.tsx         # Setting item components
│   │       └── SettingModule.tsx        # Setting module wrapper
│   │
│   ├── constants/               # Constants
│   │   ├── defaultSettings.ts       # Default values (alphabet, height, etc.)
│   │   └── storageKeys.ts           # AsyncStorage keys
│   │
│   ├── context/                 # React Context
│   │   └── SettingsContext.tsx      # Settings state management
│   │
│   ├── effects/                 # Visual effects layers
│   │   ├── EffectLayer.tsx          # Effect compositor
│   │   ├── FrostedGlass.tsx         # Frosted glass effect
│   │   └── GradientGlow.tsx         # Gradient glow effect
│   │
│   ├── hooks/                   # Custom Hooks
│   │   ├── useActiveAlphabet.ts     # Active alphabet calculation
│   │   └── useSettings.ts           # Settings persistence
│   │
│   ├── i18n/                    # Internationalization
│   │   ├── index.ts                 # i18n configuration
│   │   ├── zh.json                  # Chinese translations
│   │   └── en.json                  # English translations
│   │
│   ├── modules/                 # Native bridge modules
│   │   └── WallpaperBridge.ts       # Wallpaper service bridge
│   │
│   ├── services/                # Business logic services
│   │   └── AppService.ts            # App loading, caching, launching
│   │
│   └── types/                   # TypeScript type definitions
│       ├── settings.ts              # App info, settings interfaces
│       └── index.ts                 # Type exports
│
├── apk/                         # APK build scripts
│   └── compress.js
│
├── assets/                      # Static assets
│   ├── icon.png
│   ├── adaptive-icon.png
│   ├── splash-icon.png
│   └── favicon.png
│
└── android/                     # Android native configuration (gitignore)
```

## Gesture Controls

| Gesture | Function |
|---------|----------|
| Right edge swipe left | Open alphabet rail |
| Left edge swipe right | Open alphabet rail |
| Slide up/down on rail | Select letter, quickly locate app |
| Tap app | Launch app |
| Long press app | Open context menu (favorite, edit) |
| Back button | Return to clock view |

## Configuration

App configuration is in `app.json`:

- `name` - App name
- `android.package` - Android package name
- `newArchEnabled` - Enable React Native new architecture
- `edgeToEdgeEnabled` - Enable Edge-to-Edge display

## Tech Stack

| Technology | Version |
|------------|---------|
| React Native | 0.81.5 |
| Expo SDK | 54 |
| React | 19.1.0 |
| TypeScript | - |
| AsyncStorage | 2.1.1 |
| pinyin-pro | 3.28.1 |
| react-native-haptic-feedback | 3.0.0 |
| react-native-launcher-kit | 2.1.0 |
| expo-localization | 17.0.8 |
| i18n-js | 4.5.3 |

## Internationalization

The app supports Chinese and English, automatically detecting the system language. Translations are located in `src/i18n/`.

## License

MIT License - see [LICENSE](LICENSE)
