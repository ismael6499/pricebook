import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { t } from '../i18n';
import {
  takePhotoWithCamera,
  pickPhotoFromGallery,
  pickPhotoFromFileSystem,
  pastePhotoFromClipboard,
} from '../services/imagePicker';

interface PhotoPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onImageSelected: (uri: string | null) => void;
  hasExistingImage?: boolean;
}

export default function PhotoPickerModal({
  visible,
  onClose,
  onImageSelected,
  hasExistingImage = false,
}: PhotoPickerModalProps) {
  const handleAction = async (action: 'camera' | 'gallery' | 'file' | 'clipboard' | 'remove') => {
    onClose();

    if (action === 'remove') {
      onImageSelected(null);
      return;
    }

    let result;
    if (action === 'camera') {
      result = await takePhotoWithCamera();
    } else if (action === 'gallery') {
      result = await pickPhotoFromGallery();
    } else if (action === 'file') {
      result = await pickPhotoFromFileSystem();
    } else if (action === 'clipboard') {
      result = await pastePhotoFromClipboard();
      if (!result.success && result.error === 'no_image_in_clipboard') {
        Alert.alert(t('common.error'), t('products.no_image_in_clipboard'));
        return;
      }
    }

    if (result && result.success && result.uri) {
      onImageSelected(result.uri);
    } else if (result && result.error && result.error !== 'no_image_in_clipboard') {
      Alert.alert(t('common.error'), result.error);
    }
  };

  return (
    <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <View style={styles.content}>
          <Text style={styles.title}>{t('products.photo_source_title')}</Text>

          {/* Camera Option */}
          <TouchableOpacity style={styles.optionRow} onPress={() => handleAction('camera')}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(59, 130, 246, 0.15)' }]}>
              <Ionicons name="camera" size={22} color={colors.primary} />
            </View>
            <Text style={styles.optionText}>{t('products.take_photo')}</Text>
          </TouchableOpacity>

          {/* Gallery Option */}
          <TouchableOpacity style={styles.optionRow} onPress={() => handleAction('gallery')}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
              <Ionicons name="images" size={22} color={colors.success} />
            </View>
            <Text style={styles.optionText}>{t('products.pick_image')}</Text>
          </TouchableOpacity>

          {/* Device File Explorer Option */}
          <TouchableOpacity style={styles.optionRow} onPress={() => handleAction('file')}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(139, 92, 246, 0.15)' }]}>
              <Ionicons name="folder-open" size={22} color="#8B5CF6" />
            </View>
            <Text style={styles.optionText}>{t('products.pick_file')}</Text>
          </TouchableOpacity>

          {/* Paste from Clipboard Option */}
          <TouchableOpacity style={styles.optionRow} onPress={() => handleAction('clipboard')}>
            <View style={[styles.iconWrapper, { backgroundColor: 'rgba(245, 158, 11, 0.15)' }]}>
              <Ionicons name="clipboard" size={22} color={colors.warning} />
            </View>
            <Text style={styles.optionText}>{t('products.paste_image')}</Text>
          </TouchableOpacity>

          {/* Remove Current Photo */}
          {hasExistingImage && (
            <TouchableOpacity style={styles.optionRow} onPress={() => handleAction('remove')}>
              <View style={[styles.iconWrapper, { backgroundColor: colors.dangerBg }]}>
                <Ionicons name="trash" size={22} color={colors.danger} />
              </View>
              <Text style={[styles.optionText, { color: colors.danger }]}>
                {t('products.remove_photo')}
              </Text>
            </TouchableOpacity>
          )}

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text style={styles.cancelText}>{t('common.cancel')}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'flex-end',
  },
  content: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 36,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  cancelBtn: {
    marginTop: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textSecondary,
  },
});
