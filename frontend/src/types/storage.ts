/**
 * Storage types for the VeriFund app.
 * These define the shape of data persisted in storage (local storage now, backend later).
 */

export type UserRole = 'member' | 'admin' | 'executive'

export type AuthSession = {
  memberId: string
  cooperativeId: string
  email: string
  name: string
  activeRole: UserRole
  availableRoles: UserRole[]
  trustScore: number
  verificationStatus: 'verified' | 'pending' | 'flagged'
  onboardingComplete?: boolean
  timestamp: number // When the session was created
}

export type MemberProfile = {
  memberId: string
  name: string
  email: string
  bvn?: string
  cooperativeId: string
  cooperativeName: string
  cooperativeCode?: string
  virtualAccountNumber?: string
  role?: UserRole
  savingsBalance: number
  contributions: number
  trustScore: number
  verificationStatus: 'verified' | 'pending' | 'flagged'
  termsAccepted?: boolean
  onboardingComplete?: boolean
}

export type ExecutiveInvite = {
  id: string
  name: string
  email?: string
  phone?: string
  status: 'invited' | 'accepted' | 'rejected'
}

export type CooperativeRecord = {
  cooperativeCode: string
  cooperativeName: string
  cooperativeType: 'thrift' | 'credit' | 'multipurpose'
  state: string
  registrationNumber: string
  adminBvn: string
  bvnVerified: boolean
  adminName: string
  adminEmail: string
  virtualAccountNumber: string
  monthlyContributionAmount: number
  debitDayOfMonth: number
  inviteCode: string
  inviteLink: string
  executives: ExecutiveInvite[]
  aiBlockEnabled: boolean
  createdAt: number
}

export type WithdrawalRequest = {
  id: string
  cooperativeCode: string
  initiatedBy: string
  initiatedByRole: UserRole
  amount: number
  destinationAccount: string
  purpose: string
  aiRiskStatus: 'clear' | 'blocked'
  status: 'pending_signatures' | 'approved' | 'rejected' | 'blocked'
  approvals: string[]
  rejections: string[]
  createdAt: number
}

export type FraudReport = {
  id: string
  cooperativeCode: string
  submittedBy: string
  anonymous: boolean
  category: 'fraud' | 'suspicious_debit' | 'identity_issue' | 'other'
  details: string
  createdAt: number
}

export type ContributionRecord = {
  date: string
  amount: number
  status: 'Confirmed' | 'Flagged'
  ref: string
}

export type DashboardData = {
  savingsBalance: number
  pendingWithdrawals: number
  verifiedActions: number
  contributionConsistency: number
  verificationHealth: number
  fraudRiskSignals: number
  contributionHistory: ContributionRecord[]
}

export type StorageData = {
  auth: AuthSession | null
  memberProfile: MemberProfile | null
  dashboardData: DashboardData | null
  cooperatives?: CooperativeRecord[]
  withdrawals?: WithdrawalRequest[]
  fraudReports?: FraudReport[]
}
