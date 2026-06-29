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
  Modal,
  Pressable,
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
import { encryptMessage } from "@/utils/encryption";

export default function ChatScreen() {
  const router = useRouter();
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const { auth } = useApp();
  const { getToken } = useAuth();
  const { socket, typingState, setConversations, fetchConversations } = useSocket();
  const [conversationExists, setConversationExists] = useState(true);

  const [messages, setMessages] = useState<Message[]>([]);
  const [partner, setPartner] = useState<User | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [mediaUri, setMediaUri] = useState<string | null>(null);
  const flatListRef = useRef<FlatList>(null);
  const typingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [convoStatus, setConvoStatus] = useState<"pending" | "accepted" | "declined" | null>(null);
  const [requestSender, setRequestSender] = useState<string | null>(null);
  const [theme, setTheme] = useState<"default" | "love" | "friendly" | "fifa">("default");
  const [themeModalVisible, setThemeModalVisible] = useState(false);

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

  // Resolve partner and request metadata from conversations
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
          if (convo) {
            if (convo.participant) setPartner(convo.participant);
            setConvoStatus(convo.status || "pending");
            setRequestSender(convo.requestSender);
            if (convo.theme) setTheme(convo.theme);
          }
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

  // Listen for real-time incoming messages and conversation state events
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
    const handleAccepted = (data: { conversationId: string; status: string }) => {
      if (data.conversationId === conversationId) {
        setConvoStatus(data.status as any);
      }
    };
    const handleDeleted = (data: { conversationId: string }) => {
      if (data.conversationId === conversationId) {
        Alert.alert("Chat Deleted", "This conversation has been deleted.", [
          { text: "OK", onPress: () => router.replace("/(tabs)") }
        ]);
      }
    };
    const handleThemeUpdated = (data: { conversationId: string; theme: any }) => {
      if (data.conversationId === conversationId) {
        setTheme(data.theme);
      }
    };
    socket.on("message", handleMessage);
    socket.on("messages_read", handleRead);
    socket.on("conversation_accepted", handleAccepted);
    socket.on("conversation_deleted", handleDeleted);
    socket.on("conversation_theme_updated", handleThemeUpdated);
    return () => {
      socket.off("message", handleMessage);
      socket.off("messages_read", handleRead);
      socket.off("conversation_accepted", handleAccepted);
      socket.off("conversation_deleted", handleDeleted);
      socket.off("conversation_theme_updated", handleThemeUpdated);
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
      if (text.trim()) {
        const encrypted = encryptMessage(text.trim(), conversationId);
        formData.append("text", encrypted);
      }

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

  const handleAcceptRequest = async () => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/conversations/${conversationId}/accept`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setConvoStatus("accepted");
        await fetchConversations();
      }
    } catch (err) {
      console.warn("accept error:", err);
    }
  };

  const handleDeclineRequest = async () => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/conversations/${conversationId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        await fetchConversations();
        router.replace("/(tabs)");
      }
    } catch (err) {
      console.warn("decline error:", err);
    }
  };

  const handleSelectTheme = async (selectedTheme: "default" | "love" | "friendly" | "fifa") => {
    const token = await getAuthToken();
    if (!token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/conversations/${conversationId}/theme`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ theme: selectedTheme }),
      });
      const data = await res.json();
      if (data.success) {
        setTheme(selectedTheme);
        setThemeModalVisible(false);
        await fetchConversations();
      }
    } catch (err) {
      console.warn("Error changing theme:", err);
    }
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

  const isRequestSender = auth.user && requestSender && auth.user._id === requestSender;

  let chatBgStyle = { backgroundColor: Colors.surfaceLowest };
  if (theme === "love") {
    chatBgStyle = { backgroundColor: "#ffe5ec" };
  } else if (theme === "friendly") {
    chatBgStyle = { backgroundColor: "#fffdf0" };
  } else if (theme === "fifa") {
    chatBgStyle = { backgroundColor: "#0b2011" };
  }

  return (
    <SafeAreaView style={[styles.safe, chatBgStyle]} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={Colors.onSurface} />
        </TouchableOpacity>
        <TouchableOpacity
          style={{ flexDirection: "row", alignItems: "center", flex: 1, gap: 10, minWidth: 0 }}
          onPress={() => setThemeModalVisible(true)}
          activeOpacity={0.7}
        >
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
        </TouchableOpacity>
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
                  <Bubble msg={msg} isMine={isMine} theme={theme} />
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

        {/* Conditional Footer (Input Bar or Request Banners) */}
        {convoStatus === "pending" ? (
          isRequestSender ? (
            <View style={styles.waitingBanner}>
              <Text style={styles.waitingText}>
                Waiting for {partner?.name || "recipient"} to accept your message request. You will be able to send more messages once they accept.
              </Text>
            </View>
          ) : (
            <View style={styles.requestBanner}>
              <Text style={styles.requestText}>
                {partner?.name || "Someone"} wants to send you a message. Accept to start chatting.
              </Text>
              <View style={styles.requestActions}>
                <TouchableOpacity style={styles.declineButton} onPress={handleDeclineRequest}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.acceptButton} onPress={handleAcceptRequest}>
                  <Text style={styles.acceptText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          )
        ) : (
          /* Input Bar */
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
        )}
      </KeyboardAvoidingView>

      {/* Theme Selection Modal */}
      <Modal
        visible={themeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setThemeModalVisible(false)}
      >
        <Pressable
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
          onPress={() => setThemeModalVisible(false)}
        >
          <Pressable
            style={{
              backgroundColor: Colors.surfaceLowest,
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              padding: 24,
              gap: 20,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
              <Text style={{ fontSize: 18, fontWeight: "700", color: Colors.onSurface }}>
                Choose Chat Theme
              </Text>
              <TouchableOpacity onPress={() => setThemeModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color={Colors.outline} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 13, color: Colors.outline, marginTop: -8 }}>
              Change the theme for this chat. Both participants will see the changes.
            </Text>

            <View style={{ gap: 14 }}>
              {[
                { id: "default", name: "Default (Blue/Purple)", preview: [Colors.primary, "#f0f0f0"] },
                { id: "love", name: "Love (Pink/Rose)", preview: ["#ff4b72", "#fff0f2"] },
                { id: "friendly", name: "Friendly (Orange/Green)", preview: ["#ff9f1c", "#f4f9f4"] },
                { id: "fifa", name: "FIFA (Pitch Green/Gold)", preview: ["#1b4332", "#081c15"] },
              ].map((item) => {
                const isSelected = theme === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => handleSelectTheme(item.id as any)}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: 14,
                      borderRadius: 16,
                      backgroundColor: isSelected ? Colors.surfaceLow : Colors.surfaceLowest,
                      borderWidth: 1,
                      borderColor: isSelected ? Colors.primary : Colors.surfaceHigh,
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                      <View style={{ flexDirection: "row", gap: 4 }}>
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: item.preview[0], borderWidth: 1, borderColor: "#ccc" }} />
                        <View style={{ width: 20, height: 20, borderRadius: 10, backgroundColor: item.preview[1], borderWidth: 1, borderColor: "#ccc" }} />
                      </View>
                      <Text style={{ fontSize: 15, fontWeight: isSelected ? "700" : "500", color: Colors.onSurface }}>
                        {item.name}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark-circle" size={22} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}
