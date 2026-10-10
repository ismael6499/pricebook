import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import {
  performDailyAutoBackup,
  shareBackupToDriveOrFile,
  pickAndRestoreBackup,
  listLocalBackups,
} from '../../services/backup';
import { fetchUsdBlueRate } from '../../services/dollar';
import { getSetting, setSetting, seedAgustinPersonalData, clearPersonalData } from '../../db/database';
import CategoryManagerModal from '../../components/CategoryManagerModal';
import { colors } from '../../constants/theme';
import { t, setLocale, getLocale, SupportedLocale } from '../../i18n';

export default function SettingsScreen() {
  const [currentLang, setCurrentLang] = useState<SupportedLocale>(getLocale());
  const [usdRate, setUsdRate] = useState<number>(1350);
  const [backups, setBackups] = useState<Array<{ name: string; uri: string; size: number }>>([]);
  const [autoUsd, setAutoUsd] = useState(true);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [devModeUnlocked, setDevModeUnlocked] = useState(false);
  const [tapCount, setTapCount] = useState(0);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const rate = await fetchUsdBlueRate();
      setUsdRate(rate);
      const bList = await listLocalBackups();
      setBackups(bList);
      const autoSetting = await getSetting('auto_fetch_usd', 'true');
      setAutoUsd(autoSetting === 'true');
      const devSetting = await getSetting('dev_mode_unlocked', 'false');
      setDevModeUnlocked(devSetting === 'true');
    } catch (err) {
      console.warn('Error loading settings:', err);
    }
  };

  const handleVersionTap = async () => {
    if (devModeUnlocked) {
      Alert.alert(t('common.info'), 'Developer / Sample Mode is active.');
      return;
    }
    const next = tapCount + 1;
    setTapCount(next);
    if (next >= 7) {
      setDevModeUnlocked(true);
      await setSetting('dev_mode_unlocked', 'true');
      Alert.alert('🛠️ Mode Unlocked', 'Developer & Sample Template options are now enabled.');
    }
  };

  const handleChangeLanguage = (lang: SupportedLocale) => {
    setLocale(lang);
    setCurrentLang(lang);
    setSetting('locale', lang);
  };

  const handleCreateBackup = async () => {
    try {
      const path = await performDailyAutoBackup();
      const bList = await listLocalBackups();
      setBackups(bList);
      Alert.alert(t('common.success'), `Backup created successfully:\n${path.split('/').pop()}`);
    } catch (err) {
      Alert.alert(t('common.error'), 'Failed to create backup');
    }
  };

  const handleShareToDrive = async () => {
    try {
      await shareBackupToDriveOrFile();
    } catch (err: any) {
      Alert.alert(t('common.error'), err.message || 'Failed to export backup');
    }
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restore Backup',
      'Restoring a backup will replace your current database with the selected backup file. Continue?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Restore',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await pickAndRestoreBackup();
              if (res.success) {
                Alert.alert(t('common.success'), res.message);
                loadSettings();
              }
            } catch (err) {
              Alert.alert(t('common.error'), 'Failed to restore backup file');
            }
          },
        },
      ]
    );
  };

  const handleRefreshUsd = async () => {
    try {
      const rate = await fetchUsdBlueRate();
      setUsdRate(rate);
      Alert.alert('USD Rate Updated', `Current rate: $ ${rate.toLocaleString('es-AR')}`);
    } catch (err) {
      Alert.alert(t('common.error'), 'Could not update USD rate');
    }
  };

  const handleLoadPersonalBasket = () => {
    Alert.alert(
      t('settings.load_personal_basket'),
      t('settings.load_personal_basket_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          onPress: async () => {
            try {
              setSeeding(true);
              await seedAgustinPersonalData();
              Alert.alert(t('common.success'), t('settings.load_personal_basket_success'));
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.message || 'Failed to seed data');
            } finally {
              setSeeding(false);
            }
          },
        },
      ]
    );
  };

  const handleClearData = () => {
    Alert.alert(
      t('settings.clear_database_btn'),
      t('settings.clean_database_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              setSeeding(true);
              await clearPersonalData();
              Alert.alert(t('common.success'), t('settings.clear_database_success'));
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.message || 'Failed to reset data');
            } finally {
              setSeeding(false);
            }
          },
        },
      ]
    );
  };

  return (
    <>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Language Section */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('settings.language')}</Text>
        <View style={styles.optionsRow}>
          <TouchableOpacity
            style={[styles.optionBtn, currentLang === 'en' && styles.optionBtnActive]}
            onPress={() => handleChangeLanguage('en')}
          >
            <Ionicons name="globe-outline" size={16} color={currentLang === 'en' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.optionText, currentLang === 'en' && styles.optionTextActive]}>
              English (Default)
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.optionBtn, currentLang === 'es' && styles.optionBtnActive]}
            onPress={() => handleChangeLanguage('es')}
          >
            <Ionicons name="globe-outline" size={16} color={currentLang === 'es' ? '#FFFFFF' : colors.textSecondary} />
            <Text style={[styles.optionText, currentLang === 'es' && styles.optionTextActive]}>
              Español
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Categories Management */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('settings.manage_categories')}</Text>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Ionicons name="pricetags-outline" size={16} color={colors.primary} />
            <Text style={styles.refreshText}>{t('common.edit')}</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionDesc}>{t('settings.manage_categories_desc')}</Text>
        <TouchableOpacity
          style={styles.categoryActionBtn}
          onPress={() => setCategoryModalVisible(true)}
        >
          <Ionicons name="color-palette-outline" size={18} color="#FFFFFF" />
          <Text style={styles.categoryActionBtnText}>{t('categories.manage')}</Text>
        </TouchableOpacity>
      </View>

      {/* Developer / Sample Template Data & Clean DB (Hidden by default for public users) */}
      {devModeUnlocked && (
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>{t('settings.personal_data_title')}</Text>
          <Text style={styles.sectionDesc}>{t('settings.personal_data_desc')}</Text>

          <View style={styles.backupActions}>
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#10b981' }]}
              onPress={handleLoadPersonalBasket}
              disabled={seeding}
            >
              <Ionicons name="basket-outline" size={18} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>{t('settings.load_personal_basket')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.secondaryBtn, { borderColor: colors.danger, marginTop: 4 }]}
              onPress={handleClearData}
              disabled={seeding}
            >
              <Ionicons name="trash-bin-outline" size={16} color={colors.danger} />
              <Text style={[styles.secondaryBtnText, { color: colors.danger }]}>
                {t('settings.clear_database_btn')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* USD Blue Reference */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('settings.usd_tracking')}</Text>
          <TouchableOpacity style={styles.refreshBtn} onPress={handleRefreshUsd}>
            <Ionicons name="refresh" size={16} color={colors.primary} />
            <Text style={styles.refreshText}>Update</Text>
          </TouchableOpacity>
        </View>
        <Text style={styles.sectionDesc}>{t('settings.usd_tracking_desc')}</Text>
        <View style={styles.usdRateBox}>
          <Text style={styles.usdRateLabel}>USD Blue Reference Rate</Text>
          <Text style={styles.usdRateValue}>$ {usdRate.toLocaleString('es-AR')}</Text>
        </View>
      </View>

      {/* Backups & Google Drive */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>Backups & Google Drive</Text>
        <Text style={styles.sectionDesc}>
          Rotary local daily backups (last 7 days). Export directly to your 2TB Google Drive via Android Share sheet.
        </Text>

        <View style={styles.backupActions}>
          <TouchableOpacity style={styles.primaryActionBtn} onPress={handleShareToDrive}>
            <Ionicons name="logo-google" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Export to Google Drive / Share</Text>
          </TouchableOpacity>

          <View style={styles.secondaryActionsRow}>
            <TouchableOpacity style={styles.secondaryBtn} onPress={handleCreateBackup}>
              <Ionicons name="save-outline" size={16} color={colors.text} />
              <Text style={styles.secondaryBtnText}>Create Local Backup</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.secondaryBtn} onPress={handleRestore}>
              <Ionicons name="cloud-download-outline" size={16} color={colors.text} />
              <Text style={styles.secondaryBtnText}>Restore File</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Local Backups List */}
        <Text style={styles.subTitle}>Recent Local Backups ({backups.length}/7 days)</Text>
        {backups.length === 0 ? (
          <Text style={styles.noBackupsText}>No local backups created yet.</Text>
        ) : (
          backups.map((b, idx) => (
            <View key={idx} style={styles.backupItem}>
              <Ionicons name="document-text-outline" size={18} color={colors.primary} />
              <Text style={styles.backupName} numberOfLines={1}>
                {b.name}
              </Text>
              <TouchableOpacity onPress={() => shareBackupToDriveOrFile(b.uri)}>
                <Ionicons name="share-social-outline" size={18} color={colors.textMuted} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      {/* About */}
      <View style={styles.aboutCard}>
        <Ionicons name="book-outline" size={28} color={colors.primary} />
        <Text style={styles.aboutTitle}>PriceBook</Text>
        <TouchableOpacity activeOpacity={0.7} onPress={handleVersionTap}>
          <Text style={styles.aboutVersion}>
            v{Constants.expoConfig?.version || '1.0.3'} (Build {Constants.expoConfig?.android?.versionCode || 4}) • Offline-First
          </Text>
        </TouchableOpacity>
        <Text style={styles.aboutDesc}>
          Tailored for tracking purchases, grocery inflation & parent repayments.
        </Text>
      </View>
    </ScrollView>

    <CategoryManagerModal
      visible={categoryModalVisible}
      onClose={() => setCategoryModalVisible(false)}
    />
  </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  categoryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 12,
  },
  categoryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  sectionDesc: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 16,
  },
  refreshBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  refreshText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
  },
  optionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 12,
  },
  optionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  optionBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  optionText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  optionTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  usdRateBox: {
    backgroundColor: colors.surfaceElevated,
    padding: 14,
    borderRadius: 12,
    marginTop: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  usdRateLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  usdRateValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.success,
  },
  backupActions: {
    marginTop: 14,
    gap: 10,
  },
  primaryActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  secondaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  secondaryBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
  },
  subTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginTop: 16,
    marginBottom: 8,
  },
  noBackupsText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  backupItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 8,
  },
  backupName: {
    fontSize: 12,
    color: colors.textSecondary,
    flex: 1,
  },
  aboutCard: {
    alignItems: 'center',
    paddingVertical: 20,
    gap: 6,
  },
  aboutTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
  aboutVersion: {
    fontSize: 12,
    color: colors.textMuted,
  },
  aboutDesc: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
  },
});
