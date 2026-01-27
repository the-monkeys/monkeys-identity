import { Policy } from '../types';

export const MOCK_POLICIES: Policy[] = [
    {
        id: '1',
        name: 'AdministratorAccess',
        description: 'Provides full access to monkeys identities services and resources.',
        type: 'Managed',
        usageCount: 12,
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        json: {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: '*',
                    Resource: '*'
                }
            ]
        }
    },
    {
        id: '2',
        name: 'S3ReadOnlyAccess',
        description: 'Provides read-only access to all buckets via S3.',
        type: 'Managed',
        usageCount: 45,
        created_at: '2023-02-15T10:30:00Z',
        updated_at: '2023-02-15T10:30:00Z',
        json: {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: [
                        's3:Get*',
                        's3:List*',
                        's3-object-lambda:Get*',
                        's3-object-lambda:List*'
                    ],
                    Resource: '*'
                }
            ]
        }
    },
    {
        id: '3',
        name: 'UserFullAccess',
        description: 'Allows full management of users.',
        type: 'Customer',
        usageCount: 3,
        created_at: '2023-03-10T14:20:00Z',
        updated_at: '2023-03-20T09:15:00Z',
        json: {
            Version: '2012-10-17',
            Statement: [
                {
                    Effect: 'Allow',
                    Action: 'iam:CreateUser',
                    Resource: 'arn:aws:iam::*:user/*'
                },
                {
                    Effect: 'Deny',
                    Action: 'iam:DeleteUser',
                    Resource: 'arn:aws:iam::*:user/admin'
                }
            ]
        }
    }
];
