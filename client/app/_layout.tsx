import { AppProvider } from "@/context/AppContext";
import { SocketProvider } from "@/context/SocketContext";
import { SupabaseProvider } from "@/context/SupabaseContext";
import {
  SplashScreen,
  Stack,
  useRouter,
  useSegments,
} from "expo-router";
import { StatusBar } from "expo-status-bar";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { ClerkLoaded, ClerkProvider, useAuth } from "@clerk/expo";
import { tokenCache } from "@clerk/expo/token-cache";
import { MenuProvider } from "react-native-popup-menu";
import { useEffect, useRef } from "react";
import { ActivityIndicator, View } from "react-native";
import { Colors } from "@/constants/Colors";

SplashScreen.preventAutoHideAsync();

const publishableKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!;

if (!publishableKey) {
  throw new Error("Add your Clerk Publishable Key to the .env file");
}

function AuthGuard() {
  const { isSignedIn, isLoaded } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationReady = useRef(false);

  useEffect(() => {
    navigationReady.current = true;
  }, []);

  useEffect(() => {
    if (!isLoaded || !navigationReady.current) return;

    SplashScreen.hideAsync();

    const rootSegment = segments[0] as string | undefined;
    const inAuth = rootSegment === "(auth)";

    if (!isSignedIn && !inAuth) {
      router.replace("/(auth)");
    } else if (isSignedIn && inAuth) {
      router.replace("/(tabs)");
    }
  }, [isSignedIn, isLoaded, segments, router]);

  if (!isLoaded) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: Colors.surface,
        }}
      >
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return null;
}

export default function RootLayout() {
  return (
    <ClerkProvider publishableKey={publishableKey} tokenCache={tokenCache}>
      <ClerkLoaded>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AppProvider>
            <SupabaseProvider>
              <SocketProvider>
                <MenuProvider>
                  <Stack
                    screenOptions={{
                      headerShown: false,
                    }}
                  >
                    <Stack.Screen name="(auth)" />
                    <Stack.Screen name="(tabs)" />
                    <Stack.Screen
                      name="chat/[id]"
                      options={{ animation: "slide_from_right" }}
                    />
                    <Stack.Screen name="call" options={{ animation: "slide_from_right" }} />
                    <Stack.Screen name="settings" options={{ animation: "slide_from_right" }} />
                    <Stack.Screen name="notifications" options={{ animation: "slide_from_right" }} />
                    <Stack.Screen name="blocked-users" options={{ animation: "slide_from_right" }} />
                  </Stack>
                  <AuthGuard />
                  <StatusBar style="dark" />
                </MenuProvider>
              </SocketProvider>
            </SupabaseProvider>
          </AppProvider>
        </GestureHandlerRootView>
      </ClerkLoaded>
    </ClerkProvider>
  );
}
