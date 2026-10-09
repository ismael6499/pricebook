import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../constants/theme';
import { t } from '../i18n';
import {
  Category,
  getCategoriesWithCount,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../db/database';

interface CategoryManagerModalProps {
  visible: boolean;
  onClose: () => void;
  onCategoryChange?: () => void;
}

const COLOR_PALETTE = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#F59E0B', // Amber
  '#EF4444', // Red
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#84CC16', // Lime
  '#6366F1', // Indigo
  '#64748B', // Slate
];

export default function CategoryManagerModal({
  visible,
  onClose,
  onCategoryChange,
}: CategoryManagerModalProps) {
  const [categories, setCategories] = useState<Array<Category & { product_count: number }>>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_PALETTE[0]);
  const [isFormVisible, setIsFormVisible] = useState(false);

  useEffect(() => {
    if (visible) {
      loadCategories();
      resetForm();
    }
  }, [visible]);

  const loadCategories = async () => {
    try {
      const data = await getCategoriesWithCount();
      setCategories(data);
    } catch (err) {
      console.error('Error loading categories:', err);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setSelectedColor(COLOR_PALETTE[0]);
    setIsFormVisible(false);
  };

  const startEdit = (cat: Category & { product_count: number }) => {
    setEditingId(cat.id);
    setName(cat.name);
    setSelectedColor(cat.color || COLOR_PALETTE[0]);
    setIsFormVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim()) return;

    try {
      if (editingId) {
        await updateCategory(editingId, { name: name.trim(), color: selectedColor });
      } else {
        await createCategory(name.trim(), selectedColor);
      }
      resetForm();
      await loadCategories();
      onCategoryChange?.();
    } catch (err: any) {
      Alert.alert(t('common.error'), err?.message || 'Error saving category');
    }
  };

  const handleDelete = (cat: Category & { product_count: number }) => {
    if (cat.is_default === 1) {
      Alert.alert(t('common.error'), 'Default categories cannot be deleted.');
      return;
    }

    Alert.alert(
      t('common.confirm'),
      t('categories.delete_confirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteCategory(cat.id);
              await loadCategories();
              onCategoryChange?.();
            } catch (err: any) {
              Alert.alert(t('common.error'), err?.message || 'Error deleting category');
            }
          },
        },
      ]
    );
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContent}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle}>{t('categories.manage')}</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={24} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* Form Section */}
          {isFormVisible ? (
            <View style={styles.formContainer}>
              <Text style={styles.formTitle}>
                {editingId ? t('categories.edit_category') : t('categories.add_category')}
              </Text>

              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder={t('categories.name_placeholder')}
                placeholderTextColor={colors.textMuted}
                autoFocus
              />

              {/* Color Palette Chips */}
              <Text style={styles.fieldLabel}>{t('categories.color')}</Text>
              <View style={styles.colorPalette}>
                {COLOR_PALETTE.map((color) => {
                  const isSelected = selectedColor === color;
                  return (
                    <TouchableOpacity
                      key={color}
                      onPress={() => setSelectedColor(color)}
                      style={[
                        styles.colorChip,
                        { backgroundColor: color },
                        isSelected && styles.colorChipSelected,
                      ]}
                    >
                      {isSelected && <Ionicons name="checkmark" size={16} color="#FFF" />}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Form Action Buttons */}
              <View style={styles.formActions}>
                <TouchableOpacity onPress={resetForm} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>{t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                  <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.newCategoryBtn}
              onPress={() => {
                resetForm();
                setIsFormVisible(true);
              }}
            >
              <Ionicons name="add-circle" size={20} color={colors.primary} />
              <Text style={styles.newCategoryBtnText}>{t('categories.add_category')}</Text>
            </TouchableOpacity>
          )}

          {/* Category List */}
          <FlatList
            data={categories}
            keyExtractor={(item) => String(item.id)}
            contentContainerStyle={styles.listContainer}
            renderItem={({ item }) => (
              <View style={styles.categoryRow}>
                <View style={styles.categoryInfo}>
                  <View style={[styles.colorIndicator, { backgroundColor: item.color || colors.primary }]} />
                  <View>
                    <Text style={styles.categoryName}>{item.name}</Text>
                    <Text style={styles.categoryCount}>
                      {t('categories.products_count', { count: item.product_count })}
                    </Text>
                  </View>
                </View>

                <View style={styles.actionsGroup}>
                  <TouchableOpacity onPress={() => startEdit(item)} style={styles.actionIconBtn}>
                    <Ionicons name="pencil-outline" size={18} color={colors.textSecondary} />
                  </TouchableOpacity>
                  {item.is_default !== 1 && (
                    <TouchableOpacity onPress={() => handleDelete(item)} style={styles.actionIconBtn}>
                      <Ionicons name="trash-outline" size={18} color={colors.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
          />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 32,
    maxHeight: '85%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: 6,
  },
  newCategoryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceElevated,
    borderRadius: 12,
    paddingVertical: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.borderLight,
    borderStyle: 'dashed',
  },
  newCategoryBtnText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 15,
    marginLeft: 8,
  },
  formContainer: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  formTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: colors.text,
    fontSize: 15,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 12,
  },
  fieldLabel: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  colorChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorChipSelected: {
    borderWidth: 3,
    borderColor: '#FFF',
  },
  formActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: colors.surface,
  },
  cancelBtnText: {
    color: colors.textSecondary,
    fontWeight: '600',
    fontSize: 14,
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listContainer: {
    paddingBottom: 24,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  colorIndicator: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginRight: 12,
  },
  categoryName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.text,
  },
  categoryCount: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  actionIconBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: colors.surfaceElevated,
  },
});
