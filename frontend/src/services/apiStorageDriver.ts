/**
 * API Storage Driver
 * Implements the StorageDriver interface using the Django backend API.
 * Allows seamless substitution of localStorage with backend persistence.
 */

import type { StorageDriver } from './storage'
import type {
  AuthSession,
  MemberProfile,
  DashboardData,
  CooperativeRecord,
  WithdrawalRequest,
  FraudReport,
  UserRole,
} from '../types/storage'
import { apiService } from './api'
import type {
  APIMemberResponse,
  APICooperativeResponse,
  APIWithdrawalResponse,
} from '../types/api'

/**
 * Map API member response to local AuthSession
 */
function mapMemberToSession(
  member: APIMemberResponse,
  cooperativeId: string
): AuthSession {
  // Map API role to local UserRole
  const roleMap: Record<string, UserRole> = {
    MEMBER: 'member',
    ADMIN: 'admin',
    TREASURER: 'admin',
    EXECUTIVE1: 'executive',
    EXECUTIVE2: 'executive',
  }

  const activeRole = (roleMap[member.role] || 'member') as UserRole
  const availableRoles: UserRole[] = [activeRole]

  return {
    memberId: member.id,
    cooperativeId,
    email: member.email,
    name: `${member.first_name} ${member.last_name}`,
    activeRole,
    availableRoles,
    trustScore: 50, // Will be fetched separately
    verificationStatus: member.bvn_verified ? 'verified' : 'pending',
    onboardingComplete: member.bvn_verified,
    timestamp: Date.now(),
  }
}

/**
 * Map API member response to local MemberProfile
 */
function mapMemberToProfile(
  member: APIMemberResponse,
  cooperativeId: string,
  cooperativeName: string
): MemberProfile {
  return {
    memberId: member.id,
    name: `${member.first_name} ${member.last_name}`,
    email: member.email,
    bvn: '', // Not returned by API, will be filled on verification
    cooperativeId,
    cooperativeName,
    virtualAccountNumber: '', // Will be fetched from virtual account endpoint
    role: member.role === 'MEMBER' ? 'member' : 'admin',
    savingsBalance: 0,
    contributions: 0,
    trustScore: 50,
    verificationStatus: member.bvn_verified ? 'verified' : 'pending',
    termsAccepted: true,
    onboardingComplete: member.bvn_verified,
  }
}

/**
 * Map API cooperative to local CooperativeRecord
 */
function mapCooperativeToRecord(coop: APICooperativeResponse): CooperativeRecord {
  return {
    cooperativeCode: coop.id,
    cooperativeName: coop.name,
    cooperativeType: (coop.cooperative_type.toLowerCase() as 'thrift' | 'credit' | 'multipurpose'),
    state: coop.state,
    registrationNumber: coop.registration_number,
    adminBvn: '', // Not in API response
    bvnVerified: true,
    adminName: '', // Not in API response
    adminEmail: '', // Not in API response
    virtualAccountNumber: coop.squad_virtual_account_number,
    monthlyContributionAmount: 0, // Not in API response
    debitDayOfMonth: 0, // Not in API response
    inviteCode: `INV-${coop.id.substring(0, 8)}`,
    inviteLink: `${window.location.origin}?invite=${coop.id.substring(0, 8)}`,
    executives: [],
    aiBlockEnabled: false,
    createdAt: Date.now(),
  }
}

/**
 * Map API withdrawal to local WithdrawalRequest
 */
function mapWithdrawalToRecord(withdrawal: APIWithdrawalResponse): WithdrawalRequest {
  return {
    id: withdrawal.id,
    cooperativeCode: withdrawal.cooperative_id,
    initiatedBy: withdrawal.requested_by,
    initiatedByRole: 'admin',
    amount: withdrawal.amount_kobo,
    destinationAccount: withdrawal.destination_account,
    purpose: withdrawal.purpose,
    aiRiskStatus: withdrawal.ai_risk_score > 0.5 ? 'blocked' : 'clear',
    status: withdrawal.status as 'pending_signatures' | 'approved' | 'rejected' | 'blocked',
    approvals: withdrawal.signatures.map(s => s.signed_by),
    rejections: [],
    createdAt: Date.parse(withdrawal.created_at),
  }
}

/**
 * API Storage Driver implementation
 */
export class APIStorageDriver implements StorageDriver {
  private cooperativeId: string | null = null

  async getAuthSession(): Promise<AuthSession | null> {
    try {
      const token = apiService.getToken()
      if (!token) return null

      const member = await apiService.getCurrentMember()
      if (!this.cooperativeId) {
        // Try to get from localStorage
        const storedCoop = localStorage.getItem('current_cooperative')
        if (storedCoop) {
          const parsed = JSON.parse(storedCoop)
          this.cooperativeId = parsed.id
        }
      }

      return mapMemberToSession(member, this.cooperativeId || '')
    } catch (error) {
      console.error('Failed to get auth session:', error)
      return null
    }
  }

