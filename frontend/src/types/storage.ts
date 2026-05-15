/**
 * Storage types for the VeriFund app.
 * These define the shape of data persisted in storage (local storage now, backend later).
 */

export type AuthSession = {
  memberId: string
  cooperativeId: string
  email: string
  name: string
  trustScore: number
  verificationStatus: 'verified' | 'pending' | 'flagged'
  onboardingComplete?: boolean
  timestamp: number // When the session was created
}

export type MemberProfile = {
  memberId: string
  name: string
  email: string
  cooperativeId: string
  cooperativeName: string
  cooperativeCode?: string
  virtualAccountNumber?: string
  savingsBalance: number
  contributions: number
  trustScore: number
  verificationStatus: 'verified' | 'pending' | 'flagged'
  onboardingComplete?: boolean
}

export type CooperativeRecord = {
  cooperativeCode: string
  cooperativeName: string
  registrationNumber: string
  adminName: string
  adminEmail: string
  virtualAccountNumber: string
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
}
