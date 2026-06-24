import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

import Avatar from "@/components/Avatar";
import { styles } from "@/assets/styles/ProfileScreen.styles";
import { Colors } from "@/constants/Colors";
import { dummyUserProfile } from "@/assets/assets";

export default function Profile() {
  const [editing, setEditing] = useState(false);

  const [profile, setProfile] = useState({
    ...dummyUserProfile,
  });

  const handleSave = () => {
    Alert.alert("Success", "Profile updated successfully");
    setEditing(false);
  };

  const handleSignOut = () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive" },
    ]);
  };

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
            onPress={() => setEditing(!editing)}
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
              <TouchableOpacity style={styles.cameraOverlay}>
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
                onChangeText={(text) => setProfile({ ...profile, name: text })}
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
                onChangeText={(text) => setProfile({ ...profile, email: text })}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>BIO</Text>

              <TextInput
                multiline
                style={[styles.input, styles.bioInput]}
                value={profile.bio}
                onChangeText={(text) => setProfile({ ...profile, bio: text })}
              />
            </View>

            <TouchableOpacity style={styles.saveWrapper} onPress={handleSave}>
              <View
                style={[styles.saveBtn, { backgroundColor: Colors.primary }]}
              >
                <Text style={styles.saveBtnText}>Save Changes</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* Settings */}
        <View style={styles.optionsSection}>
          <TouchableOpacity style={styles.optionRow}>
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
          <TouchableOpacity style={styles.optionRow}>
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

          <TouchableOpacity style={styles.optionRow}>
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

          <TouchableOpacity style={styles.optionRow}>
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
