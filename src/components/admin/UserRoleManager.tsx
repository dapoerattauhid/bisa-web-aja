
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/components/ui/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Users, Shield, UserCheck } from 'lucide-react';

interface UserRole {
  user_id: string;
  role: string;
}

interface ProfileUser {
  id: string;
  full_name: string | null;
  created_at: string;
  role: string | null;
  email?: string | null; // Email will be fetched separately
}

interface ProfileData {
  id: string;
  full_name: string | null;
  created_at: string;
  role: string | null;
}

export const UserRoleManager = () => {
  const [profileUsers, setProfileUsers] = useState<ProfileUser[]>([]);
  const [userRoles, setUserRoles] = useState<UserRole[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsersAndRoles();
  }, []);

  const fetchUsersAndRoles = async () => {
    try {
      console.log('Fetching users and roles...');
      
      // First, fetch from profiles table (without email)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, created_at, role');
        
      if (profilesError) {
        console.error('Error fetching profiles:', profilesError);
        throw profilesError;
      }
      
      console.log('Profiles data:', profilesData);
      
      // Then fetch auth users to get emails
      const { data: { users: authUsers }, error: authError } = await supabase.auth.admin.listUsers();
      
      if (authError) {
        console.error('Error fetching auth users:', authError);
        // Continue without emails if we can't fetch them
      }
      
      // Combine the data with proper type checking
      let combinedUsers: ProfileUser[] = [];
      
      if (profilesData && Array.isArray(profilesData)) {
        combinedUsers = (profilesData as ProfileData[]).map((profile: ProfileData) => ({
          id: profile.id,
          full_name: profile.full_name,
          created_at: profile.created_at,
          role: profile.role,
          email: authUsers?.find(user => user.id === profile.id)?.email || null
        }));
      }
      
      setProfileUsers(combinedUsers);

      // Fetch user roles
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) {
        console.error('Error fetching roles:', rolesError);
        throw rolesError;
      }
      
      console.log('Roles data:', rolesData);
      setUserRoles(rolesData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Gagal memuat data pengguna. Pastikan Anda memiliki akses admin.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      console.log('Updating role for user:', userId, 'to:', newRole);
      
      // Update or insert user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert({ user_id: userId, role: newRole });

      if (roleError) {
        console.error('Error updating user_roles:', roleError);
        throw roleError;
      }

      // Update profiles table as well
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (profileError) {
        console.error('Error updating profiles:', profileError);
        throw profileError;
      }

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
    const profileRole = profileUsers.find(user => user.id === userId)?.role;
    return userRole?.role || profileRole || 'parent';
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
          {profileUsers.length === 0 ? (
            <div className="text-center p-4 text-gray-500">
              Tidak ada data pengguna. Pastikan Anda memiliki akses admin.
            </div>
          ) : (
            profileUsers.map((user) => (
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
                      {user.full_name || user.email || `User ${user.id.slice(0, 8)}`}
                    </p>
                    <p className="text-sm text-gray-500">
                      {user.email || `ID: ${user.id.slice(0, 8)}...`}
                    </p>
                    <p className="text-xs text-gray-400">
                      Role saat ini: {getUserRole(user.id)}
                    </p>
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
