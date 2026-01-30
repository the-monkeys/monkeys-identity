
import AuditLogTable from '../components/AuditLogTable';
import { History } from 'lucide-react';

const AuditLogsPage = () => {
    return (
        <div className="container mx-auto px-6 py-8">
            <div className="mb-8">
                <div className="flex items-center gap-3 mb-2">
                    <History className="h-8 w-8 text-primary" />
                    <h1 className="text-3xl font-bold text-white">Audit Logs</h1>
                </div>
                <p className="text-gray-400">
                    Track system events, user activities, and security actions across your organization.
                </p>
            </div>

            <AuditLogTable />
        </div>
    );
};

export default AuditLogsPage;
