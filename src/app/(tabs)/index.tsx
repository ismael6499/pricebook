import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  Alert,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import {
  getAllProducts,
  getCategories,
  createCategory,
  createProduct,
  Product,
  Category,
} from '../../db/database';
import { colors } from '../../constants/theme';
import { t, formatCurrency, formatPercent } from '../../i18n';

export default function ProductsScreen() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [modalVisible, setModalVisible] = useState(false);
  const [categoryModalVisible, setCategoryModalVisible] = useState(false);

  // New product form
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [unit, setUnit] = useState('1 u');
  const [notes, setNotes] = useState('');
  const [imageUri, setImageUri] = useState<string | null>(null);

  // New category form
  const [newCategoryName, setNewCategoryName] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [prods, cats] = await Promise.all([
        getAllProducts(search, selectedCategory),
        getCategories(),
      ]);
      setProducts(prods);
      setCategories(cats);
    } catch (err) {
      console.error('Error loading products:', err);
    }
  }, [search, selectedCategory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handlePickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), 'Permission to access gallery is required');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleTakePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(t('common.error'), 'Permission to access camera is required');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      quality: 0.7,
    });
    if (!result.canceled && result.assets[0]) {
      setImageUri(result.assets[0].uri);
    }
  };

  const handleCreateProduct = async () => {
    if (!name.trim()) {
      Alert.alert(t('common.error'), t('products.name') + ' is required');
      return;
    }
    try {
      await createProduct({
        name: name.trim(),
        category,
        unit: unit.trim() || '1 u',
        notes: notes.trim(),
        image_uri: imageUri,
      });
      setName('');
      setCategory('General');
      setUnit('1 u');
      setNotes('');
      setImageUri(null);
      setModalVisible(false);
      loadData();
    } catch (err) {
      console.error('Failed to create product:', err);
      Alert.alert(t('common.error'), 'Failed to create product');
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      await createCategory(newCategoryName.trim());
      setNewCategoryName('');
      setCategoryModalVisible(false);
      const cats = await getCategories();
      setCategories(cats);
    } catch (err) {
      Alert.alert(t('common.error'), 'Category already exists or invalid');
    }
  };

  const renderProductItem = ({ item }: { item: Product }) => {
    const variation = item.price_variation || 0;
    const hasVariation = item.previous_price && item.previous_price > 0;
    const isIncrease = variation > 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/product/${item.id}` as any)}
      >
        <View style={styles.imageContainer}>
          {item.image_uri ? (
            <Image source={{ uri: item.image_uri }} style={styles.productImage} />
          ) : (
            <View style={styles.placeholderImage}>
              <Ionicons name="basket-outline" size={24} color={colors.primary} />
            </View>
          )}
        </View>

        <View style={styles.infoContainer}>
          <View style={styles.titleRow}>
            <Text style={styles.productName} numberOfLines={1}>
              {item.name}
            </Text>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>
          </View>

          <Text style={styles.unitText}>{item.unit}</Text>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.priceLabel}>{t('products.latest_price')}</Text>
              <Text style={styles.priceValue}>
                {item.latest_price ? formatCurrency(item.latest_price) : '--'}
              </Text>
            </View>

            {hasVariation && (
              <View
                style={[
                  styles.variationBadge,
                  isIncrease ? styles.variationBadgeDanger : styles.variationBadgeSuccess,
                ]}
              >
                <Ionicons
                  name={isIncrease ? 'arrow-up' : 'arrow-down'}
                  size={12}
                  color={isIncrease ? colors.danger : colors.success}
                />
                <Text
                  style={[
                    styles.variationText,
                    isIncrease ? { color: colors.danger } : { color: colors.success },
                  ]}
                >
                  {formatPercent(variation)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color={colors.textMuted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder={t('common.search')}
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      {/* Category Pills Filter */}
      <View style={styles.categoriesSection}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryChips}>
          <TouchableOpacity
            style={[styles.chip, selectedCategory === 'All' && styles.chipActive]}
            onPress={() => setSelectedCategory('All')}
          >
            <Text style={[styles.chipText, selectedCategory === 'All' && styles.chipTextActive]}>
              {t('common.all')}
            </Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[styles.chip, selectedCategory === c.name && styles.chipActive]}
              onPress={() => setSelectedCategory(c.name)}
            >
              <Text style={[styles.chipText, selectedCategory === c.name && styles.chipTextActive]}>
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.addCategoryChip}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Ionicons name="add" size={14} color={colors.primary} />
            <Text style={styles.addCategoryText}>Category</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Product List */}
      <FlatList
        data={products}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderProductItem}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="bag-handle-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyText}>{t('products.no_products')}</Text>
          </View>
        }
      />

      {/* Floating Action Button (New Product) */}
      <TouchableOpacity
        style={styles.fab}
        activeOpacity={0.8}
        onPress={() => setModalVisible(true)}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Add Product Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('products.add_product')}</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Photo preview / upload */}
              <View style={styles.imagePickerSection}>
                {imageUri ? (
                  <View style={styles.pickedImageWrapper}>
                    <Image source={{ uri: imageUri }} style={styles.pickedImage} />
                    <TouchableOpacity
                      style={styles.removeImageBtn}
                      onPress={() => setImageUri(null)}
                    >
                      <Ionicons name="trash" size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.imageActionButtons}>
                    <TouchableOpacity style={styles.imageBtn} onPress={handleTakePhoto}>
                      <Ionicons name="camera" size={20} color={colors.primary} />
                      <Text style={styles.imageBtnText}>{t('products.take_photo')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imageBtn} onPress={handlePickImage}>
                      <Ionicons name="images" size={20} color={colors.primary} />
                      <Text style={styles.imageBtnText}>{t('products.pick_image')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>

              <Text style={styles.inputLabel}>{t('products.name')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('products.name_placeholder')}
                placeholderTextColor={colors.textMuted}
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>{t('products.category')}</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.modalCategoryPicker}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[styles.modalCatChip, category === c.name && styles.modalCatChipActive]}
                    onPress={() => setCategory(c.name)}
                  >
                    <Text
                      style={[
                        styles.modalCatChipText,
                        category === c.name && styles.modalCatChipTextActive,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <Text style={styles.inputLabel}>{t('products.unit')}</Text>
              <TextInput
                style={styles.modalInput}
                placeholder={t('products.unit_placeholder')}
                placeholderTextColor={colors.textMuted}
                value={unit}
                onChangeText={setUnit}
              />

              <Text style={styles.inputLabel}>{t('products.notes')}</Text>
              <TextInput
                style={[styles.modalInput, styles.notesInput]}
                placeholder={t('products.notes_placeholder')}
                placeholderTextColor={colors.textMuted}
                value={notes}
                onChangeText={setNotes}
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleCreateProduct}>
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add Category Modal */}
      <Modal visible={categoryModalVisible} animationType="fade" transparent>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { maxHeight: 220 }]}>
            <Text style={styles.modalTitle}>New Category</Text>
            <TextInput
              style={[styles.modalInput, { marginTop: 16 }]}
              placeholder="e.g. Snacks, Beverages, Pharmacy"
              placeholderTextColor={colors.textMuted}
              value={newCategoryName}
              onChangeText={setNewCategoryName}
            />
            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.btnCancel, { flex: 1, marginRight: 8 }]}
                onPress={() => setCategoryModalVisible(false)}
              >
                <Text style={styles.btnCancelText}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, { flex: 1, marginTop: 0 }]}
                onPress={handleCreateCategory}
              >
                <Text style={styles.saveBtnText}>{t('common.save')}</Text>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 12,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    color: colors.text,
    fontSize: 14,
  },
  categoriesSection: {
    marginVertical: 12,
  },
  categoryChips: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  addCategoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
    gap: 4,
  },
  addCategoryText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageContainer: {
    width: 68,
    height: 68,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: colors.surfaceElevated,
    justifyContent: 'center',
    alignItems: 'center',
  },
  productImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  productName: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    flex: 1,
    marginRight: 6,
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
    marginTop: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  priceLabel: {
    fontSize: 10,
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  priceValue: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  variationBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
    gap: 2,
  },
  variationBadgeDanger: {
    backgroundColor: colors.dangerBg,
  },
  variationBadgeSuccess: {
    backgroundColor: colors.successBg,
  },
  variationText: {
    fontSize: 11,
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
    textAlign: 'center',
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
  imagePickerSection: {
    marginBottom: 16,
    alignItems: 'center',
  },
  pickedImageWrapper: {
    width: 120,
    height: 120,
    borderRadius: 12,
    overflow: 'hidden',
    position: 'relative',
  },
  pickedImage: {
    width: '100%',
    height: '100%',
  },
  removeImageBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    backgroundColor: 'rgba(0,0,0,0.6)',
    padding: 6,
    borderRadius: 12,
  },
  imageActionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  imageBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceElevated,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageBtnText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
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
  notesInput: {
    height: 70,
    textAlignVertical: 'top',
  },
  modalCategoryPicker: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  modalCatChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.surfaceElevated,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCatChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  modalCatChipText: {
    color: colors.textSecondary,
    fontSize: 12,
  },
  modalCatChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
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
  modalButtonsRow: {
    flexDirection: 'row',
    marginTop: 16,
  },
  btnCancel: {
    backgroundColor: colors.surfaceElevated,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnCancelText: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '600',
  },
});
