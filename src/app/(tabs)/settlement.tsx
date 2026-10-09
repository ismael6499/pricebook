import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import {
  getMonthlySummary,
  settleAllPendingPurchases,
  revertSettlement,
  getSettlementsHistory,
  MonthlySummary,
  Settlement,
} from '../../db/database';
import { colors } from '../../constants/theme';
import { t, formatCurrency, formatPercent, formatDateTime } from '../../i18n';

export default function SettlementScreen() {
  const [summary, setSummary] = useState<MonthlySummary | null>(null);
  const [history, setHistory] = useState<Settlement[]>([]);
  const [lastSettlementId, setLastSettlementId] = useState<number | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sum, hist] = await Promise.all([
        getMonthlySummary(),
        getSettlementsHistory(),
      ]);
      setSummary(sum);
      setHistory(hist);
    } catch (err) {
      console.error('Error loading settlement summary:', err);
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
      await loadData();
    } finally {
      setRefreshing(false);
    }
  }, [loadData]);

  const handleSettleAll = () => {
    if (!summary || summary.total_pending_to_repay <= 0) {
      Alert.alert(t('common.empty_state'), 'No pending purchases to settle for this period.');
      return;
    }

    Alert.alert(
      t('settlement.settle_all'),
      `${t('settlement.settle_all_confirm')}\n\nTotal: ${formatCurrency(summary.total_pending_to_repay)} (${summary.pending_count} purchases)`,
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.confirm'),
          style: 'default',
          onPress: async () => {
            try {
              const res = await settleAllPendingPurchases(summary.period, 'Bank Transfer / MercadoPago');
              setLastSettlementId(res.settlementId);
              loadData();
              Alert.alert(t('common.success'), t('settlement.settle_success'));
            } catch (err) {
              Alert.alert(t('common.error'), 'Failed to settle purchases');
            }
          },
        },
      ]
    );
  };

  const handleRevert = async (settlementId: number) => {
    Alert.alert(
      'Revert Settlement',
      'Do you want to cancel this settlement and return all purchases to Pending status?',
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: 'Yes, Revert to Pending',
          style: 'destructive',
          onPress: async () => {
            try {
              await revertSettlement(settlementId);
              if (lastSettlementId === settlementId) {
                setLastSettlementId(null);
              }
              loadData();
              Alert.alert(t('common.success'), 'Settlement reverted. Purchases are pending again.');
            } catch (err) {
              Alert.alert(t('common.error'), 'Failed to revert settlement');
            }
          },
        },
      ]
    );
  };

  if (!summary) {
    return (
      <View style={[styles.container, styles.center]}>
        <Text style={styles.loadingText}>{t('common.loading')}</Text>
      </View>
    );
  }

  const hasPending = summary.total_pending_to_repay > 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
        />
      }
    >
      {/* Undo Banner if recently settled */}
      {lastSettlementId && (
        <View style={styles.undoBanner}>
          <View style={styles.undoTextWrapper}>
            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
            <Text style={styles.undoBannerText}>Settlement recorded.</Text>
          </View>
          <TouchableOpacity
            style={styles.undoBtn}
            onPress={() => handleRevert(lastSettlementId)}
          >
            <Ionicons name="arrow-undo" size={14} color="#FFFFFF" />
            <Text style={styles.undoBtnText}>Undo / Cancel</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Hero Card: Total Pending to Repay to Parents */}
      <View style={styles.heroCard}>
        <Text style={styles.periodLabel}>{t('settlement.current_period')}: {summary.period}</Text>
        <Text style={styles.heroTitle}>{t('settlement.total_to_pay')}</Text>
        <Text style={[styles.heroAmount, !hasPending && { color: colors.success }]}>
          {formatCurrency(summary.total_pending_to_repay)}
        </Text>
        <Text style={styles.pendingItemsCount}>
          {summary.pending_count} purchases pending repayment
        </Text>

        <TouchableOpacity
          style={[styles.settleBtn, !hasPending && styles.settleBtnDisabled]}
          disabled={!hasPending}
          activeOpacity={0.8}
          onPress={handleSettleAll}
        >
          <Ionicons name="checkmark-done-circle" size={20} color="#FFFFFF" />
          <Text style={styles.settleBtnText}>{t('settlement.settle_all')}</Text>
        </TouchableOpacity>
      </View>

      {/* Summary Metrics Card */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Period Summary</Text>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t('settlement.total_spent')}</Text>
          <Text style={styles.metricValue}>{formatCurrency(summary.total_spent)}</Text>
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t('settlement.total_settled')}</Text>
          <Text style={[styles.metricValue, { color: colors.success }]}>
            {formatCurrency(summary.total_settled)}
          </Text>
        </View>
        {summary.previous_month_total > 0 && (
          <View style={styles.metricRow}>
            <Text style={styles.metricLabel}>{t('settlement.month_comparison')}</Text>
            <Text
              style={[
                styles.metricValue,
                summary.variation_vs_prev_month > 0 ? { color: colors.danger } : { color: colors.success },
              ]}
            >
              {formatPercent(summary.variation_vs_prev_month)} vs prev month
            </Text>
          </View>
        )}
      </View>

      {/* Top Price Increases this month */}
      {summary.top_increases.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{t('settlement.top_increases')}</Text>
          {summary.top_increases.map((item) => (
            <View key={item.product_id} style={styles.increaseItem}>
              <View style={styles.increaseLeft}>
                <Text style={styles.increaseName}>{item.name}</Text>
                <Text style={styles.increaseSub}>
                  {formatCurrency(item.previous_price)} ➔ {formatCurrency(item.current_price)}
                </Text>
              </View>
              <View style={styles.increaseBadge}>
                <Ionicons name="arrow-up" size={12} color={colors.danger} />
                <Text style={styles.increaseBadgeText}>{formatPercent(item.variation_pct)}</Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Past Settlements Archive */}
      {history.length > 0 && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Past Repayment Closures</Text>
          {history.map((h) => (
            <View key={h.id} style={styles.historyRow}>
              <View>
                <Text style={styles.historyPeriod}>
                  {h.period} • {formatCurrency(h.total_settled)}
                </Text>
                <Text style={styles.historyDate}>
                  Paid: {formatDateTime(h.settled_at)} ({h.purchases_count} items)
                </Text>
              </View>
              <TouchableOpacity
                style={styles.revertBtn}
                onPress={() => handleRevert(h.id)}
              >
                <Ionicons name="arrow-undo-outline" size={14} color={colors.warning} />
                <Text style={styles.revertBtnText}>Revert</Text>
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}
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
  undoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
    borderColor: colors.success,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 14,
  },
  undoTextWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  undoBannerText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '600',
  },
  undoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  undoBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
  },
  periodLabel: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 8,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  heroAmount: {
    fontSize: 34,
    fontWeight: '900',
    color: colors.warning,
    marginTop: 4,
  },
  pendingItemsCount: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
  },
  settleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 14,
    marginTop: 18,
    width: '100%',
    gap: 8,
  },
  settleBtnDisabled: {
    backgroundColor: colors.surfaceElevated,
    opacity: 0.6,
  },
  settleBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 16,
    marginTop: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  metricLabel: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  metricValue: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  increaseItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  increaseLeft: {
    flex: 1,
  },
  increaseName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  increaseSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  increaseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.dangerBg,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 2,
  },
  increaseBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
  },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyPeriod: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  historyDate: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  revertBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  revertBtnText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.warning,
  },
});
