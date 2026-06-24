import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import React, { useState } from "react";
import { styles } from "@/assets/styles/StoriesBar.styles";
import { UserStory } from "@/types";
import { dummyConversationData, dummyStoriesData } from "@/assets/assets";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import * as ImagePicker from "expo-image-picker";
import Avatar from "./Avatar";
interface StoriesBarProps {
  onviewStory: (us: UserStory) => void;
}

export default function StoriesBar({ onviewStory }: StoriesBarProps) {
  const [uploading, setUploading] = useState(false);
  const { userStories } = { userStories: dummyStoriesData };

  const pickAndUpload = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      Alert.alert(
        "Permission needed",
        "Allow access to your photos to your post a story.",
      );
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      quality: 0.8,
    });

    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    const formData = new FormData();
    formData.append("file", {
      uri: asset.uri,
      type: asset.mimeType || "image/jpg",
      name: asset.fileName || "story.jpg",
    } as any);

    setUploading(true);
    setTimeout(() => {
      setUploading(false);
    }, 2000);
  };

  return (
    <FlatList
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
      data={[{ _addstory: true }, ...userStories] as any[]}
      keyExtractor={(item, i) =>
        item._addStory ? "add" : (item.user?._id ?? String(i))
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
