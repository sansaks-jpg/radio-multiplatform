import { useAuthStore } from "../stores/authStore";
import type { Profile } from "../types";

export interface ProfileView {
  profile: Profile | null;
  isLoggedIn: boolean;
  initializing: boolean;
}

/** Profile data comes from the auth store (restored/updated on sign-in). */
export function useProfile(): ProfileView {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);
  const initializing = useAuthStore((s) => s.initializing);
  return { profile, isLoggedIn: session !== null, initializing };
}
