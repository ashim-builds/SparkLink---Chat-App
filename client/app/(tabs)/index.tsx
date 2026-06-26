import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Image,
  StatusBar,
} from "react-native";
import React, { useEffect, useState } from "react";
import { Conversation, UserStory } from "@/types";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "react-native-gesture-handler";
import { LinearGradient } from "expo-linear-gradient";
import StoriesBar from "@/components/StoriesBar";
import StoryViewer from "@/components/StoryViewer";
import ConvoItem from "@/components/ConvoItem";
import { useSocket } from "@/context/SocketContext";

// ─── Design tokens ────────────────────────────────────────────────────────────
const L = {
  bg: "#F4F6FB",
  surface: "#FFFFFF",
  surfaceHover: "#F0F3FA",
  border: "#E8EBF5",

  primary: "#4D7CFE",
  primaryLight: "#EEF2FF",
  accent: "#A78BFA",

  textPrimary: "#0F172A",
  textSecondary: "#64748B",
  textMuted: "#B0BAD0",

  storyUnseen: "#4D7CFE", // blue ring — not yet viewed
  storySeen: "#D1D5E8", // gray ring — already viewed
};

// ─── Story ring wrapper ───────────────────────────────────────────────────────
// Pass seen=true  → gray border, pushed to end of list by parent
// Pass seen=false → blue-violet gradient ring at the front
function StoryRing({
  initials,
  color,
  name,
  seen,
  isAdd,
}: {
  initials: string;
  color: string;
  name: string;
  seen?: boolean;
  isAdd?: boolean;
}) {
  return (
    <View style={storyStyles.wrap}>
      {isAdd ? (
        <View style={storyStyles.addRing}>
          <View
            style={[storyStyles.avatar, { backgroundColor: L.primaryLight }]}
          >
            <Ionicons name="add" size={22} color={L.primary} />
          </View>
        </View>
      ) : seen ? (
        <View style={storyStyles.seenRing}>
          <View style={[storyStyles.avatar, { backgroundColor: color }]}>
            <Text style={storyStyles.initials}>{initials}</Text>
          </View>
        </View>
      ) : (
        <LinearGradient
          colors={["#4D7CFE", "#A78BFA"]}
          start={{ x: 0, y: 1 }}
          end={{ x: 1, y: 0 }}
          style={storyStyles.unseenRing}
        >
          <View style={storyStyles.ringInner}>
            <View style={[storyStyles.avatar, { backgroundColor: color }]}>
              <Text style={storyStyles.initials}>{initials}</Text>
            </View>
          </View>
        </LinearGradient>
      )}
      <Text style={storyStyles.name} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

const storyStyles = StyleSheet.create({
  wrap: { alignItems: "center", gap: 5, width: 60 },
  unseenRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    padding: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  ringInner: {
    width: "100%",
    height: "100%",
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "#fff",
    overflow: "hidden",
  },
  seenRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2.5,
    borderColor: L.storySeen,
    overflow: "hidden",
  },
  addRing: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 2,
    borderColor: L.border,
    borderStyle: "dashed",
    overflow: "hidden",
  },
  avatar: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  initials: { fontSize: 16, fontWeight: "700", color: "#fff" },
  name: {
    fontSize: 10,
    fontWeight: "500",
    color: L.textSecondary,
    textAlign: "center",
    maxWidth: 56,
  },
});

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function MessagesScreen() {
  const { conversations, fetchConversations, stories } = useSocket();
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
          c.participant?.handle.toLowerCase().includes(lowerSearch),
      )
    : conversations;

  const openConvo = (c: Conversation) => router.push(`/chat/${c._id}`);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <StatusBar barStyle="dark-content" backgroundColor={L.surface} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {/* Logo image — no background, just the image with border-radius */}
          <Image
            source={require("../../assets/SparkLink.png")}
            style={styles.logoImage}
            resizeMode="contain"
          />
          <View>
            <Text style={styles.headerTitle}>Messages</Text>
            <Text style={styles.headerSub}>SparkLink</Text>
          </View>
        </View>
        {/* No edit button, no count badge — clean right side */}
      </View>

      {/* ── Search bar ── */}
      <View style={styles.searchWrap}>
        <View style={styles.searchBar}>
          <Ionicons name="search-outline" size={16} color={L.textMuted} />
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={setSearch}
            placeholder="Search conversations..."
            placeholderTextColor={L.textMuted}
            returnKeyType="search"
          />
          {search.length > 0 && (
            <TouchableOpacity
              onPress={() => setSearch("")}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="close-circle" size={16} color={L.textMuted} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Stories ── */}
      {/* 
        STORY ORDER RULE:
        - Unseen stories (seen=false) → front of list, blue-violet gradient ring
        - Seen stories  (seen=true)  → end of list, gray ring
        Sort your stories array before passing to StoriesBar, e.g.:
        [...stories].sort((a,b) => (a.seen === b.seen ? 0 : a.seen ? 1 : -1))
      */}
      <View style={styles.storiesSection}>
        <StoriesBar onviewStory={(us) => setSelectedStory(us)} />
      </View>

      {selectedStory && (
        <StoryViewer
          userStory={selectedStory}
          onClose={() => setSelectedStory(null)}
        />
      )}

      {/* ── Conversations ── */}
      <View style={styles.listHeader}>
        <Text style={styles.listHeaderText}>Recent</Text>
        {filtered.length > 0 && (
          <Text style={styles.listHeaderCount}>{filtered.length} chats</Text>
        )}
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator color={L.primary} size="large" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(c) => c._id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={L.primary}
              colors={[L.primary]}
            />
          }
          renderItem={({ item, index }) => (
            <View
              style={[
                styles.convoCard,
                index === 0 && styles.convoCardFirst,
                index === filtered.length - 1 && styles.convoCardLast,
              ]}
            >
              <ConvoItem
                convo={item}
                selected={false}
                onPress={() => openConvo(item)}
              />
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <View style={styles.emptyIconWrap}>
                <LinearGradient
                  colors={["#EEF2FF", "#E8E4FF"]}
                  style={styles.emptyIconBg}
                >
                  <Ionicons
                    name="chatbubbles-outline"
                    size={34}
                    color={L.primary}
                  />
                </LinearGradient>
              </View>
              <Text style={styles.emptyTitle}>
                {search ? "No results" : "No conversations yet"}
              </Text>
              <Text style={styles.emptySubtitle}>
                {search
                  ? `Nothing matched "${search}"`
                  : "Search for someone to start chatting"}
              </Text>
              {!search && (
                <TouchableOpacity
                  style={styles.emptyBtn}
                  activeOpacity={0.8}
                  onPress={() => router.push("/search")}
                >
                  <LinearGradient
                    colors={[L.primary, L.accent]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyBtnGrad}
                  >
                    <Ionicons name="search" size={14} color="#fff" />
                    <Text style={styles.emptyBtnText}>Find people</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: L.bg },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: L.surface,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: L.border,
  },
  headerLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  logoImage: {
    width: 40,
    height: 40,
    borderRadius: 12, // border-radius on the image itself, no background
  },
  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: L.textPrimary,
    letterSpacing: -0.5,
    lineHeight: 25,
  },
  headerSub: {
    fontSize: 11,
    fontWeight: "600",
    color: L.primary,
    letterSpacing: 0.4,
    marginTop: 1,
  },

  // Search
  searchWrap: {
    backgroundColor: L.bg,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: L.surfaceHover,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: L.border,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: L.textPrimary,
    paddingVertical: 0,
  },

  // Stories
  storiesSection: {
    backgroundColor: L.surface,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: L.border,
    marginTop: 8,
  },

  // List header
  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  listHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: L.textSecondary,
    letterSpacing: 0.3,
  },
  listHeaderCount: {
    fontSize: 12,
    fontWeight: "500",
    color: L.textMuted,
  },

  // Conversation cards — grouped, borderless inner rows
  listContent: { flexGrow: 1, paddingBottom: 32, paddingHorizontal: 14 },
  convoCard: {
    backgroundColor: L.surface,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderRightWidth: StyleSheet.hairlineWidth,
    borderColor: L.border,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  convoCardFirst: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  convoCardLast: {
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },

  // Loading
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: { fontSize: 13, color: L.textMuted, fontWeight: "500" },

  // Empty state
  empty: {
    flex: 1,
    alignItems: "center",
    paddingTop: 72,
    paddingHorizontal: 36,
    gap: 10,
  },
  emptyIconWrap: { marginBottom: 4 },
  emptyIconBg: {
    width: 76,
    height: 76,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: L.textPrimary,
    textAlign: "center",
    letterSpacing: -0.2,
  },
  emptySubtitle: {
    fontSize: 13,
    color: L.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
  emptyBtn: { marginTop: 10, borderRadius: 12, overflow: "hidden" },
  emptyBtnGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 22,
    paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: "700", color: "#fff" },
});
