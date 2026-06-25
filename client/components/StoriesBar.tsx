import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Alert,
  Platform,
} from "react-native";
import React, { useState } from "react";
import { styles } from "@/assets/styles/StoriesBar.styles";
import { UserStory } from "@/types";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import * as ImagePicker from "expo-image-picker";
import Avatar from "./Avatar";
import { useApp } from "@/context/AppContext";
import { useSocket } from "@/context/SocketContext";
import { API_BASE_URL } from "@/constants/Config";

interface StoriesBarProps {
  onviewStory: (us: UserStory) => void;
}

export default function StoriesBar({ onviewStory }: StoriesBarProps) {
  const [uploading, setUploading] = useState(false);
  const { auth } = useApp();
  const { stories, fetchStories } = useSocket();

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      if (Platform.OS === "web") {
        window.alert("Allow access to your photos to post a story.");
      } else {
        Alert.alert("Permission needed", "Allow access to your photos to post a story.");
      }
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;
    if (!auth.token) return;

    const asset = result.assets[0];
    setUploading(true);

    try {
      const formData = new FormData();
      if (
        Platform.OS === "web" ||
        asset.uri.startsWith("data:") ||
        asset.uri.startsWith("blob:")
      ) {
        const blob = await (await fetch(asset.uri)).blob();
        formData.append("media", blob, asset.fileName || "story.jpg");
      } else {
        formData.append("media", {
          uri: asset.uri,
          type: asset.mimeType || "image/jpeg",
          name: asset.fileName || "story.jpg",
        } as any);
      }

      const res = await fetch(`${API_BASE_URL}/api/stories`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.token}` },
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        await fetchStories();
      } else {
        throw new Error(data.message || "Upload failed");
      }
    } catch (err: any) {
      if (Platform.OS === "web") {
        window.alert(err?.message || "Could not upload story.");
      } else {
        Alert.alert("Upload failed", err?.message || "Could not upload story.");
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      data={[{ _addstory: true }, ...stories] as any[]}
      keyExtractor={(item, i) =>
        item._addstory ? "add" : (item.user?._id ?? String(i))
      }
      renderItem={({ item }) => {
        if (item._addstory) {
          return (
            <TouchableOpacity
              style={styles.storyItem}
              onPress={pickAndUpload}
              disabled={uploading}
            >
              <View style={styles.addCircle}>
                <Ionicons
                  name={uploading ? "hourglass" : "add"}
                  size={24}
                  color={Colors.onSurfaceVariant}
                />
              </View>
              <Text style={styles.label}>Your Story</Text>
            </TouchableOpacity>
          );
        }
        const us = item as UserStory;
        return (
          <TouchableOpacity
            style={styles.storyItem}
            onPress={() => onviewStory(us)}
          >
            <View style={styles.storyRing}>
              <Avatar name={us.user.name} src={us.user.avatar} size={52} />
            </View>
            <Text style={styles.label} numberOfLines={1}>
              {us.user.name.split(" ")[0]}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}
