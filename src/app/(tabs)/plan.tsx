import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  getMonthlyPlanItems,
  createMonthlyPlanItem,
  deleteMonthlyPlanItem,
  getAllProducts,
  createProduct,
  MonthlyPlanItem,
} from '../../db/database';
import { colors } from '../../constants/theme';
import { t, formatCurrency, formatPercent } from '../../i18n';

export default function MonthlyPlanScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MonthlyPlanItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [quickCalcModalVisible, setQuickCalcModalVisible] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [calcMode, setCalcMode] = useState<'frequency' | 'standard'>('frequency');
  const [freqAmount, setFreqAmount] = useState('15000');
  const [freqType, setFreqType] = useState<'weekly' | 'daily' | 'biweekly' | 'monthly' | 'custom'>('weekly');
  const [freqCustomDays, setFreqCustomDays] = useState('3');
  const [unitDesc, setUnitDesc] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [monthlyQty, setMonthlyQty] = useState('1');
  const [notes, setNotes] = useState('');

  // Quick Calculator state
  const [quickAmount, setQuickAmount] = useState('15000');
  const [quickFreq, setQuickFreq] = useState<'weekly' | 'daily' | 'biweekly' | 'monthly' | 'custom'>('weekly');
  const [quickCustomDays, setQuickCustomDays] = useState('3');

  const loadData = useCallback(async () => {
    try {
      const planItems = await getMonthlyPlanItems();
      setItems(planItems);
    } catch (err) {
      console.error('Error loading monthly plan:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalBudget = items.reduce((acc, it) => acc + it.estimated_monthly_total, 0);

  // Frequency calculations helper for form
  const freqAmountNum = parseFloat(freqAmount.replace(',', '.')) || 0;
  let homDay = 0;
  let homWeek = 0;
  let homMonth30 = 0;
  let homMonth31 = 0;
  let homMonthAvg = 0;

  if (freqAmountNum > 0) {
    if (freqType === 'weekly') {
      homDay = freqAmountNum / 7;
      homWeek = freqAmountNum;
      homMonth30 = (freqAmountNum / 7) * 30;
      homMonth31 = (freqAmountNum / 7) * 31;
      homMonthAvg = freqAmountNum * (52 / 12);
    } else if (freqType === 'daily') {
      homDay = freqAmountNum;
      homWeek = freqAmountNum * 7;
      homMonth30 = freqAmountNum * 30;
      homMonth31 = freqAmountNum * 31;
      homMonthAvg = freqAmountNum * 30.4167;
    } else if (freqType === 'biweekly') {
      homDay = freqAmountNum / 14;
      homWeek = (freqAmountNum / 14) * 7;
      homMonth30 = (freqAmountNum / 14) * 30;
      homMonth31 = (freqAmountNum / 14) * 31;
      homMonthAvg = freqAmountNum * 2.1667;
    } else if (freqType === 'monthly') {
      homDay = freqAmountNum / 30.4167;
      homWeek = (freqAmountNum / 30.4167) * 7;
      homMonth30 = freqAmountNum;
      homMonth31 = freqAmountNum;
      homMonthAvg = freqAmountNum;
    } else if (freqType === 'custom') {
      const days = parseFloat(freqCustomDays) || 1;
      homDay = freqAmountNum / days;
      homWeek = (freqAmountNum / days) * 7;
      homMonth30 = (freqAmountNum / days) * 30;
      homMonth31 = (freqAmountNum / days) * 31;
      homMonthAvg = (freqAmountNum / days) * 30.4167;
    }
  }

  // Quick calculator calculations
  const quickAmountNum = parseFloat(quickAmount.replace(',', '.')) || 0;
  let qDay = 0;
  let qWeek = 0;
  let qMonth30 = 0;
  let qMonth31 = 0;
  let qMonthAvg = 0;

  if (quickAmountNum > 0) {
    if (quickFreq === 'weekly') {
      qDay = quickAmountNum / 7;
      qWeek = quickAmountNum;
      qMonth30 = (quickAmountNum / 7) * 30;
      qMonth31 = (quickAmountNum / 7) * 31;
      qMonthAvg = quickAmountNum * (52 / 12);
    } else if (quickFreq === 'daily') {
      qDay = quickAmountNum;
      qWeek = quickAmountNum * 7;
      qMonth30 = quickAmountNum * 30;
      qMonth31 = quickAmountNum * 31;
      qMonthAvg = quickAmountNum * 30.4167;
    } else if (quickFreq === 'biweekly') {
      qDay = quickAmountNum / 14;
      qWeek = (quickAmountNum / 14) * 7;
      qMonth30 = (quickAmountNum / 14) * 30;
      qMonth31 = (quickAmountNum / 14) * 31;
      qMonthAvg = quickAmountNum * 2.1667;
    } else if (quickFreq === 'monthly') {
      qDay = quickAmountNum / 30.4167;
      qWeek = (quickAmountNum / 30.4167) * 7;
      qMonth30 = quickAmountNum;
      qMonth31 = quickAmountNum;
      qMonthAvg = quickAmountNum;
    } else if (quickFreq === 'custom') {
      const days = parseFloat(quickCustomDays) || 1;
      qDay = quickAmountNum / days;
      qWeek = (quickAmountNum / days) * 7;
      qMonth30 = (quickAmountNum / days) * 30;
      qMonth31 = (quickAmountNum / days) * 31;
      qMonthAvg = (quickAmountNum / days) * 30.4167;
    }
  }

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), 'Item name is required');
      return;
    }

    try {
      if (calcMode === 'frequency') {
        if (freqAmountNum <= 0) {
          Alert.alert(t('common.error'), 'Please enter a valid amount');
          return;
        }

        let finalUnitDesc = '';
        let finalQty = 1;
        let finalUnitPrice = freqAmountNum;

        if (freqType === 'weekly') {
          finalUnitDesc = `1/sem (${formatCurrency(freqAmountNum)})`;
          finalQty = 4.33;
        } else if (freqType === 'daily') {
          finalUnitDesc = `1/día (${formatCurrency(freqAmountNum)})`;
          finalQty = 30.4;
        } else if (freqType === 'biweekly') {
          finalUnitDesc = `c/15d (${formatCurrency(freqAmountNum)})`;
          finalQty = 2.17;
        } else if (freqType === 'monthly') {
          finalUnitDesc = `1/mes (${formatCurrency(freqAmountNum)})`;
          finalQty = 1;
        } else if (freqType === 'custom') {
          const days = parseFloat(freqCustomDays) || 1;
          finalUnitDesc = `c/${days}d (${formatCurrency(freqAmountNum)})`;
          finalQty = Number((30.4167 / days).toFixed(2));
        }

        await createMonthlyPlanItem({
          name: name.trim(),
          unit_desc: finalUnitDesc,
          estimated_unit_price: finalUnitPrice,
          estimated_monthly_qty: finalQty,
          notes: notes.trim() || undefined,
        });
      } else {
        const priceNum = parseFloat(unitPrice.replace(',', '.')) || 0;
        const qtyNum = parseFloat(monthlyQty.replace(',', '.')) || 1;

        await createMonthlyPlanItem({
          name: name.trim(),
          unit_desc: unitDesc.trim() || undefined,
          estimated_unit_price: priceNum,
          estimated_monthly_qty: qtyNum,
          notes: notes.trim() || undefined,
        });
      }

      setName('');
      setUnitDesc('');
      setUnitPrice('');
      setMonthlyQty('1');
      setFreqAmount('15000');
      setNotes('');
      setModalVisible(false);
      loadData();
    } catch (err) {
      Alert.alert(t('common.error'), 'Failed to add plan item');
    }
  };

  const handleDelete = (id: number) => {
    Alert.alert(t('common.confirm'), t('plan.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteMonthlyPlanItem(id);
          loadData();
        },
      },
    ]);
  };

  const handleQuickPurchase = async (item: MonthlyPlanItem) => {
    // Check if product exists in catalog, if not create it
    const prods = await getAllProducts(item.name);
    let target = prods.find((p) => p.name.toLowerCase() === item.name.toLowerCase());
    if (!target) {
      const newId = await createProduct({
        name: item.name,
        category: item.category || 'General',
        unit: item.unit_desc || '1 u',
        notes: item.notes || undefined,
      });
      router.push(`/product/${newId}` as any);
    } else {
      router.push(`/product/${target.id}` as any);
    }
  };

  const renderItem = ({ item }: { item: MonthlyPlanItem }) => {
    const hasRealPrice = item.current_real_price !== undefined;
    const isHigher = (item.variation_vs_estimate || 0) > 0;

    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <View style={styles.nameContainer}>
            <Text style={styles.itemName}>{item.name}</Text>
            {item.unit_desc ? <Text style={styles.itemUnit}>{item.unit_desc}</Text> : null}
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeLabel}>Monthly Total</Text>
            <Text style={styles.totalBadgeAmount}>{formatCurrency(item.estimated_monthly_total)}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.formulaText}>
            Est: {formatCurrency(item.estimated_unit_price)} × {item.estimated_monthly_qty}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.quickRecordBtn}
              onPress={() => handleQuickPurchase(item)}
            >
              <Ionicons name="cart-outline" size={14} color={colors.primary} />
              <Text style={styles.quickRecordText}>View Product</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {hasRealPrice && (
          <View style={styles.realVsPlanRow}>
            <Text style={styles.realVsPlanLabel}>
              Latest real purchase: <Text style={styles.realPriceVal}>{formatCurrency(item.current_real_price!)}</Text>
            </Text>
            {item.variation_vs_estimate !== 0 && (
              <View style={[styles.varBadge, isHigher ? styles.varBadgeDanger : styles.varBadgeSuccess]}>
                <Ionicons
                  name={isHigher ? 'arrow-up' : 'arrow-down'}
                  size={10}
                  color={isHigher ? colors.danger : colors.success}
                />
                <Text style={[styles.varText, isHigher ? { color: colors.danger } : { color: colors.success }]}>
                  {formatPercent(item.variation_vs_estimate || 0)} vs plan
                </Text>
              </View>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Hero Banner: Total Estimated Monthly Budget */}
      <View style={styles.bannerCard}>
        <View>
          <Text style={styles.bannerLabel}>{t('plan.total_budget')}</Text>
          <Text style={styles.bannerAmount}>{formatCurrency(totalBudget)}</Text>
        </View>
        <View style={styles.bannerRight}>
          <TouchableOpacity
            style={styles.quickCalcBannerBtn}
            onPress={() => setQuickCalcModalVisible(true)}
          >
            <Ionicons name="calculator-outline" size={14} color={colors.primary} />
            <Text style={styles.quickCalcBannerText}>{t('plan.homologate_btn')}</Text>
          </TouchableOpacity>
          <View style={styles.bannerCount}>
            <Text style={styles.bannerCountText}>{items.length} items</Text>
          </View>
        </View>
      </View>

      {/* Plan Items List */}
      <FlatList
        data={items}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('common.empty_state')}</Text>
          </View>
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Planned Item Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('plan.add_item')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Mode Toggle: Frequency vs Standard */}
              <View style={styles.modeTabsRow}>
                <TouchableOpacity
                  style={[styles.modeTabBtn, calcMode === 'frequency' && styles.modeTabBtnActive]}
                  onPress={() => setCalcMode('frequency')}
                >
                  <Text style={[styles.modeTabText, calcMode === 'frequency' && styles.modeTabTextActive]}>
                    {t('plan.mode_frequency')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeTabBtn, calcMode === 'standard' && styles.modeTabBtnActive]}
                  onPress={() => setCalcMode('standard')}
                >
                  <Text style={[styles.modeTabText, calcMode === 'standard' && styles.modeTabTextActive]}>
                    {t('plan.mode_standard')}
                  </Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.inputLabel}>{t('plan.item_name')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Milanesas, Huevos, Banana"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              {calcMode === 'frequency' ? (
                <>
                  <Text style={styles.inputLabel}>{t('plan.spent_amount')} ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 15000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={freqAmount}
                    onChangeText={setFreqAmount}
                  />

                  <Text style={styles.inputLabel}>{t('plan.freq_label')}</Text>
                  <View style={styles.freqChipsRow}>
                    <TouchableOpacity
                      style={[styles.freqChip, freqType === 'weekly' && styles.freqChipActive]}
                      onPress={() => setFreqType('weekly')}
                    >
                      <Text style={[styles.freqChipText, freqType === 'weekly' && styles.freqChipTextActive]}>
                        {t('plan.freq_weekly')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.freqChip, freqType === 'daily' && styles.freqChipActive]}
                      onPress={() => setFreqType('daily')}
                    >
                      <Text style={[styles.freqChipText, freqType === 'daily' && styles.freqChipTextActive]}>
                        {t('plan.freq_daily')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.freqChip, freqType === 'biweekly' && styles.freqChipActive]}
                      onPress={() => setFreqType('biweekly')}
                    >
                      <Text style={[styles.freqChipText, freqType === 'biweekly' && styles.freqChipTextActive]}>
                        {t('plan.freq_biweekly')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.freqChip, freqType === 'monthly' && styles.freqChipActive]}
                      onPress={() => setFreqType('monthly')}
                    >
                      <Text style={[styles.freqChipText, freqType === 'monthly' && styles.freqChipTextActive]}>
                        {t('plan.freq_monthly')}
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.freqChip, freqType === 'custom' && styles.freqChipActive]}
                      onPress={() => setFreqType('custom')}
                    >
                      <Text style={[styles.freqChipText, freqType === 'custom' && styles.freqChipTextActive]}>
                        {freqType === 'custom' ? `${freqCustomDays}d` : t('plan.freq_custom')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {freqType === 'custom' && (
                    <View style={styles.customDaysRow}>
                      <Text style={styles.subLabel}>{t('plan.custom_days_label')}</Text>
                      <TextInput
                        style={styles.customDaysInput}
                        keyboardType="numeric"
                        value={freqCustomDays}
                        onChangeText={setFreqCustomDays}
                        placeholder="3"
                        placeholderTextColor={colors.textMuted}
                      />
                    </View>
                  )}

                  {/* Live Projections Card */}
                  <View style={styles.homologationCard}>
                    <Text style={styles.homologationTitle}>{t('plan.homologated_projection')}</Text>
                    <View style={styles.homologationRow}>
                      <View style={styles.homologationItem}>
                        <Text style={styles.homologationLabel}>{t('unit_calculator.cost_per_day')}</Text>
                        <Text style={styles.homologationVal}>{formatCurrency(homDay)}</Text>
                      </View>
                      <View style={styles.homologationDivider} />
                      <View style={styles.homologationItem}>
                        <Text style={styles.homologationLabel}>{t('unit_calculator.cost_per_week')}</Text>
                        <Text style={styles.homologationVal}>{formatCurrency(homWeek)}</Text>
                      </View>
                      <View style={styles.homologationDivider} />
                      <View style={styles.homologationItem}>
                        <Text style={styles.homologationLabel}>{t('unit_calculator.month_avg_weeks')}</Text>
                        <Text style={[styles.homologationVal, { color: colors.warning }]}>
                          {formatCurrency(homMonthAvg)}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.daysBreakdownRow}>
                      <Text style={styles.daysBreakdownText}>
                        30d: <Text style={styles.daysBreakdownVal}>{formatCurrency(homMonth30)}</Text> • 31d: <Text style={styles.daysBreakdownVal}>{formatCurrency(homMonth31)}</Text>
                      </Text>
                    </View>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.inputLabel}>{t('plan.unit_desc')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 1 x día, 8 paq / mes, 4 semanas"
                    placeholderTextColor={colors.textMuted}
                    value={unitDesc}
                    onChangeText={setUnitDesc}
                  />

                  <Text style={styles.inputLabel}>{t('plan.estimated_unit_price')} ($)</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 5000"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={unitPrice}
                    onChangeText={setUnitPrice}
                  />

                  <Text style={styles.inputLabel}>{t('plan.monthly_qty')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="e.g. 31, 8, 4"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={monthlyQty}
                    onChangeText={setMonthlyQty}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>{t('plan.notes')}</Text>
              <TextInput
                style={[styles.modalInput, { height: 60 }]}
                placeholder="Optional notes or details"
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleAddItem}>
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Quick Homologator Modal */}
      <Modal visible={quickCalcModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="calculator-outline" size={20} color={colors.primary} />
                <Text style={styles.modalTitle}>{t('plan.quick_calculator_title')}</Text>
              </View>
              <TouchableOpacity onPress={() => setQuickCalcModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('plan.spent_amount')} ($)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 15000"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={quickAmount}
                onChangeText={setQuickAmount}
              />

              <Text style={styles.inputLabel}>{t('plan.freq_label')}</Text>
              <View style={styles.freqChipsRow}>
                <TouchableOpacity
                  style={[styles.freqChip, quickFreq === 'weekly' && styles.freqChipActive]}
                  onPress={() => setQuickFreq('weekly')}
                >
                  <Text style={[styles.freqChipText, quickFreq === 'weekly' && styles.freqChipTextActive]}>
                    {t('plan.freq_weekly')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.freqChip, quickFreq === 'daily' && styles.freqChipActive]}
                  onPress={() => setQuickFreq('daily')}
                >
                  <Text style={[styles.freqChipText, quickFreq === 'daily' && styles.freqChipTextActive]}>
                    {t('plan.freq_daily')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.freqChip, quickFreq === 'biweekly' && styles.freqChipActive]}
                  onPress={() => setQuickFreq('biweekly')}
                >
                  <Text style={[styles.freqChipText, quickFreq === 'biweekly' && styles.freqChipTextActive]}>
                    {t('plan.freq_biweekly')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.freqChip, quickFreq === 'monthly' && styles.freqChipActive]}
                  onPress={() => setQuickFreq('monthly')}
                >
                  <Text style={[styles.freqChipText, quickFreq === 'monthly' && styles.freqChipTextActive]}>
                    {t('plan.freq_monthly')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.freqChip, quickFreq === 'custom' && styles.freqChipActive]}
                  onPress={() => setQuickFreq('custom')}
                >
                  <Text style={[styles.freqChipText, quickFreq === 'custom' && styles.freqChipTextActive]}>
                    {quickFreq === 'custom' ? `${quickCustomDays}d` : t('plan.freq_custom')}
                  </Text>
                </TouchableOpacity>
              </View>

              {quickFreq === 'custom' && (
                <View style={styles.customDaysRow}>
                  <Text style={styles.subLabel}>{t('plan.custom_days_label')}</Text>
                  <TextInput
                    style={styles.customDaysInput}
                    keyboardType="numeric"
                    value={quickCustomDays}
                    onChangeText={setQuickCustomDays}
                    placeholder="3"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              )}

              {/* Homologation Breakdown */}
              <View style={[styles.homologationCard, { marginTop: 16 }]}>
                <Text style={styles.homologationTitle}>{t('plan.homologated_projection')}</Text>
                <View style={styles.homologationRow}>
                  <View style={styles.homologationItem}>
                    <Text style={styles.homologationLabel}>{t('unit_calculator.cost_per_day')}</Text>
                    <Text style={styles.homologationVal}>{formatCurrency(qDay)}</Text>
                  </View>
                  <View style={styles.homologationDivider} />
                  <View style={styles.homologationItem}>
                    <Text style={styles.homologationLabel}>{t('unit_calculator.cost_per_week')}</Text>
                    <Text style={styles.homologationVal}>{formatCurrency(qWeek)}</Text>
                  </View>
                  <View style={styles.homologationDivider} />
                  <View style={styles.homologationItem}>
                    <Text style={styles.homologationLabel}>{t('unit_calculator.month_avg_weeks')}</Text>
                    <Text style={[styles.homologationVal, { color: colors.warning }]}>
                      {formatCurrency(qMonthAvg)}
                    </Text>
                  </View>
                </View>
                <View style={styles.daysBreakdownRow}>
                  <Text style={styles.daysBreakdownText}>
                    30d: <Text style={styles.daysBreakdownVal}>{formatCurrency(qMonth30)}</Text> • 31d: <Text style={styles.daysBreakdownVal}>{formatCurrency(qMonth31)}</Text>
                  </Text>
                </View>
                <Text style={[styles.hintFooter, { marginTop: 10 }]}>
                  💡 {t('unit_calculator.homologation_hint')}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.saveBtn, { marginTop: 16 }]}
                onPress={() => {
                  setFreqAmount(quickAmount);
                  setFreqType(quickFreq);
                  setCalcMode('frequency');
                  setQuickCalcModalVisible(false);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.saveBtnText}>+ {t('plan.add_item')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  bannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerRight: {
    alignItems: 'flex-end',
    gap: 6,
  },
  quickCalcBannerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  quickCalcBannerText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  bannerLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  bannerAmount: {
    fontSize: 24,
    fontWeight: '900',
    color: colors.primary,
    marginTop: 4,
  },
  bannerCount: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  bannerCountText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
  },
  modeTabsRow: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    padding: 3,
    marginBottom: 12,
  },
  modeTabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabBtnActive: {
    backgroundColor: colors.primary,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  modeTabTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  freqChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 6,
  },
  freqChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  freqChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  freqChipText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  freqChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  homologationCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: 4,
    marginBottom: 4,
  },
  homologationTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  homologationRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  homologationItem: {
    flex: 1,
    alignItems: 'center',
  },
  homologationLabel: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
  },
  homologationVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  homologationDivider: {
    width: 1,
    height: 22,
    backgroundColor: colors.border,
  },
  daysBreakdownRow: {
    marginTop: 8,
    alignItems: 'center',
  },
  daysBreakdownText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  daysBreakdownVal: {
    fontWeight: '700',
    color: colors.text,
  },
  hintFooter: {
    fontSize: 10,
    color: colors.textMuted,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  nameContainer: {
    flex: 1,
    marginRight: 10,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  itemUnit: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
  },
  totalBadge: {
    alignItems: 'flex-end',
  },
  totalBadgeLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },
  totalBadgeAmount: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginTop: 1,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  formulaText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  quickRecordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  quickRecordText: {
    fontSize: 11,
    color: colors.primary,
    fontWeight: '600',
  },
  realVsPlanRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  realVsPlanLabel: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  realPriceVal: {
    fontWeight: '700',
    color: colors.text,
  },
  varBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  varBadgeDanger: {
    backgroundColor: colors.dangerBg,
  },
  varBadgeSuccess: {
    backgroundColor: colors.successBg,
  },
  varText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    gap: 12,
  },
  emptyText: {
    color: colors.textMuted,
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  saveBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  customDaysRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
    marginBottom: 6,
  },
  subLabel: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  customDaysInput: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    color: colors.text,
    fontSize: 14,
    borderWidth: 1,
    borderColor: colors.border,
    width: 60,
    textAlign: 'center',
  },
});
