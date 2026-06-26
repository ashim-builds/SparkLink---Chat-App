import {
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  FlatList,
} from "react-native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "@/assets/styles/ChatScreen.styles";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { formatTime } from "@/utils/formatTime";
import Avatar from "@/components/Avatar";
import Bubble from "@/components/Bubble";
import { TextInput } from "react-native-gesture-handler";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { Message, User } from "@/types";
import { useApp } from "@/context/AppContext";
import { useSocket } from "@/context/SocketContext";
import { API_BASE_URL } from "@/constants/Config";
import { useAuth } from "@clerk/expo";

export default function ChatScreen() {
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { auth } = useApp();
  const { getToken } = useAuth();
  const { socket, typingState, setConversations } = useSocket();
  const [conversationExists, setConversationExists] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getAuthToken = async () => {
    const token = await getToken();

    if (!token) {
      router.replace("/(auth)");
      return null;
    }

    return token;
  };

  // Fetch messages and partner info
  const fetchMessages = useCallback(async () => {
    if (!conversationId) return;

    const token = await getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(
        `${API_BASE_URL}/api/messages/${conversationId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const data = await res.json();
      if (data.success) {
        setConversationExists(true);
        setMessages(data.messages);
      } else {
        setConversationExists(false);
        setMessages([]);
      }
      if (res.status === 404) {
        setConversationExists(false);
        setMessages([]);
        setLoading(false);
        return;
      }

      // Mark as read
      await fetch(`${API_BASE_URL}/api/messages/${conversationId}/read`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (err) {
      console.warn("fetchMessages error:", err);
    } finally {
      setLoading(false);
    }
  }, [auth.token, conversationId]);

  // Resolve partner from conversations
  useEffect(() => {
    if (!conversationId) return;
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        const data = await res.json();
        if (data.success) {
          const convo = data.conversations.find(
            (c: any) => c._id === conversationId,
          );
          if (convo?.participant) setPartner(convo.participant);
        }
      } catch (err) {
        console.warn("resolve partner error:", err);
      }
    })();
  }, [auth.token, conversationId]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  // Scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // Listen for real-time incoming messages
  useEffect(() => {
    if (!socket) return;
    const handleMessage = (newMsg: Message) => {
      if (newMsg.conversationId === conversationId) {
        setMessages((prev) => [...prev, newMsg]);
        // Mark as read immediately
        (async () => {
          const token = await getAuthToken();
          if (!token) return;

          await fetch(`${API_BASE_URL}/api/messages/${conversationId}/read`, {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        })();
      }
    };
    const handleRead = ({
      conversationId: cId,
    }: {
      conversationId: string;
      readerId: string;
    }) => {
      if (cId === conversationId) {
        setMessages((prev) => prev.map((m) => ({ ...m, read: true })));
      }
    };
    socket.on("message", handleMessage);
    socket.on("messages_read", handleRead);
    return () => {
      socket.off("message", handleMessage);
      socket.off("messages_read", handleRead);
    };
  }, [socket, conversationId, auth.token]);

  const handleTyping = (val: string) => {
    setText(val);
    if (!socket || !partner) return;
    socket.emit("typing", {
      conversationId,
      receiverId: partner._id,
      isTyping: true,
    });
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit("typing", {
        conversationId,
        receiverId: partner._id,
        isTyping: false,
      });
    }, 2000);
  };

  const pickMedia = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      if (Platform.OS === "web") {
        window.alert("Please allow photo library access.");
      } else {
        Alert.alert(
          "Permission Required",
          "Please allow photo library access.",
        );
      }
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setMediaUri(result.assets[0].uri);
    }
  };

  const send = async () => {
    if ((!text.trim() && !mediaUri) || !conversationId) return;

    const token = await getAuthToken();
    if (!token) return;
    setSending(true);
    try {
      const formData = new FormData();
      formData.append("conversationId", conversationId);
      if (text.trim()) formData.append("text", text.trim());

      if (mediaUri) {
        if (
          Platform.OS === "web" ||
          mediaUri.startsWith("data:") ||
          mediaUri.startsWith("blob:")
        ) {
          const blob = await (await fetch(mediaUri)).blob();
          formData.append("media", blob, "media.jpg");
        } else {
          const ext = mediaUri.split(".").pop()?.toLowerCase() || "jpg";
          const mime =
            ext === "mp4" || ext === "mov" ? "video/mp4" : "image/jpeg";
          formData.append("media", {
            uri: mediaUri,
            name: `media.${ext}`,
            type: mime,
          } as any);
        }
      }

      const res = await fetch(`${API_BASE_URL}/api/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) => [...prev, data.message]);
        setText("");
        setMediaUri(null);
        // Stop typing indicator
        if (socket && partner) {
          socket.emit("typing", {
            conversationId,
            receiverId: partner._id,
            isTyping: false,
          });
        }
      }
    } catch (err) {
      console.warn("send error:", err);
    } finally {
      setSending(false);
    }
  };

  const initiateCall = (type: "audio" | "video") => {
    if (!partner) return;
    router.push({
      pathname: "/call",
      params: {
        partnerId: partner._id,
        partnerName: partner.name,
        partnerAvatar: partner.avatar || "",
        conversationId,
        callType: type,
        isOutgoing: "true",
      },
    });
  };

  // Typing indicator from partner
  const partnerTyping =
    partner && typingState[conversationId]?.[partner._id] === true;

  if (!partner && !loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace("/(tabs)");
            }
          }}
        >
          <Ionicons name="chevron-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Ionicons
            name="chatbubbles-outline"
            size={52}
            color={Colors.outlineVariant}
          />
          <Text style={styles.emptyText}>Conversation not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const headerSub = partner?.isOnline
    ? "Online"
    : partner?.lastSeen
      ? `Last seen ${formatTime(partner.lastSeen)}`
      : "Offline";

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <Avatar
          name={partner?.name || ""}
          src={partner?.avatar}
          size={38}
          online={partner?.isOnline}
        />
        <View style={styles.headerInfo}>
          <Text style={styles.headerName} numberOfLines={1}>
            {partner?.name}
          </Text>
          <Text style={styles.headerHandle}>@{partner?.handle}</Text>
          <Text
            style={[
              styles.headerSub,
              partner?.isOnline && { color: Colors.online },
            ]}
          >
            {partnerTyping ? "typing..." : headerSub}
          </Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => initiateCall("audio")}
          >
            <Ionicons name="call-outline" size={24} color={Colors.onSurface} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => initiateCall("video")}
          >
            <Ionicons
              name="videocam-outline"
              size={24}
              color={Colors.onSurface}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main */}
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Messages */}
        {loading ? (
          <ActivityIndicator style={{ flex: 1 }} color={Colors.primary} />
        ) : (
          <FlatList
            data={messages}
            ref={flatListRef}
            keyExtractor={(m) => m._id}
            contentContainerStyle={styles.messageList}
            renderItem={({ item: msg, index }) => {
              const isMine = msg.sender === auth.user?._id;
              const prev = messages[index - 1];
              const showGap = !prev || prev.sender !== msg.sender;
              return (
                <View style={showGap && index > 0 ? { marginTop: 10 } : {}}>
                  <Bubble msg={msg} isMine={isMine} />
                </View>
              );
            }}
            onContentSizeChange={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
            ListEmptyComponent={
              <View style={{ flex: 1, alignItems: "center", paddingTop: 60 }}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={48}
                  color={Colors.outlineVariant}
                />
                <Text
                  style={{
                    color: Colors.outlineVariant,
                    marginTop: 12,
                    fontSize: 15,
                  }}
                >
                  Say hello to {partner?.name}!
                </Text>
              </View>
            }
          />
        )}

        {/* Input Bar */}
        <View style={styles.inputBar}>
          {mediaUri && (
            <View style={styles.mediaPreview}>
              <Image source={{ uri: mediaUri }} style={styles.mediaThumb} />
              <TouchableOpacity
                style={styles.mediaRemove}
                onPress={() => setMediaUri(null)}
              >
                <Ionicons name="close-circle" size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          )}
          <View style={styles.inputRow}>
            <TouchableOpacity style={styles.attachBtn} onPress={pickMedia}>
              <Ionicons
                name="image-outline"
                size={22}
                color={Colors.onSurfaceVariant}
              />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              value={text}
              onChangeText={handleTyping}
              placeholder="Message..."
              placeholderTextColor={Colors.outlineVariant}
              multiline
              maxLength={2000}
            />
            <TouchableOpacity
              disabled={(!text.trim() && !mediaUri) || sending}
              activeOpacity={0.85}
              onPress={send}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryContainer]}
                style={[
                  styles.sendBtn,
                  !text.trim() && !mediaUri && styles.sendBtnDisabled,
                ]}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
