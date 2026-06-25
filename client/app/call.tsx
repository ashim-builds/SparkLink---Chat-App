import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Avatar from "@/components/Avatar";
import { Colors } from "@/constants/Colors";
import { useSocket } from "@/context/SocketContext";
import { useApp } from "@/context/AppContext";

const { width, height } = Dimensions.get("window");

export default function CallScreen() {
  const router = useRouter();
  const { auth } = useApp();
  const { socket } = useSocket();
  const params = useLocalSearchParams<{
    partnerId: string;
    partnerName: string;
    partnerAvatar: string;
    conversationId: string;
    callType: "audio" | "video";
    isOutgoing: string;
  }>();

  const [callStatus, setCallStatus] = useState<
    "calling" | "connected" | "ended"
  >(params.isOutgoing === "true" ? "calling" : "connected");
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [speaker, setSpeaker] = useState(params.callType === "video");
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isVideo = params.callType === "video";

  // Notify partner via socket that call is being initiated
  useEffect(() => {
    if (!socket || !params.partnerId || !auth.user) return;

    if (params.isOutgoing === "true") {
      socket.emit("call_initiate", {
        to: params.partnerId,
        from: auth.user._id,
        fromName: auth.user.name,
        fromAvatar: auth.user.avatar || "",
        callType: params.callType,
        conversationId: params.conversationId,
      });
    }

    // Listen for call_accepted
    const onAccepted = () => {
      setCallStatus("connected");
      startTimer();
    };

    // Listen for call_declined / ended
    const onEnded = () => {
      setCallStatus("ended");
      stopTimer();
      setTimeout(() => router.back(), 1500);
    };

    socket.on("call_accepted", onAccepted);
    socket.on("call_ended", onEnded);

    // Auto-connect after 2s if incoming call
    if (params.isOutgoing !== "true") {
      setCallStatus("connected");
      startTimer();
      socket.emit("call_accept", { to: params.partnerId });
    }

    return () => {
      socket.off("call_accepted", onAccepted);
      socket.off("call_ended", onEnded);
    };
  }, [socket]);

  function startTimer() {
    timerRef.current = setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);
  }

  function stopTimer() {
    if (timerRef.current) clearInterval(timerRef.current);
  }

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const formatElapsed = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  const endCall = () => {
    if (socket && params.partnerId) {
      socket.emit("call_end", {
        to: params.partnerId,
        from: auth.user?._id,
      });
    }
    stopTimer();
    setCallStatus("ended");
    setTimeout(() => router.back(), 800);
  };

  return (
    <LinearGradient
      colors={["#1a1a2e", "#16213e", "#0f3460"]}
      style={styles.container}
    >
      <SafeAreaView style={styles.safe}>
        {/* Call status */}
        <View style={styles.statusRow}>
          <Text style={styles.callTypeText}>
            {isVideo ? "Video Call" : "Voice Call"}
          </Text>
          <Text style={styles.statusText}>
            {callStatus === "calling"
              ? "Calling..."
              : callStatus === "ended"
              ? "Call ended"
              : formatElapsed(elapsed)}
          </Text>
        </View>

        {/* Avatar / Video area */}
        <View style={styles.avatarArea}>
          {isVideo && callStatus === "connected" && !videoOff ? (
            <View style={styles.videoPlaceholder}>
              <Ionicons
                name="videocam"
                size={64}
                color="rgba(255,255,255,0.3)"
              />
              <Text style={styles.videoPlaceholderText}>
                Video stream active
              </Text>
              <Text style={styles.videoSubText}>
                (WebRTC integration required for live video)
              </Text>
            </View>
          ) : (
            <View style={styles.avatarContainer}>
              <Avatar
                name={params.partnerName}
                src={params.partnerAvatar}
                size={120}
              />
              {callStatus === "calling" && (
                <View style={styles.ringingRings}>
                  {[1, 2, 3].map((i) => (
                    <View key={i} style={[styles.ring, { opacity: 0.3 / i }]} />
                  ))}
                </View>
              )}
            </View>
          )}

          <Text style={styles.partnerName}>{params.partnerName}</Text>

          {/* Self video thumbnail */}
          {isVideo && callStatus === "connected" && (
            <View style={styles.selfVideo}>
              <Ionicons
                name="person"
                size={28}
                color="rgba(255,255,255,0.6)"
              />
              <Text style={styles.selfVideoText}>You</Text>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            style={[styles.controlBtn, muted && styles.controlBtnActive]}
            onPress={() => setMuted(!muted)}
          >
            <Ionicons
              name={muted ? "mic-off" : "mic"}
              size={24}
              color="#fff"
            />
            <Text style={styles.controlLabel}>{muted ? "Unmute" : "Mute"}</Text>
          </TouchableOpacity>

          {isVideo && (
            <TouchableOpacity
              style={[styles.controlBtn, videoOff && styles.controlBtnActive]}
              onPress={() => setVideoOff(!videoOff)}
            >
              <Ionicons
                name={videoOff ? "videocam-off" : "videocam"}
                size={24}
                color="#fff"
              />
              <Text style={styles.controlLabel}>
                {videoOff ? "Start Video" : "Stop Video"}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[styles.controlBtn, speaker && styles.controlBtnActive]}
            onPress={() => setSpeaker(!speaker)}
          >
            <Ionicons
              name={speaker ? "volume-high" : "volume-mute"}
              size={24}
              color="#fff"
            />
            <Text style={styles.controlLabel}>
              {speaker ? "Speaker" : "Earpiece"}
            </Text>
          </TouchableOpacity>

          {/* End call button */}
          <TouchableOpacity style={styles.endBtn} onPress={endCall}>
            <Ionicons name="call" size={28} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safe: {
    flex: 1,
    paddingHorizontal: 24,
  },
  statusRow: {
    alignItems: "center",
    paddingTop: 20,
    gap: 6,
  },
  callTypeText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    fontWeight: "500",
  },
  statusText: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  avatarArea: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  avatarContainer: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  ringingRings: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 2,
    borderColor: "#fff",
  },
  partnerName: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
    marginTop: 24,
  },
  videoPlaceholder: {
    width: width - 48,
    height: height * 0.45,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.05)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 12,
  },
  videoPlaceholderText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 16,
  },
  videoSubText: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 12,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  selfVideo: {
    position: "absolute",
    bottom: 20,
    right: 0,
    width: 90,
    height: 120,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    gap: 8,
  },
  selfVideoText: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 12,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
    paddingBottom: 40,
    paddingTop: 20,
    flexWrap: "wrap",
  },
  controlBtn: {
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 50,
    width: 68,
    height: 68,
    justifyContent: "center",
  },
  controlBtnActive: {
    backgroundColor: "rgba(255,255,255,0.25)",
  },
  controlLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 10,
    marginTop: 2,
  },
  endBtn: {
    backgroundColor: "#e53935",
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "135deg" }],
    shadowColor: "#e53935",
    shadowOpacity: 0.6,
    shadowRadius: 12,
    elevation: 8,
  },
});
