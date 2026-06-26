import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useApp } from '@/context/AppContext';
import { useAuth } from '@clerk/expo';

export default function SettingsScreen() {
  const router = useRouter();
  const { logout } = useApp();
  const { signOut } = useAuth();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [messagePreview, setMessagePreview] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [typingIndicators, setTypingIndicators] = useState(true);
  const [onlineStatus, setOnlineStatus] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [biometricLock, setBiometricLock] = useState(false);

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person-circle-outline',
          label: 'Edit Profile',
          onPress: () => router.push('/(tabs)/profile'),
          type: 'navigation' as const,
        },
        {
          icon: 'lock-closed-outline',
          label: 'Change Password',
          onPress: () => Alert.alert('Coming Soon', 'Password change will be available soon.'),
          type: 'navigation' as const,
        },
        {
          icon: 'shield-checkmark-outline',
          label: 'Two-Factor Authentication',
          onPress: () => Alert.alert('Coming Soon', '2FA will be available soon.'),
          type: 'navigation' as const,
        },
      ],
    },
    {
      title: 'Notifications',
      items: [
        {
          icon: 'notifications-outline',
          label: 'Push Notifications',
          value: notificationsEnabled,
          onValueChange: setNotificationsEnabled,
          type: 'toggle' as const,
        },
        {
          icon: 'eye-outline',
          label: 'Message Preview',
          value: messagePreview,
          onValueChange: setMessagePreview,
          type: 'toggle' as const,
        },
        {
          icon: 'volume-high-outline',
          label: 'Sound',
          value: soundEnabled,
          onValueChange: setSoundEnabled,
          type: 'toggle' as const,
        },
        {
          icon: 'phone-portrait-outline',
          label: 'Vibration',
          value: vibrationEnabled,
          onValueChange: setVibrationEnabled,
          type: 'toggle' as const,
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          icon: 'checkmark-done-outline',
          label: 'Read Receipts',
          value: readReceipts,
          onValueChange: setReadReceipts,
          type: 'toggle' as const,
          subtitle: 'Let others know when you\'ve read their messages',
        },
        {
          icon: 'create-outline',
          label: 'Typing Indicators',
          value: typingIndicators,
          onValueChange: setTypingIndicators,
          type: 'toggle' as const,
          subtitle: 'Show when you\'re typing',
        },
        {
          icon: 'radio-button-on-outline',
          label: 'Online Status',
          value: onlineStatus,
          onValueChange: setOnlineStatus,
          type: 'toggle' as const,
          subtitle: 'Show when you\'re online',
        },
        {
          icon: 'finger-print-outline',
          label: 'Biometric Lock',
          value: biometricLock,
          onValueChange: setBiometricLock,
          type: 'toggle' as const,
          subtitle: 'Require fingerprint or face to open app',
        },
        {
          icon: 'ban-outline',
          label: 'Blocked Users',
          onPress: () => router.push('/blocked-users'),
          type: 'navigation' as const,
        },
      ],
    },
    {
      title: 'Appearance',
      items: [
        {
          icon: 'moon-outline',
          label: 'Dark Mode',
          value: darkMode,
          onValueChange: setDarkMode,
          type: 'toggle' as const,
        },
        {
          icon: 'color-palette-outline',
          label: 'Chat Theme',
          onPress: () => Alert.alert('Chat Themes', 'Long press on a chat to customize its theme.'),
          type: 'navigation' as const,
        },
      ],
    },
    {
      title: 'Support',
      items: [
        {
          icon: 'help-circle-outline',
          label: 'Help Center',
          onPress: () => Alert.alert('Help Center', 'Visit our help center at support.sparklink.app'),
          type: 'navigation' as const,
        },
        {
          icon: 'document-text-outline',
          label: 'Terms of Service',
          onPress: () => Alert.alert('Terms', 'View terms at sparklink.app/terms'),
          type: 'navigation' as const,
        },
        {
          icon: 'shield-outline',
          label: 'Privacy Policy',
          onPress: () => Alert.alert('Privacy', 'View privacy policy at sparklink.app/privacy'),
          type: 'navigation' as const,
        },
      ],
    },
  ];

  const handleSignOut = async () => {
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out?');
      if (confirmed) {
        await signOut();
        router.replace('/(auth)');
      }
    } else {
      Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            router.replace('/(auth)');
          },
        },
      ]);
    }
  };

  const renderSettingItem = (item: any, index: number, sectionIndex: number) => {
    const isLast = index === settingsSections[sectionIndex].items.length - 1;

    return (
      <View key={index}>
        <TouchableOpacity
          style={[styles.settingItem, isLast && styles.settingItemLast]}
          onPress={item.type === 'navigation' ? item.onPress : undefined}
          disabled={item.type === 'toggle'}
        >
          <View style={styles.settingIcon}>
            <Ionicons name={item.icon as any} size={22} color={Colors.primary} />
          </View>
          <View style={styles.settingContent}>
            <Text style={styles.settingLabel}>{item.label}</Text>
            {item.subtitle && (
              <Text style={styles.settingSubtitle}>{item.subtitle}</Text>
            )}
          </View>
          {item.type === 'toggle' ? (
            <Switch
              value={item.value}
              onValueChange={item.onValueChange}
              trackColor={{ false: Colors.surfaceHigh, true: `${Colors.primary}50` }}
              thumbColor={item.value ? Colors.primary : Colors.outline}
            />
          ) : (
            <Ionicons name="chevron-forward" size={20} color={Colors.outlineVariant} />
          )}
        </TouchableOpacity>
        {!isLast && <View style={styles.settingDivider} />}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={section.title} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.sectionContent}>
              {section.items.map((item, index) => renderSettingItem(item, index, sectionIndex))}
            </View>
          </View>
        ))}

        <View style={styles.signOutSection}>
          <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={22} color={Colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.version}>SparkLink v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: Colors.surfaceHigh,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: Colors.onSurface },
  scrollContent: { paddingBottom: 40 },
  section: { marginTop: 24, paddingHorizontal: 16 },
  sectionTitle: {
    fontSize: 13, fontWeight: '600', color: Colors.onSurfaceVariant,
    textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4,
  },
  sectionContent: { backgroundColor: Colors.surfaceLowest, borderRadius: 12, overflow: 'hidden' },
  settingItem: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    backgroundColor: Colors.surfaceLowest,
  },
  settingItemLast: { borderBottomWidth: 0 },
  settingIcon: {
    width: 32, height: 32, borderRadius: 8,
    backgroundColor: `${Colors.primary}10`, alignItems: 'center', justifyContent: 'center', marginRight: 12,
  },
  settingContent: { flex: 1 },
  settingLabel: { fontSize: 16, color: Colors.onSurface, fontWeight: '400' },
  settingSubtitle: { fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 2 },
  settingDivider: { height: 1, backgroundColor: Colors.surfaceHigh, marginLeft: 58 },
  signOutSection: { marginTop: 32, paddingHorizontal: 16 },
  signOutButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: `${Colors.error}10`, padding: 16, borderRadius: 12, gap: 10,
  },
  signOutText: { fontSize: 16, fontWeight: '600', color: Colors.error },
  version: { textAlign: 'center', marginTop: 24, fontSize: 13, color: Colors.onSurfaceVariant },
});
