import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  useWindowDimensions,
  Platform,
} from 'react-native';
import {
  Home,
  ScanLine,
  ShoppingCart,
  List,
  History as HistoryIcon,
  CircleUser,
  Users as UsersIcon,
  Moon,
  Sun,
  ChevronLeft,
  ChevronRight,
  LogOut,
  ShieldCheck,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { colors, darkColors, spacing, borderRadius } from '../theme/theme';

interface MainLayoutProps {
  children: React.ReactNode;
  activeRoute: 'Dashboard' | 'Scanner' | 'Sell' | 'Inventory' | 'HistoryTabs' | 'Users' | 'Profile';
  onNavigate: (route: string) => void;
  title?: string;
}

export default function MainLayout({
  children,
  activeRoute,
  onNavigate,
  title,
}: MainLayoutProps) {
  const navigation = useNavigation<any>();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { isDarkMode, toggleDarkMode, dbStatus, cart, user, token, logout } = useStore();
  const theme = isDarkMode ? darkColors : colors;

  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);
  const isManager = user?.role === 'manager';

  // Strict Route Guard: Redirect unauthenticated users to Auth
  useEffect(() => {
    if (!user || !token) {
      navigation.reset({
        index: 0,
        routes: [{ name: 'Auth' }],
      });
    }
  }, [user, token]);

  // Role-based Navigation Configuration
  const allNavItems = [
    { name: 'Dashboard', label: 'Home', icon: Home, section: 'OVERVIEW', roles: ['manager'] },
    { name: 'Scanner', label: 'Scan', icon: ScanLine, section: 'OVERVIEW', roles: ['cashier', 'manager'] },
    { name: 'Sell', label: 'Sell / POS', icon: ShoppingCart, section: 'OVERVIEW', badge: cartCount > 0 ? cartCount : undefined, roles: ['cashier', 'manager'] },
    { name: 'Inventory', label: 'Inventory', icon: List, section: 'MANAGEMENT', roles: ['manager'] },
    { name: 'HistoryTabs', label: 'History', icon: HistoryIcon, section: 'MANAGEMENT', roles: ['cashier', 'manager'] },
    { name: 'Users', label: 'Cashiers', icon: UsersIcon, section: 'MANAGEMENT', roles: ['manager'] },
    { name: 'Profile', label: 'Settings', icon: CircleUser, section: 'ACCOUNT', roles: ['cashier', 'manager'] },
  ];

  const allowedNavItems = allNavItems.filter((item) =>
    item.roles.includes(user?.role || 'cashier')
  );

  const handleLogout = async () => {
    await logout();
    navigation.reset({
      index: 0,
      routes: [{ name: 'Auth' }],
    });
  };

  const renderNavItems = (section: string) =>
    allowedNavItems
      .filter((i) => i.section === section)
      .map((item) => {
        const Icon = item.icon;
        const isActive = activeRoute === item.name;
        return (
          <TouchableOpacity
            key={item.name}
            style={[
              styles.navItem,
              isActive && { backgroundColor: theme.surfaceHover },
            ]}
            onPress={() => onNavigate(item.name)}
          >
            <View style={[styles.navIconWrap, isActive && { borderColor: theme.accent }]}>
              <Icon
                color={isActive ? theme.primary : theme.textSecondary}
                size={18}
                strokeWidth={isActive ? 2 : 1.5}
              />
            </View>
            {!isCollapsed && (
              <Text
                style={[
                  styles.navLabel,
                  { color: isActive ? theme.primary : theme.textSecondary },
                  isActive && { fontWeight: '700' },
                ]}
              >
                {item.label}
              </Text>
            )}
            {!isCollapsed && item.badge ? (
              <View style={[styles.badge, { backgroundColor: theme.accent }]}>
                <Text style={styles.badgeText}>{item.badge}</Text>
              </View>
            ) : null}
            {isActive && (
              <View style={[styles.activeBar, { backgroundColor: theme.accent }]} />
            )}
          </TouchableOpacity>
        );
      });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Desktop Collapsible Sidebar */}
      {isDesktop && (
        <View
          style={[
            styles.sidebar,
            { backgroundColor: theme.surface, borderRightColor: theme.border },
            isCollapsed ? styles.sidebarCollapsed : styles.sidebarExpanded,
          ]}
        >
          {/* Brand */}
          <View style={[styles.sidebarBrand, { borderBottomColor: theme.border }]}>
            <View style={[styles.sidebarMonogram, { borderColor: theme.border }]}>
              <Text style={[styles.sidebarMonogramText, { color: theme.primary }]}>NP</Text>
            </View>
            {!isCollapsed && (
              <View style={styles.brandTextWrap}>
                <Text style={[styles.brandName, { color: theme.primary }]}>NP_BRANDING</Text>
                <Text style={[styles.brandTagline, { color: theme.accent }]}>
                  {user?.role?.toUpperCase() || 'LADIES FASHION'}
                </Text>
              </View>
            )}
          </View>

          {/* User Badge */}
          {!isCollapsed && user && (
            <View style={[styles.userBadgeCard, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <ShieldCheck color={theme.accent} size={14} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.userNameText, { color: theme.primary }]} numberOfLines={1}>
                  {user.name}
                </Text>
                <Text style={[styles.userRoleText, { color: theme.textSecondary }]}>
                  @{user.username} · {user.role.toUpperCase()}
                </Text>
              </View>
            </View>
          )}

          {/* Nav */}
          <ScrollView style={styles.navList} contentContainerStyle={styles.navListContent}>
            {!isCollapsed && allowedNavItems.some(i => i.section === 'OVERVIEW') && (
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                OVERVIEW
              </Text>
            )}
            {renderNavItems('OVERVIEW')}

            {!isCollapsed && allowedNavItems.some(i => i.section === 'MANAGEMENT') && (
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                MANAGEMENT
              </Text>
            )}
            {renderNavItems('MANAGEMENT')}

            {!isCollapsed && (
              <Text style={[styles.sectionLabel, { color: theme.textSecondary }]}>
                ACCOUNT
              </Text>
            )}
            {renderNavItems('ACCOUNT')}
          </ScrollView>

          {/* Collapse toggle */}
          <TouchableOpacity
            style={[styles.collapseBtn, { borderTopColor: theme.border }]}
            onPress={() => setIsCollapsed(!isCollapsed)}
          >
            {isCollapsed ? (
              <ChevronRight color={theme.textSecondary} size={18} strokeWidth={1.5} />
            ) : (
              <>
                <ChevronLeft color={theme.textSecondary} size={18} strokeWidth={1.5} />
                <Text style={[styles.collapseText, { color: theme.textSecondary }]}>
                  Collapse
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.mainContent}>
        {/* Top Header */}
        <View
          style={[
            styles.topHeader,
            { backgroundColor: theme.surface, borderBottomColor: theme.border },
          ]}
        >
          {/* Left: Page title */}
          <View style={styles.topHeaderLeft}>
            <Text style={[styles.pageLabel, { color: theme.accent }]}>NP_BRANDING</Text>
            <Text style={[styles.pageTitle, { color: theme.primary }]}>
              {title === 'Dashboard'
                ? 'OVERVIEW'
                : title === 'Scan Barcode / QR'
                ? 'SCAN'
                : title === 'Point of Sale (POS)'
                ? 'SELL'
                : title === 'Inventory Management'
                ? 'INVENTORY'
                : title === 'Sales History'
                ? 'HISTORY'
                : title === 'Cashier Management'
                ? 'CASHIERS'
                : title === 'Account & Settings'
                ? 'SETTINGS'
                : (title || activeRoute).toUpperCase()}
            </Text>
          </View>

          <View style={styles.topHeaderRight}>
            {/* DB Status */}
            <View
              style={[
                styles.dbBadge,
                {
                  backgroundColor:
                    dbStatus === 'connected'
                      ? theme.success + '18'
                      : theme.error + '18',
                  borderColor:
                    dbStatus === 'connected'
                      ? theme.success + '40'
                      : theme.error + '40',
                },
              ]}
            >
              <View
                style={[
                  styles.dbDot,
                  {
                    backgroundColor:
                      dbStatus === 'connected' ? theme.success : theme.error,
                  },
                ]}
              />
              <Text
                style={[
                  styles.dbText,
                  {
                    color:
                      dbStatus === 'connected' ? theme.success : theme.error,
                  },
                ]}
              >
                {dbStatus === 'connected' ? 'LIVE' : 'OFFLINE'}
              </Text>
            </View>

            {/* Dark Mode Toggle */}
            <TouchableOpacity
              style={[
                styles.iconBtn,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
              onPress={toggleDarkMode}
            >
              {isDarkMode ? (
                <Sun color={theme.accent} size={16} strokeWidth={1.5} />
              ) : (
                <Moon color={theme.textSecondary} size={16} strokeWidth={1.5} />
              )}
            </TouchableOpacity>

            {/* Logout Button */}
            <TouchableOpacity
              style={[
                styles.logoutBtn,
                { backgroundColor: theme.background, borderColor: theme.border },
              ]}
              onPress={handleLogout}
            >
              <LogOut color={theme.textSecondary} size={15} />
              <Text style={[styles.logoutText, { color: theme.textSecondary }]}>LOGOUT</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Page Body */}
        <View style={styles.contentBody}>{children}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh' as any,
    }),
  },
  sidebar: {
    height: '100%',
    borderRightWidth: 1,
    justifyContent: 'space-between',
  },
  sidebarExpanded: { width: 224 },
  sidebarCollapsed: { width: 64 },
  sidebarBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    height: 64,
    borderBottomWidth: 1,
    gap: spacing.m,
  },
  sidebarMonogram: {
    width: 34,
    height: 34,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sidebarMonogramText: {
    fontSize: 13,
    fontWeight: '300',
    letterSpacing: 3,
  },
  brandTextWrap: { flex: 1 },
  brandName: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  brandTagline: {
    fontSize: 8,
    fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginTop: 1,
  },
  userBadgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: spacing.s,
    padding: spacing.s + 2,
    borderWidth: 1,
    borderRadius: borderRadius.xs,
    gap: spacing.s,
  },
  userNameText: { fontSize: 11, fontWeight: '700' },
  userRoleText: { fontSize: 8, fontWeight: '600', letterSpacing: 1 },
  navList: { flex: 1 },
  navListContent: {
    paddingVertical: spacing.s,
    paddingHorizontal: spacing.s,
  },
  sectionLabel: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    paddingHorizontal: spacing.m - 4,
    marginTop: spacing.m,
    marginBottom: spacing.xs,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m - 4,
    paddingVertical: spacing.s + 2,
    borderRadius: borderRadius.s,
    marginBottom: 2,
    gap: spacing.m,
    position: 'relative',
    overflow: 'hidden',
  },
  navIconWrap: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  navLabel: {
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.3,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: borderRadius.round,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  activeBar: {
    position: 'absolute',
    left: 0,
    top: 8,
    bottom: 8,
    width: 2,
    borderRadius: 1,
  },
  collapseBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    height: 48,
    borderTopWidth: 1,
    gap: spacing.m,
  },
  collapseText: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  mainContent: { flex: 1 },
  topHeader: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.l,
    borderBottomWidth: 1,
  },
  topHeaderLeft: { gap: 1 },
  pageLabel: {
    fontSize: 8,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  topHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.m,
  },
  dbBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.round,
    gap: 6,
    borderWidth: 1,
  },
  dbDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dbText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  iconBtn: {
    width: 34,
    height: 34,
    borderRadius: borderRadius.s,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.m,
    height: 34,
    borderRadius: borderRadius.xs,
    borderWidth: 1,
    gap: 6,
  },
  logoutText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
  contentBody: { flex: 1 },
});
