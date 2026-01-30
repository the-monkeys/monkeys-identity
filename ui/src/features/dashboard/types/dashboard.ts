export interface Identity {
  id: string;
  name: string;
  type: 'User' | 'Role' | 'Group';
  arn: string;
  lastModified: string;
  status: 'Active' | 'Pending' | 'Disabled';
}

export interface SummaryMetric {
  label: string;
  value: string | number;
  change: number;
  data: number[];
}
