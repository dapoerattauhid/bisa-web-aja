
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, UserCheck } from 'lucide-react';
import type { User } from '@supabase/supabase-js';

interface UserRole {
  user_id: string;
  role: string;
}

interface ProfileUser {
  id: string;
  full_name: string | null;
  created_at: string;
}

export const UserRoleManager = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [profileUsers, setProfileUsers] = useState<ProfileUser[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [useProfiles, setUseProfiles] = useState(false);

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    try {
      // Try to fetch users from auth.users (admin only)
      const { data: usersData, error: usersError } = await supabase.auth.admin.listUsers();
      
      if (usersError) {
        console.error('Error fetching users from auth:', usersError);
        // Fallback: fetch from profiles table
        const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('id, full_name, created_at');
          
        if (profilesError) throw profilesError;
        
        setProfileUsers(profilesData || []);
        setUseProfiles(true);
      } else {
        setUsers(usersData.users || []);
        setUseProfiles(false);
      }

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;
      setUserRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data pengguna",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      // Update or insert user role
      const { error } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: newRole });

      if (error) throw error;

      // Update profiles table as well
      await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      toast({
        title: "Berhasil",
        description: `Role pengguna berhasil diubah menjadi ${newRole}`,
      });

      // Refresh data
      fetchUsersAndRoles();
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        title: "Error",
        description: "Gagal mengubah role pengguna",
        variant: "destructive",
      });
    }
  };

  const getUserRole = (userId: string) => {
    const userRole = userRoles.find(role => role.user_id === userId);
    return userRole?.role || 'parent';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const displayUsers = useProfiles 
    ? profileUsers.map(profile => ({
        id: profile.id,
        email: `User ${profile.id.slice(0, 8)}...`, // Fallback display
        user_metadata: { full_name: profile.full_name },
        created_at: profile.created_at
      }))
    : users;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Users className="h-5 w-5 mr-2" />
          Manajemen Role Pengguna
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayUsers.map((user) => (
            <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-gray-100 rounded-full">
                  {getUserRole(user.id) === 'admin' ? (
                    <Shield className="h-4 w-4 text-red-600" />
                  ) : getUserRole(user.id) === 'cashier' ? (
                    <UserCheck className="h-4 w-4 text-blue-600" />
                  ) : (
                    <Users className="h-4 w-4 text-gray-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">
                    {user.user_metadata?.full_name || user.email}
                  </p>
                  <p className="text-sm text-gray-500">{user.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Select
                  value={getUserRole(user.id)}
                  onValueChange={(newRole) => updateUserRole(user.id, newRole)}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="parent">Parent</SelectItem>
                    <SelectItem value="cashier">Kasir</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
