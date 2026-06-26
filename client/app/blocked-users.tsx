import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useSupabase } from '@/context/SupabaseContext';
import Avatar from '@/components/Avatar';

interface BlockedUser {
  id: string;
  user_id: string;
  blocked_user_id: string;
  blocked_user?: {
    id: string;
    name: string;
    handle: string;
    avatar?: string;
  };
}

export default function BlockedUsersScreen() {
  const router = useRouter();
  const { blockedUsers, fetchBlockedUsers, unblockUser } = useSupabase();
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    (async () => {
      await fetchBlockedUsers();
      setLoading(false);
    })();
  }, []);

  const handleUnblock = (blockedUser: BlockedUser) => {
    const doUnblock = async () => {
      await unblockUser(blockedUser.blocked_user_id);
    };

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Unblock ${blockedUser.blocked_user?.name}?`);
      if (confirmed) doUnblock();
    } else {
      Alert.alert(
        'Unblock User',
        `Unblock ${blockedUser.blocked_user?.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Unblock', style: 'default', onPress: doUnblock },
        ]
      );
    }
  };

  const renderBlockedUser = ({ item }: { item: BlockedUser }) => (
    <View style={styles.userRow}>
      <Avatar
        name={item.blocked_user?.name || 'User'}
        src={item.blocked_user?.avatar}
        size={48}
      />
      <View style={styles.userInfo}>
        <Text style={styles.userName}>{item.blocked_user?.name}</Text>
        <Text style={styles.userHandle}>@{item.blocked_user?.handle}</Text>
      </View>
      <TouchableOpacity
        style={styles.unblockBtn}
        onPress={() => handleUnblock(item)}
      >
        <Text style={styles.unblockText}>Unblock</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Blocked Users</Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={blockedUsers}
          keyExtractor={(item) => item.id}
          renderItem={renderBlockedUser}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="shield-checkmark-outline" size={56} color={Colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No blocked users</Text>
              <Text style={styles.emptySubtitle}>
                When you block someone, they'll appear here
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.surfaceHigh,
  },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: Colors.onSurface },
  listContent: { paddingTop: 16, paddingBottom: 20 },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surfaceLowest,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 12,
  },
  userInfo: { flex: 1, marginLeft: 12 },
  userName: { fontSize: 16, fontWeight: '600', color: Colors.onSurface },
  userHandle: { fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 2 },
  unblockBtn: {
    backgroundColor: Colors.surfaceHigh,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  unblockText: { fontSize: 14, fontWeight: '600', color: Colors.primary },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.onSurface },
  emptySubtitle: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
