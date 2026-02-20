import { useParams, Link } from 'react-router';
import { ArrowLeft, Loader } from 'lucide-react';

import PolicyVisualizer from '../components/PolicyVisualizer';
import { useGetPolicyById } from '@/hooks/policy/useGetPolicyById';

const PolicyDetail = () => {
    const { policyId } = useParams<{ policyId: string }>();
    const { data: policy, isLoading, error } = useGetPolicyById(policyId);

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center text-gray-400 gap-2">
                <Loader className="animate-spin" size={20} /> Loading policy...
            </div>
        );
    }

    if (error || !policy) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-4">
                <p>Failed to load policy or policy not found.</p>
                <Link to="/policies" className="text-primary hover:underline flex items-center gap-2">
                    <ArrowLeft size={16} /> Back to Policies
                </Link>
            </div>
        );
    }

    return (
        <div className="w-full mx-auto h-[calc(100vh-6rem)] flex flex-col">
            <div className="w-full flex flex-row justify-between items-center mb-6">
                <div className="flex flex-col space-y-1">
                    <div className="flex items-center gap-2 text-sm text-gray-400 mb-1">
                        <Link to="/policies" className="hover:text-gray-200 transition-colors">Policies</Link>
                        <span>/</span>
                        <span className="text-text-main-dark">{policy.name}</span>
                    </div>
                    <h1 className="text-2xl font-bold text-text-main-dark">{policy.name}</h1>
                    <p className="text-sm text-gray-400">{policy.description}</p>
                </div>
            </div>

            <div className="flex-1 min-h-0 bg-bg-card-dark border border-border-color-dark rounded-xl shadow-sm overflow-hidden">
                <PolicyVisualizer policy={policy} />
            </div>
        </div>
    );
};

export default PolicyDetail;
