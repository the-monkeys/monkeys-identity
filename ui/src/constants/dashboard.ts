import { Identity, SummaryMetric } from '@/Types/interfaces';

export const mockSummary: SummaryMetric[] = [
  { label: 'Total Users', value: 1248, change: 12, data: [10, 15, 8, 12, 18, 14, 20] },
  { label: 'Active Sessions', value: 342, change: 5, data: [30, 25, 35, 32, 40, 38, 45] },
  /*{ label: 'Security Alerts', value: 3, change: -10, data: [5, 4, 3, 2, 4, 1, 3] },*/
];

export const mockIdentities: Identity[] = [
  { id: '001', name: 'billing-manager-role', type: 'Role', arn: 'arn:monkeys-iam::7721:role/billing-manager', lastModified: '2025-01-24 14:22', status: 'Active' },
  { id: '002', name: 'dev-ops-group', type: 'Group', arn: 'arn:monkeys-iam::7721:group/dev-ops', lastModified: '2025-01-24 10:15', status: 'Active' },
  { id: '003', name: 'admin.support', type: 'User', arn: 'arn:monkeys-iam::7721:user/admin.support', lastModified: '2025-01-23 18:40', status: 'Pending' },
  { id: '004', name: 'readonly-auditor', type: 'Role', arn: 'arn:monkeys-iam::7721:role/readonly-auditor', lastModified: '2025-01-22 09:12', status: 'Active' },
  { id: '05', name: 'external-contractor', type: 'User', arn: 'arn:monkeys-iam::7721:user/external-contractor', lastModified: '2025-01-21 11:30', status: 'Disabled' },
];