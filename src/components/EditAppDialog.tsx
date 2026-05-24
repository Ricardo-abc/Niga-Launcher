import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Image,
  TextInput,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AppInfo, AppCustomization } from '../types/settings';
import { useSettingsContext } from '../context/SettingsContext';
import { EffectLayer } from '../effects';
import { t } from '../i18n';

const { height } = Dimensions.get('window');

interface EditAppDialogProps {
  visible: boolean;
  app: AppInfo | null;
  existingCustomization?: AppCustomization;
  onClose: () => void;
  onSave: (packageName: string, customization: AppCustomization) => void;
}

const EditAppDialog: React.FC<EditAppDialogProps> = ({
  visible,
  app,
  existingCustomization,
  onClose,
  onSave,
}) => {
  const { settings } = useSettingsContext();
  const [name, setName] = useState('');
  const [iconUri, setIconUri] = useState('');
  const overlayAnim = useRef(new Animated.Value(0)).current;
  const dialogAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible && app) {
      setName(existingCustomization?.customName || app.name);
      setIconUri(existingCustomization?.customIcon || app.icon || '');
    }
  }, [visible, app, existingCustomization]);

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(overlayAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(dialogAnim, {
          toValue: 1,
          friction: 6,
          tension: 50,
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
        Animated.timing(dialogAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  if (!visible || !app) return null;

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
        if (asset.base64) {
          setIconUri(`data:image/jpeg;base64,${asset.base64}`);
        } else if (asset.uri) {
          setIconUri(asset.uri);
        }
      }
    } catch (e) {
      console.error('[ImagePicker] Error:', e);
    }
  };

  const handleSave = () => {
    if (!app) return;

    const customization: AppCustomization = {};
    const trimmedName = name.trim();

    if (trimmedName && trimmedName !== app.name) {
      customization.customName = trimmedName;
    }
    if (iconUri && iconUri !== app.icon) {
      customization.customIcon = iconUri;
    }

    onSave(app.packageName, customization);
    onClose();
  };

  const handleReset = () => {
    if (app) {
      setName(app.name);
      setIconUri(app.icon || '');
    }
  };

  const hasCustomName = existingCustomization?.customName;
  const hasCustomIcon = existingCustomization?.customIcon;
  const bgEnabled = settings.enableBackgroundImage && settings.wallpapers.length > 0;

  return (
    <View style={styles.container}>
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayAnim, backgroundColor: bgEnabled ? 'rgba(0,0,0,0.4)' : 'rgba(0,0,0,0.7)' }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.dialog,
          {
            transform: [{
              scale: dialogAnim.interpolate({
                inputRange: [0, 1],
                outputRange: [0.9, 1],
              }),
            }],
            opacity: dialogAnim,
            overflow: 'hidden',
          },
        ]}
      >
        <EffectLayer
          effectKey={bgEnabled ? settings.overlayEffect : ''}
          intensity={settings.overlayEffectIntensity}
          style={[styles.dialogEffect, { backgroundColor: bgEnabled ? 'rgba(30,30,50,0.6)' : 'rgba(30,30,50,0.95)' }]}
        >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View>
            {/* Header */}
            <Text style={styles.title}>{t('editDialog.title')}</Text>

            {/* Icon Edit Area */}
            <TouchableOpacity
              style={styles.iconContainer}
              onPress={handlePickImage}
              activeOpacity={0.7}
            >
              {iconUri ? (
                <Image source={{ uri: iconUri }} style={styles.icon} />
              ) : (
                <View style={[styles.icon, styles.fallbackIcon]}>
                  <Text style={styles.fallbackText}>{app.name.charAt(0)}</Text>
                </View>
              )}
              <View style={styles.iconOverlay}>
                <Text style={styles.iconOverlayText}>{t('editDialog.changeIcon')}</Text>
              </View>
            </TouchableOpacity>

            {/* Name Input */}
            <Text style={styles.label}>{t('editDialog.appName')}</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder={t('editDialog.placeholder')}
              placeholderTextColor="#555"
              maxLength={30}
              selectTextOnFocus
            />

            {/* Reset Hint */}
            {(hasCustomName || hasCustomIcon) && (
              <TouchableOpacity onPress={handleReset} style={styles.resetButton}>
                <Text style={styles.resetText}>{t('common.reset')}</Text>
              </TouchableOpacity>
            )}

            {/* Buttons */}
            <View style={styles.buttonRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={onClose}
                activeOpacity={0.6}
              >
                <Text style={styles.cancelButtonText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.button, styles.saveButton]}
                onPress={handleSave}
                activeOpacity={0.6}
              >
                <Text style={styles.saveButtonText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
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
    zIndex: 110,
    elevation: 110,
    justifyContent: 'center',
    alignItems: 'center',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    width: '85%',
    borderRadius: 20,
    padding: 24,
  },
  dialogEffect: {
    overflow: 'hidden',
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 24,
  },
  iconContainer: {
    alignSelf: 'center',
    marginBottom: 24,
  },
  icon: {
    width: 80,
    height: 80,
    borderRadius: 20,
  },
  fallbackIcon: {
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: '700',
  },
  iconOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingVertical: 4,
    alignItems: 'center',
  },
  iconOverlayText: {
    color: '#fff',
    fontSize: 10,
  },
  label: {
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '500',
  },
  input: {
    backgroundColor: '#12121e',
    borderRadius: 12,
    padding: 14,
    color: '#fff',
    fontSize: 16,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  resetButton: {
    alignSelf: 'center',
    marginTop: 12,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  resetText: {
    color: '#3b82f6',
    fontSize: 13,
  },
  buttonRow: {
    flexDirection: 'row',
    marginTop: 24,
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  cancelButtonText: {
    color: '#888',
    fontSize: 16,
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#3b82f6',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default EditAppDialog;