  async setAuthSession(session: AuthSession | null): Promise<void> {
    if (!session) {
      this.cooperativeId = null
      localStorage.removeItem('current_cooperative')
      return
    }

    this.cooperativeId = session.cooperativeId
    localStorage.setItem('current_cooperative', JSON.stringify({
      id: session.cooperativeId,
      name: '',
    }))
  }

  async getMemberProfile(): Promise<MemberProfile | null> {
    try {
      const token = apiService.getToken()
      if (!token) return null

      const member = await apiService.getCurrentMember()
      const storedCoop = localStorage.getItem('current_cooperative')
      const cooperativeName = storedCoop ? JSON.parse(storedCoop).name : ''
      return mapMemberToProfile(member, this.cooperativeId || '', cooperativeName)
    } catch (error) {
      console.error('Failed to get member profile:', error)
      return null
    }
  }

  async setMemberProfile(profile: MemberProfile | null): Promise<void> {
    if (!profile) return

    try {
      await apiService.updateProfile({
        first_name: profile.name.split(' ')[0],
        last_name: profile.name.split(' ').slice(1).join(' '),
        email: profile.email,
      })
    } catch (error) {
      console.error('Failed to update member profile:', error)
    }
  }

  async getDashboardData(): Promise<DashboardData | null> {
    try {
      if (!this.cooperativeId) return null

      // Fetch contributions
      const contribResponse = await apiService.getContributionHistory()
      const totalContributions = contribResponse.contributions.reduce(
        (sum, c) => sum + c.amount_kobo,
        0
      )

      // Fetch pending withdrawals
      const withdrawalsResponse = await apiService.getPendingWithdrawals(this.cooperativeId)

      return {
        savingsBalance: totalContributions,
        pendingWithdrawals: withdrawalsResponse.pending.length,
        verifiedActions: 0,
        contributionConsistency: 85,
        verificationHealth: 100,
        fraudRiskSignals: 0,
        contributionHistory: contribResponse.contributions.map(c => ({
          date: c.contributed_at,
          amount: c.amount_kobo / 100, // Convert kobo to naira
          status: c.status === 'CONFIRMED' ? 'Confirmed' : 'Flagged',
          ref: c.squad_transaction_ref,
        })),
      }
    } catch (error) {
      console.error('Failed to get dashboard data:', error)
      return null
    }
  }

  async setDashboardData(_data: DashboardData | null): Promise<void> {
    // Dashboard data is read-only (computed from other sources)
  }

  async getCooperatives(): Promise<CooperativeRecord[]> {
    try {
      if (!this.cooperativeId) return []

      const coop = await apiService.getCooperative(this.cooperativeId)
      return [mapCooperativeToRecord(coop)]
    } catch (error) {
      console.error('Failed to get cooperatives:', error)
      return []
    }
  }

  async setCooperatives(cooperatives: CooperativeRecord[]): Promise<void> {
    // Creating cooperatives is done via API directly
    if (cooperatives.length > 0) {
      localStorage.setItem('cooperatives_cache', JSON.stringify(cooperatives))
    }
  }

  async getWithdrawals(): Promise<WithdrawalRequest[]> {
    try {
      if (!this.cooperativeId) return []

      const response = await apiService.getPendingWithdrawals(this.cooperativeId)
      return response.pending.map(mapWithdrawalToRecord)
    } catch (error) {
      console.error('Failed to get withdrawals:', error)
      return []
    }
  }

  async setWithdrawals(withdrawals: WithdrawalRequest[]): Promise<void> {
    // Withdrawals are managed via API directly
    localStorage.setItem('withdrawals_cache', JSON.stringify(withdrawals))
  }

  async getFraudReports(): Promise<FraudReport[]> {
    // Fraud reports are not returned by the API for members
    // Only stored locally for demo purposes
    try {
      const cached = localStorage.getItem('fraud_reports')
      return cached ? JSON.parse(cached) : []
    } catch {
      return []
    }
  }

  async setFraudReports(reports: FraudReport[]): Promise<void> {
    localStorage.setItem('fraud_reports', JSON.stringify(reports))
  }

  /**
   * Clear all stored data (logout)
   */
  async clearAll(): Promise<void> {
    apiService.clearToken()
    this.cooperativeId = null
    localStorage.removeItem('current_cooperative')
    localStorage.removeItem('cooperatives_cache')
    localStorage.removeItem('withdrawals_cache')
    localStorage.removeItem('fraud_reports')
  }
}

export const apiStorageDriver = new APIStorageDriver()
