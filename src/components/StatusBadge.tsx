import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useStore } from '../store/useStore';
import { colors, darkColors, borderRadius } from '../theme/theme';

interface StatusBadgeProps {
  status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'SUCCESS' | 'WARNING' | 'ERROR' | 'INFO';
  label?: string;
  size?: 'small' | 'medium';
}

export default function StatusBadge({ status, label, size = 'medium' }: StatusBadgeProps) {
  const { isDarkMode } = useStore();
  const theme = isDarkMode ? darkColors : colors;

  // NP_BRANDING muted palette — no vivid green
  let bg   = theme.success + '18';
  let fg   = theme.success;
  let text = label || 'In Stock';

  if (status === 'LOW_STOCK' || status === 'WARNING') {
    bg   = theme.warning + '18';
    fg   = theme.warning;
    text = label || 'Low Stock';
  } else if (status === 'OUT_OF_STOCK' || status === 'ERROR') {
    bg   = theme.error + '18';
    fg   = theme.error;
    text = label || 'Out of Stock';
  } else if (status === 'INFO') {
    bg   = theme.info + '18';
    fg   = theme.info;
    text = label || 'Info';
  }

  const isSmall = size === 'small';

  return (
    <View
      style={[
        styles.badge,
        { backgroundColor: bg, borderColor: fg + '40' },
        isSmall && styles.badgeSmall,
      ]}
    >
      <View style={[styles.dot, { backgroundColor: fg }, isSmall && styles.dotSmall]} />
      <Text
        style={[
          styles.text,
          { color: fg },
          isSmall && styles.textSmall,
        ]}
      >
        {text.toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
    alignSelf: 'flex-start',
    gap: 5,
    borderWidth: 1,
  },
  badgeSmall: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    gap: 4,
  },
  dot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  dotSmall: {
    width: 4,
    height: 4,
    borderRadius: 2,
  },
  text: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  textSmall: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
});
