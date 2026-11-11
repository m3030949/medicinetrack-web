export type OrganizationType = 'PHARMACY' | 'HOSPITAL';
export type OrganizationStatus = 'ACTIVE' | 'SUSPENDED' | 'INACTIVE';

export type UserRole =
  | 'SUPER_ADMIN'
  | 'PHARMACY_ADMIN'
  | 'HOSPITAL_ADMIN'
  | 'CLINICIAN'
  | 'NURSE';

export type UserStatus = 'ACTIVE' | 'INVITED' | 'SUSPENDED' | 'LOCKED';

export interface OrganizationSummary {
  id: string;
  code: string;
  name: string;
  type: OrganizationType;
  status: OrganizationStatus;
}

export interface DepartmentSummary {
  id: string;
  code: string;
  name: string;
  isActive?: boolean;
  _count?: { users: number };
}

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  employeeCode: string | null;
  mfaEnabled: boolean;
  organizationId: string | null;
  organization: OrganizationSummary | null;
  departmentId: string | null;
  department: DepartmentSummary | null;
  lastLoginAt: string | null;
}

export interface LoginResult {
  mfaRequired: boolean;
  challengeToken?: string;
  accessToken?: string;
  expiresInSeconds?: number;
  user?: AuthUser;
}

export type SignupMode = 'NEW_ORGANIZATION' | 'JOIN_ORGANIZATION';

export interface SignupPayload {
  mode: SignupMode;
  fullName: string;
  email: string;
  password: string;
  organizationType?: OrganizationType;
  organizationName?: string;
  organizationCode?: string;
  licenseNo?: string;
  role?: Exclude<UserRole, 'SUPER_ADMIN'>;
  employeeCode?: string;
}

export interface SignupResult {
  pendingApproval: boolean;
  message?: string;
  accessToken?: string;
  expiresInSeconds?: number;
  user: AuthUser;
}

