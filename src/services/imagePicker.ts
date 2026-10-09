import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';

export interface ImagePickerResult {
  success: boolean;
  uri?: string;
  error?: string;
}

/**
 * Capture a photo using the device camera
 */
export async function takePhotoWithCamera(): Promise<ImagePickerResult> {
  try {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      return { success: false, error: 'Camera permission denied' };
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false };
    }

    return { success: true, uri: result.assets[0].uri };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error capturing photo' };
  }
}

/**
 * Select a photo from system gallery
 */
export async function pickPhotoFromGallery(): Promise<ImagePickerResult> {
  try {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      return { success: false, error: 'Gallery permission denied' };
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.85,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false };
    }

    return { success: true, uri: result.assets[0].uri };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error selecting from gallery' };
  }
}

/**
 * Pick an image file from the device storage / file explorer
 */
export async function pickPhotoFromFileSystem(): Promise<ImagePickerResult> {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return { success: false };
    }

    return { success: true, uri: result.assets[0].uri };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error selecting file' };
  }
}

/**
 * Paste an image from the clipboard if present
 */
export async function pastePhotoFromClipboard(): Promise<ImagePickerResult> {
  try {
    const hasImage = await Clipboard.hasImageAsync();
    if (!hasImage) {
      return { success: false, error: 'no_image_in_clipboard' };
    }

    const clipImg = await Clipboard.getImageAsync({ format: 'png' });
    if (!clipImg || !clipImg.data) {
      return { success: false, error: 'no_image_in_clipboard' };
    }

    // Process base64 data and persist to app documents directory
    let base64Data = clipImg.data;
    if (base64Data.startsWith('data:image')) {
      const commaIdx = base64Data.indexOf(',');
      if (commaIdx !== -1) {
        base64Data = base64Data.substring(commaIdx + 1);
      }
    }

    const targetDir = (FileSystem.documentDirectory || '') + 'photos/';
    const dirInfo = await FileSystem.getInfoAsync(targetDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(targetDir, { intermediates: true });
    }

    const targetPath = `${targetDir}clip_${Date.now()}.png`;
    await FileSystem.writeAsStringAsync(targetPath, base64Data, {
      encoding: FileSystem.EncodingType.Base64,
    });

    return { success: true, uri: targetPath };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error pasting from clipboard' };
  }
}
