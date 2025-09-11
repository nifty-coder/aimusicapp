import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import { useProfileAPI } from '@/hooks/useProfileAPI';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Calendar, Edit3, Save, X, LogOut, ArrowLeft } from 'lucide-react';

const Profile = () => {
  const { currentUser, logout, refreshUser } = useAuth();
  const { profile, loading: profileLoading, updateDisplayName } = useProfileAPI();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
  });
  // removed local profile image editing state — profile pictures are managed server-side

  // Update form data when profile changes
  useEffect(() => {
    if (profile) {
      setFormData({
        displayName: profile.display_name || '',
        email: profile.email || '',
      });
    }
  }, [profile]);

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // image compression/upload helpers removed — profile picture editing disabled in-app

  const displayName = profile?.display_name || currentUser?.displayName || currentUser?.email?.split('@')[0] || 'User';
  const userEmail = profile?.email || currentUser?.email || 'No email';
  const userCreatedAt = currentUser?.metadata?.creationTime 
    ? new Date(currentUser.metadata.creationTime).toLocaleDateString()
    : 'Unknown';

  const handleEdit = () => {
    setIsEditing(true);
    setFormData({
      displayName: profile?.display_name || '',
      email: profile?.email || '',
    });
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData({
      displayName: profile?.display_name || '',
      email: profile?.email || '',
    });
  };

  const handleSave = async () => {
    if (!currentUser) return;
    
    // Allow empty display name (will fall back to email)
    const displayNameToSave = formData.displayName.trim() || null;
    
    setLoading(true);
    try {
      // Update the user's display name in Supabase
      await updateDisplayName(displayNameToSave);
      
      // Also update Firebase for consistency
      await updateProfile(currentUser, {
        displayName: displayNameToSave,
      });
      
      toast({
        title: 'Success',
        description: 'Profile updated successfully!',
      });
      setIsEditing(false);
    } catch (error: any) {
      console.error('Profile update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: 'Success',
        description: 'Successfully logged out!',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to logout',
        variant: 'destructive',
      });
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // removing all in-app profile picture editing controls; if users signed up with Google,
  // their Google profile photo will be displayed; otherwise the Supabase-stored picture
  // (if any) or initials will be used.

  return (
    <div className="min-h-screen bg-gradient-hero p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/10 mr-4"
              onClick={() => navigate('/')}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to App
            </Button>
          </div>
          <h1 className="text-4xl font-bold text-white mb-2">Profile</h1>
          <p className="text-white/80">Manage your account settings and preferences</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Profile Card */}
          <div className="lg:col-span-1">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader className="text-center pb-4">
                <div className="relative mx-auto mb-4">
                  <Avatar className="h-24 w-24 mx-auto">
                    <AvatarImage
                      // Prefer Google photoURL when the user signed up with Google
                      src={
                        currentUser?.providerData?.[0]?.providerId === 'google.com'
                          ? currentUser?.photoURL || profile?.profile_picture || undefined
                          : profile?.profile_picture || undefined
                      }
                      alt={displayName}
                    />
                    <AvatarFallback className="text-2xl font-semibold bg-primary text-primary-foreground">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                </div>
                <CardTitle className="text-xl text-white">{displayName}</CardTitle>
                <CardDescription className="text-white/70">{userEmail}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 text-white/80">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Member since {userCreatedAt}</span>
                </div>
                
                <Separator className="bg-white/20" />
                <Button
                  variant="outline"
                  className="w-full border-white/20 text-white hover:bg-white/10"
                  onClick={handleLogout}
                  disabled={loading}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Profile Details */}
          <div className="lg:col-span-2">
            <Card className="bg-white/10 backdrop-blur-sm border-white/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-2xl text-white">Profile Information</CardTitle>
                    <CardDescription className="text-white/70">
                      Update your personal information and preferences
                    </CardDescription>
                  </div>
                  {!isEditing ? (
                    <Button
                      variant="outline"
                      className="border-white/20 text-white hover:bg-white/10"
                      onClick={handleEdit}
                    >
                      <Edit3 className="mr-2 h-4 w-4" />
                      Edit Profile
                    </Button>
                  ) : (
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        className="border-white/20 text-white hover:bg-white/10"
                        onClick={handleCancel}
                        disabled={loading}
                      >
                        <X className="mr-2 h-4 w-4" />
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSave}
                        disabled={loading}
                      >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="mr-2 h-4 w-4" />
                        Save Changes
                      </Button>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Display Name */}
                <div className="space-y-2">
                  <Label htmlFor="displayName" className="text-white">
                    <User className="inline mr-2 h-4 w-4" />
                    Display Name
                  </Label>
                  <p className="text-xs text-white/60">
                    Leave empty to use your email address as display name
                  </p>
                  {isEditing ? (
                    <Input
                      id="displayName"
                      value={formData.displayName}
                      onChange={(e) => handleInputChange('displayName', e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Enter your display name"
                      disabled={loading}
                    />
                  ) : (
                    <div className="p-3 bg-white/10 rounded-md border border-white/20">
                      <span className="text-white">{displayName}</span>
                    </div>
                  )}
                </div>

                {/* Email */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-white">
                    <Mail className="inline mr-2 h-4 w-4" />
                    Email Address
                  </Label>
                  {isEditing ? (
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="bg-white/10 border-white/20 text-white placeholder:text-white/50"
                      placeholder="Enter your email"
                      disabled
                    />
                  ) : (
                    <div className="p-3 bg-white/10 rounded-md border border-white/20">
                      <span className="text-white">{userEmail}</span>
                    </div>
                  )}
                  {isEditing && (
                    <p className="text-xs text-white/60">
                      Email address cannot be changed for security reasons
                    </p>
                  )}
                </div>

                {/* Profile Picture (read-only) */}
                <div className="space-y-2">
                  <Label className="text-white">
                    Profile Picture
                  </Label>
                  <div className="p-3 bg-white/10 rounded-md border border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-white">
                        {currentUser?.providerData?.[0]?.providerId === 'google.com' && currentUser?.photoURL
                          ? 'Using Google profile picture'
                          : profile?.profile_picture
                            ? 'Custom profile picture'
                            : 'Default avatar (initials)'
                        }
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-white/60">
                    Profile pictures can no longer be changed inside the app. If you signed up with Google,
                    your Google profile photo will be used automatically.
                  </p>
                </div>

                {/* Account Type */}
                <div className="space-y-2">
                  <Label className="text-white">Account Type</Label>
                  <div className="p-3 bg-white/10 rounded-md border border-white/20">
                    <span className="text-white">
                      {currentUser?.providerData[0]?.providerId === 'google.com' 
                        ? 'Google Account' 
                        : 'Email & Password'
                      }
                    </span>
                  </div>
                </div>

                {/* Email Verification Status */}
                <div className="space-y-2">
                  <Label className="text-white">Email Verification</Label>
                  <div className="p-3 bg-white/10 rounded-md border border-white/20">
                    <span className={`text-sm ${
                      currentUser?.emailVerified 
                        ? 'text-green-400' 
                        : 'text-yellow-400'
                    }`}>
                      {currentUser?.emailVerified 
                        ? '✓ Email Verified' 
                        : '⚠ Email Not Verified'
                      }
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
