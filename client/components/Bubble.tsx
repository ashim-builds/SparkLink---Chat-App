import { View, Text, TouchableOpacity, Image, Linking } from "react-native";
import React from "react";
import { Message } from "@/types";
import { styles } from "@/assets/styles/Bubble.styles";
import { LinearGradient } from "expo-linear-gradient";
import { Colors } from "@/constants/Colors";
import { useVideoPlayer, VideoView } from "expo-video";
import { formatTime } from "@/utils/formatTime";
import { Ionicons } from "@expo/vector-icons";

import { decryptMessage } from "@/utils/encryption";

interface BubbleProps {
  msg: Message;
  isMine: boolean;
  theme?: "default" | "love" | "friendly" | "fifa";
}

export default function Bubble({ msg, isMine, theme = "default" }: BubbleProps) {
  let gradientColors: [string, string, ...string[]] = [Colors.primary, Colors.primaryContainer];
  if (theme === "love") {
    gradientColors = ["#ff4b72", "#ff809b"];
  } else if (theme === "friendly") {
    gradientColors = ["#ff9f1c", "#ffbf69"];
  } else if (theme === "fifa") {
    gradientColors = ["#1b4332", "#40916c"];
  }

  let bubbleThemStyle: any = [styles.bubble, styles.bubbleThem];
  if (theme === "love") {
    bubbleThemStyle.push({
      backgroundColor: "#fff0f2",
      borderColor: "#ffb3c1",
      borderWidth: 1,
    });
  } else if (theme === "friendly") {
    bubbleThemStyle.push({
      backgroundColor: "#f4f9f4",
      borderColor: "#cce3de",
      borderWidth: 1,
    });
  } else if (theme === "fifa") {
    bubbleThemStyle.push({
      backgroundColor: "#081c15",
      borderColor: "#ffd700",
      borderWidth: 1,
    });
  }

  let bubbleMeStyle: any = [styles.bubble, styles.bubbleMe];
  if (theme === "fifa") {
    bubbleMeStyle.push({
      borderColor: "#ffd700",
      borderWidth: 1,
    });
  }

  const content = <BubbleContent msg={msg} isMine={isMine} theme={theme} />;

  return (
    <View style={[styles.row, isMine ? styles.rowMe : styles.rowThem]}>
      {isMine ? (
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={bubbleMeStyle}
        >
          {content}
        </LinearGradient>
      ) : (
        <View style={bubbleThemStyle}>{content}</View>
      )}
    </View>
  );
}

function BubbleContent({ msg, isMine, theme }: { msg: Message; isMine: boolean; theme: string }) {
  const decrypted = msg.text ? decryptMessage(msg.text, msg.conversationId) : "";

  let textThemColor = Colors.onSurface;
  if (theme === "love") {
    textThemColor = "#c9184a";
  } else if (theme === "friendly") {
    textThemColor = "#2f5d62";
  } else if (theme === "fifa") {
    textThemColor = "#ffffff";
  }

  let textMeColor = Colors.onPrimary;
  if (theme === "fifa") {
    textMeColor = "#ffd700";
  }

  let timeThemColor = Colors.onSurfaceVariant;
  if (theme === "love") {
    timeThemColor = "#ff4b72";
  } else if (theme === "friendly") {
    timeThemColor = "#2f5d62";
  } else if (theme === "fifa") {
    timeThemColor = "#ffd700";
  }

  let timeMeColor = `${Colors.onPrimary}88`;
  if (theme === "fifa") {
    timeMeColor = "#ffd70088";
  }

  let checkmarkColor = msg.read ? Colors.onPrimary : `${Colors.onPrimary}88`;
  if (theme === "fifa") {
    checkmarkColor = msg.read ? "#ffd700" : "#ffd70088";
  }

  return (
    <View>
      {msg.mediaUrl && (
        <View style={styles.mediaWrapper}>
          {msg.mediaType === "image" ? (
            <TouchableOpacity onPress={() => Linking.openURL(msg.mediaUrl!)}>
              <Image
                source={{ uri: msg.mediaUrl }}
                style={styles.mediaImage}
                resizeMode="cover"
              />
            </TouchableOpacity>
          ) : (
            <VideoPlayer uri={msg.mediaUrl} style={styles.mediaVideo} />
          )}
        </View>
      )}

      {!!decrypted && (
        <Text
          style={[
            styles.msgText,
            isMine ? { color: textMeColor } : { color: textThemColor },
          ]}
        >
          {decrypted}
        </Text>
      )}

      <View
        style={[styles.footer, isMine ? styles.footerRight : styles.footerLeft]}
      >
        <Text
          style={[styles.timeText, isMine ? { color: timeMeColor } : { color: timeThemColor }]}
        >
          {formatTime(msg.createdAt)}
        </Text>

        {isMine && (
          <Ionicons
            name={msg.read ? "checkmark-done" : "checkmark"}
            size={12}
            color={checkmarkColor}
          />
        )}
      </View>
    </View>
  );
}

function VideoPlayer({ uri, style }: { uri: string; style: any }) {
  const player = useVideoPlayer({ uri }, (p) => {
    p.loop = false;
  });
  return <VideoView player={player} style={style} nativeControls />;
}
