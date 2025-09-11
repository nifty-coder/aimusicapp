import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { apiService, Profile } from '@/lib/api';

export const useProfileAPI = () => {
  const { currentUser } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Get Firebase ID token
  const getFirebaseToken = async (): Promise<string> => {
    if (!currentUser) {
      throw new Error('No authenticated user');
    }
    
    try {
      const token = await currentUser.getIdToken();
      return token;
    } catch (error) {
      console.error('Error getting Firebase token:', error);
      throw new Error('Failed to get authentication token');
    }
  };

  // Fetch profile from backend API
  const fetchProfile = async () => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const token = await getFirebaseToken();
      const response = await apiService.getProfile(token);

      if (response.success && response.data) {
        console.log('Profile fetched successfully:', response.data);
        setProfile(response.data);
      } else {
        if (response.error?.includes('404') || response.error?.includes('not found')) {
          // Profile doesn't exist, create it
          console.log('Profile not found, creating new profile...');
          await createProfile();
        } else {
          console.error('Error fetching profile:', response.error);
          setError(response.error || 'Failed to fetch profile');
        }
      }
    } catch (err: any) {
      console.error('Error fetching profile:', err);
      setError(err.message || 'Failed to fetch profile');
    } finally {
      setLoading(false);
    }
  };

  // Create a new profile
  const createProfile = async () => {
    if (!currentUser) return;

    try {
      const token = await getFirebaseToken();
      
      const newProfileData = {
        user_id: currentUser.uid,
        display_name: currentUser.displayName || null,
        email: currentUser.email || '',
        profile_picture: null,
      };

      console.log('Creating profile for user:', currentUser.uid);
      
      const response = await apiService.createProfile(token, newProfileData);

      if (response.success && response.data) {
        console.log('Profile created successfully:', response.data);
        setProfile(response.data);
      } else {
        console.error('Error creating profile:', response.error);
        setError(response.error || 'Failed to create profile');
      }
    } catch (err: any) {
      console.error('Error creating profile:', err);
      setError(err.message || 'Failed to create profile');
    }
  };

  // Update profile
  const updateProfile = async (updates: Partial<Profile>) => {
    if (!currentUser || !profile) return;

    try {
      setError(null);
      const token = await getFirebaseToken();

      const response = await apiService.updateProfile(token, updates);

      if (response.success && response.data) {
        console.log('Profile updated successfully:', response.data);
        setProfile(response.data);
        return response.data;
      } else {
        console.error('Error updating profile:', response.error);
        setError(response.error || 'Failed to update profile');
        throw new Error(response.error || 'Failed to update profile');
      }
    } catch (err: any) {
      console.error('Error updating profile:', err);
      setError(err.message || 'Failed to update profile');
      throw err;
    }
  };

  // Update profile picture
  const updateProfilePicture = async (profilePicture: string | null) => {
    return updateProfile({ profile_picture: profilePicture });
  };

  // Update display name
  const updateDisplayName = async (displayName: string | null) => {
    return updateProfile({ display_name: displayName });
  };

  // Delete profile
  const deleteProfile = async () => {
    if (!currentUser) return;

    try {
      setError(null);
      const token = await getFirebaseToken();

      const response = await apiService.deleteProfile(token);

      if (response.success) {
        console.log('Profile deleted successfully');
        setProfile(null);
      } else {
        console.error('Error deleting profile:', response.error);
        setError(response.error || 'Failed to delete profile');
        throw new Error(response.error || 'Failed to delete profile');
      }
    } catch (err: any) {
      console.error('Error deleting profile:', err);
      setError(err.message || 'Failed to delete profile');
      throw err;
    }
  };

  // Fetch profile when currentUser changes
  useEffect(() => {
    fetchProfile();
  }, [currentUser]);

  return {
    profile,
    loading,
    error,
    updateProfile,
    updateProfilePicture,
    updateDisplayName,
    deleteProfile,
    refetch: fetchProfile,
  };
};
