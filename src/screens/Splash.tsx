import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, Platform } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { colors, darkColors } from '../theme/theme';

const { width } = Dimensions.get('window');

export default function Splash() {
  const navigation = useNavigation<any>();
  const { isDarkMode, user } = useStore();
  const theme = isDarkMode ? darkColors : colors;

  // Animation values
  const logoOpacity   = useRef(new Animated.Value(0)).current;
  const brandOpacity  = useRef(new Animated.Value(0)).current;
  const brandSlide    = useRef(new Animated.Value(16)).current;
  const subOpacity    = useRef(new Animated.Value(0)).current;
  const subSlide      = useRef(new Animated.Value(12)).current;
  const lineWidth     = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const isWeb = Platform.OS === 'web';
    const useNativeDriver = !isWeb;
    let navigated = false;

    const navigateNext = () => {
      if (navigated) return;
      navigated = true;
      // Always require manual login on app startup & refresh
      useStore.getState().logout();
      navigation.replace('Auth');
    };

    // Safety fallback timer to guarantee transition to Auth/Main screen
    const safetyTimer = setTimeout(navigateNext, 1800);

    Animated.sequence([
      // 1. NP monogram fades in
      Animated.timing(logoOpacity, {
        toValue: 1,
        duration: 500,
        useNativeDriver,
      }),
      // 2. Brand name slides up + fades in
      Animated.parallel([
        Animated.timing(brandOpacity, {
          toValue: 1,
          duration: 400,
          useNativeDriver,
        }),
        Animated.timing(brandSlide, {
          toValue: 0,
          duration: 400,
          useNativeDriver,
        }),
      ]),
      // 3. Subtitle slides up + fades in
      Animated.parallel([
        Animated.timing(subOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver,
        }),
        Animated.timing(subSlide, {
          toValue: 0,
          duration: 300,
          useNativeDriver,
        }),
      ]),
      // 4. Loading line sweeps across
      Animated.timing(lineWidth, {
        toValue: width * 0.36,
        duration: 400,
        useNativeDriver: false,
      }),
    ]).start(() => {
      clearTimeout(safetyTimer);
      navigateNext();
    });

    return () => clearTimeout(safetyTimer);
  }, []);

  const bg  = isDarkMode ? '#0D0D0D' : '#FAF9F7';
  const fg  = isDarkMode ? '#F5F0EB' : '#1A1A1A';
  const sub = isDarkMode ? '#9E9589' : '#8A8177';
  const acc = '#C9A99A';

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Thin top decorative line */}
      <View style={[styles.topLine, { backgroundColor: acc }]} />

      <View style={styles.centerContent}>
        {/* NP Monogram mark */}
        <Animated.View style={[styles.monogram, { borderColor: fg, opacity: logoOpacity }]}>
          <Text style={[styles.monogramText, { color: fg }]}>NP</Text>
        </Animated.View>

        {/* Brand name */}
        <Animated.Text
          style={[
            styles.brandName,
            { color: fg, opacity: brandOpacity, transform: [{ translateY: brandSlide }] },
          ]}
        >
          NP_BRANDING
        </Animated.Text>

        {/* Subtitle */}
        <Animated.Text
          style={[
            styles.subtitle,
            { color: sub, opacity: subOpacity, transform: [{ translateY: subSlide }] },
          ]}
        >
          LADIES FASHION  ·  INVENTORY  ·  QR
        </Animated.Text>

        {/* Animated loading line */}
        <View style={[styles.lineTrack, { backgroundColor: isDarkMode ? '#2D2D2D' : '#E8E2DA' }]}>
          <Animated.View style={[styles.lineFill, { backgroundColor: acc, width: lineWidth }]} />
        </View>
      </View>

      {/* Bottom thin line */}
      <View style={[styles.bottomLine, { backgroundColor: acc }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
    height: '100%',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh' as any,
    }),
  },
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  bottomLine: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 2,
    opacity: 0.5,
  },
  centerContent: {
    alignItems: 'center',
    gap: 16,
  },
  monogram: {
    width: 72,
    height: 72,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  monogramText: {
    fontSize: 26,
    fontWeight: '300',
    letterSpacing: 6,
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 8,
    textTransform: 'uppercase',
  },
  subtitle: {
    fontSize: 10,
    fontWeight: '600',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  lineTrack: {
    marginTop: 32,
    width: width * 0.36,
    height: 1,
    overflow: 'hidden',
  },
  lineFill: {
    height: 1,
  },
});
