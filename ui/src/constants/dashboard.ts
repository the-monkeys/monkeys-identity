import { Identity } from '@/features/dashboard/types/dashboard';

export const mockIdentities: Identity[] = [
  { id: '001', name: 'billing-manager-role', type: 'Role', arn: 'arn:monkeys-iam::7721:role/billing-manager', lastModified: '2025-01-24 14:22', status: 'Active' },
  { id: '002', name: 'dev-ops-group', type: 'Group', arn: 'arn:monkeys-iam::7721:group/dev-ops', lastModified: '2025-01-24 10:15', status: 'Active' },
  { id: '003', name: 'admin.support', type: 'User', arn: 'arn:monkeys-iam::7721:user/admin.support', lastModified: '2025-01-23 18:40', status: 'Pending' },
  { id: '004', name: 'readonly-auditor', type: 'Role', arn: 'arn:monkeys-iam::7721:role/readonly-auditor', lastModified: '2025-01-22 09:12', status: 'Active' },
  { id: '05', name: 'external-contractor', type: 'User', arn: 'arn:monkeys-iam::7721:user/external-contractor', lastModified: '2025-01-21 11:30', status: 'Disabled' },
];