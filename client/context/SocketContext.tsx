import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io, Socket } from "socket.io-client";
import { Alert, Platform } from "react-native";
import { useRouter } from "expo-router";
import { useApp } from "./AppContext";
import { Conversation, Message, UserStory } from "@/types";
import { API_BASE_URL, WS_URL } from "@/constants/Config";

interface TypingState {
  [conversationId: string]: { [senderId: string]: boolean };
}

interface SocketContextType {
  socket: Socket | null;
  conversations: Conversation[];
  setConversations: React.Dispatch<React.SetStateAction<Conversation[]>>;
  typingState: TypingState;
  fetchConversations: () => Promise<void>;
  stories: UserStory[];
  fetchStories: () => Promise<void>;
  onlineUsers: Set<string>;
}

const SocketContext = createContext<SocketContextType | null>(null);

export function SocketProvider({ children }: { children: ReactNode }) {
  const { auth } = useApp();
  const router = useRouter();
  const socketRef = useRef<Socket | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [typingState, setTypingState] = useState<TypingState>({});
  const [stories, setStories] = useState<UserStory[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  const fetchConversations = useCallback(async () => {
    if (!auth.token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/messages/conversations`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json();
      if (data.success) setConversations(data.conversations);
    } catch (err) {
      console.warn("fetchConversations error:", err);
    }
  }, [auth.token]);

  const fetchStories = useCallback(async () => {
    if (!auth.token) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/stories`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      const data = await res.json();
      if (data.success) setStories(data.stories);
    } catch (err) {
      console.warn("fetchStories error:", err);
    }
  }, [auth.token]);

  // Connect socket when user is signed in
  useEffect(() => {
    if (!auth.user || !auth.token) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return;
    }

    const socket = io(WS_URL, {
      transports: ["websocket"],
      reconnection: true,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      socket.emit("register_user", auth.user!._id);
    });

    // Real-time incoming message → prepend to conversation
    socket.on("message", (newMsg: Message) => {
      setConversations((prev) =>
        prev.map((c) => {
          if (c._id === newMsg.conversationId) {
            return { ...c, lastMessage: newMsg, updatedAt: newMsg.createdAt };
          }
          return c;
        })
      );
    });

    // Conversation list refresh triggered by send
    socket.on("conversation_updated", (updated: Conversation) => {
      setConversations((prev) => {
        const exists = prev.find((c) => c._id === updated._id);
        if (exists) {
          return [
            updated,
            ...prev.filter((c) => c._id !== updated._id),
          ];
        }
        return [updated, ...prev];
      });
    });

    // Typing indicators
    socket.on(
      "typing",
      ({
        conversationId,
        senderId,
        isTyping,
      }: {
        conversationId: string;
        senderId: string;
        isTyping: boolean;
      }) => {
        setTypingState((prev) => ({
          ...prev,
          [conversationId]: {
            ...(prev[conversationId] || {}),
            [senderId]: isTyping,
          },
        }));
      }
    );

    // User online/offline status
    socket.on(
      "user_status_changed",
      ({
        userId,
        isOnline,
        lastSeen,
      }: {
        userId: string;
        isOnline: boolean;
        lastSeen: string;
      }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          if (isOnline) next.add(userId);
          else next.delete(userId);
          return next;
        });
        setConversations((prev) =>
          prev.map((c) => {
            if (c.participant?._id === userId) {
              return {
                ...c,
                participant: { ...c.participant, isOnline, lastSeen },
              };
            }
            return c;
          })
        );
      }
    );

    // Stories updated — refetch
    socket.on("stories_updated", () => {
      fetchStories();
    });

    // Listen for incoming calls
    socket.on(
      "incoming_call",
      (data: {
        to: string;
        from: string;
        fromName: string;
        fromAvatar?: string;
        callType: "audio" | "video";
        conversationId: string;
      }) => {
        const acceptCall = () => {
          router.push({
            pathname: "/call",
            params: {
              partnerId: data.from,
              partnerName: data.fromName,
              partnerAvatar: data.fromAvatar || "",
              conversationId: data.conversationId,
              callType: data.callType,
              isOutgoing: "false",
            },
          });
        };

        const declineCall = () => {
          socket.emit("call_end", { to: data.from, from: auth.user?._id });
        };

        if (Platform.OS === "web") {
          const accepted = window.confirm(
            `Incoming ${data.callType} call from ${data.fromName}. Accept?`
          );
          if (accepted) {
            acceptCall();
          } else {
            declineCall();
          }
        } else {
          Alert.alert(
            `Incoming ${data.callType === "video" ? "Video" : "Audio"} Call`,
            `${data.fromName} is calling you...`,
            [
              {
                text: "Decline",
                style: "cancel",
                onPress: declineCall,
              },
              {
                text: "Accept",
                onPress: acceptCall,
              },
            ],
            { cancelable: false }
          );
        }
      }
    );

    fetchConversations();
    fetchStories();

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.user?._id, auth.token, router]);

  const value = useMemo(
    () => ({
      socket: socketRef.current,
      conversations,
      setConversations,
      typingState,
      fetchConversations,
      stories,
      fetchStories,
      onlineUsers,
    }),
    [
      conversations,
      typingState,
      fetchConversations,
      stories,
      fetchStories,
      onlineUsers,
    ]
  );

  return (
    <SocketContext.Provider value={value}>{children}</SocketContext.Provider>
  );
}

export function useSocket() {
  const ctx = useContext(SocketContext);
  if (!ctx) throw new Error("useSocket must be used inside SocketProvider");
  return ctx;
}
