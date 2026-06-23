export const dummyStoriesData = [
  {
    id: "story_1",
    userId: "user_1",
    username: "ashim",
    avatar: "/avatars/user1.jpg",
    image: "/stories/story1.jpg",
    createdAt: "2026-06-23T08:00:00Z",
  },
  {
    id: "story_2",
    userId: "user_2",
    username: "john",
    avatar: "/avatars/user2.jpg",
    image: "/stories/story2.jpg",
    createdAt: "2026-06-23T09:00:00Z",
  },
];

export const dummConversationData = [
  {
    id: "conv_1",
    participants: ["user_1", "user_2"],
    lastMessage: "Hey, how are you?",
    lastMessageAt: "2026-06-23T10:00:00Z",
    unreadCount: 2,
  },
  {
    id: "conv_2",
    participants: ["user_1", "user_3"],
    lastMessage: "Let's meet tomorrow.",
    lastMessageAt: "2026-06-23T11:00:00Z",
    unreadCount: 0,
  },
];

export const dummyMessage = [
  {
    id: "msg_1",
    conversationId: "conv_1",
    senderId: "user_1",
    text: "Hello!",
    createdAt: "2026-06-23T09:55:00Z",
  },
  {
    id: "msg_2",
    conversationId: "conv_1",
    senderId: "user_2",
    text: "Hey, how are you?",
    createdAt: "2026-06-23T10:00:00Z",
  },
];

export const dummyUsers = [
  {
    id: "user_1",
    username: "ashim",
    fullName: "Ashim Adhikari",
    avatar: "/avatars/user1.jpg",
    isOnline: true,
  },
  {
    id: "user_2",
    username: "john",
    fullName: "John Smith",
    avatar: "/avatars/user2.jpg",
    isOnline: false,
  },
  {
    id: "user_3",
    username: "emma",
    fullName: "Emma Wilson",
    avatar: "/avatars/user3.jpg",
    isOnline: true,
  },
];

export const dummyUserProfile = {
  id: "user_1",
  username: "ashim",
  fullName: "Ashim Adhikari",
  bio: "Founder of DevSpark 🚀",
  avatar: "/avatars/user1.jpg",
  email: "ashim@example.com",
  phone: "+9779800000000",
  followers: 125,
  following: 78,
  posts: 15,
  joinedAt: "2026-01-01T00:00:00Z",
};