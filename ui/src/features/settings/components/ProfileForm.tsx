
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import { profileAPI, UpdateProfileRequest } from '../api/profile';
import { User } from '@/features/users/types/user';
import { Loader2, Save, User as UserIcon } from 'lucide-react';

const ProfileForm = () => {
    const { user } = useAuth();
    const [profile, setProfile] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form state
    const [displayName, setDisplayName] = useState('');
    const [avatarUrl, setAvatarUrl] = useState('');

    useEffect(() => {
        if (user?.id) {
            loadProfile(user.id);
        }
    }, [user?.id]);

    const loadProfile = async (userId: string) => {
        try {
            setIsLoading(true);
            const response = await profileAPI.getProfile(userId);
            const userData = response.data.data;
            setProfile(userData);
            setDisplayName(userData.display_name || '');
            setAvatarUrl(userData.avatar_url || '');
        } catch (error) {
            console.error('Failed to load profile:', error);
            setMessage({ type: 'error', text: 'Failed to load profile data.' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user?.id) return;

        try {
            setIsSaving(true);
            setMessage(null);

            const updateData: UpdateProfileRequest = {
                display_name: displayName,
                avatar_url: avatarUrl,
            };

            await profileAPI.updateProfile(user.id, updateData);
            setMessage({ type: 'success', text: 'Profile updated successfully.' });

            // Refresh profile data
            loadProfile(user.id);
        } catch (error) {
            console.error('Failed to update profile:', error);
            setMessage({ type: 'error', text: 'Failed to save changes.' });
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="bg-bg-card-dark border border-border-color-dark rounded-lg p-6 max-w-2xl">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-primary" />
                Profile Information
            </h2>

            {message && (
                <div className={`mb-6 p-4 rounded-md text-sm ${message.type === 'success' ? 'bg-green-900/30 text-green-400 border border-green-800' : 'bg-red-900/30 text-red-400 border border-red-800'
                    }`}>
                    {message.text}
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Display Name</label>
                    <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full bg-bg-main-dark border border-border-color-dark rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                        placeholder="Your full name"
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Avatar</label>
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0">
                            {avatarUrl ? (
                                <img
                                    src={avatarUrl}
                                    alt="Avatar preview"
                                    className="w-16 h-16 rounded-full object-cover border-2 border-border-color-dark"
                                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                                />
                            ) : (
                                <div className="w-16 h-16 rounded-full bg-slate-700 flex items-center justify-center border-2 border-border-color-dark">
                                    <UserIcon className="h-8 w-8 text-gray-500" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={avatarUrl}
                                onChange={(e) => setAvatarUrl(e.target.value)}
                                className="w-full bg-bg-main-dark border border-border-color-dark rounded-md px-4 py-2 text-white focus:outline-none focus:ring-1 focus:ring-primary"
                                placeholder="https://example.com/avatar.png"
                            />
                            <p className="mt-1 text-xs text-gray-500">Provide a URL to your profile picture.</p>
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">Email Address</label>
                    <input
                        type="email"
                        value={profile?.email || ''}
                        disabled
                        className="w-full bg-bg-main-dark/50 border border-border-color-dark rounded-md px-4 py-2 text-gray-500 cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">Email address cannot be changed.</p>
                </div>

                <div className="pt-4">
                    <button
                        type="submit"
                        disabled={isSaving}
                        className="flex items-center gap-2 bg-primary text-bg-main-dark px-6 py-2 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Saving...
                            </>
                        ) : (
                            <>
                                <Save className="h-4 w-4" />
                                Save Changes
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default ProfileForm;
