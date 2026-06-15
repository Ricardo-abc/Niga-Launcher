import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  FlatList,
  Dimensions,
  Platform,
  BackHandler,
  Keyboard,
  Animated,
  Switch,
  Clipboard,
  ToastAndroid,
  Alert,
  Image,
  Linking,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { pinyin } from 'pinyin-pro';
import * as Contacts from 'expo-contacts';
import { AppInfo } from '../types/settings';
import AppItem from './AppItem';
import { t } from '../i18n';
import { useSettingsContext } from '../context/SettingsContext';
import { LETTER_COLORS, THEME_COLORS } from '../constants/defaultSettings';
import { RNLauncherKitHelper } from 'react-native-launcher-kit';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface SearchViewProps {
  visible: boolean;
  onClose: () => void;
  apps: AppInfo[];
  customizations: any;
  onLaunchApp: (packageName: string) => void;
  onLongPressApp: (app: AppInfo) => void;
  themeColor: string;
}

// 缓存联系人类型，增加预计算的拼音
interface CachedContact {
  id: string;
  name: string;
  phone: string;
  pinyinFull: string;
  pinyinInitials: string;
}

// 常见系统语音助手包名
const ASSISTANT_PACKAGES = [
  'com.miui.voiceassistproxy',        // 超级小爱 (Xiaomi HyperOS)
  'com.miui.voiceassist',             // 小爱同学 (Xiaomi)
  'com.huawei.vassistant',            // 小艺 (Huawei)
  'com.coloros.speechassist',         // 小布 (OPPO)
  'com.heytap.speechassist',          // 小布 (OPPO/OnePlus)
  'com.vivo.voiceassistant',          // 蓝心小V (VIVO)
  'com.samsung.android.bixby.agent',  // Bixby (Samsung)
  'com.google.android.apps.googleassistant', // Google Assistant
  'com.google.android.googlequicksearchbox', // Google Search / Gemini
];

// 拼音检索助手函数
const matchApp = (appName: string, query: string): boolean => {
  const cleanQuery = query.trim().toLowerCase();
  if (!cleanQuery) return false;
  
  const cleanName = appName.toLowerCase();
  
  // 1. 直接匹配
  if (cleanName.includes(cleanQuery)) return true;
  
  // 2. 拼音全拼匹配
  try {
    const fullPinyin = pinyin(appName, { toneType: 'none' })
      .replace(/\s+/g, '')
      .toLowerCase();
    if (fullPinyin.includes(cleanQuery)) return true;
  } catch (e) {
    // ignore
  }
  
  // 3. 拼音首字母匹配
  try {
    const initials = pinyin(appName, { pattern: 'first', toneType: 'none' })
      .replace(/\s+/g, '')
      .toLowerCase();
    if (initials.includes(cleanQuery)) return true;
  } catch (e) {
    // ignore
  }
  
  return false;
};

// 安全计算器评估
const evaluateMath = (str: string): string | null => {
  if (!/^[0-9+\-*/().\s]+$/.test(str)) return null;
  if (!/[+\-*/]/.test(str)) return null;
  try {
    const result = Function(`"use strict"; return (${str})`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return result.toString();
    }
  } catch {
    // ignore
  }
  return null;
};

