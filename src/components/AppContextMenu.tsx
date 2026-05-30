import React, { useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Dimensions,
  TouchableWithoutFeedback,
  Linking,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { AppAnimated as Animated } from '../services/AnimationService';
import * as ImagePicker from 'expo-image-picker';
import { AppInfo, AppCustomization, AppCustomizations } from '../types/settings';
import { useSettingsContext } from '../context/SettingsContext';
import { t } from '../i18n';
import { openAppDetails } from '../services/AppService';

const { height } = Dimensions.get('window');

interface AppContextMenuProps {
  visible: boolean;
  app: AppInfo | null;
  isFavorite: boolean;
  customizations: AppCustomizations;
  onClose: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
  onSaveCustomization: (packageName: string, customization: AppCustomization) => void;
}

const AppContextMenu: React.FC<AppContextMenuProps> = ({
  visible,
  app,
  isFavorite,
  customizations,
  onClose,
  onToggleFavorite,
  onEdit,
  onSaveCustomization,
}) => {
  const { settings } = useSettingsContext();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(height)).current;
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingName, setEditingName] = useState('');
  const nameInputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(sheetAnim, {
          toValue: 0,
          friction: 8,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(sheetAnim, {
          toValue: height,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start();
      setIsEditingName(false);
      setEditingName('');
    }
  }, [visible]);

  useEffect(() => {
    if (isEditingName && nameInputRef.current) {
      // 添加延迟确保 TextInput 已经渲染完成
      setTimeout(() => {
        nameInputRef.current?.focus();
      }, 100);
    }
  }, [isEditingName]);

  if (!visible || !app) return null;

  const custom = customizations[app.packageName];
  const displayName = custom?.customName || app.name;
  const displayIcon = custom?.customIcon || app.icon;
  const hasIcon = !!displayIcon && displayIcon.length > 5;

  const handleClose = () => {
    // 如果正在编辑名称，关闭编辑状态
    if (isEditingName) {
      setIsEditingName(false);
      setEditingName('');
      return;
    }
    onClose();
  };

  const handleAppInfo = () => {
    // 如果正在编辑名称，关闭编辑状态
    if (isEditingName) {
      setIsEditingName(false);
      setEditingName('');
    }
    onClose();
    setTimeout(() => {
      if (Platform.OS === 'android') {
        openAppDetails(app.packageName);
      } else {
        Linking.openSettings();
      }
    }, 200);
  };

  const handleToggleFavorite = () => {
    // 如果正在编辑名称，关闭编辑状态
    if (isEditingName) {
      setIsEditingName(false);
      setEditingName('');
    }
    onToggleFavorite();
    onClose();
  };

  const handleEdit = () => {
    // 如果正在编辑名称，关闭编辑状态
    if (isEditingName) {
      setIsEditingName(false);
      setEditingName('');
    }
    onClose();
    setTimeout(() => onEdit(), 100);
  };

  const handlePickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        let iconUri = '';
        if (asset.base64) {
          iconUri = `data:image/jpeg;base64,${asset.base64}`;
        } else if (asset.uri) {
          iconUri = asset.uri;
        }

        if (iconUri) {
          const customization: AppCustomization = {
            customName: custom?.customName,
            customIcon: iconUri,
          };
          onSaveCustomization(app.packageName, customization);
        }
      }
    } catch (e) {
      console.error('[ImagePicker] Error:', e);
    }
  };

  const handleStartEditName = () => {
    setEditingName(displayName);
    setIsEditingName(true);
  };

  const handleNameChange = (text: string) => {
    setEditingName(text);
    // 输入时自动保存
    const trimmedName = text.trim();
    if (trimmedName && trimmedName !== app.name) {
      const customization: AppCustomization = {
        customName: trimmedName,
        customIcon: custom?.customIcon,
      };
      onSaveCustomization(app.packageName, customization);
    } else if (!trimmedName || trimmedName === app.name) {
      if (custom?.customIcon) {
        onSaveCustomization(app.packageName, { customIcon: custom.customIcon });
      } else {
        onSaveCustomization(app.packageName, {});
      }
    }
  };

  const handleSaveName = () => {
    setIsEditingName(false);
    setEditingName('');
  };

  const handleNameSubmitEditing = () => {
    handleSaveName();
    // 按回车保存后不关闭菜单
  };

  const handleNameBlur = () => {
    handleSaveName();
    // 失焦时只保存，不关闭菜单
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim, backgroundColor: 'rgba(0,0,0,0.3)' }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}
      >
        <View
          style={[styles.sheetEffect, { backgroundColor: '#FFFFFF' }]}
        >
        {/* App Preview - 点击图标直接选择图片，点击名称直接编辑 */}
        <View style={styles.appPreview}>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
            {hasIcon ? (
              <Image source={{ uri: displayIcon }} style={styles.previewIcon} />
            ) : (
              <View style={[styles.previewIcon, styles.fallbackIcon]}>
                <Text style={styles.fallbackText}>{displayName.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.iconEditBadge}>
              <Text style={styles.iconEditText}>✎</Text>
            </View>
          </TouchableOpacity>
          <View style={styles.appInfo}>
            {isEditingName ? (
              <TextInput
                ref={nameInputRef}
                style={styles.nameInput}
                value={editingName}
                onChangeText={handleNameChange}
                onSubmitEditing={handleNameSubmitEditing}
                onBlur={handleNameBlur}
                maxLength={30}
                selectTextOnFocus
                returnKeyType="done"
              />
            ) : (
              <TouchableOpacity onPress={handleStartEditName} activeOpacity={0.7}>
                <Text style={styles.appName} numberOfLines={1}>{displayName}</Text>
                <Text style={styles.packageName} numberOfLines={1}>{app.packageName}</Text>
                <Text style={styles.editHint}>{t('contextMenu.editHint')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.divider} />

        {/* Menu Items */}
        <TouchableOpacity style={styles.menuItem} onPress={handleToggleFavorite} activeOpacity={0.6}>
          <Text style={styles.menuIcon}>{isFavorite ? '★' : '☆'}</Text>
          <Text style={styles.menuText}>
            {isFavorite ? t('contextMenu.unfavorite') : t('contextMenu.favorite')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleAppInfo} activeOpacity={0.6}>
          <Text style={styles.menuIcon}>ⓘ</Text>
          <Text style={styles.menuText}>{t('contextMenu.appInfo')}</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem} onPress={handleEdit} activeOpacity={0.6}>
          <Text style={styles.menuIcon}>✎</Text>
          <Text style={styles.menuText}>{t('contextMenu.editNameIcon')}</Text>
        </TouchableOpacity>

        {/* Cancel Button */}
        <View style={styles.divider} />
        <TouchableOpacity style={styles.cancelButton} onPress={onClose} activeOpacity={0.6}>
          <Text style={styles.cancelText}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        </View>
      </Animated.View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
    elevation: 100,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 16,
  },
  sheetEffect: {
    overflow: 'hidden',
  },
  appPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  previewIcon: {
    width: 52,
    height: 52,
    borderRadius: 14,
    marginRight: 14,
  },
  iconEditBadge: {
    position: 'absolute',
    bottom: -2,
    right: 10,
    backgroundColor: '#3b82f6',
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconEditText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
  },
  fallbackIcon: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: '700',
  },
  appInfo: {
    flex: 1,
  },
  appName: {
    color: '#1C1C1E',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  nameInput: {
    color: '#1C1C1E',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    paddingVertical: 10,
    paddingHorizontal: 12,
    minHeight: 44,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  packageName: {
    color: '#8E8E93',
    fontSize: 13,
  },
  editHint: {
    color: '#3b82f6',
    fontSize: 11,
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: '#E5E5EA',
    marginHorizontal: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  menuIcon: {
    fontSize: 20,
    color: '#8E8E93',
    width: 32,
    textAlign: 'center',
  },
  menuText: {
    color: '#1C1C1E',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: '#555',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AppContextMenu;
