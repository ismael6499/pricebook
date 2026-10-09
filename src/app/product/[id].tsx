import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Modal,
  TextInput,
  Dimensions,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Svg, { Polyline, Circle, Line, Text as SvgText } from 'react-native-svg';
import {
  getProductById,
  getPurchases,
  createPurchase,
  togglePurchaseStatus,
  deletePurchase,
  deleteProduct,
  updateProduct,
  Product,
  Purchase,
} from '../../db/database';
import { fetchUsdBlueRate } from '../../services/dollar';
import PhotoPickerModal from '../../components/PhotoPickerModal';
import UnitCalculatorCard from '../../components/UnitCalculatorCard';
import { colors } from '../../constants/theme';
import { t, formatCurrency, formatPercent, formatDateTime } from '../../i18n';

const SCREEN_WIDTH = Dimensions.get('window').width;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const productId = parseInt(id || '0', 10);

  const [product, setProduct] = useState<Product | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [purchaseModalVisible, setPurchaseModalVisible] = useState(false);
  const [photoPickerVisible, setPhotoPickerVisible] = useState(false);

  // New purchase form
  const [entryType, setEntryType] = useState<'purchase' | 'reference'>('purchase');
  const [unitPrice, setUnitPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [store, setStore] = useState('');
  const [buyer, setBuyer] = useState('Parents');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<'pending' | 'settled'>('pending');
  const [usdRate, setUsdRate] = useState<number | null>(null);

  const loadData = useCallback(async () => {
    if (!productId) return;
    try {
      const prod = await getProductById(productId);
      const purs = await getPurchases({ productId });
      setProduct(prod);
      setPurchases(purs);
    } catch (err) {
      console.error('Failed to load product detail:', err);
    }
  }, [productId]);

  useEffect(() => {
    loadData();
    fetchUsdBlueRate().then((rate) => setUsdRate(rate));
  }, [loadData]);

  const handlePhotoSelected = async (uri: string | null) => {
    if (!product) return;
    try {
      await updateProduct(product.id, {
        name: product.name,
        category: product.category,
        unit: product.unit,
        notes: product.notes,
        image_uri: uri,
      });
      loadData();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'Failed to update photo');
    }
  };

  const handleAddPurchase = async () => {
    const priceNum = parseFloat(unitPrice.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      Alert.alert(t('common.error'), 'Please enter a valid unit price');
      return;
    }
    const qtyNum = parseFloat(quantity.replace(',', '.')) || 1;

    try {
      await createPurchase({
        product_id: productId,
        unit_price: priceNum,
        quantity: qtyNum,
        store: store.trim() || undefined,
        buyer: buyer.trim() || 'Parents',
        notes: notes.trim() || undefined,
        status: entryType === 'reference' ? 'settled' : status,
        entry_type: entryType,
        usd_rate: usdRate,
      });

      setUnitPrice('');
      setQuantity('1');
      setStore('');
      setNotes('');
      setEntryType('purchase');
      setStatus('pending');
      setPurchaseModalVisible(false);
      loadData();
    } catch (err) {
      Alert.alert(t('common.error'), 'Failed to save record');
    }
  };

  const handleToggleStatus = async (purchase: Purchase) => {
    const newStatus = purchase.status === 'pending' ? 'settled' : 'pending';
    await togglePurchaseStatus(purchase.id, newStatus);
    loadData();
  };

  const handleDeletePurchase = (purchaseId: number) => {
    Alert.alert(t('common.confirm'), t('purchases.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deletePurchase(purchaseId);
          loadData();
        },
      },
    ]);
  };

  const handleDeleteProduct = () => {
    Alert.alert(t('common.confirm'), t('products.delete_confirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteProduct(productId);
          router.replace('/(tabs)');
        },
      },
    ]);
  };

  if (!product) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  // Price points for chart (chronological: oldest to newest)
  const chartPurchases = [...purchases].reverse();
  const prices = chartPurchases.map((p) => p.unit_price);
  const minPrice = prices.length ? Math.min(...prices) : (product.latest_price || 0);
  const maxPrice = prices.length ? Math.max(...prices) : (product.latest_price || 0);

  // Render SVG Line Chart
  const renderChart = () => {
    if (prices.length < 2) {
      return (
        <View style={styles.emptyChart}>
          <Ionicons name="analytics-outline" size={32} color={colors.textMuted} />
          <Text style={styles.emptyChartText}>{t('trends.no_chart_data')}</Text>
        </View>
      );
    }

    const chartWidth = SCREEN_WIDTH - 64;
    const chartHeight = 140;
    const padding = 20;

    const priceRange = maxPrice - minPrice || 1;
    const xStep = (chartWidth - padding * 2) / (prices.length - 1);

    const points = prices.map((price, idx) => {
      const x = padding + idx * xStep;
      const normalizedPrice = (price - minPrice) / priceRange;
      const y = chartHeight - padding - normalizedPrice * (chartHeight - padding * 2);
      return { x, y, price, date: chartPurchases[idx].purchase_date.substring(5, 10) };
    });

    const pointsString = points.map((p) => `${p.x},${p.y}`).join(' ');

    return (
      <View style={styles.chartWrapper}>
        <Svg width={chartWidth} height={chartHeight}>
          {/* Baseline horizontal grid line */}
          <Line
            x1={padding}
            y1={chartHeight - padding}
            x2={chartWidth - padding}
            y2={chartHeight - padding}
            stroke={colors.border}
            strokeWidth="1"
          />
          {/* Top horizontal grid line */}
          <Line
            x1={padding}
            y1={padding}
            x2={chartWidth - padding}
            y2={padding}
            stroke={colors.border}
            strokeWidth="1"
            strokeDasharray="4, 4"
          />
          {/* Connecting trend line */}
          <Polyline
            points={pointsString}
            fill="none"
            stroke={colors.primary}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          {/* Data Points */}
          {points.map((p, idx) => (
            <React.Fragment key={idx}>
              <Circle cx={p.x} cy={p.y} r="5" fill={colors.primary} />
              <Circle cx={p.x} cy={p.y} r="2" fill="#FFFFFF" />
              <SvgText
                x={p.x}
                y={chartHeight - 4}
                fontSize="9"
                fill={colors.textMuted}
                textAnchor="middle"
              >
                {p.date}
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </View>
    );
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Hero Header */}
      <View style={styles.heroCard}>
        <TouchableOpacity style={styles.photoContainer} onPress={() => setPhotoPickerVisible(true)}>
          {product.image_uri ? (
            <Image source={{ uri: product.image_uri }} style={styles.heroImage} />
          ) : (
            <View style={styles.heroImagePlaceholder}>
              <Ionicons name="camera-outline" size={32} color={colors.primary} />
              <Text style={styles.photoPrompt}>{t('products.image')}</Text>
            </View>
          )}
        </TouchableOpacity>

        <View style={styles.heroDetails}>
          <View style={styles.heroTitleRow}>
            <Text style={styles.heroName}>{product.name}</Text>
            <TouchableOpacity onPress={handleDeleteProduct}>
              <Ionicons name="trash-outline" size={20} color={colors.danger} />
            </TouchableOpacity>
          </View>
          <View style={styles.tagsRow}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{product.category}</Text>
            </View>
            <Text style={styles.unitText}>Unit: {product.unit}</Text>
          </View>
          {product.notes ? <Text style={styles.notesText}>{product.notes}</Text> : null}
        </View>
      </View>

      {/* Quick Stats Grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>{t('products.latest_price')}</Text>
          <Text style={styles.statValue}>
            {product.latest_price ? formatCurrency(product.latest_price) : '--'}
          </Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Min Price</Text>
          <Text style={styles.statValue}>{minPrice ? formatCurrency(minPrice) : '--'}</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Max Price</Text>
          <Text style={styles.statValue}>{maxPrice ? formatCurrency(maxPrice) : '--'}</Text>
        </View>
      </View>

      {/* Price Evolution Chart */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{t('trends.price_evolution')}</Text>
          {product.price_variation !== undefined && product.previous_price ? (
            <View
              style={[
                styles.variationBadge,
                product.price_variation > 0 ? styles.badgeDanger : styles.badgeSuccess,
              ]}
            >
              <Ionicons
                name={product.price_variation > 0 ? 'arrow-up' : 'arrow-down'}
                size={12}
                color={product.price_variation > 0 ? colors.danger : colors.success}
              />
              <Text
                style={[
                  styles.variationText,
                  product.price_variation > 0 ? { color: colors.danger } : { color: colors.success },
                ]}
              >
                {formatPercent(product.price_variation)}
              </Text>
            </View>
          ) : null}
        </View>
        {renderChart()}
      </View>

      {/* Unit & Frequency Breakdown Calculator */}
      <UnitCalculatorCard unitPrice={product.latest_price || 0} />

      {/* Action Button: Record New Purchase / Price Check */}
      <TouchableOpacity
        style={styles.recordBtn}
        activeOpacity={0.8}
        onPress={() => setPurchaseModalVisible(true)}
      >
        <Ionicons name="add-circle" size={20} color="#FFFFFF" />
        <Text style={styles.recordBtnText}>{t('purchases.add_purchase')}</Text>
      </TouchableOpacity>

      {/* Price & Purchase History */}
      <View style={styles.sectionCard}>
        <Text style={styles.sectionTitle}>{t('products.history')}</Text>
        {purchases.length === 0 ? (
          product.latest_price ? (
            <View style={styles.historyItem}>
              <View style={styles.historyTopRow}>
                <Text style={styles.historyDate}>{t('plan.freq_monthly')}</Text>
                <View style={styles.refBadge}>
                  <Ionicons name="pricetag" size={12} color={colors.primary} />
                  <Text style={styles.refBadgeText}>{t('purchases.reference_badge')}</Text>
                </View>
              </View>
              <View style={styles.historyDetailRow}>
                <Text style={styles.historyCalculation}>
                  {formatCurrency(product.latest_price)} (Plan Mensual)
                </Text>
              </View>
              <View style={styles.historyMetaRow}>
                <Text style={styles.historyMeta}>📍 Plan Mensual • 👤 Parents</Text>
              </View>
            </View>
          ) : (
            <Text style={styles.noHistoryText}>{t('common.empty_state')}</Text>
          )
        ) : (
          purchases.map((pur) => (
            <View key={pur.id} style={styles.historyItem}>
              <View style={styles.historyTopRow}>
                <Text style={styles.historyDate}>{formatDateTime(pur.purchase_date)}</Text>
                {pur.entry_type === 'reference' ? (
                  <View style={styles.refBadge}>
                    <Ionicons name="pricetag" size={12} color={colors.primary} />
                    <Text style={styles.refBadgeText}>{t('purchases.reference_badge')}</Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.statusPill,
                      pur.status === 'pending' ? styles.statusPending : styles.statusSettled,
                    ]}
                    onPress={() => handleToggleStatus(pur)}
                  >
                    <Ionicons
                      name={pur.status === 'pending' ? 'time-outline' : 'checkmark-circle-outline'}
                      size={12}
                      color={pur.status === 'pending' ? colors.warning : colors.success}
                    />
                    <Text
                      style={[
                        styles.statusPillText,
                        pur.status === 'pending' ? { color: colors.warning } : { color: colors.success },
                      ]}
                    >
                      {pur.status === 'pending' ? t('settlement.pending_badge') : t('settlement.settled_badge')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.historyDetailRow}>
                <Text style={styles.historyCalculation}>
                  {formatCurrency(pur.unit_price)} x {pur.quantity} ={' '}
                  <Text style={styles.historyTotal}>{formatCurrency(pur.total_amount)}</Text>
                </Text>
                <TouchableOpacity onPress={() => handleDeletePurchase(pur.id)}>
                  <Ionicons name="trash-outline" size={16} color={colors.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.historyMetaRow}>
                <Text style={styles.historyMeta}>
                  {pur.store ? `📍 ${pur.store} • ` : ''}👤 {pur.buyer || 'Parents'}
                </Text>
                {pur.usd_rate && (
                  <Text style={styles.usdText}>
                    ≈ ${(pur.total_amount / pur.usd_rate).toFixed(2)} USD
                  </Text>
                )}
              </View>
            </View>
          ))
        )}
      </View>

      {/* Record Purchase Modal */}
      <Modal visible={purchaseModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('purchases.add_purchase')}</Text>
              <TouchableOpacity onPress={() => setPurchaseModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>{t('purchases.entry_type')}</Text>
              <View style={styles.entryTypeToggleRow}>
                <TouchableOpacity
                  style={[styles.entryTypeBtn, entryType === 'purchase' && styles.entryTypeBtnActive]}
                  onPress={() => setEntryType('purchase')}
                >
                  <Ionicons
                    name="cart"
                    size={16}
                    color={entryType === 'purchase' ? '#FFFFFF' : colors.textSecondary}
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
                  style={[styles.entryTypeBtn, entryType === 'reference' && styles.entryTypeBtnActiveRef]}
                  onPress={() => setEntryType('reference')}
                >
                  <Ionicons
                    name="pricetag"
                    size={16}
                    color={entryType === 'reference' ? '#FFFFFF' : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.entryTypeText,
                      entryType === 'reference' && styles.entryTypeTextActive,
                    ]}
                  >
                    {t('purchases.type_reference')}
                  </Text>
                </TouchableOpacity>
              </View>

              {entryType === 'reference' ? (
                <Text style={styles.hintText}>{t('purchases.type_reference_hint')}</Text>
              ) : null}

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

              {entryType === 'purchase' && (
                <>
                  <Text style={styles.inputLabel}>{t('purchases.status')}</Text>
                  <View style={styles.statusToggleRow}>
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === 'pending' && styles.statusToggleActivePending]}
                      onPress={() => setStatus('pending')}
                    >
                      <Text
                        style={[
                          styles.statusToggleText,
                          status === 'pending' && { color: colors.warning, fontWeight: '700' },
                        ]}
                      >
                        {t('purchases.status_pending')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.statusToggleBtn, status === 'settled' && styles.statusToggleActiveSettled]}
                      onPress={() => setStatus('settled')}
                    >
                      <Text
                        style={[
                          styles.statusToggleText,
                          status === 'settled' && { color: colors.success, fontWeight: '700' },
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

      {/* Photo Picker Modal */}
      <PhotoPickerModal
        visible={photoPickerVisible}
        onClose={() => setPhotoPickerVisible(false)}
        onImageSelected={handlePhotoSelected}
        hasExistingImage={Boolean(product.image_uri)}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  center: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    fontSize: 16,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  photoContainer: {
    width: 90,
    height: 90,
    borderRadius: 14,
    backgroundColor: colors.surfaceElevated,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroImagePlaceholder: {
    alignItems: 'center',
    gap: 4,
  },
  photoPrompt: {
    fontSize: 10,
    color: colors.primary,
    fontWeight: '600',
  },
  heroDetails: {
    flex: 1,
    marginLeft: 14,
  },
  heroTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  heroName: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
    flex: 1,
    marginRight: 6,
  },
  tagsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  unitText: {
    fontSize: 12,
    color: colors.textMuted,
  },
  notesText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 6,
    fontStyle: 'italic',
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginTop: 4,
  },
  sectionCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  variationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
  },
  badgeDanger: {
    backgroundColor: colors.dangerBg,
  },
  badgeSuccess: {
    backgroundColor: colors.successBg,
  },
  variationText: {
    fontSize: 11,
    fontWeight: '700',
  },
  chartWrapper: {
    alignItems: 'center',
    marginTop: 6,
  },
  emptyChart: {
    alignItems: 'center',
    paddingVertical: 24,
    gap: 6,
  },
  emptyChartText: {
    color: colors.textMuted,
    fontSize: 12,
  },
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: 14,
    marginTop: 14,
    gap: 8,
  },
  recordBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  noHistoryText: {
    color: colors.textMuted,
    fontSize: 13,
    marginTop: 10,
  },
  historyItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  historyDate: {
    fontSize: 12,
    color: colors.textMuted,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  statusPending: {
    backgroundColor: colors.warningBg,
  },
  statusSettled: {
    backgroundColor: colors.successBg,
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: '700',
  },
  historyDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  historyCalculation: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  historyTotal: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  historyMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  historyMeta: {
    fontSize: 12,
    color: colors.textMuted,
  },
  usdText: {
    fontSize: 11,
    color: colors.textMuted,
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
  refBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  refBadgeText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700',
  },
  entryTypeToggleRow: {
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
  entryTypeBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  entryTypeBtnActiveRef: {
    backgroundColor: '#0D9488', // Teal
    borderColor: '#0D9488',
  },
  entryTypeText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '600',
  },
  entryTypeTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  hintText: {
    fontSize: 12,
    color: colors.textMuted,
    fontStyle: 'italic',
    marginBottom: 4,
  },
});