const SearchView: React.FC<SearchViewProps> = ({
  visible,
  onClose,
  apps,
  customizations,
  onLaunchApp,
  onLongPressApp,
  themeColor,
}) => {
  const { settings, updateSetting } = useSettingsContext();
  const [query, setQuery] = useState('');
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [appPickerVisible, setAppPickerVisible] = useState(false);
  const [pickerSearchQuery, setPickerSearchQuery] = useState('');
  const [contacts, setContacts] = useState<CachedContact[]>([]);
  
  const inputRef = useRef<TextInput>(null);
  const pickerInputRef = useRef<TextInput>(null);

  // 动画值
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(25)).current;
  const bottomSheetAnim = useRef(new Animated.Value(450)).current;

  // 自动定位当前的 AI 关联应用
  const currentAiApp = useMemo(() => {
    if (settings.searchAiAppPackage) {
      const found = apps.find(a => a.packageName === settings.searchAiAppPackage);
      if (found) return found;
    }
    for (const pkg of ASSISTANT_PACKAGES) {
      const found = apps.find(a => a.packageName === pkg);
      if (found) return found;
    }
    const fallback = apps.find(a => 
      a.name.toLowerCase().includes('ai') || 
      a.name.includes('助手') || 
      a.name.includes('语音') || 
      a.name.includes('智能')
    );
    return fallback || null;
  }, [settings.searchAiAppPackage, apps]);

  // 加载系统通讯录，进行拼音预计算
  const loadContacts = async () => {
    try {
      const { status } = await Contacts.getPermissionsAsync();
      if (status !== 'granted') return;
      
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.PhoneNumbers],
      });
      
      if (data && data.length > 0) {
        const cached: CachedContact[] = [];
        data.forEach(c => {
          const name = c.name || '';
          if (!name) return;
          const phoneNumbers = c.phoneNumbers || [];
          if (phoneNumbers.length === 0) return;
          const phone = phoneNumbers[0].number || '';
          if (!phone) return;
          
          let pinyinFull = '';
          let pinyinInitials = '';
          try {
            pinyinFull = pinyin(name, { toneType: 'none' }).replace(/\s+/g, '').toLowerCase();
            pinyinInitials = pinyin(name, { pattern: 'first', toneType: 'none' }).replace(/\s+/g, '').toLowerCase();
          } catch (e) {
            // ignore
          }
          
          cached.push({
            id: c.id || Math.random().toString(),
            name,
            phone,
            pinyinFull,
            pinyinInitials,
          });
        });
        setContacts(cached);
      }
    } catch (e) {
      console.warn('[SearchView] Failed to load contacts:', e);
    }
  };

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 220,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 220,
          useNativeDriver: true,
        }),
      ]).start();

      const timer = setTimeout(() => {
        inputRef.current?.focus();
      }, 150);

      // 如果开启了联系人搜索，在打开界面时异步加载通讯录
      if (settings.searchContacts) {
        loadContacts();
      }

      return () => clearTimeout(timer);
    }
  }, [visible, settings.searchContacts]);

  // 监听键盘状态
  useEffect(() => {
    const showSub = Keyboard.addListener('keyboardDidShow', () => setKeyboardVisible(true));
    const hideSub = Keyboard.addListener('keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  // 处理返回键
  useEffect(() => {
    const onBackPress = () => {
      if (appPickerVisible) {
        setAppPickerVisible(false);
      } else if (settingsVisible) {
        handleCloseSettings();
      } else {
        handleClose();
      }
      return true;
    };

    const subscription = BackHandler.addEventListener('hardwareBackPress', onBackPress);
    return () => {
      subscription.remove();
    };
  }, [settingsVisible, appPickerVisible]);

  const handleClose = () => {
    Keyboard.dismiss();
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 180,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 25,
        duration: 180,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  // 呼出设置底栏
  const handleOpenSettings = () => {
    Keyboard.dismiss();
    setSettingsVisible(true);
    Animated.spring(bottomSheetAnim, {
      toValue: 0,
      friction: 8,
      tension: 180,
      useNativeDriver: true,
    }).start();
  };

  // 收起设置底栏
  const handleCloseSettings = () => {
    Animated.timing(bottomSheetAnim, {
      toValue: 450,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setSettingsVisible(false);
    });
  };

  // 打开 AI 应用选择器
  const handleOpenAppPicker = () => {
    setPickerSearchQuery('');
    setAppPickerVisible(true);
    setTimeout(() => {
      pickerInputRef.current?.focus();
    }, 100);
  };

  // 选择 AI 关联应用
  const handleSelectAiApp = (packageName: string) => {
    updateSetting('searchAiAppPackage', packageName);
    setAppPickerVisible(false);
  };

  // 浮动键盘按钮切换
  const handleToggleKeyboard = () => {
    if (keyboardVisible) {
      Keyboard.dismiss();
    } else {
      inputRef.current?.focus();
    }
  };

  // 处理计算器结果复制
  const handleCopyResult = (result: string) => {
    Clipboard.setString(result);
    if (Platform.OS === 'android') {
      ToastAndroid.show(t('search.copySuccess'), ToastAndroid.SHORT);
    } else {
      Alert.alert('', t('search.copySuccess'));
    }
  };

  // AI 搜索：一键复制并唤起 AI App（通过 Intent 尝试自动填入）
  const handleLaunchAiSearch = () => {
    if (!currentAiApp) {
      Alert.alert('提示', '未找到可用的 AI 应用');
      return;
    }
    
    const trimmedQuery = query.trim();
    
    // 复制搜索词到剪贴板，作为可靠的双保险备份
    Clipboard.setString(trimmedQuery);
    
    // 提示用户并启动应用
    const msg = `已复制检索词并尝试自动填入，正在打开 ${currentAiApp.name}...`;
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('', msg);
    }

    handleClose();

    if (Platform.OS === 'android') {
      try {
        const pkg = currentAiApp.packageName;
        
        // 区分系统语音助手与普通第三方 AI 应用
        const isSystemAssistant = [
          'com.miui.voiceassist',
          'com.miui.voiceassistproxy',
          'com.huawei.vassistant',
          'com.vivo.voiceassistant',
          'com.coloros.speechassist',
          'com.heytap.speechassist',
          'com.samsung.android.bixby.agent',
          'com.google.android.apps.googleassistant',
          'com.google.android.googlequicksearchbox',
        ].includes(pkg);

        if (isSystemAssistant) {
          // 对于系统语音助手，利用标准的 WEB_SEARCH 检索意图
          RNLauncherKitHelper.launchApplication(pkg, {
            action: 'android.intent.action.WEB_SEARCH',
            extras: {
              'query': trimmedQuery,
            }
          });
        } else {
          // 对于常规三方 AI 客户端（如 ChatGPT、Kimi、豆包等），发送标准的 SEND 文本分享意图，促使其自动将检索词预填至对话框中
          RNLauncherKitHelper.launchApplication(pkg, {
            action: 'android.intent.action.SEND',
            type: 'text/plain',
            extras: {
              'android.intent.extra.TEXT': trimmedQuery,
            }
          });
        }
      } catch (err) {
        console.warn('[SearchView] Failed to launch with intent, falling back to default launch:', err);
        onLaunchApp(currentAiApp.packageName);
      }
    } else {
      onLaunchApp(currentAiApp.packageName);
    }
  };

  // 真实申请并处理联系人检索权限
  const handleContactsToggle = async (val: boolean) => {
    if (val) {
      try {
        const { status } = await Contacts.requestPermissionsAsync();
        if (status === 'granted') {
          updateSetting('searchContacts', true);
          // 授权成功，立即加载数据
          await loadContacts();
          if (Platform.OS === 'android') {
            ToastAndroid.show('通讯录读取授权成功', ToastAndroid.SHORT);
          }
        } else {
          updateSetting('searchContacts', false);
          Alert.alert('授权失败', t('search.contactsAlert'));
        }
      } catch (err) {
        console.error(err);
        updateSetting('searchContacts', false);
        Alert.alert('错误', '申请通讯录权限时发生异常。');
      }
    } else {
      updateSetting('searchContacts', false);
      setContacts([]);
    }
  };

  // 呼出电话拨号盘
  const handleDialContact = (phone: string) => {
    const cleanPhone = phone.replace(/[\s-+]/g, '');
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert('错误', '无法打开拨号界面');
    });
  };

  // 计算计算器结果
  const mathResult = useMemo(() => {
    if (!settings.searchCalculator || !query.trim()) return null;
    return evaluateMath(query);
  }, [query, settings.searchCalculator]);

  // 根据搜索词过滤应用
  const filteredApps = useMemo(() => {
    if (!query.trim()) {
      return apps;
    }
    return apps.filter((app) => {
      const custom = customizations[app.packageName];
      const displayName = custom?.customName || app.name;
      return (
        matchApp(displayName, query) ||
        matchApp(app.packageName, query)
      );
    });
  }, [query, apps, customizations]);

  // 根据搜索词过滤联系人 (采用 O(N) 高效缓存过滤)
  const filteredContacts = useMemo(() => {
    if (!settings.searchContacts || !query.trim()) return [];
    const cleanQuery = query.trim().toLowerCase();
    
    return contacts.filter(c => {
      // 1. 名字直接包含
      if (c.name.toLowerCase().includes(cleanQuery)) return true;
      // 2. 电话包含
      if (c.phone.replace(/[\s-+]/g, '').includes(cleanQuery)) return true;
      // 3. 拼音全拼包含
      if (c.pinyinFull.includes(cleanQuery)) return true;
      // 4. 拼音首字母包含
      if (c.pinyinInitials.includes(cleanQuery)) return true;
      return false;
    });
  }, [query, contacts, settings.searchContacts]);

  // 应用选择器检索过滤
  const filteredPickerApps = useMemo(() => {
    if (!pickerSearchQuery.trim()) return apps;
    return apps.filter(
      (app) =>
        app.name.toLowerCase().includes(pickerSearchQuery.toLowerCase()) ||
        app.packageName.toLowerCase().includes(pickerSearchQuery.toLowerCase())
    );
  }, [pickerSearchQuery, apps]);

  // 构建复合 FlatList 数据
  const listData = useMemo(() => {
    const data: any[] = [];
    
    // 1. 如果有计算器结果，放入第一项
    if (mathResult !== null) {
      data.push({
        _type: 'calculator',
        id: 'search-calculator-result',
        result: mathResult,
      });
    }

    // 2. 放入过滤后的联系人列表
    filteredContacts.forEach(contact => {
      data.push({
        _type: 'contact',
        id: `contact-${contact.id}`,
        contact,
      });
    });

    // 3. 放入过滤后的应用列表
    filteredApps.forEach((app) => {
      data.push({
        _type: 'app',
        id: app.id,
        app,
      });
    });

    // 4. 如果开启了 AI 建议，且搜索词不为空，放入最后一项
    if (settings.searchAiSuggestions && query.trim().length > 0 && currentAiApp) {
      data.push({
        _type: 'ai-search',
        id: 'search-ai-action',
        query: query.trim(),
        app: currentAiApp,
      });
    }

    return data;
  }, [mathResult, filteredContacts, filteredApps, query, settings.searchAiSuggestions, currentAiApp]);

  const renderListItem = ({ item }: { item: any }) => {
    if (item._type === 'calculator') {
      return (
        <TouchableOpacity
          style={styles.calculatorCard}
          onPress={() => handleCopyResult(item.result)}
          activeOpacity={0.7}
        >
          <View style={[styles.cardIconContainer, { backgroundColor: 'rgba(21, 163, 74, 0.12)' }]}>
            <Text style={styles.cardIcon}>🧮</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t('search.calculatorResult')}</Text>
            <Text style={styles.cardValue} numberOfLines={1}>{item.result}</Text>
          </View>
          <Text style={[styles.cardActionHint, { color: themeColor }]}>{t('contextMenu.editHint')}</Text>
        </TouchableOpacity>
      );
    }

    if (item._type === 'contact') {
      const contact = item.contact;
      const initial = contact.name.charAt(0).toUpperCase();
      // 基于联系人姓名获取配色索引，保持颜色统一且绚丽
      const charCode = contact.name.charCodeAt(0);
      const colorIndex = charCode % THEME_COLORS.length;
      const avatarColor = THEME_COLORS[colorIndex] === 'auto' || THEME_COLORS[colorIndex] === undefined
        ? themeColor 
        : THEME_COLORS[colorIndex];

      return (
        <TouchableOpacity
          style={styles.contactCard}
          onPress={() => handleDialContact(contact.phone)}
          activeOpacity={0.7}
        >
          <View style={[styles.contactAvatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.contactAvatarText}>{initial}</Text>
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.contactName}>{contact.name}</Text>
            <Text style={styles.contactPhone}>{contact.phone}</Text>
          </View>
          <Text style={[styles.cardActionHint, { color: themeColor, fontSize: 16 }]}>📞</Text>
        </TouchableOpacity>
      );
    }

    if (item._type === 'ai-search') {
      const custom = customizations[item.app.packageName];
      const displayName = custom?.customName || item.app.name;
      const displayIcon = custom?.customIcon || item.app.icon;
      const hasIcon = !!displayIcon && displayIcon.length > 5;

      return (
        <TouchableOpacity
          style={styles.aiSearchCard}
          onPress={handleLaunchAiSearch}
          activeOpacity={0.7}
        >
          {hasIcon ? (
            <Image source={{ uri: displayIcon }} style={styles.aiAppIcon} />
          ) : (
            <View style={[styles.aiAppIconFallback, { backgroundColor: LETTER_COLORS[item.app.letter] || '#8b5cf6' }]}>
              <Text style={styles.aiAppIconFallbackText}>{displayName.charAt(0).toUpperCase()}</Text>
            </View>
          )}
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>{t('search.aiSearchQuery')}</Text>
            <Text style={styles.cardValue} numberOfLines={1}>在 {displayName} 中检索“{item.query}”</Text>
          </View>
          <Text style={[styles.cardActionHint, { color: themeColor }]}>✨</Text>
        </TouchableOpacity>
      );
    }

    // 渲染常规 App 项
    const appInfo: AppInfo = item.app;
    const custom = customizations[appInfo.packageName];
    return (
      <AppItem
        item={appInfo}
        customization={custom}
        onPress={(pkg) => {
          handleClose();
          onLaunchApp(pkg);
        }}
        onLongPress={(app) => {
          handleClose();
          onLongPressApp(app);
        }}
      />
    );
  };

  return (
    <Animated.View
      style={[
        styles.overlay,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      {/* 模糊背景 */}
      <BlurView tint="dark" intensity={85} style={styles.absoluteBlur} />
      <View style={styles.backgroundColorFallback} />

      {/* 点击空白处关闭搜索界面 */}
      <TouchableOpacity
        style={styles.touchCloseArea}
        activeOpacity={1}
        onPress={handleClose}
      />

      {/* 头部精美药丸搜索栏 */}
      <View style={styles.header}>
        <View style={styles.inputContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            ref={inputRef}
            style={styles.input}
            value={query}
            onChangeText={setQuery}
            placeholder={t('search.placeholder')}
            placeholderTextColor="#8e8e93"
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity
              style={styles.clearButton}
              onPress={() => setQuery('')}
              activeOpacity={0.6}
            >
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}
          <View style={styles.dividerLine} />
          <TouchableOpacity
            style={styles.menuButton}
            onPress={handleOpenSettings}
            activeOpacity={0.6}
          >
            <Text style={styles.menuIcon}>⋮</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 搜索结果列表 */}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderListItem}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={Platform.OS === 'android'}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
            <Text style={styles.emptyText}>{t('search.noResults')}</Text>
          </View>
        }
      />

      {/* 浮动键盘切换按钮 */}
      <TouchableOpacity
        style={[styles.floatingKeyboardButton, { backgroundColor: themeColor }]}
        onPress={handleToggleKeyboard}
        activeOpacity={0.8}
      >
        <Text style={styles.floatingKeyboardIcon}>⌨️</Text>
      </TouchableOpacity>

      {/* 搜索设置 Bottom Sheet */}
      {settingsVisible && (
        <View style={styles.bottomSheetContainer}>
          <TouchableOpacity
            style={styles.bottomSheetBackdrop}
            activeOpacity={1}
            onPress={handleCloseSettings}
          />
          <Animated.View
            style={[
              styles.bottomSheetContent,
              {
                transform: [{ translateY: bottomSheetAnim }],
              },
            ]}
          >
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>{t('search.title')}</Text>
              <TouchableOpacity onPress={handleCloseSettings} style={styles.sheetCloseButton}>
                <Text style={styles.sheetCloseText}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* 设置项列表 */}
            <View style={styles.settingCard}>
              {/* AI 搜索建议 */}
              <View style={styles.settingItem}>
                <View style={[styles.settingIconBg, { backgroundColor: '#f5f3ff' }]}>
                  <Text style={[styles.settingIcon, { color: '#7c3aed' }]}>✨</Text>
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>{t('search.aiSuggestions')}</Text>
                  <Text style={styles.settingDesc}>{t('search.aiSuggestionsDesc')}</Text>
                </View>
                <Switch
                  value={settings.searchAiSuggestions}
                  onValueChange={(val) => updateSetting('searchAiSuggestions', val)}
                  trackColor={{ false: '#e5e5ea', true: 'rgba(124, 58, 237, 0.4)' }}
                  thumbColor={settings.searchAiSuggestions ? '#7c3aed' : '#f4f3f0'}
                />
              </View>

              {/* 绑定 AI 应用选择项 (仅在 AI 搜索建议开启时显示) */}
              {settings.searchAiSuggestions && (
                <>
                  <View style={styles.horizontalLine} />
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={handleOpenAppPicker}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.settingIconBg, { backgroundColor: '#fdf2f8' }]}>
                      <Text style={[styles.settingIcon, { color: '#db2777' }]}>📱</Text>
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text style={styles.settingTitle}>{t('search.aiApp')}</Text>
                      <Text style={styles.settingDesc} numberOfLines={1}>
                        {currentAiApp ? currentAiApp.name : t('search.autoDetect')}
                      </Text>
                    </View>
                    <Text style={styles.arrowIcon}>›</Text>
                  </TouchableOpacity>
                </>
              )}

              <View style={styles.horizontalLine} />

              {/* 联系人搜索 */}
              <View style={styles.settingItem}>
                <View style={[styles.settingIconBg, { backgroundColor: '#fff7ed' }]}>
                  <Text style={[styles.settingIcon, { color: '#d97706' }]}>👤</Text>
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>{t('search.contacts')}</Text>
                  <Text style={styles.settingDesc}>{t('search.contactsDesc')}</Text>
                </View>
                <Switch
                  value={settings.searchContacts}
                  onValueChange={handleContactsToggle}
                  trackColor={{ false: '#e5e5ea', true: 'rgba(217, 119, 6, 0.4)' }}
                  thumbColor={settings.searchContacts ? '#d97706' : '#f4f3f0'}
                />
              </View>

              <View style={styles.horizontalLine} />

              {/* 计算器 */}
              <View style={styles.settingItem}>
                <View style={[styles.settingIconBg, { backgroundColor: '#f0fdf4' }]}>
                  <Text style={[styles.settingIcon, { color: '#16a34a' }]}>🧮</Text>
                </View>
                <View style={styles.settingTextContainer}>
                  <Text style={styles.settingTitle}>{t('search.calculator')}</Text>
                  <Text style={styles.settingDesc}>{t('search.calculatorDesc')}</Text>
                </View>
                <Switch
                  value={settings.searchCalculator}
                  onValueChange={(val) => updateSetting('searchCalculator', val)}
                  trackColor={{ false: '#e5e5ea', true: 'rgba(22, 163, 74, 0.4)' }}
                  thumbColor={settings.searchCalculator ? '#16a34a' : '#f4f3f0'}
                />
              </View>
            </View>
          </Animated.View>
        </View>
      )}

      {/* AI 关联应用 Picker Modal */}
      {appPickerVisible && (
        <View style={styles.pickerContainer}>
          <BlurView tint="dark" intensity={95} style={styles.absoluteBlur} />
          <View style={styles.pickerHeader}>
            <TouchableOpacity onPress={() => setAppPickerVisible(false)} style={styles.pickerBackButton}>
              <Text style={styles.pickerBackText}>‹ {t('common.back')}</Text>
            </TouchableOpacity>
            <Text style={styles.pickerTitle}>{t('search.selectAiApp')}</Text>
            <View style={{ width: 60 }} />
          </View>

          {/* 搜索过滤框 */}
          <View style={styles.pickerSearchContainer}>
            <TextInput
              ref={pickerInputRef}
              style={styles.pickerSearchInput}
              value={pickerSearchQuery}
              onChangeText={setPickerSearchQuery}
              placeholder="搜索应用..."
              placeholderTextColor="rgba(255, 255, 255, 0.35)"
              autoCorrect={false}
              autoCapitalize="none"
            />
          </View>

          {/* 应用列表 */}
          <FlatList
            data={filteredPickerApps}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.pickerList}
            renderItem={({ item }) => {
              const custom = customizations[item.packageName];
              const displayName = custom?.customName || item.name;
              const displayIcon = custom?.customIcon || item.icon;
              const hasIcon = !!displayIcon && displayIcon.length > 5;
              const isSelected = settings.searchAiAppPackage === item.packageName;

              return (
                <TouchableOpacity
                  style={[styles.pickerItem, isSelected && styles.pickerItemActive]}
                  onPress={() => handleSelectAiApp(item.packageName)}
                  activeOpacity={0.7}
                >
                  {hasIcon ? (
                    <Image source={{ uri: displayIcon }} style={styles.pickerAppIcon} />
                  ) : (
                    <View style={[styles.pickerAppIconFallback, { backgroundColor: LETTER_COLORS[item.letter] || '#3b82f6' }]}>
                      <Text style={styles.pickerAppIconText}>{displayName.charAt(0).toUpperCase()}</Text>
                    </View>
                  )}
                  <View style={styles.pickerItemTextContainer}>
                    <Text style={styles.pickerItemName}>{displayName}</Text>
                    <Text style={styles.pickerItemPackage} numberOfLines={1}>{item.packageName}</Text>
                  </View>
                  {isSelected && <Text style={[styles.checkIcon, { color: themeColor }]}>✓</Text>}
                </TouchableOpacity>
              );
            }}
            ListHeaderComponent={
              !pickerSearchQuery.trim() ? (
                <TouchableOpacity
                  style={[styles.pickerItem, !settings.searchAiAppPackage && styles.pickerItemActive]}
                  onPress={() => handleSelectAiApp('')}
                  activeOpacity={0.7}
                >
                  <View style={[styles.pickerAppIconFallback, { backgroundColor: '#4b5563' }]}>
                    <Text style={styles.pickerAppIconText}>🤖</Text>
                  </View>
                  <View style={styles.pickerItemTextContainer}>
                    <Text style={styles.pickerItemName}>{t('search.autoDetect')}</Text>
                    <Text style={styles.pickerItemPackage}>依据手机大厂助手进行自动适配</Text>
                  </View>
                  {!settings.searchAiAppPackage && <Text style={[styles.checkIcon, { color: themeColor }]}>✓</Text>}
                </TouchableOpacity>
              ) : null
            }
          />
        </View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
  },
  absoluteBlur: {
    ...StyleSheet.absoluteFillObject,
  },
  backgroundColorFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.65)',
    zIndex: -2,
  },
  touchCloseArea: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 64 : 48,
    paddingBottom: 12,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    paddingHorizontal: 16,
    height: 48,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    elevation: 6,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 10,
    opacity: 0.6,
  },
  input: {
    flex: 1,
    color: '#000000',
    fontSize: 16,
    padding: 0,
    height: '100%',
    fontWeight: '400',
  },
  clearButton: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  clearIcon: {
    color: 'rgba(0, 0, 0, 0.35)',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dividerLine: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    backgroundColor: 'rgba(0,0,0,0.12)',
    marginHorizontal: 10,
  },
  menuButton: {
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIcon: {
    color: '#333333',
    fontSize: 20,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 120,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
  },
  emptyIcon: {
    fontSize: 40,
    color: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 16,
  },
  emptyText: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 15,
    textAlign: 'center',
  },
  floatingKeyboardButton: {
    position: 'absolute',
    right: 20,
    bottom: 35,
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 900,
  },
  floatingKeyboardIcon: {
    fontSize: 22,
    color: '#fff',
  },
  // 卡片样式
  calculatorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  aiSearchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
    marginTop: 8,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  aiAppIcon: {
    width: 38,
    height: 38,
    borderRadius: 9,
    marginRight: 12,
  },
  aiAppIconFallback: {
    width: 38,
    height: 38,
    borderRadius: 9,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiAppIconFallbackText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactAvatarText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  contactName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
    marginBottom: 2,
  },
  contactPhone: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
  },
  cardIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  cardIcon: {
    fontSize: 18,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 12,
    color: 'rgba(255, 255, 255, 0.4)',
    marginBottom: 2,
    fontWeight: '500',
  },
  cardValue: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
  cardActionHint: {
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 8,
    opacity: 0.8,
  },
  // Bottom Sheet 样式
  bottomSheetContainer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 2000,
    justifyContent: 'flex-end',
  },
  bottomSheetBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  bottomSheetContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 44 : 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 16,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#000000',
  },
  sheetCloseButton: {
    padding: 4,
  },
  sheetCloseText: {
    fontSize: 16,
    color: '#8e8e93',
    fontWeight: 'bold',
  },
  settingCard: {
    backgroundColor: '#f9f9f9',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#f2f2f7',
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingIcon: {
    fontSize: 18,
  },
  settingTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1c1e',
    marginBottom: 2,
  },
  settingDesc: {
    fontSize: 12,
    color: '#8e8e93',
  },
  arrowIcon: {
    fontSize: 20,
    color: '#c7c7cc',
    paddingHorizontal: 4,
  },
  horizontalLine: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#e5e5ea',
  },
  // Picker Modal 样式
  pickerContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(10, 10, 10, 0.95)',
    zIndex: 3000,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
  },
  pickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    height: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  pickerBackButton: {
    paddingVertical: 6,
    paddingRight: 12,
  },
  pickerBackText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  pickerTitle: {
    color: '#fff',
    fontSize: 17,
    fontWeight: 'bold',
  },
  pickerSearchContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  pickerSearchInput: {
    height: 40,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 16,
    color: '#fff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.04)',
  },
  pickerList: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  pickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  pickerItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.02)',
  },
  pickerAppIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 14,
  },
  pickerAppIconFallback: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pickerAppIconText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  pickerItemTextContainer: {
    flex: 1,
    paddingRight: 10,
  },
  pickerItemName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  pickerItemPackage: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 12,
  },
  checkIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    paddingHorizontal: 8,
  },
});

export default SearchView;
