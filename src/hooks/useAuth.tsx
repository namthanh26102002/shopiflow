import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface TrialInfo {
  is_expired: boolean;
  days_remaining: number;
  trial_days: number;
  expires_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  trialInfo: TrialInfo | null;
  /** null while unknown. False means signed in but no access code claimed yet,
   *  which is possible after OAuth since the provider carries no code. */
  accessCodeClaimed: boolean | null;
  /** True when the claim check itself failed, so the UI can offer a retry
   *  instead of spinning forever. */
  claimCheckFailed: boolean;
  /** True while the user is following a password-reset link. */
  recoveryMode: boolean;
  signUp: (email: string, password: string, accessCode: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  validateAccessCode: (code: string) => Promise<boolean>;
  claimAccessCode: (code: string) => Promise<{ error: Error | null }>;
  requestPasswordReset: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  checkTrialStatus: () => Promise<TrialInfo | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);
  const [accessCodeClaimed, setAccessCodeClaimed] = useState<boolean | null>(null);
  const [claimCheckFailed, setClaimCheckFailed] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(false);

  const checkTrialStatus = async (userId?: string): Promise<TrialInfo | null> => {
    const uid = userId || user?.id;
    if (!uid) return null;

    try {
      const { data, error } = await supabase.rpc('check_trial_status', { _user_id: uid });
      if (error) {
        console.error('Error checking trial status:', error);
        return null;
      }
      // NULL means permanent access (no trial)
      if (data === null) {
        setTrialInfo(null);
        return null;
      }
      const info = data as unknown as TrialInfo;
      setTrialInfo(info);
      return info;
    } catch (err) {
      console.error('Error checking trial status:', err);
      return null;
    }
  };

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);

        // Fired when the user opens a reset link; the session it creates is
        // only good for setting a new password.
        if (event === 'PASSWORD_RECOVERY') setRecoveryMode(true);
        if (event === 'SIGNED_OUT') {
          setClaimCheckFailed(false);
          setAccessCodeClaimed(null);
          setRecoveryMode(false);
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // OAuth users arrive authenticated but with no code claimed, so this is what
  // the sign-in screen and ProtectedRoute gate on.
  const refreshAccessCodeClaim = async (userId: string) => {
    try {
      const { data, error } = await supabase.rpc('has_access_code', { _user_id: userId });
      if (error) throw error;
      setAccessCodeClaimed(data === true);
      setClaimCheckFailed(false);
    } catch (err) {
      // Failing open would defeat the gate, and leaving it null spins forever,
      // so surface it and let the user retry.
      console.error('Error checking access code claim:', err);
      setAccessCodeClaimed(null);
      setClaimCheckFailed(true);
    }
  };

  useEffect(() => {
    if (!user) { setAccessCodeClaimed(null); return; }
    refreshAccessCodeClaim(user.id);
  }, [user]);

  const validateAccessCode = async (code: string): Promise<boolean> => {
    try {
      const { data, error } = await supabase.functions.invoke('access-code', {
        body: { action: 'validate', code: code.toUpperCase().trim() },
      });
      if (error) {
        console.error('Error validating access code:', error);
        return false;
      }
      return data?.valid === true;
    } catch (err) {
      console.error('Error validating access code:', err);
      return false;
    }
  };

  const signUp = async (email: string, password: string, accessCode: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      return { error };
    }

    if (data.user) {
      const { data: claimResult, error: claimError } = await supabase.functions.invoke('access-code', {
        body: { action: 'claim', code: accessCode.toUpperCase().trim() },
      });

      if (claimError || claimResult?.claimed !== true) {
        await supabase.auth.signOut();
        return { error: new Error('Invalid or already used access code. Please try again with a different code.') };
      }

      // The session already exists, so the claim flag was computed before this
      // claim landed. Without refreshing, the user is held on the "enter your
      // access code" step having just entered one.
      await refreshAccessCodeClaim(data.user.id);
    }

    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error };
    }

    // Check trial status after successful sign-in
    if (data.user) {
      const trial = await checkTrialStatus(data.user.id);
      if (trial?.is_expired) {
        await supabase.auth.signOut();
        return { error: new Error(`Your ${trial.trial_days}-day free trial has expired. Contact support to continue access.`) };
      }
    }

    return { error: null };
  };

  /**
   * Google sign-in. The provider cannot carry an access code, so the gate is
   * applied on return: the user lands authenticated but with no code claimed,
   * and the Auth screen asks for one before letting them through.
   */
  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    return { error: error ?? null };
  };

  /** Claim a code for the signed-in user, used after OAuth. */
  const claimAccessCode = async (code: string) => {
    if (!user) return { error: new Error('You need to be signed in') };

    const { data, error } = await supabase.functions.invoke('access-code', {
      body: { action: 'claim', code: code.toUpperCase().trim() },
    });

    if (error || data?.claimed !== true) {
      return { error: new Error('Invalid or already used access code.') };
    }

    await refreshAccessCodeClaim(user.id);
    return { error: null };
  };

  const requestPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: `${window.location.origin}/auth`,
    });
    return { error: error ?? null };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    if (!error) setRecoveryMode(false);
    return { error: error ?? null };
  };

  const signOut = async () => {
    setTrialInfo(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{
      user, session, loading, trialInfo, accessCodeClaimed, claimCheckFailed, recoveryMode,
      signUp, signIn, signInWithGoogle, signOut,
      validateAccessCode, claimAccessCode,
      requestPasswordReset, updatePassword, checkTrialStatus,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
