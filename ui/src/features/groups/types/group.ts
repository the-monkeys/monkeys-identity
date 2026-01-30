export interface Group {
  id: string;
  name: string;
  description: string;
  organization_id: string;
  parent_group_id?: string;
  group_type: string;
  attributes?: string; // JSONB as string
  max_members: number;
  status: 'active' | 'archived' | 'suspended';
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface GroupMembership {
  id: string;
  group_id: string;
  principal_id: string;
  principal_type: 'user' | 'service_account';
  role_in_group: string;
  joined_at: string;
  expires_at?: string;
  added_by: string;
}

export interface GroupMember {
  id: string;
  principal_id: string;
  name: string;
  email?: string;
  type: 'user' | 'service_account';
  role_in_group: string;
  joined_at: string;
  expires_at?: string;
}

export interface CreateGroupRequest {
  name: string;
  description: string;
  organization_id: string;
  parent_group_id?: string;
  group_type: string;
  max_members?: number;
}

export interface UpdateGroupRequest {
  name?: string;
  description?: string;
  parent_group_id?: string;
  group_type?: string;
  max_members?: number;
  status?: string;
}

export interface AddGroupMemberRequest {
  principal_id: string;
  principal_type: 'user' | 'service_account';
  role_in_group: string;
  expires_at?: string;
}
