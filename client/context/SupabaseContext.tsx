import { createContext, ReactNode, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@clerk/expo';

interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, any>;
  is_read: boolean;
  created_at: string;
}

interface MessageRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: string;
  created_at: string;
  sender?: any;
}

interface ChatTheme {
  id: string;
  name: string;
  background_color: string;
  bubble_sent_color: string;
  bubble_sent_text_color: string;
  bubble_received_color: string;
  bubble_received_text_color: string;
}

interface BlockedUser {
  id: string;
  user_id: string;
  blocked_user_id: string;
  blocked_user?: any;
}

interface SupabaseContextType {
  user: any | null;
  notifications: Notification[];
  messageRequests: MessageRequest[];
  chatThemes: ChatTheme[];
  blockedUsers: BlockedUser[];
  unreadNotificationCount: number;
  loading: boolean;
  syncUser: () => Promise<any | null>;
  fetchNotifications: () => Promise<void>;
  fetchMessageRequests: () => Promise<void>;
  acceptMessageRequest: (requestId: string) => Promise<any | null>;
  declineMessageRequest: (requestId: string) => Promise<void>;
  markNotificationRead: (notificationId: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  fetchBlockedUsers: () => Promise<void>;
  blockUser: (userId: string) => Promise<void>;
  unblockUser: (blockedUserId: string) => Promise<void>;
  fetchChatThemes: () => Promise<void>;
  updateConversationTheme: (conversationId: string, themeId: string, bubbleStyle?: string) => Promise<void>;
  getConversationMessages: (conversationId: string) => Promise<any[]>;
  sendMessage: (conversationId: string, content: string, mediaUrl?: string, replyToId?: string) => Promise<any | null>;
  addReaction: (messageId: string, emoji: string) => Promise<void>;
  removeReaction: (messageId: string, emoji: string) => Promise<void>;
  deleteMessage: (messageId: string) => Promise<void>;
  fetchStories: () => Promise<void>;
  stories: any[];
  markStoryViewed: (storyId: string) => Promise<void>;
  likeStory: (storyId: string) => Promise<void>;
  unlikeStory: (storyId: string) => Promise<void>;
}

const SupabaseContext = createContext<SupabaseContextType | null>(null);

export function SupabaseProvider({ children }: { children: ReactNode }) {
  const { userId: clerkId, isSignedIn } = useAuth();
  const [user, setUser] = useState<any | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [messageRequests, setMessageRequests] = useState<MessageRequest[]>([]);
  const [chatThemes, setChatThemes] = useState<ChatTheme[]>([]);
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [stories, setStories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const unreadNotificationCount = useMemo(
    () => notifications.filter(n => !n.is_read).length,
    [notifications]
  );

  const syncUser = useCallback(async (): Promise<any | null> => {
    if (!clerkId || !supabase) return null;
    const { data, error } = await supabase.from('users').select('*').eq('clerk_id', clerkId).single();
    if (error) return null;
    setUser(data);
    return data;
  }, [clerkId]);

  const fetchNotifications = useCallback(async () => {
    if (!user || !supabase) return;
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50);
    if (!error && data) setNotifications(data as Notification[]);
  }, [user]);

  const fetchMessageRequests = useCallback(async () => {
    if (!user || !supabase) return;
    const { data } = await supabase
      .from('message_requests')
      .select('*, sender:users!message_requests_sender_id_fkey(*)')
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
    if (data) setMessageRequests(data as MessageRequest[]);
  }, [user]);

  const acceptMessageRequest = useCallback(async (requestId: string): Promise<any | null> => {
    if (!user || !supabase) return null;
    const { data, error } = await supabase.rpc('accept_message_request', { p_request_id: requestId });
    if (error) return null;
    await fetchMessageRequests();
    return data;
  }, [user, fetchMessageRequests]);

  const declineMessageRequest = useCallback(async (requestId: string) => {
    if (!supabase) return;
    await supabase.from('message_requests').update({ status: 'declined' }).eq('id', requestId);
    await fetchMessageRequests();
  }, [fetchMessageRequests]);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    if (!supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
    setNotifications(prev => prev.map(n => n.id === notificationId ? { ...n, is_read: true } : n));
  }, []);

