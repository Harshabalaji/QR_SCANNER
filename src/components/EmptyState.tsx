import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { LucideIcon, PackageOpen } from 'lucide-react-native';
import { useStore } from '../store/useStore';
import { colors, darkColors, spacing, borderRadius } from '../theme/theme';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export default function EmptyState({
  icon: Icon = PackageOpen,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const { isDarkMode } = useStore();
  const theme = isDarkMode ? darkColors : colors;

  return (
    <View style={styles.container}>
      {/* Square icon box — editorial style */}
      <View style={[styles.iconBox, { borderColor: theme.border }]}>
        <Icon color={theme.textSecondary} size={30} strokeWidth={1.5} />
      </View>

      <Text style={[styles.title, { color: theme.primary }]}>{title}</Text>

      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{subtitle}</Text>
      ) : null}

      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.primary }]}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <Text style={[styles.buttonText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    marginVertical: spacing.l,
    gap: spacing.m,
  },
  iconBox: {
    width: 64,
    height: 64,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
    borderRadius: borderRadius.xs,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
  button: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.m,
    borderRadius: borderRadius.xs,
    marginTop: spacing.s,
  },
  buttonText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
});
