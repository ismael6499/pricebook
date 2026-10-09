import { Paths, Directory, File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { exportDatabaseToJson, restoreDatabaseFromJson } from '../db/database';

const MAX_BACKUP_DAYS = 7;

function getBackupDirectory(): Directory {
  return new Directory(Paths.document, 'backups');
}

export async function ensureBackupDir(): Promise<Directory> {
  const dir = getBackupDirectory();
  if (!dir.exists) {
    dir.create({ idempotent: true });
  }
  return dir;
}

/**
 * Creates today's backup file (pricebook_backup_YYYY-MM-DD.json)
 * and purges backups older than 7 days.
 */
export async function performDailyAutoBackup(): Promise<string> {
  const dir = await ensureBackupDir();

  const todayStr = new Date().toISOString().substring(0, 10);
  const backupFileName = `pricebook_backup_${todayStr}.json`;
  const backupFile = new File(dir, backupFileName);

  const backupData = await exportDatabaseToJson();
  backupFile.write(JSON.stringify(backupData, null, 2));

  // Rotate backups: keep only last 7 days
  await rotateOldBackups();

  return backupFile.uri;
}

export async function rotateOldBackups(): Promise<void> {
  try {
    const dir = await ensureBackupDir();
    const items = dir.list();
    const backupFiles: File[] = [];

    for (const item of items) {
      if (item instanceof File && item.name.startsWith('pricebook_backup_') && item.name.endsWith('.json')) {
        backupFiles.push(item);
      }
    }

    // Sort descending by name (newest first)
    backupFiles.sort((a, b) => b.name.localeCompare(a.name));

    if (backupFiles.length > MAX_BACKUP_DAYS) {
      const filesToDelete = backupFiles.slice(MAX_BACKUP_DAYS);
      for (const f of filesToDelete) {
        try {
          f.delete();
        } catch (e) {
          console.warn('Failed to delete old backup file:', f.name, e);
        }
      }
    }
  } catch (err) {
    console.error('Error rotating backups:', err);
  }
}

export async function listLocalBackups(): Promise<Array<{ name: string; uri: string; size: number }>> {
  const dir = await ensureBackupDir();
  const items = dir.list();
  const backupFiles: File[] = [];

  for (const item of items) {
    if (item instanceof File && item.name.startsWith('pricebook_backup_') && item.name.endsWith('.json')) {
      backupFiles.push(item);
    }
  }

  backupFiles.sort((a, b) => b.name.localeCompare(a.name));

  return backupFiles.map((f) => ({
    name: f.name,
    uri: f.uri,
    size: f.size || 0,
  }));
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
  const file = new File(asset.uri);
  const content = await file.text();
  const backupJson = JSON.parse(content);

  await restoreDatabaseFromJson(backupJson);

  return { success: true, message: 'Database restored successfully' };
}
