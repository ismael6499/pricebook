import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { colors } from '../constants/theme';
import { t, formatCurrency } from '../i18n';
import { Ionicons } from '@expo/vector-icons';

interface UnitCalculatorCardProps {
  unitPrice: number;
}

export default function UnitCalculatorCard({ unitPrice }: UnitCalculatorCardProps) {
  const [activeTab, setActiveTab] = useState<'frequency' | 'weight'>('frequency');

  // Frequency state
  const [frequencyPreset, setFrequencyPreset] = useState<'1_day' | '2_day' | '1_week' | 'custom'>('1_day');
  const [customDaysPerUnit, setCustomDaysPerUnit] = useState('3'); // e.g., 1 pack every 3 days

  // Weight / Units state
  const [packageGrams, setPackageGrams] = useState('500');
  const [packageUnits, setPackageUnits] = useState('20');

  // --- Calculations for Frequency Mode ---
  let costPerDay = 0;
  let costPerWeek = 0;
  let costPerMonth = 0;

  if (unitPrice > 0) {
    if (frequencyPreset === '1_day') {
      costPerDay = unitPrice;
      costPerWeek = unitPrice * 7;
      costPerMonth = unitPrice * 30;
    } else if (frequencyPreset === '2_day') {
      costPerDay = unitPrice * 2;
      costPerWeek = unitPrice * 14;
      costPerMonth = unitPrice * 60;
    } else if (frequencyPreset === '1_week') {
      costPerWeek = unitPrice;
      costPerDay = unitPrice / 7;
      costPerMonth = (unitPrice / 7) * 30;
    } else if (frequencyPreset === 'custom') {
      const days = parseFloat(customDaysPerUnit) || 1;
      costPerDay = unitPrice / days;
      costPerWeek = (unitPrice / days) * 7;
      costPerMonth = (unitPrice / days) * 30;
    }
  }

  // --- Calculations for Weight & Unit Mode ---
  const gramsNum = parseFloat(packageGrams) || 0;
  const unitsNum = parseFloat(packageUnits) || 0;

  const costPer100g = gramsNum > 0 ? (unitPrice / gramsNum) * 100 : 0;
  const costPerKg = gramsNum > 0 ? (unitPrice / gramsNum) * 1000 : 0;
  const costPerSingleUnit = unitsNum > 0 ? unitPrice / unitsNum : 0;

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
      </View>

      {/* Frequency Mode View */}
      {activeTab === 'frequency' && (
        <View style={styles.sectionContent}>
          <Text style={styles.inputLabel}>{t('unit_calculator.consumption_rate')}</Text>

          <View style={styles.presetChipsRow}>
            <TouchableOpacity
              style={[styles.chip, frequencyPreset === '1_day' && styles.chipActive]}
              onPress={() => setFrequencyPreset('1_day')}
            >
              <Text style={[styles.chipText, frequencyPreset === '1_day' && styles.chipTextActive]}>
                {t('unit_calculator.rate_1_per_day')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, frequencyPreset === '2_day' && styles.chipActive]}
              onPress={() => setFrequencyPreset('2_day')}
            >
              <Text style={[styles.chipText, frequencyPreset === '2_day' && styles.chipTextActive]}>
                {t('unit_calculator.rate_2_per_day')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.chip, frequencyPreset === '1_week' && styles.chipActive]}
              onPress={() => setFrequencyPreset('1_week')}
            >
              <Text style={[styles.chipText, frequencyPreset === '1_week' && styles.chipTextActive]}>
                {t('unit_calculator.rate_1_per_week')}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Results Grid */}
          <View style={styles.metricsGrid}>
            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t('unit_calculator.cost_per_day')}</Text>
              <Text style={styles.metricValue}>{formatCurrency(costPerDay)}</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t('unit_calculator.cost_per_week')}</Text>
              <Text style={styles.metricValue}>{formatCurrency(costPerWeek)}</Text>
            </View>

            <View style={styles.metricBox}>
              <Text style={styles.metricLabel}>{t('unit_calculator.cost_per_month')}</Text>
              <Text style={[styles.metricValue, { color: colors.warning }]}>
                {formatCurrency(costPerMonth)}
              </Text>
            </View>
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
    marginBottom: 14,
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
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 3,
    marginBottom: 16,
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
    gap: 8,
  },
  chip: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 8,
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
  inputsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputCol: {
    flex: 1,
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
});
