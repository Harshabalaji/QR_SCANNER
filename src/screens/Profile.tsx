import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Switch, ScrollView, Platform } from 'react-native';
import { useStore } from '../store/useStore';
import { colors, darkColors, spacing, borderRadius } from '../theme/theme';
import { useNavigation } from '@react-navigation/native';
import { LogOut, CloudOff, Moon, Sun } from 'lucide-react-native';

export default function Profile() {
  const { isDarkMode, toggleDarkMode, user, setUser } = useStore();
  const theme = isDarkMode ? darkColors : colors;
  const navigation = useNavigation<any>();

  const handleLogout = () => {
    setUser(null);
    navigation.replace('Auth');
  };

  const acc = theme.accent; // dusty rose

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* ── Profile Hero ── */}
      <View style={[styles.hero, { borderBottomColor: theme.border }]}>
        {/* NP Monogram avatar */}
        <View style={[styles.avatarBox, { borderColor: theme.border }]}>
          <Text style={[styles.avatarInitial, { color: theme.primary }]}>
            {user?.name?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>

        <Text style={[styles.userName, { color: theme.primary }]}>
          {user?.name || 'User'}
        </Text>
        <Text style={[styles.userRole, { color: acc }]}>
          {(user?.role || 'STAFF').toUpperCase()} · NP_BRANDING
        </Text>
      </View>

      {/* ── Settings ── */}
      <View style={[styles.section, { borderBottomColor: theme.border }]}>
        <Text style={[styles.sectionLabel, { color: acc }]}>APPEARANCE</Text>

        {/* Dark Mode Row */}
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={styles.rowLeft}>
            {isDarkMode
              ? <Moon color={theme.primary} size={18} strokeWidth={1.5} />
              : <Sun color={theme.primary} size={18} strokeWidth={1.5} />
            }
            <Text style={[styles.rowLabel, { color: theme.primary }]}>Dark Mode</Text>
          </View>
          <Switch
            value={isDarkMode}
            onValueChange={toggleDarkMode}
            trackColor={{ false: theme.border, true: acc }}
            thumbColor={isDarkMode ? theme.surface : theme.background}
          />
        </View>
      </View>

      <View style={[styles.section, { borderBottomColor: theme.border }]}>
        <Text style={[styles.sectionLabel, { color: acc }]}>SYSTEM</Text>

        {/* Offline Sync Row */}
        <View style={[styles.row, { borderBottomColor: theme.border }]}>
          <View style={styles.rowLeft}>
            <CloudOff color={theme.primary} size={18} strokeWidth={1.5} />
            <Text style={[styles.rowLabel, { color: theme.primary }]}>Offline Sync Mode</Text>
          </View>
          <View style={[styles.statusPill, { borderColor: theme.success + '50', backgroundColor: theme.success + '15' }]}>
            <View style={[styles.statusDot, { backgroundColor: theme.success }]} />
            <Text style={[styles.statusText, { color: theme.success }]}>ACTIVE</Text>
          </View>
        </View>
      </View>

      {/* ── App info ── */}
      <View style={styles.appInfo}>
        <View style={[styles.npMonogram, { borderColor: theme.border }]}>
          <Text style={[styles.npText, { color: theme.primary }]}>NP</Text>
        </View>
        <Text style={[styles.appName, { color: theme.primary }]}>NP_BRANDING</Text>
        <Text style={[styles.appTagline, { color: theme.textSecondary }]}>
          LADIES FASHION · INVENTORY · QR
        </Text>
        <Text style={[styles.version, { color: theme.textSecondary }]}>v1.0.0</Text>
      </View>

      {/* ── Log Out ── */}
      <TouchableOpacity
        style={[styles.logoutBtn, { borderColor: theme.border }]}
        onPress={handleLogout}
        activeOpacity={0.8}
      >
        <LogOut color={theme.error} size={18} strokeWidth={1.5} />
        <Text style={[styles.logoutText, { color: theme.error }]}>SIGN OUT</Text>
      </TouchableOpacity>

      <View style={{ height: spacing.xxl }} />
    </ScrollView>
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

  // ── Hero ──
  hero: {
    alignItems: 'center',
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    borderBottomWidth: 1,
    gap: 8,
  },
  avatarBox: {
    width: 80,
    height: 80,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
  },
  avatarInitial: {
    fontSize: 32,
    fontWeight: '300',
    letterSpacing: 2,
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  userRole: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },

  // ── Sections ──
  section: {
    paddingHorizontal: spacing.l,
    paddingTop: spacing.l,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: spacing.m,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: spacing.m,
    marginBottom: spacing.s,
    borderBottomWidth: 1,
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  rowLabel: {
    fontSize: 15,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    gap: 6,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 1.5,
  },

  // ── App info ──
  appInfo: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    gap: 6,
  },
  npMonogram: {
    width: 44,
    height: 44,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  npText: {
    fontSize: 14,
    fontWeight: '300',
    letterSpacing: 4,
  },
  appName: {
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  appTagline: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  version: {
    fontSize: 11,
    letterSpacing: 0.5,
    marginTop: 4,
  },

  // ── Logout ──
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.l,
    marginHorizontal: spacing.l,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    gap: spacing.s,
  },
  logoutText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
});
