
import ProfileForm from '../components/ProfileForm';
import BackupCodes from '../components/BackupCodes';
import ChangePasswordForm from '../components/ChangePasswordForm';
import { Settings } from 'lucide-react';

const AccountSettingsPage = () => {
    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <Settings className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold text-white">Account Settings</h1>
                </div>
                <p className="text-gray-400">
                    Manage your personal profile, password, and security preferences.
                </p>
            </div>

            <div className="space-y-8">
                <ProfileForm />
                <ChangePasswordForm />
                <BackupCodes />
            </div>
        </div>
    );
};

export default AccountSettingsPage;
