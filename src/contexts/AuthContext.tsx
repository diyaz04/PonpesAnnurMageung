import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "../lib/supabase";

export type AdminEntity = "pesantren" | "smp";

export type AuthProfile = {
  role: string;
  nama: string;
  entitas: AdminEntity;
};

type ProfileMap = Partial<Record<AdminEntity, AuthProfile>>;

interface AuthContextType {
  user: User | null;
  profile: AuthProfile | null;
  profiles: ProfileMap;
  loading: boolean;
  refreshProfile: (sessionUser?: User | null) => Promise<AuthProfile | null>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type ProfileRow = {
  role: string;
  nama: string;
};

async function loadProfile(
  userId: string,
  tableName: "pp_profiles" | "smp_profiles",
  entitas: AdminEntity,
) {
  const { data, error } = await supabase
    .from(tableName)
    .select("role,nama")
    .eq("id", userId)
    .maybeSingle<ProfileRow>();

  if (error) {
    console.error(`Failed to load ${tableName}`, error);
    return null;
  }

  if (!data) {
    return null;
  }

  return { ...data, entitas };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<AuthProfile | null>(null);
  const [profiles, setProfiles] = useState<ProfileMap>({});
  const [loading, setLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  // requestIdRef dihapus karena menyebabkan race condition
  // yang membuat refreshProfile return null padahal data ada

  const refreshProfile = useCallback(
    async (sessionUser: User | null = userRef.current) => {
      if (!sessionUser) {
        setProfile(null);
        setProfiles({});
        return null;
      }

      const [pesantrenProfile, smpProfile] = await Promise.all([
        loadProfile(sessionUser.id, "pp_profiles", "pesantren"),
        loadProfile(sessionUser.id, "smp_profiles", "smp"),
      ]);

      const nextProfiles: ProfileMap = {};

      if (pesantrenProfile) {
        nextProfiles.pesantren = pesantrenProfile;
      }

      if (smpProfile) {
        nextProfiles.smp = smpProfile;
      }

      const nextProfile = pesantrenProfile ?? smpProfile ?? null;
      setProfiles(nextProfiles);
      setProfile(nextProfile);

      return nextProfile;
    },
    [],
  );

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  useEffect(() => {
    let mounted = true;
    const pendingTimers = new Set<number>();

    async function resolveInitialSession() {
      setLoading(true);
      const { data, error } = await supabase.auth.getSession();

      if (!mounted) {
        return;
      }

      if (error) {
        console.error("Failed to resolve auth session", error);
        setUser(null);
        setProfile(null);
        setProfiles({});
        setLoading(false);
        return;
      }

      const sessionUser = data.session?.user ?? null;
      userRef.current = sessionUser;
      setUser(sessionUser);
      await refreshProfile(sessionUser);

      if (mounted) {
        setLoading(false);
      }
    }

    resolveInitialSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
      const sessionUser = session?.user ?? null;

      setLoading(true);
      userRef.current = sessionUser;
      setUser(sessionUser);

      const timerId = window.setTimeout(() => {
        pendingTimers.delete(timerId);
        refreshProfile(sessionUser).finally(() => {
          if (mounted) {
            setLoading(false);
          }
        });
      }, 0);

      pendingTimers.add(timerId);
    });

    return () => {
      mounted = false;
      pendingTimers.forEach((timerId) => window.clearTimeout(timerId));
      subscription.unsubscribe();
    };
  }, [refreshProfile]);

  const logout = useCallback(async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();

    if (error) {
      setLoading(false);
      throw error;
    }

    setUser(null);
    userRef.current = null;
    setProfile(null);
    setProfiles({});
    setLoading(false);
  }, []);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      profiles,
      loading,
      refreshProfile,
      logout,
    }),
    [loading, logout, profile, profiles, refreshProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
