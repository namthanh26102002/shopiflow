import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, loading, accessCodeClaimed, claimCheckFailed, checkTrialStatus, signOut } = useAuth();
  const [trialChecked, setTrialChecked] = useState(false);
  const [trialExpired, setTrialExpired] = useState(false);
  const [trialDays, setTrialDays] = useState<number | null>(null);

  useEffect(() => {
    const check = async () => {
      if (!user) {
        setTrialChecked(true);
        return;
      }
      const trial = await checkTrialStatus();
      if (trial?.is_expired) {
        setTrialExpired(true);
        setTrialDays(trial.trial_days);
        await signOut();
      }
      setTrialChecked(true);
    };
    if (!loading) {
      check();
    }
  }, [user, loading]);

  if (loading || !trialChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (trialExpired) {
    return <Navigate to="/auth?trial_expired=true" replace />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  // Still checking whether a code has been claimed. A failed check falls
  // through to /auth, which explains it and offers a retry.
  if (accessCodeClaimed === null && !claimCheckFailed) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // An OAuth session can exist without a claimed code, since the provider has
  // nowhere to carry one. Send them back to finish signing up.
  if (accessCodeClaimed !== true) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
};
