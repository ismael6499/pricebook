import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '../constants/theme';
import { t, formatCurrency } from '../i18n';
import { Ionicons } from '@expo/vector-icons';

interface UnitCalculatorCardProps {
  unitPrice: number;
}

export default function UnitCalculatorCard({ unitPrice }: UnitCalculatorCardProps) {
  const [activeTab, setActiveTab] = useState<'frequency' | 'weight' | 'volume'>('frequency');

  // Amount input (defaults to unitPrice if positive, but user can freely change)
  const [customAmount, setCustomAmount] = useState<string>(unitPrice > 0 ? String(unitPrice) : '');

  React.useEffect(() => {
    if (unitPrice > 0 && (!customAmount || customAmount === '0')) {
      setCustomAmount(String(unitPrice));
    }
  }, [unitPrice]);

  // Frequency basis
  const [basis, setBasis] = useState<'week' | 'day' | 'biweekly' | 'month' | 'custom'>('week');
  const [customDays, setCustomDays] = useState('3');

  // Weight / Units state
  const [packageGrams, setPackageGrams] = useState('500');
  const [packageUnits, setPackageUnits] = useState('20');

  // Volume state (liquids / beverages / oils)
  const [packageVolumeMl, setPackageVolumeMl] = useState('900');
  const [packageVolumeUnits, setPackageVolumeUnits] = useState('1');

  // Base numeric amount
  const parsedAmount = parseFloat(customAmount.replace(',', '.')) || (unitPrice > 0 ? unitPrice : 0);

  // --- Frequency & Homologation Calculations ---
  let costPerDay = 0;
  let costPerWeek = 0;
  let costPerMonth30 = 0;
  let costPerMonth31 = 0;
  let costPerMonthAvg = 0;

  if (parsedAmount > 0) {
    if (basis === 'week') {
      costPerWeek = parsedAmount;
      costPerDay = parsedAmount / 7;
      costPerMonth30 = (parsedAmount / 7) * 30;
      costPerMonth31 = (parsedAmount / 7) * 31;
      costPerMonthAvg = parsedAmount * (52 / 12); // ~4.3333 weeks
    } else if (basis === 'day') {
      costPerDay = parsedAmount;
      costPerWeek = parsedAmount * 7;
      costPerMonth30 = parsedAmount * 30;
      costPerMonth31 = parsedAmount * 31;
      costPerMonthAvg = parsedAmount * 30.4167;
    } else if (basis === 'biweekly') {
      costPerDay = parsedAmount / 15;
      costPerWeek = (parsedAmount / 15) * 7;
      costPerMonth30 = parsedAmount * 2;
      costPerMonth31 = (parsedAmount / 15) * 31;
      costPerMonthAvg = (parsedAmount / 15) * 30.4167;
    } else if (basis === 'month') {
      costPerMonth30 = parsedAmount;
      costPerMonth31 = parsedAmount;
      costPerMonthAvg = parsedAmount;
      costPerDay = parsedAmount / 30.4167;
      costPerWeek = (parsedAmount / 30.4167) * 7;
    } else if (basis === 'custom') {
      const days = parseFloat(customDays) || 1;
      costPerDay = parsedAmount / days;
      costPerWeek = (parsedAmount / days) * 7;
      costPerMonth30 = (parsedAmount / days) * 30;
      costPerMonth31 = (parsedAmount / days) * 31;
      costPerMonthAvg = (parsedAmount / days) * 30.4167;
    }
  }

  // --- Calculations for Weight & Unit Mode ---
  const gramsNum = parseFloat(packageGrams) || 0;
  const unitsNum = parseFloat(packageUnits) || 0;

  const costPer100g = gramsNum > 0 ? (parsedAmount / gramsNum) * 100 : 0;
  const costPerKg = gramsNum > 0 ? (parsedAmount / gramsNum) * 1000 : 0;
  const costPerSingleUnit = unitsNum > 0 ? parsedAmount / unitsNum : 0;

  // --- Calculations for Volume & Liquids Mode ---
  const volumeNum = parseFloat(packageVolumeMl) || 0;
  const volumeUnitsNum = parseFloat(packageVolumeUnits) || 1;
  const totalVolumeMl = volumeNum * volumeUnitsNum;

  const costPer100ml = totalVolumeMl > 0 ? (parsedAmount / totalVolumeMl) * 100 : 0;
  const costPerLiter = totalVolumeMl > 0 ? (parsedAmount / totalVolumeMl) * 1000 : 0;
  const costPerVolumeUnit = volumeUnitsNum > 1 ? parsedAmount / volumeUnitsNum : 0;

  return (
    <View style={styles.card}>
      {/* Card Header */}
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="calculator-outline" size={20} color={colors.primary} />
          <Text style={styles.title}>{t('unit_calculator.title')}</Text>
        </View>
        <Text style={styles.subtitle}>{t('unit_calculator.subtitle')}</Text>
      </View>

      {/* Amount Input */}
      <View style={styles.amountInputContainer}>
        <Text style={styles.inputLabel}>{t('unit_calculator.amount_label')} ($)</Text>
        <TextInput
          style={styles.amountInput}
          value={customAmount}
          onChangeText={setCustomAmount}
          keyboardType="numeric"
          placeholder={unitPrice > 0 ? String(unitPrice) : t('unit_calculator.amount_placeholder')}
          placeholderTextColor={colors.textMuted}
        />
      </View>

      {/* Mode Tabs */}
      <View style={styles.tabsRow}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'frequency' && styles.tabBtnActive]}
          onPress={() => setActiveTab('frequency')}
        >
          <Text style={[styles.tabText, activeTab === 'frequency' && styles.tabTextActive]}>
            {t('unit_calculator.frequency_tab')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'weight' && styles.tabBtnActive]}
          onPress={() => setActiveTab('weight')}
        >
          <Text style={[styles.tabText, activeTab === 'weight' && styles.tabTextActive]}>
            {t('unit_calculator.weight_tab')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === 'volume' && styles.tabBtnActive]}
          onPress={() => setActiveTab('volume')}
        >
          <Text style={[styles.tabText, activeTab === 'volume' && styles.tabTextActive]}>
            {t('unit_calculator.volume_tab')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Frequency Mode View */}
      {activeTab === 'frequency' && (
        <View style={styles.sectionContent}>
          <Text style={styles.inputLabel}>{t('unit_calculator.consumption_rate')}</Text>

          <View style={styles.presetChipsRow}>
            <TouchableOpacity
              style={[styles.chip, basis === 'week' && styles.chipActive]}
              onPress={() => setBasis('week')}
            >
              <Text style={[styles.chipText, basis === 'week' && styles.chipTextActive]}>
                {t('unit_calculator.rate_1_per_week')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, basis === 'day' && styles.chipActive]}
              onPress={() => setBasis('day')}
            >
              <Text style={[styles.chipText, basis === 'day' && styles.chipTextActive]}>
                {t('unit_calculator.rate_1_per_day')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, basis === 'biweekly' && styles.chipActive]}
              onPress={() => setBasis('biweekly')}
            >
              <Text style={[styles.chipText, basis === 'biweekly' && styles.chipTextActive]}>
                {t('unit_calculator.rate_biweekly')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, basis === 'month' && styles.chipActive]}
              onPress={() => setBasis('month')}
            >
              <Text style={[styles.chipText, basis === 'month' && styles.chipTextActive]}>
                {t('unit_calculator.rate_1_per_month')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, basis === 'custom' && styles.chipActive]}
              onPress={() => setBasis('custom')}
            >
              <Text style={[styles.chipText, basis === 'custom' && styles.chipTextActive]}>
                {basis === 'custom' ? `${customDays}d` : t('unit_calculator.rate_custom_days')}
              </Text>
            </TouchableOpacity>
          </View>

          {basis === 'custom' && (
            <View style={styles.customDaysRow}>
              <Text style={styles.subLabel}>{t('plan.custom_days_label')}</Text>
              <TextInput
                style={styles.customDaysInput}
                keyboardType="numeric"
                value={customDays}
                onChangeText={setCustomDays}
                placeholder="3"
                placeholderTextColor={colors.textMuted}
              />
            </View>
          )}

          {/* Daily & Weekly Homologation Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t('unit_calculator.cost_per_day')}</Text>
              <Text style={styles.metricValue}>{formatCurrency(costPerDay)}</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t('unit_calculator.cost_per_week')}</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>
                {formatCurrency(costPerWeek)}
              </Text>
            </View>
          </View>

          {/* Monthly 30/31 Projections Card */}
          <View style={styles.monthlyProjectionCard}>
            <Text style={styles.monthlyCardTitle}>{t('plan.homologated_projection')}</Text>
            <View style={styles.monthlyColumnsRow}>
              <View style={styles.monthColumn}>
                <Text style={styles.monthColLabel}>{t('unit_calculator.month_30_days')}</Text>
                <Text style={styles.monthColValue}>{formatCurrency(costPerMonth30)}</Text>
              </View>
              <View style={styles.monthDivider} />
              <View style={styles.monthColumn}>
                <Text style={styles.monthColLabel}>{t('unit_calculator.month_31_days')}</Text>
                <Text style={styles.monthColValue}>{formatCurrency(costPerMonth31)}</Text>
              </View>
              <View style={styles.monthDivider} />
              <View style={styles.monthColumn}>
                <Text style={styles.monthColLabel}>{t('unit_calculator.month_avg_weeks')}</Text>
                <Text style={[styles.monthColValue, { color: colors.warning }]}>
                  {formatCurrency(costPerMonthAvg)}
                </Text>
              </View>
            </View>
            <Text style={styles.hintFooter}>
              💡 {t('unit_calculator.homologation_hint')}
            </Text>
          </View>
        </View>
      )}

      {/* Weight & Units Mode View */}
      {activeTab === 'weight' && (
        <View style={styles.sectionContent}>
          <View style={styles.inputsRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>{t('unit_calculator.package_weight')}</Text>
              <TextInput
                style={styles.input}
                value={packageGrams}
                onChangeText={setPackageGrams}
                keyboardType="numeric"
                placeholder={t('unit_calculator.package_weight_placeholder')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>{t('unit_calculator.package_units')}</Text>
              <TextInput
                style={styles.input}
                value={packageUnits}
                onChangeText={setPackageUnits}
                keyboardType="numeric"
                placeholder={t('unit_calculator.package_units_placeholder')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Quick Unit Presets for Eggs & Packs */}
          <View style={styles.unitPresetsRow}>
            {[
              { label: t('unit_calculator.unit_preset_single'), val: '1' },
              { label: t('unit_calculator.unit_preset_half_dozen'), val: '6' },
              { label: t('unit_calculator.unit_preset_dozen'), val: '12' },
              { label: t('unit_calculator.unit_preset_tray_20'), val: '20' },
              { label: t('unit_calculator.unit_preset_tray'), val: '30' },
            ].map((p) => (
              <TouchableOpacity
                key={p.val}
                style={[styles.unitPresetChip, packageUnits === p.val && styles.unitPresetChipActive]}
                onPress={() => setPackageUnits(p.val)}
              >
                <Text style={[styles.unitPresetChipText, packageUnits === p.val && styles.unitPresetChipTextActive]}>
                  {p.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Results Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t('unit_calculator.cost_per_100g')}</Text>
              <Text style={styles.metricValue}>{formatCurrency(costPer100g)}</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t('unit_calculator.cost_per_kg')}</Text>
              <Text style={styles.metricValue}>{formatCurrency(costPerKg)}</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t('unit_calculator.cost_per_unit')}</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>
                {formatCurrency(costPerSingleUnit)}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Volume Mode View */}
      {activeTab === 'volume' && (
        <View style={styles.sectionContent}>
          <Text style={styles.inputLabel}>{t('unit_calculator.package_volume')}</Text>
          <View style={styles.presetChipsRow}>
            {[
              { label: '500ml', val: '500' },
              { label: '900ml', val: '900' },
              { label: '1L', val: '1000' },
              { label: '1.5L', val: '1500' },
              { label: '2.25L', val: '2250' },
              { label: '5L', val: '5000' },
            ].map((preset) => (
              <TouchableOpacity
                key={preset.val}
                style={[styles.chip, packageVolumeMl === preset.val && styles.chipActive]}
                onPress={() => setPackageVolumeMl(preset.val)}
              >
                <Text style={[styles.chipText, packageVolumeMl === preset.val && styles.chipTextActive]}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <View style={styles.inputsRow}>
            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>{t('unit_calculator.package_volume')}</Text>
              <TextInput
                style={styles.input}
                value={packageVolumeMl}
                onChangeText={setPackageVolumeMl}
                keyboardType="numeric"
                placeholder={t('unit_calculator.package_volume_placeholder')}
                placeholderTextColor={colors.textMuted}
              />
            </View>

            <View style={styles.inputCol}>
              <Text style={styles.inputLabel}>{t('unit_calculator.package_units')}</Text>
              <TextInput
                style={styles.input}
                value={packageVolumeUnits}
                onChangeText={setPackageVolumeUnits}
                keyboardType="numeric"
                placeholder={t('unit_calculator.package_units_placeholder')}
                placeholderTextColor={colors.textMuted}
              />
            </View>
          </View>

          {/* Results Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t('unit_calculator.cost_per_100ml')}</Text>
              <Text style={styles.metricValue}>{formatCurrency(costPer100ml)}</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t('unit_calculator.cost_per_liter')}</Text>
              <Text style={[styles.metricValue, { color: colors.primary }]}>
                {formatCurrency(costPerLiter)}
              </Text>
            </View>

            {volumeUnitsNum > 1 && (
              <View style={styles.metricBox}>
                <Text style={styles.metricLabel}>{t('unit_calculator.cost_per_unit')}</Text>
                <Text style={[styles.metricValue, { color: colors.warning }]}>
                  {formatCurrency(costPerVolumeUnit)}
                </Text>
              </View>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  header: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  subtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  amountInputContainer: {
    marginBottom: 14,
  },
  amountInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  tabTextActive: {
    color: '#FFF',
    fontWeight: '700',
  },
  sectionContent: {
    gap: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  presetChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  chipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  customDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  subLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  customDaysInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    width: 60,
    textAlign: 'center',
  },
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
  },
  unitPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 2,
    marginBottom: 6,
  },
  unitPresetChip: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitPresetChipActive: {
    borderColor: colors.primary,
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
  },
  unitPresetChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  unitPresetChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.success,
  },
  monthlyProjectionCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
  },
  monthlyCardTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  monthlyColumnsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  monthColumn: {
    flex: 1,
    alignItems: 'center',
  },
  monthColLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  monthColValue: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  monthDivider: {
    width: 1,
    height: 24,
    backgroundColor: colors.border,
  },
  hintFooter: {
    fontSize: 10,
    color: colors.textMuted,
    marginTop: 10,
    fontStyle: 'italic',
  },
});
