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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";

import Avatar from "@/components/Avatar";
import { styles } from "@/assets/styles/ProfileScreen.styles";
import { Colors } from "@/constants/Colors";
import { useApp } from "@/context/AppContext";
import { User } from "@/types";

export default function Profile() {
  const { auth, logout, refreshProfile, updateUser } = useApp();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<User | null>(auth.user);
  const [avatarUri, setAvatarUri] = useState<string | undefined>();

  useEffect(() => {
    if (!editing) {
      setProfile(auth.user);
      setAvatarUri(undefined);
    }
  }, [auth.user, editing]);

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

  if (!profile) {
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
            <Avatar src={profile.avatar} name={profile.name} size={100} />

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
            <Text style={styles.userName}>{profile.name}</Text>

            <Text style={styles.userHandle}>@{profile.handle}</Text>

            <Text style={styles.userEmail}>{profile.email}</Text>

            <Text style={styles.userBio}>{profile.bio}</Text>
          </View>
        </View>

        {/* Edit Form */}
        {editing && (
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>FULL NAME</Text>

              <TextInput
                style={styles.input}
                value={profile.name}
                onChangeText={(text) =>
                  setProfile({
                    ...profile,
                    name: text,
                  })
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
                    setProfile({
                      ...profile,
                      handle: text.toLowerCase().replace(/\s/g, ""),
                    })
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
                  setProfile({
                    ...profile,
                    bio: text,
                  })
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
            onPress={() => Alert.alert("Settings", "Settings are up to date.")}
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
            onPress={() =>
              Alert.alert(
                "Notifications",
                "Notification preferences coming soon.",
              )
            }
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
            onPress={() => Alert.alert("Privacy", "Your account is protected.")}
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
            onPress={() =>
              Alert.alert("Help & Support", "Contact support from SparkLink.")
            }
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
