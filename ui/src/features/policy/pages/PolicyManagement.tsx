import { Link, useNavigate } from 'react-router';
import { Plus, Loader } from 'lucide-react';

import PolicyList from '../components/PolicyList';
import { useGetAllPolicy } from '@/hooks/policy/useGetAllPolicy';

const PolicyManagement = () => {
    const { data: policies, isLoading } = useGetAllPolicy();
    const navigate = useNavigate();

    return (
        <div className="w-full mx-auto h-[calc(100vh-6rem)] flex flex-col">
            <div className="w-full flex flex-row justify-between items-center mb-6">
                <div className="flex flex-col space-y-1">
                    <h1 className="text-2xl font-bold text-text-main-dark">Policies</h1>
                    <p className="text-sm text-gray-400">Fine-grained permission controls</p>
                </div>
                <Link to="/policies/create" className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 cursor-pointer">
                    <Plus size={16} /> Create Policy
                </Link>
            </div>

            <div className="h-full min-h-0">
                {isLoading ? (
                    <div className="flex items-center justify-center h-full text-gray-400 gap-2">
                        <Loader className="animate-spin" size={20} /> Loading policies...
                    </div>
                ) : (
                    <PolicyList
                        policies={policies || []}
                        selectedPolicy={null}
                        onSelectPolicy={() => { }}
                        onPolicyClick={(path) => navigate(`/policies/${path}`)}
                    />
                )}
            </div>
        </div>
    );
};

export default PolicyManagement;
