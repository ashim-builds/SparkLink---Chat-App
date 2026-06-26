export interface User {
  id: string;
  clerk_id: string;
  name: string;
  email: string;
  handle: string;
  avatar?: string;
  bio?: string;
  is_online: boolean;
  last_seen: string;
  encryption_public_key?: string;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  content?: string;
  content_encrypted?: string;
  media_url?: string;
  media_type?: "image" | "video" | "audio";
  reply_to_id?: string;
  is_deleted: boolean;
  status: "sent" | "delivered" | "read";
  created_at: string;
  reactions?: MessageReaction[];
}

export interface MessageReaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
  created_at: string;
  user?: User;
}

export interface Conversation {
  id: string;
  is_group: boolean;
  created_by: string;
  last_message_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  participant?: User;
  lastMessage?: Message;
  participants?: ConversationParticipant[];
  theme?: ChatTheme;
  bubble_style?: string;
  unread_count?: number;
}

export interface ConversationParticipant {
  id: string;
  conversation_id: string;
  user_id: string;
  role: "admin" | "member";
  last_read_at?: string;
  muted: boolean;
  theme_id?: string;
  bubble_style?: string;
  joined_at: string;
  user?: User;
}

export interface MessageRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: "pending" | "accepted" | "declined" | "blocked";
  created_at: string;
  updated_at: string;
  sender?: User;
  receiver?: User;
  last_message?: Message;
}

export interface Story {
  id: string;
  user_id: string;
  media_url: string;
  media_type: "image" | "video";
  caption?: string;
  expires_at: string;
  created_at: string;
  views?: StoryView[];
  likes?: StoryLike[];
  has_viewed?: boolean;
  has_liked?: boolean;
  view_count?: number;
  like_count?: number;
}

export interface StoryView {
  id: string;
  story_id: string;
  viewer_id: string;
  created_at: string;
  viewer?: User;
}

export interface StoryLike {
  id: string;
  story_id: string;
  user_id: string;
  created_at: string;
  user?: User;
}

export interface UserStory {
  user: User;
  stories: Story[];
  has_unviewed?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  type: "message" | "message_request" | "call" | "story_view" | "story_like" | "reaction" | "mention";
  title: string;
  body?: string;
  data?: Record<string, any>;
  is_read: boolean;
  read_at?: string;
  created_at: string;
}

export interface CallLog {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: "audio" | "video";
  status: "missed" | "completed" | "declined" | "failed";
  duration_seconds?: number;
  started_at?: string;
  ended_at?: string;
  created_at: string;
  caller?: User;
  receiver?: User;
}

export interface ChatTheme {
  id: string;
  name: string;
  background_color: string;
  bubble_sent_color: string;
  bubble_sent_text_color: string;
  bubble_received_color: string;
  bubble_received_text_color: string;
  accent_color: string;
}

export interface BlockedUser {
  id: string;
  user_id: string;
  blocked_user_id: string;
  created_at: string;
  blocked_user?: User;
}

export interface TypingIndicator {
  conversation_id: string;
  user_id: string;
  is_typing: boolean;
  user?: User;
}

export interface WebRTCSession {
  id: string;
  caller_id: string;
  receiver_id: string;
  call_type: "audio" | "video";
  status: "pending" | "connected" | "ended";
  offer_sdp?: string;
  answer_sdp?: string;
  ice_candidates?: any[];
  created_at: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  loading: boolean;
  error?: string | null;
}

export interface WsEvent {
  type: string;
  payload?: any;
  senderId?: string;
  isTyping?: boolean;
  userId?: string;
  isOnline?: boolean;
  user?: User;
  conversationId?: string;
  [key: string]: any;
}

export const BUBBLE_STYLES = [
  "rounded",
  "square",
  "bubble",
  "minimal",
  "outlined",
  "gradient",
  "shadow",
  "neon",
  "comic",
] as const;

export type BubbleStyle = (typeof BUBBLE_STYLES)[number];
