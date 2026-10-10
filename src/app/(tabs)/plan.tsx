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
  RefreshControl,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import {
  getMonthlyPlanItems,
  createMonthlyPlanItem,
  updateMonthlyPlanItem,
  deleteMonthlyPlanItem,
  getAllProducts,
  createProduct,
  createPurchase,
  syncPlanPricesToProducts,
  generatePurchasesFromMonthlyPlan,
  MonthlyPlanItem,
  Product,
} from '../../db/database';
import { colors } from '../../constants/theme';
import { t, formatCurrency, formatPercent, getLocale } from '../../i18n';

export default function MonthlyPlanScreen() {
  const router = useRouter();
  const [items, setItems] = useState<MonthlyPlanItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [quickCalcModalVisible, setQuickCalcModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<MonthlyPlanItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [calcMode, setCalcMode] = useState<'frequency' | 'standard'>('frequency');
  const [freqAmount, setFreqAmount] = useState('15000');
  const [freqType, setFreqType] = useState<'weekly' | 'daily' | 'biweekly' | 'monthly' | 'custom' | 'alternating'>('weekly');
  const [freqCustomDays, setFreqCustomDays] = useState('3');
  const [selectedDays, setSelectedDays] = useState<string[]>(['Mon', 'Wed', 'Fri']);
  const [qtyPerDay, setQtyPerDay] = useState('2');
  const [unitDesc, setUnitDesc] = useState('');
  const [isCustomUnit, setIsCustomUnit] = useState(false);
  const [unitPrice, setUnitPrice] = useState('');
  const [monthlyQty, setMonthlyQty] = useState('1');
  const [notes, setNotes] = useState('');

  // Quick Calculator state
  const [quickAmount, setQuickAmount] = useState('15000');
  const [quickFreq, setQuickFreq] = useState<'weekly' | 'daily' | 'biweekly' | 'monthly' | 'custom'>('weekly');
  const [quickCustomDays, setQuickCustomDays] = useState('3');

  const loadData = useCallback(async () => {
    try {
      const [planItems, prods] = await Promise.all([
        getMonthlyPlanItems(),
        getAllProducts(),
      ]);
      setItems(planItems);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading monthly plan:', err);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await syncPlanPricesToProducts();
      await loadData();
    } finally {
      setRefreshing(false);
    }
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
    } else if (freqType === 'alternating') {
      const daysCount = selectedDays.length > 0 ? selectedDays.length : 1;
      const dailyQty = parseFloat(qtyPerDay) || 1;
      const weeklyCost = freqAmountNum * daysCount * dailyQty;
      homDay = weeklyCost / 7;
      homWeek = weeklyCost;
      homMonth30 = (weeklyCost / 7) * 30;
      homMonth31 = (weeklyCost / 7) * 31;
      homMonthAvg = weeklyCost * (52 / 12);
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

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setName('');
    setUnitDesc('');
    setUnitPrice('');
    setMonthlyQty('1');
    setFreqAmount('15000');
    setQtyPerDay('2');
    setSelectedDays(['Mon', 'Wed', 'Fri']);
    setNotes('');
    setCalcMode('frequency');
    setFreqType('weekly');
    setModalVisible(true);
  };

  const handleEditItem = (item: MonthlyPlanItem) => {
    setEditingItem(item);
    setName(item.name);
    setUnitDesc(item.unit_desc || '');
    setUnitPrice(String(item.estimated_unit_price));
    setMonthlyQty(String(item.estimated_monthly_qty));
    setFreqAmount(String(item.estimated_unit_price));
    setNotes(item.notes || '');
    setCalcMode('standard');
    setModalVisible(true);
  };

  const handleSaveItem = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), 'Item name is required');
      return;
    }

    try {
      const isEn = getLocale() === 'en';
      let finalUnitDesc = '';
      let finalQty = 1;
      let finalUnitPrice = 0;

      if (calcMode === 'frequency') {
        if (freqAmountNum <= 0) {
          Alert.alert(t('common.error'), 'Please enter a valid amount');
          return;
        }

        finalUnitPrice = freqAmountNum;

        if (freqType === 'weekly') {
          finalUnitDesc = isEn ? `1/wk (${formatCurrency(freqAmountNum)})` : `1/sem (${formatCurrency(freqAmountNum)})`;
          finalQty = 4.33;
        } else if (freqType === 'daily') {
          finalUnitDesc = isEn ? `1/day (${formatCurrency(freqAmountNum)})` : `1/día (${formatCurrency(freqAmountNum)})`;
          finalQty = 30.4;
        } else if (freqType === 'biweekly') {
          finalUnitDesc = isEn ? `every 15d (${formatCurrency(freqAmountNum)})` : `c/15d (${formatCurrency(freqAmountNum)})`;
          finalQty = 2.17;
        } else if (freqType === 'monthly') {
          finalUnitDesc = isEn ? `1/mo (${formatCurrency(freqAmountNum)})` : `1/mes (${formatCurrency(freqAmountNum)})`;
          finalQty = 1;
        } else if (freqType === 'custom') {
          const days = parseFloat(freqCustomDays) || 1;
          finalUnitDesc = isEn ? `every ${days}d (${formatCurrency(freqAmountNum)})` : `c/${days}d (${formatCurrency(freqAmountNum)})`;
          finalQty = Number((30.4167 / days).toFixed(2));
        } else if (freqType === 'alternating') {
          const daysCount = selectedDays.length > 0 ? selectedDays.length : 1;
          const dailyQty = parseFloat(qtyPerDay.replace(',', '.')) || 1;
          finalUnitDesc = isEn ? `${daysCount}d/wk (${dailyQty}/day)` : `${daysCount}d/sem (${dailyQty}/día)`;
          finalQty = Number(((daysCount * dailyQty) * (52 / 12)).toFixed(2));
        }
      } else {
        finalUnitPrice = parseFloat(unitPrice.replace(',', '.')) || 0;
        finalQty = parseFloat(monthlyQty.replace(',', '.')) || 1;
        finalUnitDesc = unitDesc.trim();
      }

      if (editingItem) {
        await updateMonthlyPlanItem(editingItem.id, {
          name: name.trim(),
          category: editingItem.category || 'General',
          unit_desc: finalUnitDesc || undefined,
          estimated_unit_price: finalUnitPrice,
          estimated_monthly_qty: finalQty,
          notes: notes.trim() || undefined,
        });
      } else {
        await createMonthlyPlanItem({
          name: name.trim(),
          unit_desc: finalUnitDesc || undefined,
          estimated_unit_price: finalUnitPrice,
          estimated_monthly_qty: finalQty,
          notes: notes.trim() || undefined,
        });
      }

      setName('');
      setUnitDesc('');
      setUnitPrice('');
      setMonthlyQty('1');
      setFreqAmount('15000');
      setQtyPerDay('2');
      setSelectedDays(['Mon', 'Wed', 'Fri']);
      setNotes('');
      setEditingItem(null);
      setModalVisible(false);
      loadData();
    } catch (err) {
      Alert.alert(t('common.error'), 'Failed to save plan item');
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
      if (item.estimated_unit_price > 0) {
        await createPurchase({
          product_id: newId,
          unit_price: item.estimated_unit_price,
          quantity: 1,
          store: 'Plan Mensual',
          buyer: 'Parents',
          notes: 'Precio registrado del plan mensual',
          status: 'settled',
          entry_type: 'reference',
        });
      }
      router.push(`/product/${newId}` as any);
    } else {
      if ((!target.latest_price || target.latest_price <= 0) && item.estimated_unit_price > 0) {
        await createPurchase({
          product_id: target.id,
          unit_price: item.estimated_unit_price,
          quantity: 1,
          store: 'Plan Mensual',
          buyer: 'Parents',
          notes: 'Precio registrado del plan mensual',
          status: 'settled',
          entry_type: 'reference',
        });
      }
      router.push(`/product/${target.id}` as any);
    }
  };

  const handleGeneratePurchases = useCallback(() => {
    if (items.length === 0) {
      Alert.alert(t('common.info'), t('plan.generate_empty_warning'));
      return;
    }

    Alert.alert(
      t('plan.generate_confirm_title'),
      t('plan.generate_confirm_desc', {
        count: items.length,
        total: formatCurrency(totalBudget),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('plan.generate_confirm_action'),
          onPress: async () => {
            try {
              setIsGenerating(true);
              const result = await generatePurchasesFromMonthlyPlan();
              await loadData();
              Alert.alert(
                t('common.success'),
                t('plan.generate_success', {
                  count: result.count,
                  total: formatCurrency(result.total),
                }),
                [
                  { text: t('common.done') },
                  {
                    text: t('plan.view_purchases_btn'),
                    onPress: () => router.push('/(tabs)/purchases'),
                  },
                ]
              );
            } catch (err) {
              console.error('Error generating purchases from monthly plan:', err);
              Alert.alert(t('common.error'), String(err));
            } finally {
              setIsGenerating(false);
            }
          },
        },
      ]
    );
  }, [items, totalBudget, loadData, router]);

  const resolvePlanUnitLabel = (item: MonthlyPlanItem): string => {
    const desc = (item.unit_desc || '').toLowerCase();
    if (desc.includes('/wk') || desc.includes('/sem') || desc.includes('week') || desc.includes('seman')) {
      return t('plan.unit_weeks');
    }
    if (desc.includes('/day') || desc.includes('/día') || desc.includes('/dia') || desc.includes('day') || desc.includes('día')) {
      return t('plan.unit_days');
    }
    if (desc.includes('15d') || desc.includes('biweek') || desc.includes('quincen')) {
      return t('plan.unit_fortnights');
    }
    if (desc.includes('/mo') || desc.includes('/mes') || desc.includes('month') || desc.includes('mes')) {
      return t('plan.unit_months');
    }
    if (item.unit_desc && item.unit_desc.trim()) {
      return item.unit_desc.trim();
    }
    return t('plan.unit_units');
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
            <Text style={styles.totalBadgeLabel}>{t('plan.monthly_total')}</Text>
            <Text style={styles.totalBadgeAmount}>{formatCurrency(item.estimated_monthly_total)}</Text>
          </View>
        </View>

        <View style={styles.detailRow}>
          <Text style={styles.formulaText}>
            Est: {formatCurrency(item.estimated_unit_price)} × {item.estimated_monthly_qty} {resolvePlanUnitLabel(item)}
          </Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.quickRecordBtn}
              onPress={() => handleQuickPurchase(item)}
            >
              <Ionicons name="cart-outline" size={14} color={colors.primary} />
              <Text style={styles.quickRecordText}>{t('products.product_details')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleEditItem(item)} style={{ paddingHorizontal: 6 }}>
              <Ionicons name="pencil-outline" size={16} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => handleDelete(item.id)}>
              <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        {hasRealPrice && (
          <View style={styles.realVsPlanRow}>
            <Text style={styles.realVsPlanLabel}>
              {t('plan.real_vs_plan')}: <Text style={styles.realPriceVal}>{formatCurrency(item.current_real_price!)}</Text>
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
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('common.empty_state')}</Text>
          </View>
        }
      />

      {/* Floating Action Buttons */}
      <View style={styles.fabContainer} pointerEvents="box-none">
        {items.length > 0 && (
          <TouchableOpacity
            style={styles.generateFab}
            activeOpacity={0.8}
            disabled={isGenerating}
            onPress={handleGeneratePurchases}
          >
            <Ionicons name="cart" size={18} color="#FFFFFF" />
            <Text style={styles.generateFabText}>
              {t('plan.generate_purchases_btn')}
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.8}
          onPress={handleOpenAddModal}
        >
          <Ionicons name="add" size={28} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      {/* Add / Edit Planned Item Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => { setModalVisible(false); setEditingItem(null); }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingItem ? t('plan.edit_item') : t('plan.add_item')}
              </Text>
              <TouchableOpacity onPress={() => { setModalVisible(false); setEditingItem(null); }}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 50 }}
            >
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
              {products.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prodPicker}>
                  {products.map((p) => {
                    const isSelected = name.toLowerCase().trim() === p.name.toLowerCase().trim();
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={[styles.prodChip, isSelected && styles.prodChipActive]}
                        onPress={() => {
                          setName(p.name);
                          if (p.unit) {
                            setUnitDesc(p.unit);
                          }
                          if (p.latest_price) {
                            setFreqAmount(String(p.latest_price));
                            setUnitPrice(String(p.latest_price));
                          }
                        }}
                      >
                        <Text style={[styles.prodChipText, isSelected && styles.prodChipTextActive]}>
                          {p.name}{p.latest_price ? ` (${formatCurrency(p.latest_price)})` : ''}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}
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

                  {(() => {
                    const matchedProduct = products.find((p) => p.name.toLowerCase().trim() === name.toLowerCase().trim());
                    if (matchedProduct && matchedProduct.latest_price && matchedProduct.latest_price > 0 && freqAmountNum > 0) {
                      const unitsPerWeek = (freqAmountNum / matchedProduct.latest_price).toFixed(1);
                      const unitsPerMonth = ((freqAmountNum / matchedProduct.latest_price) * (52 / 12)).toFixed(1);
                      return (
                        <View style={styles.freqUnitsHintBox}>
                          <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
                          <Text style={styles.freqUnitsHintText}>
                            {t('plan.weekly_units_hint', {
                              units: unitsPerWeek,
                              monthly: unitsPerMonth,
                            })}
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })()}

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

                    <TouchableOpacity
                      style={[styles.freqChip, freqType === 'alternating' && styles.freqChipActive]}
                      onPress={() => setFreqType('alternating')}
                    >
                      <Text style={[styles.freqChipText, freqType === 'alternating' && styles.freqChipTextActive]}>
                        {t('plan.freq_alternating')}
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

                  {freqType === 'alternating' && (
                    <View style={styles.alternatingContainer}>
                      <Text style={styles.subLabel}>{t('plan.days_of_week_label')}</Text>
                      <View style={styles.daysOfWeekRow}>
                        {[
                          { key: 'Mon', label: t('plan.day_mon') },
                          { key: 'Tue', label: t('plan.day_tue') },
                          { key: 'Wed', label: t('plan.day_wed') },
                          { key: 'Thu', label: t('plan.day_thu') },
                          { key: 'Fri', label: t('plan.day_fri') },
                          { key: 'Sat', label: t('plan.day_sat') },
                          { key: 'Sun', label: t('plan.day_sun') },
                        ].map((d) => {
                          const isSelected = selectedDays.includes(d.key);
                          return (
                            <TouchableOpacity
                              key={d.key}
                              style={[styles.dayChip, isSelected && styles.dayChipActive]}
                              onPress={() => {
                                if (isSelected) {
                                  if (selectedDays.length > 1) {
                                    setSelectedDays(selectedDays.filter((x) => x !== d.key));
                                  }
                                } else {
                                  setSelectedDays([...selectedDays, d.key]);
                                }
                              }}
                            >
                              <Text style={[styles.dayChipText, isSelected && styles.dayChipTextActive]}>
                                {d.label}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>

                      <View style={styles.qtyPerDayRow}>
                        <Text style={styles.subLabel}>{t('plan.qty_per_day_label')}</Text>
                        <TextInput
                          style={styles.customDaysInput}
                          keyboardType="numeric"
                          value={qtyPerDay}
                          onChangeText={setQtyPerDay}
                          placeholder="2"
                          placeholderTextColor={colors.textMuted}
                        />
                      </View>

                      <Text style={styles.alternatingSummaryText}>
                        🗓️ {t('plan.alternating_summary', {
                          days: selectedDays.length,
                          qty: qtyPerDay || '1',
                          monthly: Math.round(selectedDays.length * (parseFloat(qtyPerDay) || 1) * 4.3333),
                        })}
                      </Text>
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
                  <Text style={styles.inputLabel}>{t('plan.unit_measure_label')}</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.unitChipScrollView}>
                    {[
                      { key: 'units', label: t('plan.unit_units') },
                      { key: 'kg', label: t('plan.unit_kg') },
                      { key: 'g', label: t('plan.unit_g') },
                      { key: 'L', label: t('plan.unit_l') },
                      { key: 'packs', label: t('plan.unit_packs') },
                      { key: 'bottles', label: t('plan.unit_bottles') },
                      { key: 'tray20', label: t('plan.unit_tray_20') },
                      { key: 'tray', label: t('plan.unit_tray') },
                      { key: 'dozen', label: t('plan.unit_dozen') },
                      { key: 'custom', label: t('plan.unit_custom') },
                    ].map((u) => {
                      const isActive = (unitDesc.toLowerCase().trim() === u.label.toLowerCase().trim()) || (u.key === 'custom' && isCustomUnit);
                      return (
                        <TouchableOpacity
                          key={u.key}
                          style={[styles.unitChip, isActive && styles.unitChipActive]}
                          onPress={() => {
                            if (u.key === 'custom') {
                              setIsCustomUnit(true);
                            } else {
                              setIsCustomUnit(false);
                              setUnitDesc(u.label);
                            }
                          }}
                        >
                          <Text style={[styles.unitChipText, isActive && styles.unitChipTextActive]}>
                            {u.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                  {isCustomUnit && (
                    <TextInput
                      style={[styles.modalInput, { marginTop: 4, marginBottom: 8 }]}
                      placeholder={t('plan.unit_desc_placeholder')}
                      placeholderTextColor={colors.textMuted}
                      value={unitDesc}
                      onChangeText={setUnitDesc}
                    />
                  )}

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
                  <View style={styles.qtyStepperRow}>
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => {
                        const cur = Math.max(1, (parseFloat(monthlyQty.replace(',', '.')) || 1) - 1);
                        setMonthlyQty(String(cur));
                      }}
                    >
                      <Ionicons name="remove" size={18} color={colors.text} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.qtyStepperInput}
                      placeholder="1"
                      placeholderTextColor={colors.textMuted}
                      keyboardType="numeric"
                      value={monthlyQty}
                      onChangeText={setMonthlyQty}
                    />
                    <TouchableOpacity
                      style={styles.stepperBtn}
                      onPress={() => {
                        const cur = (parseFloat(monthlyQty.replace(',', '.')) || 0) + 1;
                        setMonthlyQty(String(cur));
                      }}
                    >
                      <Ionicons name="add" size={18} color={colors.text} />
                    </TouchableOpacity>
                  </View>

                  {/* Quantity quick preset chips */}
                  <View style={styles.qtyPresetsRow}>
                    {['1', '2', '4', '8', '12', '24', '30'].map((q) => (
                      <TouchableOpacity
                        key={q}
                        style={[styles.qtyPresetChip, monthlyQty === q && styles.qtyPresetChipActive]}
                        onPress={() => setMonthlyQty(q)}
                      >
                        <Text style={[styles.qtyPresetChipText, monthlyQty === q && styles.qtyPresetChipTextActive]}>
                          {q}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Live Total Calculation Card */}
                  <View style={styles.standardCalcCard}>
                    <Text style={styles.standardCalcLabel}>{t('plan.monthly_total')}</Text>
                    <Text style={styles.standardCalcTotal}>
                      {formatCurrency(
                        (parseFloat(unitPrice.replace(',', '.')) || 0) * (parseFloat(monthlyQty.replace(',', '.')) || 0)
                      )}
                    </Text>
                    <Text style={styles.standardCalcFormula}>
                      {monthlyQty || '0'} {unitDesc || t('plan.unit_units')} × {formatCurrency(parseFloat(unitPrice.replace(',', '.')) || 0)}
                    </Text>
                  </View>
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

              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveItem}>
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Quick Homologator Modal */}
      <Modal
        visible={quickCalcModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setQuickCalcModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
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

            <ScrollView
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={{ paddingBottom: 50 }}
            >
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
        </KeyboardAvoidingView>
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
  fabContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  generateFab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    gap: 8,
  },
  generateFabText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  fab: {
    marginLeft: 'auto',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
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
    maxHeight: '85%',
    flexShrink: 1,
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
  prodPicker: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  prodChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  prodChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  prodChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  prodChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  alternatingContainer: {
    backgroundColor: colors.surfaceElevated,
    padding: 12,
    borderRadius: 12,
    marginTop: 4,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginVertical: 8,
  },
  dayChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dayChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  dayChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  qtyPerDayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 4,
  },
  alternatingSummaryText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    marginTop: 6,
  },
  unitChipScrollView: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  unitChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  unitChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  unitChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '500',
  },
  unitChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  qtyStepperRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  stepperBtn: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyStepperInput: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    textAlign: 'center',
  },
  qtyPresetsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 12,
  },
  qtyPresetChip: {
    paddingHorizontal: 11,
    paddingVertical: 5,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  qtyPresetChipActive: {
    backgroundColor: 'rgba(59, 130, 246, 0.2)',
    borderColor: colors.primary,
  },
  qtyPresetChipText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  qtyPresetChipTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  standardCalcCard: {
    backgroundColor: colors.surfaceElevated,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 10,
  },
  standardCalcLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  standardCalcTotal: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.warning,
    marginVertical: 2,
  },
  standardCalcFormula: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  freqUnitsHintBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 8,
    padding: 8,
    gap: 6,
    marginTop: 6,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.25)',
  },
  freqUnitsHintText: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
});

