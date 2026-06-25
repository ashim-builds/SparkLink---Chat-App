import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  Platform,
  Alert,
} from "react-native";
import React, { useEffect, useState, useCallback } from "react";
import type { User as IUser } from "../../types";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "@/assets/styles/SearchScreen.styles";
import { Colors } from "@/constants/Colors";
import { Ionicons } from "@expo/vector-icons";
import { TextInput } from "react-native-gesture-handler";
import Avatar from "@/components/Avatar";
import { useApp } from "@/context/AppContext";
import { useSocket } from "@/context/SocketContext";
import { API_BASE_URL } from "@/constants/Config";

export default function Search() {
  const [search, setSearch] = useState("");
  const [users, setUsers] = useState<IUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [startingChat, setStartingChat] = useState<string | null>(null);
  const router = useRouter();
  const { auth } = useApp();
  const { fetchConversations } = useSocket();

  const fetchUsers = useCallback(async (query: string) => {
    if (!auth.token) return;
    setLoading(true);
    try {
      const url = query.trim()
        ? `${API_BASE_URL}/api/users/search?query=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/api/users`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json();
      if (data.success) setUsers(data.users || []);
    } catch (err) {
      console.warn("fetchUsers error:", err);
    } finally {
      setLoading(false);
    }
  }, [auth.token]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(timer);
  }, [search, fetchUsers]);

  const startChat = async (user: IUser) => {
    if (!auth.token) return;
    setStartingChat(user._id);
    try {
      // Create/find conversation by sending empty message
      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${auth.token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ receiverId: user._id, text: "" }),
      });
      const data = await res.json();
      if (data.success && data.message?.conversationId) {
        await fetchConversations();
        router.push(`/chat/${data.message.conversationId}`);
      } else if (data.success && !data.message) {
        // conversationId was returned directly
        await fetchConversations();
      }
    } catch (err) {
      if (Platform.OS === "web") {
        window.alert("Could not start conversation. Please try again.");
      } else {
        Alert.alert("Error", "Could not start conversation. Please try again.");
      }
    } finally {
      setStartingChat(null);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Search</Text>
      </View>

      {/* Search */}
      <View style={styles.searchRow}>
        <Ionicons name="search" size={16} color={Colors.outlineVariant} />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search by name, email or handle ..."
          placeholderTextColor={Colors.outlineVariant}
          autoCapitalize="none"
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

      {/* Results */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 40 }} color={Colors.primary} />
      ) : (
        <FlatList
          data={users}
          keyExtractor={(u) => u._id}
          contentContainerStyle={styles.list}
          renderItem={({ item: u }) => (
            <TouchableOpacity
              style={styles.userRow}
              onPress={() => startChat(u)}
              disabled={startingChat === u._id}
              activeOpacity={0.7}
            >
              <Avatar
                name={u.name}
                src={u.avatar}
                size={44}
                online={u.isOnline}
              />
              <View style={styles.userInfo}>
                <View style={styles.nameRow} />
                <Text style={styles.userName}>{u.name}</Text>
                <Text style={styles.userHandle}>@{u.handle}</Text>
              </View>
              <Text style={styles.userEmail} numberOfLines={1}>
                {startingChat === u._id ? (
                  <ActivityIndicator size="small" color={Colors.primary} />
                ) : (
                  u.email
                )}
              </Text>
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={styles.empty}>
              {search ? "No users found" : "Search for people to chat with"}
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}
