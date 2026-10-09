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

  // Form state
  const [name, setName] = useState('');
  const [unitDesc, setUnitDesc] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [monthlyQty, setMonthlyQty] = useState('1');
  const [notes, setNotes] = useState('');

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

  const handleAddItem = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), 'Item name is required');
      return;
    }
    const priceNum = parseFloat(unitPrice.replace(',', '.')) || 0;
    const qtyNum = parseFloat(monthlyQty.replace(',', '.')) || 1;

    try {
      await createMonthlyPlanItem({
        name: name.trim(),
        unit_desc: unitDesc.trim() || undefined,
        estimated_unit_price: priceNum,
        estimated_monthly_qty: qtyNum,
        notes: notes.trim() || undefined,
      });

      setName('');
      setUnitDesc('');
      setUnitPrice('');
      setMonthlyQty('1');
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
        <View style={styles.bannerCount}>
          <Text style={styles.bannerCountText}>{items.length} Habitual Items</Text>
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
              <Text style={styles.inputLabel}>{t('plan.item_name')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Milanesas, Huevos, Banana"
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />

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
});
