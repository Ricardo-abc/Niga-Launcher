import React, { useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Linking,
  Platform,
} from 'react-native';
import { AppInfo } from '../types/settings';
import { useSettingsContext } from '../context/SettingsContext';
import { EffectLayer } from '../effects';
import { t } from '../i18n';

const { height } = Dimensions.get('window');

interface AppContextMenuProps {
  visible: boolean;
  app: AppInfo | null;
  isFavorite: boolean;
  onClose: () => void;
  onToggleFavorite: () => void;
  onEdit: () => void;
}

const AppContextMenu: React.FC<AppContextMenuProps> = ({
  visible,
  app,
  isFavorite,
  onClose,
  onToggleFavorite,
  onEdit,
}) => {
  const { settings } = useSettingsContext();
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const sheetAnim = useRef(new Animated.Value(height)).current;

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
    }
  }, [visible]);

  if (!visible || !app) return null;

  const handleAppInfo = () => {
    onClose();
    setTimeout(() => {
      try {
        const uri = `package:${app.packageName}`;
        Linking.openURL(`android.settings.APPLICATION_DETAILS_SETTINGS#${uri}`);
      } catch (e) {
        console.error('[AppInfo] Failed to open:', e);
      }
    }, 200);
  };

  const handleToggleFavorite = () => {
    onToggleFavorite();
    onClose();
  };

  const handleEdit = () => {
    onClose();
    setTimeout(() => onEdit(), 100);
  };

  const hasIcon = !!app.icon && app.icon.length > 5;

  const bgEnabled = settings.enableBackgroundImage && settings.wallpapers.length > 0;

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim, backgroundColor: bgEnabled ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.6)' }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[styles.sheet, { transform: [{ translateY: sheetAnim }] }]}
      >
        <EffectLayer
          effectKey={bgEnabled ? settings.overlayEffect : ''}
          intensity={settings.overlayEffectIntensity}
          style={[styles.sheetEffect, { backgroundColor: bgEnabled ? 'rgba(26,26,46,0.6)' : 'rgba(26,26,46,0.95)' }]}
        >
        {/* App Preview - 点击图标或名称可直接编辑 */}
        <View style={styles.appPreview}>
          <TouchableOpacity onPress={handleEdit} activeOpacity={0.7}>
            {hasIcon ? (
              <Image source={{ uri: app.icon }} style={styles.previewIcon} />
            ) : (
              <View style={[styles.previewIcon, styles.fallbackIcon]}>
                <Text style={styles.fallbackText}>{app.name.charAt(0)}</Text>
              </View>
            )}
            <View style={styles.iconEditBadge}>
              <Text style={styles.iconEditText}>✎</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.appInfo} onPress={handleEdit} activeOpacity={0.7}>
            <Text style={styles.appName} numberOfLines={1}>{app.name}</Text>
            <Text style={styles.packageName} numberOfLines={1}>{app.packageName}</Text>
            <Text style={styles.editHint}>{t('contextMenu.editHint')}</Text>
          </TouchableOpacity>
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
        </EffectLayer>
      </Animated.View>
    </View>
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
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  packageName: {
    color: '#666',
    fontSize: 13,
  },
  editHint: {
    color: '#3b82f6',
    fontSize: 11,
    marginTop: 4,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.08)',
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
    color: '#ccc',
    width: 32,
    textAlign: 'center',
  },
  menuText: {
    color: '#e0e0e0',
    fontSize: 16,
    fontWeight: '500',
  },
  cancelButton: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '500',
  },
});

export default AppContextMenu;
