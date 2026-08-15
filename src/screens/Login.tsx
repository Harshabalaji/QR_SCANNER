import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../store/useStore';
import { colors, darkColors, spacing, borderRadius } from '../theme/theme';

export default function Login() {
  const navigation = useNavigation<any>();
  const { isDarkMode, login } = useStore();

  const [role, setRole] = useState<'cashier' | 'manager'>('cashier');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleRoleChange = (newRole: 'cashier' | 'manager') => {
    setRole(newRole);
    setErrorMsg(null);
  };

  const handleLogin = async () => {
    setErrorMsg(null);
    const cleanUser = username.trim();
    const cleanPin = pin.trim();

    if (!cleanUser) {
      setErrorMsg('Invalid credentials.');
      return;
    }

    if (!cleanPin || cleanPin.length < 4) {
      setErrorMsg('Invalid credentials.');
      return;
    }

    setIsLoading(true);
    const res = await login(role, cleanPin, cleanUser);
    setIsLoading(false);

    if (res.success && res.user) {
      if (res.user.role === 'cashier') {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main', params: { screen: 'Sell' } }],
        });
      } else {
        navigation.reset({
          index: 0,
          routes: [{ name: 'Main', params: { screen: 'Dashboard' } }],
        });
      }
    } else {
      setErrorMsg('Invalid credentials.');
    }
  };

  const bg = isDarkMode ? '#0D0D0D' : '#FAF9F7';
  const fg = isDarkMode ? '#F5F0EB' : '#1A1A1A';
  const sub = isDarkMode ? '#9E9589' : '#8A8177';
  const brd = isDarkMode ? '#2D2D2D' : '#E8E2DA';
  const acc = '#C9A99A';

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: bg }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Thin top accent line */}
      <View style={[styles.topLine, { backgroundColor: acc }]} />

      <View style={styles.inner}>
        {/* Logo block */}
        <View style={styles.logoBlock}>
          <View style={[styles.monogram, { borderColor: fg }]}>
            <Text style={[styles.monogramText, { color: fg }]}>NP</Text>
          </View>
          <Text style={[styles.brandName, { color: fg }]}>NP_BRANDING</Text>
          <Text style={[styles.brandTagline, { color: sub }]}>
            LADIES FASHION · INVENTORY · QR
          </Text>
        </View>

        {/* Divider */}
        <View style={[styles.divider, { backgroundColor: brd }]} />

        {/* Heading */}
        <Text style={[styles.heading, { color: fg }]}>WELCOME BACK</Text>
        <Text style={[styles.subHeading, { color: sub }]}>
          Sign in to continue managing your collection
        </Text>

        {/* Role Selector */}
        <Text style={[styles.inputLabel, { color: sub, marginBottom: 6 }]}>CHOOSE ROLE</Text>
        <View style={[styles.roleRow, { borderColor: brd }]}>
          {(['cashier', 'manager'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[
                styles.roleBtn,
                role === r ? { backgroundColor: fg } : { backgroundColor: 'transparent' },
              ]}
              onPress={() => handleRoleChange(r)}
            >
              <Text
                style={[
                  styles.roleText,
                  {
                    color:
                      role === r
                        ? isDarkMode
                          ? '#0D0D0D'
                          : '#FFFFFF'
                        : sub,
                  },
                ]}
              >
                {r.toUpperCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Error Banner */}
        {errorMsg && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{errorMsg}</Text>
          </View>
        )}

        {/* Username Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: sub }]}>USERNAME</Text>
          <TextInput
            style={[styles.textInput, { color: fg, borderBottomColor: brd }]}
            placeholder="Enter your username"
            placeholderTextColor={brd}
            autoCapitalize="none"
            autoCorrect={false}
            value={username}
            onChangeText={(val) => {
              setUsername(val);
              setErrorMsg(null);
            }}
          />
        </View>

        {/* PIN Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: sub }]}>ACCESS PIN</Text>
          <TextInput
            style={[styles.pinInput, { color: fg, borderBottomColor: brd }]}
            placeholder="• • • •"
            placeholderTextColor={brd}
            secureTextEntry
            keyboardType="number-pad"
            value={pin}
            onChangeText={(val) => {
              setPin(val);
              setErrorMsg(null);
            }}
            maxLength={6}
            onSubmitEditing={handleLogin}
          />
        </View>

        {/* Sign In Button */}
        <TouchableOpacity
          style={[styles.loginBtn, { backgroundColor: fg }]}
          onPress={handleLogin}
          activeOpacity={0.85}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color={isDarkMode ? '#0D0D0D' : '#FFFFFF'} />
          ) : (
            <Text style={[styles.loginBtnText, { color: isDarkMode ? '#0D0D0D' : '#FFFFFF' }]}>
              SIGN IN AS {role.toUpperCase()}
            </Text>
          )}
        </TouchableOpacity>

        {/* Bottom note */}
        <Text style={[styles.note, { color: sub }]}>NP_BRANDING · Retail Intelligence</Text>
      </View>
    </KeyboardAvoidingView>
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
  topLine: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
  },
  inner: {
    flex: 1,
    paddingHorizontal: spacing.l,
    paddingTop: spacing.xl,
    paddingBottom: spacing.xl,
    justifyContent: 'center',
    maxWidth: 440,
    alignSelf: 'center',
    width: '100%',
    ...(Platform.OS === 'web' && {
      minHeight: '100vh' as any,
    }),
  },
  logoBlock: {
    alignItems: 'center',
    marginBottom: spacing.l,
  },
  monogram: {
    width: 52,
    height: 52,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.s,
  },
  monogramText: {
    fontSize: 18,
    fontWeight: '300',
    letterSpacing: 5,
  },
  brandName: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 6,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  brandTagline: {
    fontSize: 9,
    fontWeight: '600',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    width: '100%',
    marginBottom: spacing.l,
  },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  subHeading: {
    fontSize: 12,
    fontWeight: '400',
    letterSpacing: 0.2,
    marginBottom: spacing.l,
  },
  roleRow: {
    flexDirection: 'row',
    borderWidth: 1,
    borderRadius: borderRadius.s,
    overflow: 'hidden',
    marginBottom: spacing.m,
  },
  roleBtn: {
    flex: 1,
    paddingVertical: spacing.m,
    alignItems: 'center',
  },
  roleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  errorBox: {
    backgroundColor: '#FFEAE6',
    padding: spacing.m,
    borderRadius: borderRadius.xs,
    marginBottom: spacing.m,
    borderLeftWidth: 3,
    borderLeftColor: '#DC2626',
  },
  errorText: {
    fontSize: 12,
    color: '#DC2626',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  inputSection: {
    marginBottom: spacing.l,
  },
  inputLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2.5,
    textTransform: 'uppercase',
    marginBottom: spacing.xs,
  },
  textInput: {
    fontSize: 16,
    fontWeight: '500',
    borderBottomWidth: 1,
    paddingVertical: spacing.s,
    letterSpacing: 0.5,
  },
  pinInput: {
    fontSize: 24,
    fontWeight: '300',
    letterSpacing: 8,
    borderBottomWidth: 1,
    paddingVertical: spacing.s,
  },
  loginBtn: {
    paddingVertical: spacing.l,
    alignItems: 'center',
    borderRadius: borderRadius.xs,
    marginBottom: spacing.l,
  },
  loginBtnText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 4,
    textTransform: 'uppercase',
  },
  note: {
    fontSize: 10,
    letterSpacing: 1.5,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
