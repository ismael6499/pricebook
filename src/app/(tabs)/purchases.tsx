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
import {
  getPurchases,
  getAllProducts,
  createPurchase,
  togglePurchaseStatus,
  deletePurchase,
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
  const [modalVisible, setModalVisible] = useState(false);

  // New purchase form
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
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
        getPurchases({ status: statusFilter }),
        getAllProducts(),
      ]);
      setPurchases(purs);
      setProducts(prods);
    } catch (err) {
      console.error('Error loading purchases:', err);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadData();
    fetchUsdBlueRate().then((r) => setUsdRate(r));
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
      });

      setSelectedProductId(null);
      setUnitPrice('');
      setQuantity('1');
      setStore('');
      setNotes('');
      setPurchaseStatus('pending');
      setModalVisible(false);
      loadData();
    } catch (err) {
      Alert.alert(t('common.error'), 'Failed to record purchase');
    }
  };

  const pendingPurchases = purchases.filter((p) => p.status === 'pending');
  const totalPending = pendingPurchases.reduce((acc, p) => acc + p.total_amount, 0);

  const renderPurchaseItem = ({ item }: { item: Purchase }) => {
    const isPending = item.status === 'pending';

    return (
      <View style={styles.card}>
        <View style={styles.topRow}>
          <Text style={styles.productName}>{item.product_name}</Text>
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
        </View>

        <View style={styles.calcRow}>
          <Text style={styles.calcText}>
            {formatCurrency(item.unit_price)} × {item.quantity} ={' '}
            <Text style={styles.totalText}>{formatCurrency(item.total_amount)}</Text>
          </Text>
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
          </TouchableOpacity>
        </View>

        <View style={styles.metaRow}>
          <Text style={styles.metaText}>
            {formatDateTime(item.purchase_date)}
            {item.store ? ` • ${item.store}` : ''} • 👤 {item.buyer || 'Parents'}
          </Text>
          {item.usd_rate && (
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
      {/* Top Banner: Total Pending to Repay */}
      <View style={styles.bannerCard}>
        <View>
          <Text style={styles.bannerLabel}>{t('settlement.total_to_pay')}</Text>
          <Text style={styles.bannerAmount}>{formatCurrency(totalPending)}</Text>
        </View>
        <View style={styles.bannerPill}>
          <Text style={styles.bannerPillText}>{pendingPurchases.length} pending</Text>
        </View>
      </View>

      {/* Filter Tabs */}
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
      </View>

      {/* Purchases List */}
      <FlatList
        data={purchases}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderPurchaseItem}
        contentContainerStyle={styles.listContent}
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

              <Text style={styles.inputLabel}>{t('purchases.quantity')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="1"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
                value={quantity}
                onChangeText={setQuantity}
              />

              <Text style={styles.inputLabel}>{t('purchases.store')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('purchases.store_placeholder')}
                placeholderTextColor={colors.textMuted}
                value={store}
                onChangeText={setStore}
              />

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

              <TouchableOpacity style={styles.saveBtn} onPress={handleAddPurchase}>
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
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
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
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
    fontSize: 12,
    fontWeight: '700',
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
});
