import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';

import PolicyList from '../components/PolicyList';
import PolicyVisualizer from '../components/PolicyVisualizer';
import { MOCK_POLICIES } from '../data/mock';
import { Policy } from '../types';

const PolicyManagement: React.FC = () => {
    const [selectedPolicy, setSelectedPolicy] = useState<Policy>(MOCK_POLICIES[0]);

    return (
        <div className="w-full mx-auto h-[calc(100vh-6rem)] flex flex-col">
            <div className="w-full flex flex-row justify-between items-center mb-6">
                <div className="flex flex-col space-y-1">
                    <h1 className="text-2xl font-bold text-text-main-dark">Policies</h1>
                    <p className="text-sm text-gray-400">Fine-grained permission controls for the primate kingdom.</p>
                </div>
                <Link to="/policies/create" className="px-4 py-2 bg-primary text-white rounded-md text-sm font-semibold flex items-center gap-2 hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 cursor-pointer">
                    <Plus size={16} /> Create Policy
                </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 flex-1 min-h-0">
                <div className="lg:col-span-5 h-full min-h-0">
                    <PolicyList
                        policies={MOCK_POLICIES}
                        selectedPolicy={selectedPolicy}
                        onSelectPolicy={setSelectedPolicy}
                    />
                </div>

                <div className="lg:col-span-7 h-full min-h-0">
                    <PolicyVisualizer policy={selectedPolicy} />
                </div>
            </div>
        </div>
    );
};

export default PolicyManagement;
