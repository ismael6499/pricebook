import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { exportDatabaseToJson, restoreDatabaseFromJson } from '../db/database';

const MAX_BACKUP_DAYS = 7;

function getBackupDirPath(): string {
  const docDir = FileSystem.documentDirectory || '';
  return `${docDir}backups/`;
}

export async function ensureBackupDir(): Promise<string> {
  const dirPath = getBackupDirPath();
  const info = await FileSystem.getInfoAsync(dirPath);
  if (!info.exists) {
    await FileSystem.makeDirectoryAsync(dirPath, { intermediates: true });
  }
  return dirPath;
}

/**
 * Creates today's backup file (pricebook_backup_YYYY-MM-DD.json)
 * and purges backups older than 7 days.
 */
export async function performDailyAutoBackup(): Promise<string> {
  const dirPath = await ensureBackupDir();

  const todayStr = new Date().toISOString().substring(0, 10);
  const backupFileName = `pricebook_backup_${todayStr}.json`;
  const backupFilePath = `${dirPath}${backupFileName}`;

  const backupData = await exportDatabaseToJson();
  await FileSystem.writeAsStringAsync(backupFilePath, JSON.stringify(backupData, null, 2));

  // Rotate backups: keep only last 7 days
  await rotateOldBackups();

  return backupFilePath;
}

export async function rotateOldBackups(): Promise<void> {
  try {
    const dirPath = await ensureBackupDir();
    const files = await FileSystem.readDirectoryAsync(dirPath);
    const backupFiles = files
      .filter((f) => f.startsWith('pricebook_backup_') && f.endsWith('.json'))
      .sort()
      .reverse(); // Newest first

    if (backupFiles.length > MAX_BACKUP_DAYS) {
      const filesToDelete = backupFiles.slice(MAX_BACKUP_DAYS);
      for (const f of filesToDelete) {
        try {
          await FileSystem.deleteAsync(`${dirPath}${f}`, { idempotent: true });
        } catch (e) {
          console.warn('Failed to delete old backup file:', f, e);
        }
      }
    }
  } catch (err) {
    console.error('Error rotating backups:', err);
  }
}

export async function listLocalBackups(): Promise<Array<{ name: string; uri: string; size: number }>> {
  try {
    const dirPath = await ensureBackupDir();
    const files = await FileSystem.readDirectoryAsync(dirPath);
    const backupFiles = files
      .filter((f) => f.startsWith('pricebook_backup_') && f.endsWith('.json'))
      .sort()
      .reverse();

    const results = [];
    for (const name of backupFiles) {
      const uri = `${dirPath}${name}`;
      const info = await FileSystem.getInfoAsync(uri);
      results.push({
        name,
        uri,
        size: (info as any).size || 0,
      });
    }
    return results;
  } catch (err) {
    console.warn('Could not list local backups:', err);
    return [];
  }
}

/**
 * Shares the backup file using Android native share sheet (expo-sharing).
 * Directly allows saving to Google Drive, WhatsApp, Telegram, or local files!
 */
export async function shareBackupToDriveOrFile(fileUri?: string): Promise<boolean> {
  const targetUri = fileUri || (await performDailyAutoBackup());
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device');
  }

  await Sharing.shareAsync(targetUri, {
    mimeType: 'application/json',
    dialogTitle: 'Export PriceBook Backup (Select Google Drive)',
    UTI: 'public.json',
  });

  return true;
}

/**
 * Lets the user pick a backup file and restores database content.
 */
export async function pickAndRestoreBackup(): Promise<{ success: boolean; message: string }> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ['application/json', '*/*'],
    copyToCacheDirectory: true,
  });

  if (result.canceled || !result.assets || result.assets.length === 0) {
    return { success: false, message: 'Cancelled' };
  }

  const asset = result.assets[0];
  const content = await FileSystem.readAsStringAsync(asset.uri);
  const backupJson = JSON.parse(content);

  await restoreDatabaseFromJson(backupJson);

  return { success: true, message: 'Database restored successfully' };
}
