import React, { useState } from 'react';
import { Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import {
  ACCESS_CODE_MAX_LENGTH,
  normalizeAccessCode,
  describeAccessCodeProblem,
} from '@/lib/accessCode';

const Auth: React.FC = () => {
  const {
    user, loading, signIn, signUp, signInWithGoogle,
    accessCodeClaimed, claimAccessCode,
    recoveryMode, requestPasswordReset, updatePassword,
  } = useAuth();
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const isSignUp = mode === 'signup';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newPassword, setNewPassword] = useState('');

  const trialExpired = searchParams.get('trial_expired') === 'true';
  // Shown as you type, so a malformed code is obvious before submitting.
  const accessCodeProblem = describeAccessCodeProblem(normalizeAccessCode(accessCode));

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // A password-reset link signs the user in; that session is only for setting
  // a new password, so it must not fall through to the app.
  if (user && !recoveryMode && accessCodeClaimed === true) {
    return <Navigate to="/builder" replace />;
  }

  // Signed in but unclaimed: OAuth has nowhere to carry a code, so ask now.
  const needsAccessCode = !!user && !recoveryMode && accessCodeClaimed === false;

  // Waiting on the claim check for a signed-in user.
  if (user && !recoveryMode && accessCodeClaimed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      toast.error('Please enter email and password');
      return;
    }

    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    if (isSignUp) {
      const problem = describeAccessCodeProblem(normalizeAccessCode(accessCode));
      if (problem) {
        toast.error(problem);
        return;
      }
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, accessCode);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Account created! You are now signed in.');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success('Welcome back!');
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Set a new password, after following a reset link -------------------
  if (recoveryMode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Choose a new password</h1>
            <p className="text-sm text-muted-foreground">
              You followed a reset link. Set a new password to finish.
            </p>
          </div>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (newPassword.length < 6) {
                toast.error('Password must be at least 6 characters');
                return;
              }
              setIsSubmitting(true);
              const { error } = await updatePassword(newPassword);
              setIsSubmitting(false);
              if (error) toast.error(error.message);
              else toast.success('Password updated. You are signed in.');
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="newPassword">New password</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input-clean"
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Update password'}
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // --- Signed in via a provider, but no access code claimed ----------------
  if (needsAccessCode) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">One more step</h1>
            <p className="text-sm text-muted-foreground">
              Signed in as {user?.email}. Enter your access code to finish setting
              up your account.
            </p>
          </div>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              const problem = describeAccessCodeProblem(normalizeAccessCode(accessCode));
              if (problem) { toast.error(problem); return; }
              setIsSubmitting(true);
              const { error } = await claimAccessCode(accessCode);
              setIsSubmitting(false);
              if (error) toast.error(error.message);
              else toast.success('Access code accepted.');
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="claimCode">Access Code</Label>
              <Input
                id="claimCode"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="input-clean font-mono"
                maxLength={ACCESS_CODE_MAX_LENGTH}
                placeholder="Enter your access code"
              />
              <p className="text-xs text-muted-foreground">
                {accessCodeProblem && accessCode
                  ? accessCodeProblem
                  : 'Every account needs a valid access code'}
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Checking...' : 'Continue'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={signOut}>
              Sign out
            </Button>
          </form>
        </div>
      </div>
    );
  }

  // --- Request a reset email ----------------------------------------------
  if (mode === 'forgot') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-foreground mb-2">Reset your password</h1>
            <p className="text-sm text-muted-foreground">
              We&apos;ll email you a link to choose a new one.
            </p>
          </div>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!email.trim()) { toast.error('Please enter your email'); return; }
              setIsSubmitting(true);
              const { error } = await requestPasswordReset(email);
              setIsSubmitting(false);
              // Deliberately the same message either way, so this cannot be
              // used to discover which emails have accounts.
              if (error) toast.error(error.message);
              else toast.success('If that email has an account, a reset link is on its way.');
            }}
          >
            <div className="space-y-2">
              <Label htmlFor="resetEmail">Email</Label>
              <Input
                id="resetEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-clean"
                autoComplete="email"
                placeholder="you@example.com"
              />
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" onClick={() => setMode('signin')}>
              Back to sign in
            </Button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {trialExpired && (
          <div className="mb-6 p-4 rounded-lg border border-destructive/50 bg-destructive/10 text-sm">
            <div className="flex items-center gap-2 text-destructive font-medium mb-1">
              <AlertTriangle className="w-4 h-4" />
              Trial Expired
            </div>
            <p className="text-muted-foreground">
              Your free trial has expired. Please contact support to continue accessing your account.
            </p>
          </div>
        )}

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isSignUp ? 'Create Account' : 'Welcome Back'}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isSignUp 
              ? 'Sign up to save your quizzes' 
              : 'Sign in to access your quizzes'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input-clean"
              autoComplete="email"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input-clean"
              autoComplete={isSignUp ? 'new-password' : 'current-password'}
            />
          </div>

          {isSignUp && (
            <div className="space-y-2">
              <Label htmlFor="accessCode">Access Code</Label>
              <Input
                id="accessCode"
                type="text"
                placeholder="Enter your access code"
                value={accessCode}
                onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                className="input-clean font-mono"
                maxLength={ACCESS_CODE_MAX_LENGTH}
              />
              <p className="text-xs text-muted-foreground">
                {accessCodeProblem && accessCode
                  ? accessCodeProblem
                  : 'You need a valid access code to create an account'}
              </p>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Please wait...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Button>

          {!isSignUp && (
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Forgot your password?
            </button>
          )}
        </form>

        <div className="my-6 flex items-center gap-3">
          <span className="h-px flex-1 bg-border" />
          <span className="text-xs text-muted-foreground">or</span>
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          disabled={isSubmitting}
          onClick={async () => {
            setIsSubmitting(true);
            const { error } = await signInWithGoogle();
            // On success the browser leaves for Google, so only failures land here.
            if (error) { toast.error(error.message); setIsSubmitting(false); }
          }}
        >
          <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.65l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9l3.66-2.84z"/>
            <path fill="#EA4335" d="M12 4.75c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 1.46 14.97.5 12 .5A11 11 0 0 0 2.18 7.05l3.66 2.84c.87-2.6 3.3-4.14 6.16-4.14z"/>
          </svg>
          Continue with Google
        </Button>

        <p className="mt-3 text-center text-xs text-muted-foreground">
          You&apos;ll be asked for your access code after signing in with Google.
        </p>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => setMode(isSignUp ? 'signin' : 'signup')}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isSignUp 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Sign up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Auth;
