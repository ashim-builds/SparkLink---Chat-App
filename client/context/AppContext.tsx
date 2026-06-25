import { API_BASE_URL } from "@/constants/Config";
import { AuthState, User } from "@/types";
import { useAuth } from "@clerk/expo";
import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Platform } from "react-native";

type ProfileUpdate = Partial<Pick<User, "name" | "handle" | "bio">> & {
  avatarUri?: string;
};

interface AppContextType {
  auth: AuthState;
  logout: () => Promise<void>;
  refreshProfile: (force?: boolean) => Promise<void>;
  updateUser: (updates: ProfileUpdate) => Promise<User>;
}

const AppContext = createContext<AppContextType | null>(null);

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeout?: number } = {},
) {
  const { timeout = 8000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const { getToken, isLoaded, isSignedIn, signOut, userId } = useAuth();

  // Use refs to track auth status and avoid re-triggering effect loops
  const isSignedInRef = useRef(isSignedIn);
  const userIdRef = useRef(userId);
  const fetchedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    isSignedInRef.current = isSignedIn;
    userIdRef.current = userId;
    if (!isSignedIn) {
      fetchedUserIdRef.current = null;
    }
  }, [isSignedIn, userId]);

  const profileRequestId = useRef(0);
  const [auth, setAuth] = useState<AuthState>({
    token: null,
    user: null,
    loading: true,
    error: null,
  });

  // getToken is stable (Clerk guarantees it), so authHeaders is stable too.
  const authHeaders = useCallback(async () => {
    const token = await getToken();
    if (!token) throw new Error("You are not signed in.");
    return {
      token,
      headers: { Authorization: `Bearer ${token}` } as Record<string, string>,
    };
  }, [getToken]);

  // refreshProfile reads from the refs so it stays stable
  // and doesn't need to be in the useEffect dependency array.
  const refreshProfile = useCallback(async (force = false) => {
    const currentUserId = userIdRef.current;
    if (!isSignedInRef.current || !currentUserId) {
      setAuth({ token: null, user: null, loading: false, error: null });
      fetchedUserIdRef.current = null;
      return;
    }

    // Skip if we already successfully fetched profile for this user, unless forced
    if (fetchedUserIdRef.current === currentUserId && !force) {
      return;
    }

    const requestId = ++profileRequestId.current;
    setAuth((prev) => ({ ...prev, loading: !prev.user, error: null }));

    try {
      const { token, headers } = await authHeaders();
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/profile`, {
        headers,
        timeout: 8000,
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        const message =
          response.status === 401
            ? "Your session could not be verified by the server."
            : data.message || "Failed to load profile.";
        throw new Error(message);
      }

      if (requestId === profileRequestId.current) {
        setAuth({ token, user: data.user, loading: false, error: null });
        fetchedUserIdRef.current = currentUserId; // Mark as successfully fetched
      }
    } catch (error) {
      if (requestId === profileRequestId.current) {
        setAuth((prev) => ({
          ...prev,
          loading: false,
          error:
            error instanceof Error ? error.message : "Failed to load profile.",
        }));
      }
    }
  }, [authHeaders]); // authHeaders is stable → refreshProfile is stable

  // Sign out: clear local state then call Clerk signOut.
  // Navigation back to /(auth) is handled by AuthGuard reacting to isSignedIn.
  // Do NOT call router.replace here — AppProvider is above the Stack navigator
  // so calling router from here triggers cascading re-renders.
  const logout = useCallback(async () => {
    // Clear local state immediately so the UI resets right away
    setAuth({ token: null, user: null, loading: false, error: null });
    try {
      await signOut();
    } catch (err) {
      // Log but swallow — the local state is already cleared and
      // AuthGuard will redirect once Clerk's isSignedIn becomes false.
      console.warn("Clerk signOut error (non-fatal):", err);
    }
  }, [signOut]);

  const updateUser = useCallback(
    async (updates: ProfileUpdate) => {
      const { token } = await authHeaders();
      const formData = new FormData();

      if (updates.name !== undefined) formData.append("name", updates.name);
      if (updates.handle !== undefined)
        formData.append("handle", updates.handle);
      if (updates.bio !== undefined) formData.append("bio", updates.bio);

      if (updates.avatarUri) {
        // Detect MIME type from the file extension
        const extension = updates.avatarUri.split(".").pop()?.toLowerCase();
        const mimeType =
          extension === "png"
            ? "image/png"
            : extension === "gif"
              ? "image/gif"
              : extension === "webp"
                ? "image/webp"
                : "image/jpeg";
        const fileName = `avatar.${extension || "jpg"}`;

        if (
          Platform.OS === "web" ||
          updates.avatarUri.startsWith("data:") ||
          updates.avatarUri.startsWith("blob:")
        ) {
          // Web or data/blob URI → convert to blob via fetch
          const blob = await (await fetch(updates.avatarUri)).blob();
          formData.append("avatar", blob, fileName);
        } else {
          // React Native file URI — use the RN FormData file object format
          formData.append("avatar", {
            uri: updates.avatarUri,
            name: fileName,
            type: mimeType,
          } as any);
        }
      }

      // Do NOT set Content-Type manually — React Native's fetch sets
      // "multipart/form-data; boundary=…" automatically when body is FormData.
      const response = await fetchWithTimeout(`${API_BASE_URL}/api/users/profile`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        timeout: 15000, // Allow extra time for image uploads
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to update profile.");
      }

      setAuth({ token, user: data.user, loading: false, error: null });
      return data.user as User;
    },
    [authHeaders],
  );

  // Only re-run when isLoaded or isSignedIn changes.
  // refreshProfile is intentionally omitted from deps — it's stable (see above)
  // and adding it would recreate this effect whenever authHeaders recreates,
  // causing an infinite fetch loop.
  useEffect(() => {
    if (!isLoaded) return;
    refreshProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const value = useMemo(
    () => ({ auth, logout, refreshProfile, updateUser }),
    [auth, logout, refreshProfile, updateUser],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}

export const userApp = useApp;
