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
  signUp: (email: string, password: string, accessCode: string) => Promise<{ error: Error | null }>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  validateAccessCode: (code: string) => Promise<boolean>;
  checkTrialStatus: () => Promise<TrialInfo | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [trialInfo, setTrialInfo] = useState<TrialInfo | null>(null);

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
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const signOut = async () => {
    setTrialInfo(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, trialInfo, signUp, signIn, signOut, validateAccessCode, checkTrialStatus }}>
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
