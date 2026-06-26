import React, { useEffect, useState } from 'react';
import {
  View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/Colors';
import { useRouter } from 'expo-router';
import { useAuth } from '@clerk/expo';
import { supabase } from '@/lib/supabase';
import { formatTime } from '@/utils/formatTime';

interface Notification {
  id: string;
  type: string;
  title: string;
  body?: string;
  is_read: boolean;
  created_at: string;
  data: any;
}

const NOTIFICATION_ICONS: Record<string, { icon: string; color: string }> = {
  message: { icon: 'chatbubble', color: '#4fc3f7' },
  message_request: { icon: 'mail', color: '#ffb74d' },
  call: { icon: 'call', color: '#81c784' },
  story_view: { icon: 'eye', color: '#ba68c8' },
  story_like: { icon: 'heart', color: '#e57373' },
  reaction: { icon: 'happy', color: '#ff8a65' },
  mention: { icon: 'at', color: '#64b5f6' },
};

export default function NotificationsScreen() {
  const router = useRouter();
  const { userId } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (userId) fetchNotifications();
  }, [userId]);

  const fetchNotifications = async () => {
    if (!userId || !supabase) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) {
      setNotifications(data as Notification[]);
      setUnreadCount(data.filter(n => !n.is_read).length);
    }
    setLoading(false);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchNotifications();
    setRefreshing(false);
  };

  const markAsRead = async (notificationId: string) => {
    if (!supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    fetchNotifications();
  };

  const markAllAsRead = async () => {
    if (!userId || !supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId).eq('is_read', false);
    fetchNotifications();
  };

  const handlePress = async (notification: Notification) => {
    if (!notification.is_read) await markAsRead(notification.id);
    if (notification.data?.conversation_id) {
      router.push(`/chat/${notification.data.conversation_id}`);
    }
  };

  const renderNotification = ({ item }: { item: Notification }) => {
    const config = NOTIFICATION_ICONS[item.type] || NOTIFICATION_ICONS.message;
    return (
      <TouchableOpacity
        style={[styles.notificationItem, !item.is_read && styles.notificationUnread]}
        onPress={() => handlePress(item)}
      >
        <View style={[styles.iconContainer, { backgroundColor: `${config.color}20` }]}>
          <Ionicons name={config.icon as any} size={22} color={config.color} />
        </View>
        <View style={styles.content}>
          <Text style={[styles.title, !item.is_read && styles.titleUnread]}>{item.title}</Text>
          {item.body && <Text style={styles.body} numberOfLines={2}>{item.body}</Text>}
          <Text style={styles.time}>{formatTime(item.created_at)}</Text>
        </View>
        {!item.is_read && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={markAllAsRead}>
            <Text style={styles.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          renderItem={renderNotification}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="notifications-off-outline" size={56} color={Colors.outlineVariant} />
              <Text style={styles.emptyTitle}>No notifications</Text>
              <Text style={styles.emptySubtitle}>When you get notifications, they'll show up here</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: Colors.surfaceHigh },
  backButton: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '600', color: Colors.onSurface },
  markAllText: { fontSize: 14, fontWeight: '500', color: Colors.primary },
  listContent: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 20, flexGrow: 1 },
  notificationItem: { flexDirection: 'row', alignItems: 'flex-start', padding: 16, backgroundColor: Colors.surfaceLowest, borderRadius: 16, marginBottom: 12 },
  notificationUnread: { backgroundColor: `${Colors.primary}08`, borderLeftWidth: 3, borderLeftColor: Colors.primary },
  iconContainer: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  content: { flex: 1, marginRight: 8 },
  title: { fontSize: 15, color: Colors.onSurface, lineHeight: 20 },
  titleUnread: { fontWeight: '600' },
  body: { fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 4, lineHeight: 18 },
  time: { fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 8 },
  unreadDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: Colors.primary, marginTop: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingTop: 60, gap: 16, paddingHorizontal: 40 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: Colors.onSurface },
  emptySubtitle: { fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center' },
});
