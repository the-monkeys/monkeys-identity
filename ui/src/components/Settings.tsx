import React from 'react';
import { Construction } from 'lucide-react';

export default function Settings() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted">
            <Construction size={64} className="mb-4 text-yellow-500" />
            <h2 className="text-2xl font-bold text-[var(--text)]">Coming Soon</h2>
            <p>System settings and preferences will be available here.</p>
        </div>
    );
}
