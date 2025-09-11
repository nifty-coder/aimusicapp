import React, { useState, useEffect, useRef } from 'react';
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
import { Loader2, User, Mail, Calendar, Edit3, Save, X, Camera, LogOut, ArrowLeft, Upload } from 'lucide-react';

const Profile = () => {
  const { currentUser, logout, refreshUser } = useAuth();
  const { profile, loading: profileLoading, updateProfilePicture, updateDisplayName } = useProfileAPI();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    email: '',
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [hasUnsavedImageChanges, setHasUnsavedImageChanges] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Helper function to compress image
  const compressImage = (file: File, maxWidth: number = 300, quality: number = 0.6): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        // Calculate new dimensions - more aggressive compression for large images
        let { width, height } = img;
        const maxSize = file.size > 2 * 1024 * 1024 ? 200 : maxWidth; // Smaller size for files > 2MB
        const compressionQuality = file.size > 2 * 1024 * 1024 ? 0.4 : quality; // Lower quality for large files
        
        if (width > maxSize) {
          height = (height * maxSize) / width;
          width = maxSize;
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], 'profile.jpg', {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          'image/jpeg',
          compressionQuality
        );
      };
      
      img.src = URL.createObjectURL(file);
    });
  };

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

  const handleImageSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Error',
          description: 'Please select a valid image file',
          variant: 'destructive',
        });
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'Error',
          description: 'Image size must be less than 5MB',
          variant: 'destructive',
        });
        return;
      }

      setImageFile(file);
      setHasUnsavedImageChanges(true);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = async () => {
    if (!imageFile || !currentUser) return;

    setLoading(true);
    try {
      // Show initial progress
      toast({
        title: 'Saving...',
        description: 'Compressing and saving your profile picture',
      });

      // Compress the image to reduce file size (faster with lower quality)
      const compressedFile = await compressImage(imageFile);
      
      // Convert the compressed image to a data URL
      const dataUrl = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(compressedFile);
      });
      
      // Store the profile picture in Supabase
      await updateProfilePicture(dataUrl);

      // Dispatch custom event to notify other components
      window.dispatchEvent(new CustomEvent('profilePictureUpdated', { 
        detail: { userId: currentUser.uid, dataUrl } 
      }));
      
      // Clear the image states
      setImageFile(null);
      setImagePreview(null);
      setHasUnsavedImageChanges(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      toast({
        title: 'Success',
        description: 'Profile picture updated successfully! You can see it on the main page.',
      });
    } catch (error: any) {
      console.error('Profile picture update error:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to update profile picture',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setHasUnsavedImageChanges(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

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
                      src={imagePreview || profile?.profile_picture || undefined} 
                      alt={displayName} 
                    />
                    <AvatarFallback className="text-2xl font-semibold bg-primary text-primary-foreground">
                      {getInitials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  
                  {/* Hidden file input */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                  <Button
                    size="sm"
                    variant="secondary"
                    className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full p-0"
                    disabled={loading}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                </div>
                <CardTitle className="text-xl text-white">{displayName}</CardTitle>
                <CardDescription className="text-white/70">{userEmail}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-3 text-white/80">
                  <Calendar className="h-4 w-4" />
                  <span className="text-sm">Member since {userCreatedAt}</span>
                </div>
                
                {/* Image Upload Controls */}
                {hasUnsavedImageChanges && (
                  <>
                    <Separator className="bg-white/20" />
                    <div className="space-y-3">
                      <div className="text-center">
                        <p className="text-sm text-white/80 mb-2">New profile picture selected</p>
                        <div className="flex space-x-2 justify-center">
                          <Button
                            size="sm"
                            onClick={handleImageUpload}
                            disabled={loading}
                            className="flex-1"
                          >
                            {loading ? (
                              <>
                                <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              <>
                                <Save className="mr-2 h-3 w-3" />
                                Save Picture
                              </>
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={removeImage}
                            disabled={loading}
                            className="flex-1"
                          >
                            <X className="mr-2 h-3 w-3" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </div>
                  </>
                )}
                
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

                {/* Profile Picture */}
                <div className="space-y-2">
                  <Label className="text-white">
                    <Camera className="inline mr-2 h-4 w-4" />
                    Profile Picture
                    {hasUnsavedImageChanges && (
                      <span className="ml-2 text-xs text-yellow-400">• Unsaved changes</span>
                    )}
                  </Label>
                  <div className="p-3 bg-white/10 rounded-md border border-white/20">
                    <div className="flex items-center justify-between">
                      <span className="text-white">
                        {hasUnsavedImageChanges 
                          ? 'New profile picture selected (not saved)' 
                          : profile?.profile_picture 
                            ? 'Custom profile picture' 
                            : 'Default avatar (initials)'
                        }
                      </span>
                      {profile?.profile_picture && !hasUnsavedImageChanges && (
                         <Button
                           size="sm"
                           variant="outline"
                           onClick={async () => {
                             if (currentUser) {
                               setLoading(true);
                               try {
                                 // Remove profile picture from Supabase
                                 await updateProfilePicture(null);
                                 
                                 // Dispatch custom event to notify other components
                                 window.dispatchEvent(new CustomEvent('profilePictureUpdated', { 
                                   detail: { userId: currentUser.uid, dataUrl: null } 
                                 }));
                                 
                                 toast({
                                   title: 'Success',
                                   description: 'Profile picture removed! You can see the change on the main page.',
                                 });
                               } catch (error: any) {
                                 console.error('Remove profile picture error:', error);
                                 toast({
                                   title: 'Error',
                                   description: 'Failed to remove profile picture',
                                   variant: 'destructive',
                                 });
                               } finally {
                                 setLoading(false);
                               }
                             }
                           }}
                           disabled={loading}
                           className="border-white/20 text-white hover:bg-white/10"
                         >
                           Remove
                         </Button>
                       )}
                    </div>
                  </div>
                  <p className="text-xs text-white/60">
                    {hasUnsavedImageChanges 
                      ? 'Click "Save Picture" to apply your changes or "Cancel" to discard them'
                      : 'Click the camera icon on your avatar to change your profile picture'
                    }
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
