import React, { useEffect } from 'react';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Home, ScanLine, ShoppingCart, List, History as HistoryIcon, CircleUser, Users as UsersIcon } from 'lucide-react-native';
import { Platform, useWindowDimensions } from 'react-native';

import { useStore } from '../store/useStore';
import { colors, darkColors } from '../theme/theme';
import MainLayout from '../components/MainLayout';

// Screen Imports
import Splash from '../screens/Splash';
import Login from '../screens/Login';
import Dashboard from '../screens/Dashboard';
import Scanner from '../screens/Scanner';
import Sell from '../screens/Sell';
import ProductDetail from '../screens/ProductDetail';
import Inventory from '../screens/Inventory';
import HistoryScreen from '../screens/History';
import SaleDetail from '../screens/SaleDetail';
import Profile from '../screens/Profile';
import Users from '../screens/Users';

export type RootStackParamList = {
  Splash: undefined;
  Auth: undefined;
  Main: undefined;
  ProductDetail: { barcode?: string; product?: any };
  SaleDetail: { saleId: string };
};

export type MainTabParamList = {
  Dashboard: undefined;
  Scanner: undefined;
  Sell: undefined;
  Inventory: undefined;
  HistoryTabs: undefined;
  Users: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<MainTabParamList>();

// HOC Wrapper for MainLayout
const withLayout = (
  Component: React.ComponentType<any>,
  routeName: 'Dashboard' | 'Scanner' | 'Sell' | 'Inventory' | 'HistoryTabs' | 'Users' | 'Profile',
  title: string
) => {
  return (props: any) => (
    <MainLayout
      activeRoute={routeName}
      onNavigate={(route) => props.navigation.navigate(route)}
      title={title}
    >
      <Component {...props} />
    </MainLayout>
  );
};

const WrappedDashboard = withLayout(Dashboard, 'Dashboard', 'Dashboard');
const WrappedScanner = withLayout(Scanner, 'Scanner', 'Scan Barcode / QR');
const WrappedSell = withLayout(Sell, 'Sell', 'Point of Sale (POS)');
const WrappedInventory = withLayout(Inventory, 'Inventory', 'Inventory Management');
const WrappedHistory = withLayout(HistoryScreen, 'HistoryTabs', 'Sales History');
const WrappedUsers = withLayout(Users, 'Users', 'Cashier Management');
const WrappedProfile = withLayout(Profile, 'Profile', 'Account & Settings');

const MainTabs = () => {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;
  const { isDarkMode, user } = useStore();
  const theme = isDarkMode ? darkColors : colors;
  const isManager = user?.role === 'manager';

  return (
    <Tab.Navigator
      initialRouteName={isManager ? 'Dashboard' : 'Sell'}
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          display: isDesktop ? 'none' : 'flex',
          backgroundColor: theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 24 : 10,
          paddingTop: 8,
          shadowColor: theme.primary,
          shadowOpacity: 0.04,
          shadowRadius: 8,
          elevation: 2,
        },
        tabBarIcon: ({ color }) => {
          const sz = 22;
          const sw = 1.5;
          if (route.name === 'Dashboard') return <Home color={color} size={sz} strokeWidth={sw} />;
          if (route.name === 'Scanner') return <ScanLine color={color} size={sz} strokeWidth={sw} />;
          if (route.name === 'Sell') return <ShoppingCart color={color} size={sz} strokeWidth={sw} />;
          if (route.name === 'Inventory') return <List color={color} size={sz} strokeWidth={sw} />;
          if (route.name === 'HistoryTabs') return <HistoryIcon color={color} size={sz} strokeWidth={sw} />;
          if (route.name === 'Users') return <UsersIcon color={color} size={sz} strokeWidth={sw} />;
          if (route.name === 'Profile') return <CircleUser color={color} size={sz} strokeWidth={sw} />;
        },
      })}
    >
      {isManager && <Tab.Screen name="Dashboard" component={WrappedDashboard} />}
      <Tab.Screen name="Scanner" component={WrappedScanner} options={{ title: 'Scan', tabBarLabel: 'SCAN' }} />
      <Tab.Screen name="Sell" component={WrappedSell} options={{ title: 'Sell', tabBarLabel: 'SELL' }} />
      {isManager && <Tab.Screen name="Inventory" component={WrappedInventory} />}
      <Tab.Screen name="HistoryTabs" component={WrappedHistory} options={{ title: 'History', tabBarLabel: 'HISTORY' }} />
      {isManager && <Tab.Screen name="Users" component={WrappedUsers} options={{ title: 'Cashiers', tabBarLabel: 'CASHIERS' }} />}
      <Tab.Screen name="Profile" component={WrappedProfile} />
    </Tab.Navigator>
  );
};

export default function AppNavigator() {
  const { isDarkMode, loadState } = useStore();
  const theme = isDarkMode ? darkColors : colors;
  const baseTheme = isDarkMode ? DarkTheme : DefaultTheme;

  useEffect(() => {
    loadState();
  }, []);

  const navTheme = {
    ...baseTheme,
    dark: isDarkMode,
    colors: {
      ...baseTheme.colors,
      primary: theme.primary,
      background: theme.background,
      card: theme.surface,
      text: theme.primary,
      border: theme.border,
      notification: theme.error,
    },
  };

  return (
    <NavigationContainer theme={navTheme as any}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Splash" component={Splash} />
        <Stack.Screen name="Auth" component={Login} />
        <Stack.Screen name="Main" component={MainTabs} />
        <Stack.Screen
          name="ProductDetail"
          component={ProductDetail}
          options={{
            headerShown: true,
            title: 'PRODUCT DETAILS',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.primary,
            headerTitleStyle: { fontSize: 13, fontWeight: '700' },
            presentation: 'modal',
          }}
        />
        <Stack.Screen
          name="SaleDetail"
          component={SaleDetail}
          options={{
            headerShown: true,
            title: 'INVOICE BREAKDOWN',
            headerStyle: { backgroundColor: theme.surface },
            headerTintColor: theme.primary,
            headerTitleStyle: { fontSize: 13, fontWeight: '700' },
            presentation: 'modal',
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
