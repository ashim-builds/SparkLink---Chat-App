import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Platform,
  Image,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Conversation, UserStory } from "@/types";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "@/assets/styles/MessagesScreen.styles";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "react-native-gesture-handler";
import StoriesBar from "@/components/StoriesBar";
import StoryViewer from "@/components/StoryViewer";
import ConvoItem from "@/components/ConvoItem";
import { useSocket } from "@/context/SocketContext";
import { useSupabase } from "@/context/SupabaseContext";

export default function MessagesScreen() {
  const { conversations, fetchConversations, stories } = useSocket();
  const { unreadNotificationCount, messageRequests, acceptMessageRequest, declineMessageRequest } = useSupabase();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedStory, setSelectedStory] = useState<UserStory | null>(null);

  const router = useRouter();

  useEffect(() => {
    (async () => {
      setLoading(true);
      await fetchConversations();
      setLoading(false);
    })();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchConversations();
    setRefreshing(false);
  };

  const lowerSearch = search.toLowerCase();
  const filtered = search
    ? conversations.filter(
        (c) =>
          c.participant?.name.toLowerCase().includes(lowerSearch) ||
          c.participant?.handle.toLowerCase().includes(lowerSearch)
      )
    : conversations;

  const openConvo = (c: Conversation) => {
    router.push(`/chat/${c._id}`);
  };

  const handleAcceptRequest = async (requestId: string) => {
    const conversation = await acceptMessageRequest(requestId);
    if (conversation) {
      router.push(`/chat/${conversation.conversation_id}`);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.logoRow}>
          <Image
            source={require("../../assets/images/icon.png")}
            style={styles.logoImage}
          />
          <Text style={styles.appName}>SparkLink</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={() => router.push("/notifications")}
          >
            <Ionicons name="notifications-outline" size={22} color={Colors.onSurface} />
            {unreadNotificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadNotificationCount > 99 ? "99+" : unreadNotificationCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.outlineVariant} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search conversations..."
          placeholderTextColor={Colors.outlineVariant}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons
              name="close-circle"
              size={16}
              color={Colors.outlineVariant}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Stories */}
      <StoriesBar onviewStory={(us) => setSelectedStory(us)} />

      {selectedStory && (
        <StoryViewer
          userStory={selectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}

      {/* Message Requests */}
      {messageRequests.length > 0 && (
        <View style={styles.requestsSection}>
          <View style={styles.requestsHeader}>
            <Text style={styles.requestsTitle}>Message Requests</Text>
            <Text style={styles.requestsCount}>{messageRequests.length} new</Text>
          </View>
          <FlatList
            data={messageRequests}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.requestItem}>
                <Image
                  source={{ uri: item.sender?.avatar || "https://via.placeholder.com/48" }}
                  style={styles.requestAvatar}
                />
                <View style={styles.requestContent}>
                  <Text style={styles.requestName}>{item.sender?.name || "Unknown"}</Text>
                </View>
                <View style={styles.requestActions}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => handleAcceptRequest(item.id)}
                  >
                    <Text style={styles.acceptText}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.declineBtn}
                    onPress={() => declineMessageRequest(item.id)}
                  >
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Divider */}
      <View style={styles.divider} />

      {/* Conversation list */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c._id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors.primary}
            />
          }
          renderItem={({ item }) => (
            <ConvoItem
              convo={item}
              selected={false}
              onPress={() => openConvo(item)}
            />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons
                name="chatbox-outline"
                size={44}
                color={Colors.outlineVariant}
              />
              <Text style={styles.emptyTitle}>No conversations yet</Text>
              <Text style={styles.emptySubtitle}>
                Go to search to start chatting
              </Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}
