import AuditLogTable from '../components/AuditLogTable';

const AuditLogsPage = () => {
    return (
        <div className="w-full mx-auto space-y-6">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-text-main-dark">Audit Logs</h1>
                    <p className="text-sm text-gray-400">Track system events, user activities, and security actions across your organization</p>
                </div>
            </div>

            <AuditLogTable />
        </div>
    );
};

export default AuditLogsPage;
