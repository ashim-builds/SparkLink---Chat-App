// types/index.ts

export interface User {
  id: string;
  username: string;
  fullName: string;
  email?: string;
  avatar?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen?: string;
  createdAt: string;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  text: string;
  type: "text" | "image" | "video" | "audio" | "file";
  attachmentUrl?: string;
  isRead: boolean;
  createdAt: string;
}

export interface Conversation {
  id: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isGroup: boolean;
  groupName?: string;
  groupAvatar?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Story {
  id: string;
  userId: string;
  mediaUrl: string;
  type: "image" | "video";
  caption?: string;
  viewers: string[];
  createdAt: string;
  expiresAt: string;
}

export interface UserStory {
  user: User;
  stories: Story[];
  hasViewed: boolean;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface WsEvent {
  type:
    | "message"
    | "typing"
    | "online"
    | "offline"
    | "story"
    | "read_receipt";

  payload:
    | Message
    | User
    | Story
    | {
        conversationId: string;
        userId: string;
        isTyping?: boolean;
        messageId?: string;
      };

  timestamp: string;
}