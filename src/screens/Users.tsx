import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Modal,
  Platform,
} from 'react-native';
import { UserPlus, KeyRound, ShieldAlert, CheckCircle, Lock, X } from 'lucide-react-native';
import { useStore, User } from '../store/useStore';
import { colors, darkColors, spacing, borderRadius } from '../theme/theme';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

export default function Users() {
  const { isDarkMode, user, usersList, fetchUsers, createUser, toggleUserActive, resetUserPin } = useStore();
  const theme = isDarkMode ? darkColors : colors;

  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [resetModalUser, setResetModalUser] = useState<User | null>(null);

  // Form State for Create User
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formPin, setFormPin] = useState('');
  const [formConfirmPin, setFormConfirmPin] = useState('');
  const [formRole, setFormRole] = useState<'cashier' | 'manager'>('cashier');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset PIN State
  const [newPin, setNewPin] = useState('');
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async () => {
    setFormError(null);
    if (!formName.trim()) {
      setFormError('Full name is required');
      return;
    }
    if (!formUsername.trim()) {
      setFormError('Username is required');
      return;
    }
    if (formPin.length < 4) {
      setFormError('PIN must be at least 4 digits');
      return;
    }
    if (formPin !== formConfirmPin) {
      setFormError('PINs do not match');
      return;
    }

    setIsSubmitting(true);
    const res = await createUser({
      name: formName.trim(),
      username: formUsername.trim().toLowerCase(),
      pin: formPin.trim(),
      role: formRole,
    });
    setIsSubmitting(false);

    if (res.success) {
      setCreateModalVisible(false);
      setFormName('');
      setFormUsername('');
      setFormPin('');
      setFormConfirmPin('');
    } else {
      setFormError(res.message || 'Failed to create account');
    }
  };

  const handleResetPin = async () => {
    if (!resetModalUser) return;
    setResetError(null);
    if (newPin.length < 4) {
      setResetError('New PIN must be at least 4 digits');
      return;
    }

    const res = await resetUserPin(resetModalUser.id, newPin.trim());
    if (res.success) {
      setResetModalUser(null);
      setNewPin('');
    } else {
      setResetError(res.message || 'Failed to reset PIN');
    }
  };

  const acc = theme.accent;

  const renderUserCard = ({ item }: { item: User }) => {
    const isActive = item.is_active !== 0;

    return (
      <View style={[styles.card, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Text style={[styles.userName, { color: theme.primary }]}>{item.name}</Text>
            <Text style={[styles.userUsername, { color: theme.textSecondary }]}>
              @{item.username} · {item.role.toUpperCase()}
            </Text>
          </View>
          <StatusBadge
            status={isActive ? 'IN_STOCK' : 'OUT_OF_STOCK'}
            label={isActive ? 'ACTIVE' : 'DISABLED'}
            size="small"
          />
        </View>

        <View style={[styles.cardActions, { borderTopColor: theme.border }]}>
          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.border }]}
            onPress={() => toggleUserActive(item.id)}
          >
            <Lock color={theme.textSecondary} size={14} />
            <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>
              {isActive ? 'DISABLE ACCOUNT' : 'ENABLE ACCOUNT'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { borderColor: theme.border }]}
            onPress={() => {
              setResetModalUser(item);
              setNewPin('');
              setResetError(null);
            }}
          >
            <KeyRound color={theme.textSecondary} size={14} />
            <Text style={[styles.actionBtnText, { color: theme.textSecondary }]}>RESET PIN</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (user?.role !== 'manager') {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <EmptyState
          icon={ShieldAlert}
          title="Access Denied"
          subtitle="User Management is restricted exclusively to Store Managers."
        />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Controls Row */}
      <View style={[styles.controlsRow, { borderBottomColor: theme.border }]}>
        <View>
          <Text style={[styles.eyebrow, { color: acc }]}>SECURITY</Text>
          <Text style={[styles.title, { color: theme.primary }]}>CASHIER ACCOUNTS</Text>
        </View>
        <TouchableOpacity
          style={[styles.addBtn, { backgroundColor: theme.primary }]}
          onPress={() => {
            setFormName('');
            setFormUsername('');
            setFormPin('');
            setFormConfirmPin('');
            setFormError(null);
            setCreateModalVisible(true);
          }}
        >
          <UserPlus color={isDarkMode ? '#0D0D0D' : '#FFFFFF'} size={16} />
          <Text style={[styles.addBtnText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
            ADD CASHIER
          </Text>
        </TouchableOpacity>
      </View>

      {/* Users List */}
      <FlatList
        data={usersList}
        keyExtractor={(item) => String(item.id)}
        renderItem={renderUserCard}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <EmptyState
            title="No Users Registered"
            subtitle="Click Add Cashier to create your first cashier account."
          />
        }
      />

      {/* Add Cashier Modal */}
      {createModalVisible && (
        <Modal transparent animationType="fade" visible={createModalVisible}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.primary }]}>CREATE CASHIER ACCOUNT</Text>
                <TouchableOpacity onPress={() => setCreateModalVisible(false)}>
                  <X color={theme.textSecondary} size={20} />
                </TouchableOpacity>
              </View>

              {formError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>FULL NAME *</Text>
                <TextInput
                  style={[styles.input, { color: theme.primary, borderColor: theme.border }]}
                  placeholder="e.g. Cashier 02"
                  placeholderTextColor={theme.textSecondary}
                  value={formName}
                  onChangeText={setFormName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>USERNAME *</Text>
                <TextInput
                  style={[styles.input, { color: theme.primary, borderColor: theme.border }]}
                  placeholder="e.g. cashier02"
                  placeholderTextColor={theme.textSecondary}
                  value={formUsername}
                  onChangeText={setFormUsername}
                  autoCapitalize="none"
                />
              </View>

              <View style={{ flexDirection: 'row', gap: spacing.m }}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>ACCESS PIN (MIN 4 DIGITS) *</Text>
                  <TextInput
                    style={[styles.input, { color: theme.primary, borderColor: theme.border }]}
                    placeholder="••••"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry
                    keyboardType="number-pad"
                    value={formPin}
                    onChangeText={setFormPin}
                    maxLength={6}
                  />
                </View>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={[styles.label, { color: theme.textSecondary }]}>CONFIRM PIN *</Text>
                  <TextInput
                    style={[styles.input, { color: theme.primary, borderColor: theme.border }]}
                    placeholder="••••"
                    placeholderTextColor={theme.textSecondary}
                    secureTextEntry
                    keyboardType="number-pad"
                    value={formConfirmPin}
                    onChangeText={setFormConfirmPin}
                    maxLength={6}
                  />
                </View>
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => setCreateModalVisible(false)}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleCreateUser}
                  disabled={isSubmitting}
                >
                  <Text style={[styles.saveText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
                    {isSubmitting ? 'Creating…' : 'CREATE ACCOUNT'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Reset PIN Modal */}
      {resetModalUser && (
        <Modal transparent animationType="fade" visible={!!resetModalUser}>
          <View style={styles.modalOverlay}>
            <View style={[styles.modalCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: theme.primary }]}>RESET PIN</Text>
                <TouchableOpacity onPress={() => setResetModalUser(null)}>
                  <X color={theme.textSecondary} size={20} />
                </TouchableOpacity>
              </View>

              <Text style={{ fontSize: 13, color: theme.textSecondary, marginBottom: spacing.m }}>
                Set a new PIN for <Text style={{ fontWeight: '700', color: theme.primary }}>{resetModalUser.name}</Text> (@{resetModalUser.username}).
              </Text>

              {resetError && (
                <View style={styles.errorBox}>
                  <Text style={styles.errorText}>{resetError}</Text>
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>NEW ACCESS PIN *</Text>
                <TextInput
                  style={[styles.input, { color: theme.primary, borderColor: theme.border }]}
                  placeholder="••••"
                  placeholderTextColor={theme.textSecondary}
                  secureTextEntry
                  keyboardType="number-pad"
                  value={newPin}
                  onChangeText={setNewPin}
                  maxLength={6}
                />
              </View>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.cancelBtn, { borderColor: theme.border }]}
                  onPress={() => setResetModalUser(null)}
                >
                  <Text style={[styles.cancelText, { color: theme.textSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.saveBtn, { backgroundColor: theme.primary }]}
                  onPress={handleResetPin}
                >
                  <Text style={[styles.saveText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
                    SAVE NEW PIN
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh' as any,
    }),
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.l,
    borderBottomWidth: 1,
  },
  eyebrow: { fontSize: 8, fontWeight: '700', letterSpacing: 2.5 },
  title: { fontSize: 18, fontWeight: '700', letterSpacing: 1 },
  addBtn: {
    height: 40,
    paddingHorizontal: spacing.l,
    borderRadius: borderRadius.xs,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addBtnText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  card: {
    borderWidth: 1,
    borderRadius: borderRadius.s,
    marginHorizontal: spacing.l,
    marginBottom: spacing.m,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: spacing.l,
  },
  cardHeaderLeft: { flex: 1, gap: 2 },
  userName: { fontSize: 15, fontWeight: '700' },
  userUsername: { fontSize: 12 },
  cardActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
  },
  actionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.m,
    gap: 6,
    borderRightWidth: 1,
  },
  actionBtnText: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5 },
  listContent: { paddingTop: spacing.l, paddingBottom: spacing.xxl },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.l,
  },
  modalCard: {
    width: '100%',
    maxWidth: 460,
    padding: spacing.l,
    borderWidth: 1,
    borderRadius: borderRadius.m,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  modalTitle: { fontSize: 14, fontWeight: '700', letterSpacing: 1.5 },
  formGroup: { marginBottom: spacing.m },
  label: { fontSize: 9, fontWeight: '700', letterSpacing: 1.5, marginBottom: 4 },
  input: {
    fontSize: 14,
    borderBottomWidth: 1,
    paddingVertical: spacing.xs,
  },
  errorBox: {
    backgroundColor: '#FFEAE6',
    padding: spacing.s,
    borderRadius: borderRadius.xs,
    marginBottom: spacing.m,
  },
  errorText: { fontSize: 12, color: '#DC2626', fontWeight: '600' },
  modalActions: { flexDirection: 'row', gap: spacing.m, marginTop: spacing.m },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: { fontSize: 12, fontWeight: '600' },
  saveBtn: {
    flex: 1,
    height: 40,
    borderRadius: borderRadius.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
});
