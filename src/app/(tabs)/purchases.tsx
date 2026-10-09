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
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  getPurchases,
  getAllProducts,
  createPurchase,
  togglePurchaseStatus,
  deletePurchase,
  computeSpendingStats,
  Purchase,
  Product,
} from '../../db/database';
import { fetchUsdBlueRate } from '../../services/dollar';
import { colors } from '../../constants/theme';
import { t, formatCurrency, formatDateTime } from '../../i18n';

export default function PurchasesScreen() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'settled'>('all');
  const [timeFilter, setTimeFilter] = useState<'all' | 'day' | 'week' | 'month' | 'custom'>('all');
  const [customDays, setCustomDays] = useState<number>(15);
  const [customDaysInput, setCustomDaysInput] = useState<string>('15');
  const [customModalVisible, setCustomModalVisible] = useState(false);
  const [entryTypeFilter, setEntryTypeFilter] = useState<'all' | 'purchase' | 'reference'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // New purchase form
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [entryType, setEntryType] = useState<'purchase' | 'reference'>('purchase');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [store, setStore] = useState('');
  const [buyer, setBuyer] = useState('Parents');
  const [notes, setNotes] = useState('');
  const [purchaseStatus, setPurchaseStatus] = useState<'pending' | 'settled'>('pending');
  const [usdRate, setUsdRate] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    try {
      const [purs, prods] = await Promise.all([
        getPurchases({
          status: statusFilter,
          timeRange: timeFilter,
          customDays,
          entryType: entryTypeFilter,
        }),
        getAllProducts(),
      ]);
      setPurchases(purs);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading purchases:', err);
    }
  }, [statusFilter, timeFilter, customDays, entryTypeFilter]);

  useEffect(() => {
    loadData();
    fetchUsdBlueRate().then((r) => setUsdRate(r));
  }, [loadData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleToggleStatus = async (item: Purchase) => {
    const nextStatus = item.status === 'pending' ? 'settled' : 'pending';
    await togglePurchaseStatus(item.id, nextStatus);
    loadData();
  };

  const handleDelete = (id: number) => {
    Alert.alert(t('common.confirm'), t('purchases.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deletePurchase(id);
          loadData();
        },
      },
    ]);
  };

  const handleAddPurchase = async () => {
    if (!selectedProductId) {
      Alert.alert(t('common.error'), t('purchases.select_product'));
      return;
    }
    const priceNum = parseFloat(unitPrice.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid price');
      return;
    }
    const qtyNum = parseFloat(quantity.replace(',', '.')) || 1;

    try {
      await createPurchase({
        product_id: selectedProductId,
        unit_price: priceNum,
        quantity: qtyNum,
        store: store.trim() || undefined,
        buyer: buyer.trim() || 'Parents',
        notes: notes.trim() || undefined,
        status: purchaseStatus,
        usd_rate: usdRate,
        entry_type: entryType,
      });

      setSelectedProductId(null);
      setUnitPrice('');
      setQuantity('1');
      setStore('');
      setNotes('');
      setPurchaseStatus('pending');
      setEntryType('purchase');
      setModalVisible(false);
      loadData();
    } catch (err) {
      Alert.alert(t('common.error'), 'Failed to record purchase');
    }
  };

  const spendingStats = computeSpendingStats(purchases, timeFilter, customDays);

  const renderPurchaseItem = ({ item }: { item: Purchase }) => {
    const isPending = item.status === 'pending';
    const isReference = item.entry_type === 'reference';

    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.productName}>{item.product_name}</Text>
          {isReference ? (
            <View style={styles.badgeReference}>
              <Ionicons name="pricetag-outline" size={11} color="#818cf8" />
              <Text style={styles.badgeReferenceText}>{t('purchases.reference_badge')}</Text>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.statusBadge, isPending ? styles.badgePending : styles.badgeSettled]}
              onPress={() => handleToggleStatus(item)}
            >
              <Ionicons
                name={isPending ? 'time-outline' : 'checkmark-circle-outline'}
                size={12}
                color={isPending ? colors.warning : colors.success}
              />
              <Text style={[styles.statusText, isPending ? { color: colors.warning } : { color: colors.success }]}>
                {isPending ? t('settlement.pending_badge') : t('settlement.settled_badge')}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.calcRow}>
          {isReference ? (
            <Text style={styles.calcText}>
              {formatCurrency(item.unit_price)}{' '}
              <Text style={styles.refSubtext}>({t('purchases.reference_badge')})</Text>
            </Text>
          ) : (
            <Text style={styles.calcText}>
              {formatCurrency(item.unit_price)} × {item.quantity} ={' '}
              <Text style={styles.totalText}>{formatCurrency(item.total_amount)}</Text>
            </Text>
          )}
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {formatDateTime(item.purchase_date)}
            {item.store ? ` • ${item.store}` : ''} • 👤 {item.buyer || 'Parents'}
          </Text>
          {!isReference && item.usd_rate && (
            <Text style={styles.usdText}>
              ≈ ${(item.total_amount / item.usd_rate).toFixed(2)} USD
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Top Banner: Total Pending to Repay & Spending Stats */}
      <View style={styles.bannerCard}>
        <View style={styles.bannerMainRow}>
          <View>
            <Text style={styles.bannerLabel}>{t('settlement.total_to_pay')}</Text>
            <Text style={styles.bannerAmount}>{formatCurrency(spendingStats.totalOwedPending)}</Text>
          </View>
          <View style={styles.bannerRight}>
            <View style={styles.bannerPill}>
              <Text style={styles.bannerPillText}>
                {spendingStats.purchasesCount} {t('nav.purchases').toLowerCase()}
                {spendingStats.referenceCount > 0 ? ` • ${spendingStats.referenceCount} ref` : ''}
              </Text>
            </View>
            <Text style={styles.totalPeriodText}>
              {t('time_filter.total_period')}: {formatCurrency(spendingStats.totalSpent)}
            </Text>
          </View>
        </View>

        {/* Spending Averages Grid */}
        <View style={styles.averagesDivider} />
        <View style={styles.averagesRow}>
          <View style={styles.averageItem}>
            <Text style={styles.averageItemLabel}>{t('time_filter.avg_per_day')}</Text>
            <Text style={styles.averageItemValue}>{formatCurrency(spendingStats.avgPerDay)}</Text>
          </View>
          <View style={styles.averageSeparator} />
          <View style={styles.averageItem}>
            <Text style={styles.averageItemLabel}>{t('time_filter.avg_per_week')}</Text>
            <Text style={styles.averageItemValue}>{formatCurrency(spendingStats.avgPerWeek)}</Text>
          </View>
          <View style={styles.averageSeparator} />
          <View style={styles.averageItem}>
            <Text style={styles.averageItemLabel}>{t('time_filter.avg_per_month')}</Text>
            <Text style={styles.averageItemValue}>{formatCurrency(spendingStats.avgPerMonth)}</Text>
          </View>
        </View>
      </View>

      {/* Time Filter Tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.timeFilterScrollView}
        contentContainerStyle={styles.timeFilterContainer}
      >
        <TouchableOpacity
          style={[styles.timeChip, timeFilter === 'all' && styles.timeChipActive]}
          onPress={() => setTimeFilter('all')}
        >
          <Text style={[styles.timeChipText, timeFilter === 'all' && styles.timeChipTextActive]}>
            {t('common.all')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeChip, timeFilter === 'day' && styles.timeChipActive]}
          onPress={() => setTimeFilter('day')}
        >
          <Text style={[styles.timeChipText, timeFilter === 'day' && styles.timeChipTextActive]}>
            {t('time_filter.day')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeChip, timeFilter === 'week' && styles.timeChipActive]}
          onPress={() => setTimeFilter('week')}
        >
          <Text style={[styles.timeChipText, timeFilter === 'week' && styles.timeChipTextActive]}>
            {t('time_filter.week')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeChip, timeFilter === 'month' && styles.timeChipActive]}
          onPress={() => setTimeFilter('month')}
        >
          <Text style={[styles.timeChipText, timeFilter === 'month' && styles.timeChipTextActive]}>
            {t('time_filter.month')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.timeChip, timeFilter === 'custom' && styles.timeChipActive]}
          onPress={() => {
            if (timeFilter === 'custom') {
              setCustomModalVisible(true);
            } else {
              setTimeFilter('custom');
            }
          }}
          onLongPress={() => setCustomModalVisible(true)}
        >
          <Ionicons
            name="calendar-outline"
            size={12}
            color={timeFilter === 'custom' ? '#FFFFFF' : colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.timeChipText, timeFilter === 'custom' && styles.timeChipTextActive]}>
            {timeFilter === 'custom' ? `${customDays}d` : t('time_filter.custom')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Status & Entry Type Filter Row */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterBtn, statusFilter === 'all' && styles.filterBtnActive]}
          onPress={() => setStatusFilter('all')}
        >
          <Text style={[styles.filterBtnText, statusFilter === 'all' && styles.filterBtnTextActive]}>
            {t('common.all')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, statusFilter === 'pending' && styles.filterBtnActive]}
          onPress={() => setStatusFilter('pending')}
        >
          <Text style={[styles.filterBtnText, statusFilter === 'pending' && styles.filterBtnTextActive]}>
            {t('settlement.pending_badge')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterBtn, statusFilter === 'settled' && styles.filterBtnActive]}
          onPress={() => setStatusFilter('settled')}
        >
          <Text style={[styles.filterBtnText, statusFilter === 'settled' && styles.filterBtnTextActive]}>
            {t('settlement.settled_badge')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterBtn,
            entryTypeFilter !== 'all' && styles.filterBtnActive,
            { maxWidth: 95 },
          ]}
          onPress={() => {
            if (entryTypeFilter === 'all') setEntryTypeFilter('purchase');
            else if (entryTypeFilter === 'purchase') setEntryTypeFilter('reference');
            else setEntryTypeFilter('all');
          }}
        >
          <Text
            style={[
              styles.filterBtnText,
              entryTypeFilter !== 'all' && styles.filterBtnTextActive,
            ]}
            numberOfLines={1}
          >
            {entryTypeFilter === 'all'
              ? '🏷️ ' + t('common.all')
              : entryTypeFilter === 'purchase'
              ? '🛒 ' + t('nav.purchases')
              : '🔍 Ref'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Purchases List */}
      <FlatList
        style={styles.flatList}
        data={purchases}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPurchaseItem}
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
            <Ionicons name="receipt-outline" size={48} color={colors.textMuted} />
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

      {/* Add Purchase Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('purchases.add_purchase')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('purchases.entry_type')}</Text>
              <View style={styles.entryTypeRow}>
                <TouchableOpacity
                  style={[
                    styles.entryTypeBtn,
                    entryType === 'purchase' && styles.entryTypeBtnActivePurchase,
                  ]}
                  onPress={() => setEntryType('purchase')}
                >
                  <Ionicons
                    name="cart-outline"
                    size={15}
                    color={entryType === 'purchase' ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.entryTypeText,
                      entryType === 'purchase' && styles.entryTypeTextActive,
                    ]}
                  >
                    {t('purchases.type_purchase')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.entryTypeBtn,
                    entryType === 'reference' && styles.entryTypeBtnActiveReference,
                  ]}
                  onPress={() => setEntryType('reference')}
                >
                  <Ionicons
                    name="pricetag-outline"
                    size={15}
                    color={entryType === 'reference' ? '#818cf8' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.entryTypeText,
                      entryType === 'reference' && { color: '#818cf8', fontWeight: '700' },
                    ]}
                  >
                    {t('purchases.type_reference')}
                  </Text>
                </TouchableOpacity>
              </View>

              {entryType === 'reference' && (
                <Text style={styles.referenceHintText}>
                  ℹ️ {t('purchases.type_reference_hint')}
                </Text>
              )}

              <Text style={styles.inputLabel}>{t('purchases.product')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.prodPicker}>
                {products.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.prodChip, selectedProductId === p.id && styles.prodChipActive]}
                    onPress={() => {
                      setSelectedProductId(p.id);
                      if (p.latest_price) setUnitPrice(String(p.latest_price));
                    }}
                  >
                    <Text
                      style={[
                        styles.prodChipText,
                        selectedProductId === p.id && styles.prodChipTextActive,
                      ]}
                    >
                      {p.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>{t('purchases.unit_price')} ($)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. 1450.00"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={unitPrice}
                onChangeText={setUnitPrice}
              />

              {entryType === 'purchase' && (
                <>
                  <Text style={styles.inputLabel}>{t('purchases.quantity')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder="1"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                  />
                </>
              )}

              <Text style={styles.inputLabel}>{t('purchases.store')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('purchases.store_placeholder')}
                placeholderTextColor={colors.textMuted}
                value={store}
                onChangeText={setStore}
              />

              {entryType === 'purchase' && (
                <>
                  <Text style={styles.inputLabel}>{t('purchases.buyer')}</Text>
                  <TextInput
                    style={styles.modalInput}
                    placeholder={t('purchases.buyer_placeholder')}
                    placeholderTextColor={colors.textMuted}
                    value={buyer}
                    onChangeText={setBuyer}
                  />

                  <Text style={styles.inputLabel}>{t('purchases.status')}</Text>
                  <View style={styles.statusToggleRow}>
                    <TouchableOpacity
                      style={[
                        styles.statusToggleBtn,
                        purchaseStatus === 'pending' && styles.statusToggleActivePending,
                      ]}
                      onPress={() => setPurchaseStatus('pending')}
                    >
                      <Text
                        style={[
                          styles.statusToggleText,
                          purchaseStatus === 'pending' && { color: colors.warning, fontWeight: '700' },
                        ]}
                      >
                        {t('purchases.status_pending')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.statusToggleBtn,
                        purchaseStatus === 'settled' && styles.statusToggleActiveSettled,
                      ]}
                      onPress={() => setPurchaseStatus('settled')}
                    >
                      <Text
                        style={[
                          styles.statusToggleText,
                          purchaseStatus === 'settled' && { color: colors.success, fontWeight: '700' },
                        ]}
                      >
                        {t('purchases.status_settled')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.saveBtn} onPress={handleAddPurchase}>
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Days Modal */}
      <Modal visible={customModalVisible} animationType="fade" transparent>
        <View style={styles.customModalOverlay}>
          <View style={styles.customModalContent}>
            <Text style={styles.customModalTitle}>{t('time_filter.custom_days')}</Text>
            <Text style={styles.customModalSubtitle}>
              {t('time_filter.enter_days')}
            </Text>
            <TextInput
              style={styles.customModalInput}
              keyboardType="number-pad"
              value={customDaysInput}
              onChangeText={setCustomDaysInput}
              placeholder="15"
              placeholderTextColor={colors.textMuted}
            />
            <View style={styles.customModalBtnRow}>
              <TouchableOpacity
                style={styles.customModalCancelBtn}
                onPress={() => setCustomModalVisible(false)}
              >
                <Text style={styles.customModalCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.customModalApplyBtn}
                onPress={() => {
                  const val = parseInt(customDaysInput, 10);
                  if (!isNaN(val) && val > 0) {
                    setCustomDays(val);
                    setTimeFilter('custom');
                  }
                  setCustomModalVisible(false);
                }}
              >
                <Text style={styles.customModalApplyText}>{t('time_filter.apply')}</Text>
              </TouchableOpacity>
            </View>
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
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  bannerMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  bannerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  bannerLabel: {
    fontSize: 11,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  bannerAmount: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.warning,
    marginTop: 4,
  },
  bannerPill: {
    backgroundColor: colors.warningBg,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  bannerPillText: {
    color: colors.warning,
    fontSize: 11,
    fontWeight: '700',
  },
  totalPeriodText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  averagesDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  averagesRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  averageItem: {
    flex: 1,
    alignItems: 'center',
  },
  averageItemLabel: {
    fontSize: 10,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  averageItemValue: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  averageSeparator: {
    width: 1,
    height: 22,
    backgroundColor: colors.border,
  },
  timeFilterScrollView: {
    flexGrow: 0,
    height: 44,
    maxHeight: 44,
    marginTop: 6,
    marginBottom: 2,
  },
  timeFilterContainer: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    height: 44,
  },
  timeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  timeChipText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  timeChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  flatList: {
    flex: 1,
  },
  badgeReference: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: 'rgba(99,102,241,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.3)',
    gap: 4,
  },
  badgeReferenceText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#818cf8',
  },
  refSubtext: {
    fontSize: 11,
    color: colors.textMuted,
    fontStyle: 'italic',
  },
  filterRow: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  filterBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterBtnText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  filterBtnTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
    alignItems: 'center',
  },
  productName: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 4,
  },
  badgePending: {
    backgroundColor: colors.warningBg,
  },
  badgeSettled: {
    backgroundColor: colors.successBg,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  calcRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  calcText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  totalText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  metaText: {
    fontSize: 11,
    color: colors.textMuted,
  },
  usdText: {
    fontSize: 11,
    color: colors.textMuted,
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
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 5,
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
  prodPicker: {
    flexDirection: 'row',
    marginBottom: 6,
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
  statusToggleRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  statusToggleBtn: {
    flex: 1,
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statusToggleActivePending: {
    borderColor: colors.warning,
    backgroundColor: colors.warningBg,
  },
  statusToggleActiveSettled: {
    borderColor: colors.success,
    backgroundColor: colors.successBg,
  },
  statusToggleText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
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
  entryTypeRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 8,
  },
  entryTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 6,
  },
  entryTypeBtnActivePurchase: {
    borderColor: colors.primary,
    backgroundColor: colors.surfaceElevated,
  },
  entryTypeBtnActiveReference: {
    borderColor: '#818cf8',
    backgroundColor: 'rgba(99,102,241,0.1)',
  },
  entryTypeText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  entryTypeTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  referenceHintText: {
    fontSize: 11,
    color: '#818cf8',
    backgroundColor: 'rgba(99,102,241,0.1)',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  customModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  customModalContent: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customModalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  customModalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 14,
  },
  customModalInput: {
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 16,
  },
  customModalBtnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  customModalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  customModalCancelText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  customModalApplyBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  customModalApplyText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '700',
  },
});