  const markAllNotificationsRead = useCallback(async () => {
    if (!user || !supabase) return;
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id).eq('is_read', false);
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  }, [user]);

  const fetchBlockedUsers = useCallback(async () => {
    if (!user || !supabase) return;
    const { data } = await supabase
      .from('blocked_users')
      .select('*, blocked_user:users!blocked_users_blocked_user_id_fkey(*)')
      .eq('user_id', user.id);
    if (data) setBlockedUsers(data as BlockedUser[]);
  }, [user]);

  const blockUser = useCallback(async (userId: string) => {
    if (!user || !supabase) return;
    await supabase.from('blocked_users').insert({ user_id: user.id, blocked_user_id: userId });
    await fetchBlockedUsers();
  }, [user, fetchBlockedUsers]);

  const unblockUser = useCallback(async (blockedUserId: string) => {
    if (!user || !supabase) return;
    await supabase.from('blocked_users').delete().eq('user_id', user.id).eq('blocked_user_id', blockedUserId);
    await fetchBlockedUsers();
  }, [user, fetchBlockedUsers]);

  const fetchChatThemes = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.from('chat_themes').select('*');
    if (data) setChatThemes(data as ChatTheme[]);
  }, []);

  const updateConversationTheme = useCallback(async (conversationId: string, themeId: string, bubbleStyle?: string) => {
    if (!user || !supabase) return;
    const updateData: any = { theme_id: themeId };
    if (bubbleStyle) updateData.bubble_style = bubbleStyle;
    await supabase.from('conversation_participants').update(updateData).eq('conversation_id', conversationId).eq('user_id', user.id);
  }, [user]);

  const getConversationMessages = useCallback(async (conversationId: string) => {
    if (!supabase) return [];
    const { data } = await supabase
      .from('messages')
      .select(`*, reactions:message_reactions(*)`)
      .eq('conversation_id', conversationId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });
    return data || [];
  }, []);

  const sendMessage = useCallback(async (conversationId: string, content: string, mediaUrl?: string, replyToId?: string) => {
    if (!user || !supabase) return null;
    const messageData: any = {
      conversation_id: conversationId,
      sender_id: user.id,
      status: 'sent',
    };
    if (content) messageData.content = content;
    if (mediaUrl) messageData.media_url = mediaUrl;
    if (replyToId) messageData.reply_to_id = replyToId;
    const { data, error } = await supabase.from('messages').insert(messageData).select().single();
    if (error) return null;
    return data;
  }, [user]);

  const addReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user || !supabase) return;
    await supabase.from('message_reactions').insert({ message_id: messageId, user_id: user.id, emoji });
  }, [user]);

  const removeReaction = useCallback(async (messageId: string, emoji: string) => {
    if (!user || !supabase) return;
    await supabase.from('message_reactions').delete().eq('message_id', messageId).eq('user_id', user.id).eq('emoji', emoji);
  }, [user]);

  const deleteMessage = useCallback(async (messageId: string) => {
    if (!supabase) return;
    await supabase.from('messages').update({ is_deleted: true }).eq('id', messageId);
  }, []);

  const fetchStories = useCallback(async () => {
    if (!user || !supabase) return;
    const now = new Date().toISOString();
    const { data } = await supabase
      .from('stories')
      .select('*, users(*)')
      .gte('expires_at', now)
      .order('created_at', { ascending: false });
    if (!data) return;
    const storyMap = new Map();
    for (const story of data) {
      const storyUser = story.users;
      const storyData = { ...story, has_viewed: false, has_liked: false };
      if (!storyMap.has(storyUser.id)) {
        storyMap.set(storyUser.id, { user: storyUser, stories: [], has_unviewed: false });
      }
      storyMap.get(storyUser.id).stories.push(storyData);
    }
    setStories(Array.from(storyMap.values()));
  }, [user]);

  const markStoryViewed = useCallback(async (storyId: string) => {
    if (!user || !supabase) return;
    await supabase.from('story_views').upsert({ story_id: storyId, viewer_id: user.id });
  }, [user]);

  const likeStory = useCallback(async (storyId: string) => {
    if (!user || !supabase) return;
    await supabase.from('story_likes').insert({ story_id: storyId, user_id: user.id });
  }, [user]);

  const unlikeStory = useCallback(async (storyId: string) => {
    if (!user || !supabase) return;
    await supabase.from('story_likes').delete().eq('story_id', storyId).eq('user_id', user.id);
  }, [user]);

  useEffect(() => {
    if (isSignedIn && clerkId) {
      setLoading(true);
      (async () => {
        await fetchChatThemes();
        await syncUser();
        setLoading(false);
      })();
    } else {
      setUser(null);
      setLoading(false);
    }
  }, [isSignedIn, clerkId, syncUser, fetchChatThemes]);

  useEffect(() => {
    if (user) {
      fetchNotifications();
      fetchMessageRequests();
      fetchBlockedUsers();
      fetchStories();
    }
  }, [user, fetchNotifications, fetchMessageRequests, fetchBlockedUsers, fetchStories]);

  const value = useMemo(() => ({
    user,
    notifications,
    messageRequests,
    chatThemes,
    blockedUsers,
    stories,
    unreadNotificationCount,
    loading,
    syncUser,
    fetchNotifications,
    fetchMessageRequests,
    acceptMessageRequest,
    declineMessageRequest,
    markNotificationRead,
    markAllNotificationsRead,
    fetchBlockedUsers,
    blockUser,
    unblockUser,
    fetchChatThemes,
    updateConversationTheme,
    getConversationMessages,
    sendMessage,
    addReaction,
    removeReaction,
    deleteMessage,
    fetchStories,
    markStoryViewed,
    likeStory,
    unlikeStory,
  }), [
    user, notifications, messageRequests, chatThemes, blockedUsers, stories, unreadNotificationCount, loading,
    syncUser, fetchNotifications, fetchMessageRequests, acceptMessageRequest, declineMessageRequest,
    markNotificationRead, markAllNotificationsRead, fetchBlockedUsers, blockUser, unblockUser,
    fetchChatThemes, updateConversationTheme, getConversationMessages, sendMessage, addReaction,
    removeReaction, deleteMessage, fetchStories, markStoryViewed, likeStory, unlikeStory,
  ]);

  return <SupabaseContext.Provider value={value}>{children}</SupabaseContext.Provider>;
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) throw new Error('useSupabase must be used inside SupabaseProvider');
  return ctx;
}
