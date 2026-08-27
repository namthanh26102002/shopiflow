import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useAdmin } from '@/hooks/useAdmin';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Copy, Check, RefreshCw, Users, KeyRound } from 'lucide-react';
import { toast } from 'sonner';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

interface UserInfo {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  email_confirmed_at: string | null;
}

const AdminUsers: React.FC = () => {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState<string | null>(null);

  const isOwner = isAdmin;
  const checking = authLoading || adminLoading;

  useEffect(() => {
    if (!checking && (!user || !isOwner)) {
      navigate('/builder', { replace: true });
    }
  }, [user, checking, isOwner, navigate]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      // supabase.functions.invoke uses POST by default, let's use fetch directly
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-users?action=list`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setUsers(data.users || []);
    } catch (err: any) {
      toast.error('Failed to load users: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOwner) fetchUsers();
  }, [isOwner]);

  const handleResetPassword = async (email: string) => {
    setResetting(email);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/admin-users?action=reset-password`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        }
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      if (data.resetLink) {
        await navigator.clipboard.writeText(data.resetLink);
        setCopiedLink(email);
        setTimeout(() => setCopiedLink(null), 3000);
        toast.success('Password reset link copied to clipboard! Share it with the user.');
      } else {
        toast.success(data.message);
      }
    } catch (err: any) {
      toast.error('Failed to reset password: ' + err.message);
    } finally {
      setResetting(null);
    }
  };

  if (checking || !isOwner) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="h-14 border-b border-border bg-card flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => navigate('/builder')}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <Users className="w-5 h-5 text-primary" />
          <h1 className="text-sm font-semibold text-foreground">User Management</h1>
        </div>
        <Button variant="outline" size="sm" onClick={fetchUsers} disabled={loading}>
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </header>

      <div className="max-w-5xl mx-auto p-6">
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Signed Up</TableHead>
                <TableHead>Last Sign In</TableHead>
                <TableHead>Verified</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Loading users...
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium text-foreground">{u.email}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(u.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {u.last_sign_in_at ? new Date(u.last_sign_in_at).toLocaleDateString() : '—'}
                    </TableCell>
                    <TableCell>
                      <span className={`text-xs px-2 py-0.5 rounded-full ${u.email_confirmed_at ? 'bg-green-500/10 text-green-500' : 'bg-yellow-500/10 text-yellow-500'}`}>
                        {u.email_confirmed_at ? 'Yes' : 'No'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResetPassword(u.email)}
                        disabled={resetting === u.email}
                      >
                        {resetting === u.email ? (
                          <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        ) : copiedLink === u.email ? (
                          <Check className="w-3.5 h-3.5 mr-1.5 text-green-500" />
                        ) : (
                          <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                        )}
                        {copiedLink === u.email ? 'Link Copied!' : 'Reset Password'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
