import {
  View,
  Text,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import React, { useState } from "react";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { styles } from "@/assets/styles/AuthScreen.styles";
import { TextInput } from "react-native-gesture-handler";
import { Colors } from "@/constants/Colors";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { Alert } from "react-native";
import { useClerk, useSignIn, useSignUp } from "@clerk/expo";
// import { SvgXml } from "react-native-svg";

type Mode = "login" | "register";

export default function AuthScreen() {
  const { signIn } = useSignIn();
  const { signUp } = useSignUp();
  const { setActive } = useClerk();

  const [mode, setMode] = React.useState<Mode>("login");
  const [name, setName] = React.useState("");
  const [handle, setHandle] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [verificationCode, setVerificationCode] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);
  const [verifyingMode, setVerifyingMode] = React.useState<
    "login" | "login_mfa" | "register"
  >("register");

  const router = useRouter();

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim())
      return Alert.alert("Validation", "Please fill all fields");
    if (mode === "register" && (!name.trim() || !handle.trim()))
      return Alert.alert("Validation", "Please fill all fields");

    setLoading(true);
    try {
      if (mode === "login") {
        if (!signIn) return;
        const result = await signIn.create({
          identifier: email,
          password,
        });
        if (result.error) {
          throw result.error;
        }
        if (signIn.status === "complete") {
          await setActive({ session: signIn.createdSessionId });
          router.replace("/(tabs)");
        } else if (signIn.status === "needs_first_factor" && signIn.emailCode) {
          await signIn.emailCode.sendCode();
          setVerifyingMode("login");
          setVerifying(true);
        } else if (signIn.status === "needs_second_factor" && signIn.mfa) {
          await signIn.mfa.sendEmailCode();
          setVerifyingMode("login_mfa");
          setVerifying(true);
        }
      } else {
        if (!signUp) return;

        const spaceIdx = name.trim().indexOf(" ");
        const firstName =
          spaceIdx !== -1 ? name.trim().substring(0, spaceIdx) : name.trim();
        const lastName =
          spaceIdx !== -1 ? name.trim().substring(spaceIdx + 1) : "";

        const result = await signUp.create({
          emailAddress: email,
          password,
          firstName,
          lastName,
          username: handle.toLowerCase().replace(/\s/g, ""),
        });
        if (result.error) {
          throw result.error;
        }
        const sendResult = await signUp.verifications.sendEmailCode();
        if (sendResult.error) {
          throw sendResult.error;
        }
        setVerifyingMode("register");
        setVerifying(true);
      }
    } catch (err: any) {
      Alert.alert(
        "Authentication Error",
        err?.errors?.[0]?.message || err?.message || "Something went wrong",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode.trim())
      return Alert.alert("Validation", "Please enter the verification code");

    setLoading(true);
    try {
      if (verifyingMode === "register") {
        if (!signUp) return;
        const result = await signUp.verifications.verifyEmailCode({
          code: verificationCode,
        });
        if (result.error) {
          throw result.error;
        }
        if (signUp.status === "complete") {
          await setActive({ session: signUp.createdSessionId });
          router.replace("/(tabs)");
        } else {
          Alert.alert(
            "Verification Faild",
            "Please check the code and try again.",
          );
        }
      } else {
        if (!signIn) return;
        if (verifyingMode === "login_mfa") {
          await signIn.mfa.verifyEmailCode({
            code: verificationCode,
          });
        } else {
          await signIn.emailCode.verifyCode({
            code: verificationCode,
          });
        }
        if (signIn.status === "complete") {
          await setActive({ session: signIn.createdSessionId });
          router.replace("/(tabs)");
        } else {
          Alert.alert(
            "Verification Faild",
            "Please check the code and try again.",
          );
        }
      }
    } catch (err: any) {
      Alert.alert(
        "Verification Error",
        err?.errors?.[0]?.message || err?.message || "Invalid code, try again",
      );
    } finally {
      setLoading(false);
    }
  };

  if (verifying) {
    return (
      <SafeAreaView style={styles.safe}>
        <KeyboardAvoidingView
          style={styles.kav}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo */}
            <View style={styles.logoRow}>
              <View style={styles.logoBox}>
                <Image
                  source={require("../../assets/SparkLink.png")}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>SparkLink</Text>
            </View>

            {/* Hero text */}
            <Text style={styles.heading}>Verify Email</Text>
            <Text style={styles.subheading}>
              We have sent a 6-digit verification code to {email}.
            </Text>

            {/* Form */}
            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Verification Code</Text>
              <TextInput
                style={styles.input}
                value={verificationCode}
                onChangeText={setVerificationCode}
                placeholder="Enter 6-digit code"
                placeholderTextColor={Colors.outlineVariant}
                autoCapitalize="none"
                keyboardType="numeric"
              />
            </View>

            {/* Back to sign up link */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleText}>Did not receive a code?</Text>
              <TouchableOpacity onPress={() => setVerifying(false)}>
                <Text style={styles.toggleLink}>Go back</Text>
              </TouchableOpacity>
            </View>

            {/* Submit button */}
            <TouchableOpacity
              onPress={handleVerify}
              disabled={loading}
              activeOpacity={0.88}
              style={styles.btnWrapper}
            >
              <LinearGradient
                colors={[Colors.primary, Colors.primaryContainer]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.btn}
              >
                {loading ? (
                  <ActivityIndicator color={Colors.onPrimary} size="small" />
                ) : (
                  <>
                    <Text style={styles.btnText}>Verify Code</Text>
                    <Ionicons
                      name="arrow-forward"
                      size={18}
                      color={Colors.onPrimary}
                    />
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoBox}>
              <Image
                source={require("../../assets/SparkLink.png")}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>
            <Text style={styles.appName}>SparkLink</Text>
          </View>

          {/* Hero text */}
          <Text style={styles.heading}>
            {mode === "login" ? "Welcome back 👋" : "Create your account"}
          </Text>
          <Text style={styles.subheading}>
            {mode === "login"
              ? "Sign in to continue chatting"
              : "Fill in the details to get started."}
          </Text>

          {/* Form */}
          <View style={styles.form}>
            {mode === "register" && (
              <>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Full Name</Text>
                  <TextInput
                    style={styles.input}
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your full name"
                    placeholderTextColor={Colors.outlineVariant}
                    autoCapitalize="words"
                  />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>Username</Text>
                  <View style={styles.handleRow}>
                    <Text style={styles.atSign}>@</Text>
                    <TextInput
                      style={[styles.input, styles.handleInput]}
                      value={handle}
                      onChangeText={(v) =>
                        setHandle(v.toLowerCase().replace(/\s/g, ""))
                      }
                      placeholder="Enter your username"
                      placeholderTextColor={Colors.outlineVariant}
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </>
            )}

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="youremail@gmail.com"
                placeholderTextColor={Colors.outlineVariant}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••••••••••••"
                placeholderTextColor={Colors.outlineVariant}
                secureTextEntry
              />
            </View>
          </View>
          {/* Toggle mode */}
          <View style={styles.toggleRow}>
            <Text style={styles.toggleText}>
              {mode === "login"
                ? "Don't have an account?"
                : "Already have an account?"}
            </Text>

            <TouchableOpacity
              onPress={() => setMode(mode === "login" ? "register" : "login")}
            >
              <Text style={styles.toggleLink}>
                {mode === "login" ? "Sign Up" : "Sign In"}
              </Text>
            </TouchableOpacity>
          </View>
          {/* Submit button */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={loading}
            activeOpacity={0.88}
            style={styles.btnWrapper}
          >
            <LinearGradient
              colors={[Colors.primary, Colors.primaryContainer]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.btn}
            >
              {loading ? (
                <ActivityIndicator color={Colors.onPrimary} size="small" />
              ) : (
                <>
                  <Text style={styles.btnText}>
                    {mode === "login" ? "Sign In" : "Sign Up"}
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={18}
                    color={Colors.onPrimary}
                  />
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
