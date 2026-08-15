import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AppNavigator from './src/navigation/AppNavigator';
import ErrorBoundary from './src/components/ErrorBoundary';
import { useStore } from './src/store/useStore';
import { StyleSheet, Platform } from 'react-native';

export default function App() {
  const { loadState, isDarkMode } = useStore();

  useEffect(() => {
    loadState();
  }, []);

  return (
    <ErrorBoundary>
      <SafeAreaProvider style={styles.container}>
        <StatusBar style={isDarkMode ? 'light' : 'dark'} />
        <AppNavigator />
      </SafeAreaProvider>
    </ErrorBoundary>
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
});

