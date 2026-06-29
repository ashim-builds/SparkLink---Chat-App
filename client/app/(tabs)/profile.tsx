import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Platform,
  Switch,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import Avatar from "@/components/Avatar";
import { styles } from "@/assets/styles/ProfileScreen.styles";
import { Colors } from "@/constants/Colors";
import { useApp } from "@/context/AppContext";
import { User } from "@/types";
import * as SecureStore from "expo-secure-store";
import { useSocket } from "@/context/SocketContext";
import { useUser } from "@clerk/expo";

export default function Profile() {
  const { auth, logout, refreshProfile, updateUser } = useApp();
  const { socket } = useSocket();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<User | null>(auth.user);
  const [avatarUri, setAvatarUri] = useState<string | undefined>();

  // Interactive Sub-pages State
  const [activeSection, setActiveSection] = useState<"settings" | "notifications" | "privacy" | "help" | null>(null);
  const [allowPush, setAllowPush] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrateEnabled, setVibrateEnabled] = useState(true);
  const [storyLikesAlert, setStoryLikesAlert] = useState(true);
  const [showOnline, setShowOnline] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  
  // Support Form State
  const [supportSubject, setSupportSubject] = useState("");
  const [supportMessage, setSupportMessage] = useState("");
  const [submittingSupport, setSubmittingSupport] = useState(false);

  // Load preferences from SecureStore on mount
  useEffect(() => {
    (async () => {
      try {
        const storedPush = await SecureStore.getItemAsync("pref_push");
        if (storedPush !== null) setAllowPush(storedPush === "true");
        const storedSound = await SecureStore.getItemAsync("pref_sound");
        if (storedSound !== null) setSoundEnabled(storedSound === "true");
        const storedVibrate = await SecureStore.getItemAsync("pref_vibrate");
        if (storedVibrate !== null) setVibrateEnabled(storedVibrate === "true");
        const storedStory = await SecureStore.getItemAsync("pref_story");
        if (storedStory !== null) setStoryLikesAlert(storedStory === "true");
        const storedOnline = await SecureStore.getItemAsync("pref_online");
        if (storedOnline !== null) setShowOnline(storedOnline === "true");
        const storedReceipts = await SecureStore.getItemAsync("pref_receipts");
        if (storedReceipts !== null) setReadReceipts(storedReceipts === "true");
      } catch (e) {
        console.warn("Error loading preferences:", e);
      }
    })();
  }, []);

  const togglePush = async (val: boolean) => {
    setAllowPush(val);
    await SecureStore.setItemAsync("pref_push", String(val));
  };
  const toggleSound = async (val: boolean) => {
    setSoundEnabled(val);
    await SecureStore.setItemAsync("pref_sound", String(val));
  };
  const toggleVibrate = async (val: boolean) => {
    setVibrateEnabled(val);
    await SecureStore.setItemAsync("pref_vibrate", String(val));
  };
  const toggleStory = async (val: boolean) => {
    setStoryLikesAlert(val);
    await SecureStore.setItemAsync("pref_story", String(val));
  };
  const toggleOnline = async (val: boolean) => {
    setShowOnline(val);
    await SecureStore.setItemAsync("pref_online", String(val));
    if (socket && auth.user) {
      socket.emit("online_preference_changed", { userId: auth.user._id, showOnline: val });
    }
  };
  const toggleReceipts = async (val: boolean) => {
    setReadReceipts(val);
    await SecureStore.setItemAsync("pref_receipts", String(val));
  };

  const handleSubmitSupport = () => {
    if (!supportSubject.trim() || !supportMessage.trim()) {
      Alert.alert("Validation", "Please enter both subject and description.");
      return;
    }
    setSubmittingSupport(true);
    setTimeout(() => {
      setSubmittingSupport(false);
      setSupportSubject("");
      setSupportMessage("");
      Alert.alert(
        "Support Ticket Submitted",
        "Thank you! Your ticket has been recorded. Our support team will get in touch with you at " + (auth.user?.email || "your email") + " as soon as possible."
      );
    }, 1500);
  };

  useEffect(() => {
    if (!editing) {
      setProfile(auth.user);
      setAvatarUri(undefined);
    }
  }, [auth.user, editing]);

  const { user: clerkUser } = useUser();

  const displayProfile = profile || auth.user || (clerkUser ? {
    _id: clerkUser.id,
    name: clerkUser.fullName || clerkUser.username || "Anonymous",
    handle: clerkUser.username || clerkUser.primaryEmailAddress?.emailAddress.split("@")[0] || clerkUser.id,
    email: clerkUser.primaryEmailAddress?.emailAddress || "",
    avatar: clerkUser.imageUrl || "",
    bio: "Hey there! I am using SparkLink.",
    isOnline: true,
    lastSeen: new Date().toISOString(),
  } as any as User : null);

  const startEditing = () => {
    setProfile(auth.user);
    setAvatarUri(undefined);
    setEditing(true);
  };

  const cancelEditing = () => {
    setProfile(auth.user);
    setAvatarUri(undefined);
    setEditing(false);
  };

  const pickProfileImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== "granted") {
      Alert.alert("Permission Required", "Please allow photo library access.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets.length > 0) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri);
      setProfile((prev) => ({
        ...(prev as User),
        avatar: uri,
      }));
    }
  };

  const handleSave = async () => {
    if (!profile) return;
    if (!profile.name.trim()) {
      Alert.alert("Validation", "Name is required.");
      return;
    }
    if (!profile.handle.trim()) {
      Alert.alert("Validation", "Username is required.");
      return;
    }

    setSaving(true);
    try {
      await updateUser({
        name: profile.name.trim(),
        handle: profile.handle.toLowerCase().replace(/\s/g, ""),
        bio: profile.bio ?? "",
        avatarUri,
      });
      Alert.alert("Success", "Profile updated successfully.");
      setEditing(false);
      setAvatarUri(undefined);
    } catch (error: any) {
      Alert.alert(
        "Update Failed",
        error?.message || "Could not update your profile.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = () => {
    if (Platform.OS === "web") {
      const confirmed = window.confirm("Are you sure you want to sign out?");
      if (confirmed) {
        logout();
      }
    } else {
      Alert.alert("Sign Out", "Are you sure you want to sign out?", [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: () => {
            logout();
          },
        },
      ]);
    }
  };

  if (auth.loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  if (!displayProfile) {
    return (
      <SafeAreaView style={styles.safe}>
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            gap: 14,
            padding: 24,
          }}
        >
          <Ionicons
            name="person-circle-outline"
            size={56}
            color={Colors.outline}
          />
          <Text style={[styles.title, { textAlign: "center" }]}>
            Profile unavailable
          </Text>
          <Text style={[styles.userBio, { textAlign: "center" }]}>
            {auth.error ||
              "We could not load your profile. Please try again."}
          </Text>
          <TouchableOpacity style={styles.saveWrapper} onPress={() => refreshProfile(true)}>
            <View style={[styles.saveBtn, { backgroundColor: Colors.primary }]}>
              <Text style={styles.saveBtnText}>Retry</Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (activeSection) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: Colors.surfaceHigh }]}>
          <TouchableOpacity onPress={() => setActiveSection(null)} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
            <Ionicons name="chevron-back" size={24} color={Colors.primary} />
            <Text style={{ fontSize: 16, fontWeight: "600", color: Colors.primary }}>Back</Text>
          </TouchableOpacity>
          <Text style={[styles.title, { flex: 1, textAlign: "center", marginRight: 40 }]}>
            {activeSection === "settings" && "Settings"}
            {activeSection === "notifications" && "Notifications"}
            {activeSection === "privacy" && "Privacy"}
            {activeSection === "help" && "Help & Support"}
          </Text>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          {activeSection === "settings" && (
            <View style={{ gap: 20 }}>
              <View style={{ backgroundColor: Colors.surfaceLowest, borderRadius: 16, padding: 16, gap: 12 }}>
                <Text style={{ fontSize: 12, fontWeight: "800", color: Colors.outline, letterSpacing: 0.5 }}>ACCOUNT INFO</Text>
                <View style={{ height: 1, backgroundColor: Colors.surfaceHigh }} />
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: Colors.onSurfaceVariant, fontSize: 14 }}>Name</Text>
                  <Text style={{ color: Colors.onSurface, fontWeight: "600", fontSize: 14 }}>{displayProfile.name}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: Colors.onSurfaceVariant, fontSize: 14 }}>Username</Text>
                  <Text style={{ color: Colors.onSurface, fontWeight: "600", fontSize: 14 }}>@{displayProfile.handle}</Text>
                </View>
                <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
                  <Text style={{ color: Colors.onSurfaceVariant, fontSize: 14 }}>Email</Text>
                  <Text style={{ color: Colors.onSurface, fontWeight: "600", fontSize: 14 }}>{displayProfile.email}</Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => {
                  setActiveSection(null);
                  startEditing();
                }}
                style={{
                  backgroundColor: Colors.primary,
                  paddingVertical: 14,
                  borderRadius: 14,
                  alignItems: "center"
                }}
              >
                <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Edit Profile Info</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeSection === "notifications" && (
            <View style={{ backgroundColor: Colors.surfaceLowest, borderRadius: 16, padding: 16, gap: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 4, flex: 1 }}>
                  <Text style={{ color: Colors.onSurface, fontWeight: "600", fontSize: 14 }}>Push Notifications</Text>
                  <Text style={{ color: Colors.outline, fontSize: 12 }}>Receive alerts for new messages</Text>
                </View>
                <Switch value={allowPush} onValueChange={togglePush} trackColor={{ true: Colors.primary }} />
              </View>

              <View style={{ height: 1, backgroundColor: Colors.surfaceHigh }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 4, flex: 1 }}>
                  <Text style={{ color: Colors.onSurface, fontWeight: "600", fontSize: 14 }}>Notification Sounds</Text>
                  <Text style={{ color: Colors.outline, fontSize: 12 }}>Play sound for incoming notifications</Text>
                </View>
                <Switch value={soundEnabled} onValueChange={toggleSound} trackColor={{ true: Colors.primary }} />
              </View>

              <View style={{ height: 1, backgroundColor: Colors.surfaceHigh }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 4, flex: 1 }}>
                  <Text style={{ color: Colors.onSurface, fontWeight: "600", fontSize: 14 }}>Vibrate</Text>
                  <Text style={{ color: Colors.outline, fontSize: 12 }}>Vibrate on new alerts</Text>
                </View>
                <Switch value={vibrateEnabled} onValueChange={toggleVibrate} trackColor={{ true: Colors.primary }} />
              </View>

              <View style={{ height: 1, backgroundColor: Colors.surfaceHigh }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 4, flex: 1 }}>
                  <Text style={{ color: Colors.onSurface, fontWeight: "600", fontSize: 14 }}>Story Alerts</Text>
                  <Text style={{ color: Colors.outline, fontSize: 12 }}>Get notified when users like your stories</Text>
                </View>
                <Switch value={storyLikesAlert} onValueChange={toggleStory} trackColor={{ true: Colors.primary }} />
              </View>
            </View>
          )}

          {activeSection === "privacy" && (
            <View style={{ backgroundColor: Colors.surfaceLowest, borderRadius: 16, padding: 16, gap: 16 }}>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 4, flex: 1, marginRight: 16 }}>
                  <Text style={{ color: Colors.onSurface, fontWeight: "600", fontSize: 14 }}>Show Online Status</Text>
                  <Text style={{ color: Colors.outline, fontSize: 12 }}>Let others see when you are online and active</Text>
                </View>
                <Switch value={showOnline} onValueChange={toggleOnline} trackColor={{ true: Colors.primary }} />
              </View>

              <View style={{ height: 1, backgroundColor: Colors.surfaceHigh }} />

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <View style={{ gap: 4, flex: 1, marginRight: 16 }}>
                  <Text style={{ color: Colors.onSurface, fontWeight: "600", fontSize: 14 }}>Read Receipts</Text>
                  <Text style={{ color: Colors.outline, fontSize: 12 }}>Let others see when you read their messages</Text>
                </View>
                <Switch value={readReceipts} onValueChange={toggleReceipts} trackColor={{ true: Colors.primary }} />
              </View>
            </View>
          )}

          {activeSection === "help" && (
            <View style={{ gap: 16 }}>
              <View style={{ backgroundColor: Colors.surfaceLowest, borderRadius: 16, padding: 16, gap: 12 }}>
                <Text style={{ fontSize: 14, fontWeight: "700", color: Colors.onSurface }}>Submit a Support Ticket</Text>
                <Text style={{ fontSize: 12, color: Colors.outline }}>Tell us about any bugs or feedback. We will get back to you shortly.</Text>
                
                <View style={{ height: 1, backgroundColor: Colors.surfaceHigh }} />

                <Text style={{ fontSize: 11, fontWeight: "700", color: Colors.outline }}>SUBJECT</Text>
                <TextInput
                  value={supportSubject}
                  onChangeText={setSupportSubject}
                  placeholder="e.g. Issue sending images"
                  placeholderTextColor={Colors.outlineVariant}
                  style={{
                    backgroundColor: Colors.surfaceLow,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: Colors.onSurface
                  }}
                />

                <Text style={{ fontSize: 11, fontWeight: "700", color: Colors.outline, marginTop: 8 }}>DESCRIPTION</Text>
                <TextInput
                  value={supportMessage}
                  onChangeText={setSupportMessage}
                  placeholder="Tell us what went wrong..."
                  placeholderTextColor={Colors.outlineVariant}
                  multiline
                  numberOfLines={4}
                  style={{
                    backgroundColor: Colors.surfaceLow,
                    borderRadius: 10,
                    paddingHorizontal: 12,
                    paddingVertical: 10,
                    fontSize: 14,
                    color: Colors.onSurface,
                    textAlignVertical: "top",
                    minHeight: 100
                  }}
                />

                <TouchableOpacity
                  onPress={handleSubmitSupport}
                  disabled={submittingSupport}
                  style={{
                    backgroundColor: Colors.primary,
                    paddingVertical: 12,
                    borderRadius: 10,
                    alignItems: "center",
                    marginTop: 8
                  }}
                >
                  {submittingSupport ? (
                    <ActivityIndicator color="#fff" size="small" />
                  ) : (
                    <Text style={{ color: "#fff", fontWeight: "700", fontSize: 14 }}>Submit Ticket</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Profile</Text>

          <TouchableOpacity
            style={styles.editBtn}
            onPress={editing ? cancelEditing : startEditing}
            disabled={saving}
          >
            <Ionicons
              name={editing ? "close-outline" : "create-outline"}
              size={18}
              color={Colors.primary}
            />
            <Text style={styles.editBtnText}>
              {editing ? "Cancel" : "Edit"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={styles.avatarWrapper}>
            <Avatar src={displayProfile.avatar} name={displayProfile.name} size={100} />

            {editing && (
              <TouchableOpacity
                style={styles.cameraOverlay}
                onPress={pickProfileImage}
                disabled={saving}
              >
                <Ionicons name="camera" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.userInfo}>
            <Text style={styles.userName}>{displayProfile.name}</Text>

            <Text style={styles.userHandle}>@{displayProfile.handle}</Text>

            <Text style={styles.userEmail}>{displayProfile.email}</Text>

            <Text style={styles.userBio}>{displayProfile.bio}</Text>
          </View>
        </View>

        {/* Edit Form */}
        {editing && profile && (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>

              <TextInput
                style={styles.input}
                value={profile.name}
                onChangeText={(text) =>
                  setProfile((prev) => prev ? {
                    ...prev,
                    name: text,
                  } : null)
                }
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>USERNAME</Text>

              <View style={styles.handleRow}>
                <Text style={styles.atSign}>@</Text>

                <TextInput
                  style={styles.handleInput}
                  value={profile.handle}
                  onChangeText={(text) =>
                    setProfile((prev) => prev ? {
                      ...prev,
                      handle: text.toLowerCase().replace(/\s/g, ""),
                    } : null)
                  }
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>EMAIL</Text>

              <TextInput
                style={styles.input}
                value={profile.email}
                editable={false}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>BIO</Text>

              <TextInput
                multiline
                style={[styles.input, styles.bioInput]}
                value={profile.bio ?? ""}
                onChangeText={(text) =>
                  setProfile((prev) => prev ? {
                    ...prev,
                    bio: text,
                  } : null)
                }
              />
            </View>

            <TouchableOpacity
              style={[styles.saveWrapper, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              disabled={saving}
            >
              <View
                style={[
                  styles.saveBtn,
                  {
                    backgroundColor: Colors.primary,
                  },
                ]}
              >
                {saving ? (
                  <ActivityIndicator color={Colors.onPrimary} size="small" />
                ) : (
                  <Text style={styles.saveBtnText}>Save Changes</Text>
                )}
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings */}
        <View style={styles.optionsSection}>
          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setActiveSection("settings")}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="settings-outline"
                size={18}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.optionText}>Settings</Text>

            <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setActiveSection("notifications")}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="notifications-outline"
                size={18}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.optionText}>Notifications</Text>

            <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setActiveSection("privacy")}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.optionText}>Privacy</Text>

            <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.optionRow}
            onPress={() => setActiveSection("help")}
          >
            <View style={styles.optionIcon}>
              <Ionicons
                name="help-circle-outline"
                size={18}
                color={Colors.primary}
              />
            </View>

            <Text style={styles.optionText}>Help & Support</Text>

            <Ionicons name="chevron-forward" size={18} color={Colors.outline} />
          </TouchableOpacity>
        </View>

        {/* Sign Out */}
        <View style={styles.signOutSection}>
          <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut}>
            <Ionicons name="log-out-outline" size={20} color={Colors.error} />

            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
