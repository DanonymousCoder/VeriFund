/**
 * Storage abstraction service for VeriFund.
 *
 * This service provides a clean interface to persist and retrieve app data.
 * Backed by API when available, falls back to localStorage for demo/development.
 *
 * To migrate back to localStorage:
 * Change STORAGE_BACKEND to 'local' below.
 *
 * Example migration:
 * ```
 * // Current: API
 * const data = await apiService.get('/data')
 *
 * // Fallback: localStorage
 * const data = localStorage.getItem('key')
 * ```
 */

import type {
  AuthSession,
  MemberProfile,
  DashboardData,
  CooperativeRecord,
  WithdrawalRequest,
  FraudReport,
} from '../types/storage'
import { apiStorageDriver } from './apiStorageDriver'
import { apiService } from './api'

const STORAGE_KEYS = {
  AUTH: 'vf_auth_session',
  MEMBER_PROFILE: 'vf_member_profile',
  DASHBOARD_DATA: 'vf_dashboard_data',
  COOPERATIVES: 'vf_registered_cooperatives',
  WITHDRAWALS: 'vf_withdrawal_requests',
  FRAUD_REPORTS: 'vf_fraud_reports',
} as const

/**
 * Abstract storage interface. Can be implemented with localStorage, API, IndexedDB, etc.
 * This ensures we don't create hard dependencies on any particular storage mechanism.
 */
export interface StorageDriver {
  getAuthSession(): Promise<AuthSession | null>
  setAuthSession(session: AuthSession | null): Promise<void>
  getMemberProfile(): Promise<MemberProfile | null>
  setMemberProfile(profile: MemberProfile | null): Promise<void>
  getDashboardData(): Promise<DashboardData | null>
  setDashboardData(data: DashboardData | null): Promise<void>
  getCooperatives(): Promise<CooperativeRecord[]>
  setCooperatives(cooperatives: CooperativeRecord[]): Promise<void>
  getWithdrawals(): Promise<WithdrawalRequest[]>
  setWithdrawals(withdrawals: WithdrawalRequest[]): Promise<void>
  getFraudReports(): Promise<FraudReport[]>
  setFraudReports(reports: FraudReport[]): Promise<void>
  clearAll(): Promise<void>
}

/**
 * LocalStorage implementation of the storage driver.
 * This is the current implementation, designed to be replaced with an API implementation.
 *
 * @deprecated - Replace with API implementation when backend is ready
 */
class LocalStorageDriver implements StorageDriver {
  async getAuthSession(): Promise<AuthSession | null> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH)
      return data ? JSON.parse(data) : null
    } catch {
      console.error('Failed to retrieve auth session from storage')
      return null
    }
  }

  async setAuthSession(session: AuthSession | null): Promise<void> {
    try {
      if (session === null) {
        localStorage.removeItem(STORAGE_KEYS.AUTH)
      } else {
        localStorage.setItem(STORAGE_KEYS.AUTH, JSON.stringify(session))
      }
    } catch {
      console.error('Failed to save auth session to storage')
    }
  }

  async getMemberProfile(): Promise<MemberProfile | null> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.MEMBER_PROFILE)
      return data ? JSON.parse(data) : null
    } catch {
      console.error('Failed to retrieve member profile from storage')
      return null
    }
  }

  async setMemberProfile(profile: MemberProfile | null): Promise<void> {
    try {
      if (profile === null) {
        localStorage.removeItem(STORAGE_KEYS.MEMBER_PROFILE)
      } else {
        localStorage.setItem(STORAGE_KEYS.MEMBER_PROFILE, JSON.stringify(profile))
      }
    } catch {
      console.error('Failed to save member profile to storage')
    }
  }

  async getDashboardData(): Promise<DashboardData | null> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.DASHBOARD_DATA)
      return data ? JSON.parse(data) : null
    } catch {
      console.error('Failed to retrieve dashboard data from storage')
      return null
    }
  }

  async setDashboardData(data: DashboardData | null): Promise<void> {
    try {
      if (data === null) {
        localStorage.removeItem(STORAGE_KEYS.DASHBOARD_DATA)
      } else {
        localStorage.setItem(STORAGE_KEYS.DASHBOARD_DATA, JSON.stringify(data))
      }
    } catch {
      console.error('Failed to save dashboard data to storage')
    }
  }

  async getCooperatives(): Promise<CooperativeRecord[]> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.COOPERATIVES)
      return data ? JSON.parse(data) : []
    } catch {
      console.error('Failed to retrieve cooperatives from storage')
      return []
    }
  }

  async setCooperatives(cooperatives: CooperativeRecord[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.COOPERATIVES, JSON.stringify(cooperatives))
    } catch {
      console.error('Failed to save cooperatives to storage')
    }
  }

  async getWithdrawals(): Promise<WithdrawalRequest[]> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.WITHDRAWALS)
      return data ? JSON.parse(data) : []
    } catch {
      console.error('Failed to retrieve withdrawals from storage')
      return []
    }
  }

  async setWithdrawals(withdrawals: WithdrawalRequest[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.WITHDRAWALS, JSON.stringify(withdrawals))
    } catch {
      console.error('Failed to save withdrawals to storage')
    }
  }

  async getFraudReports(): Promise<FraudReport[]> {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.FRAUD_REPORTS)
      return data ? JSON.parse(data) : []
    } catch {
      console.error('Failed to retrieve fraud reports from storage')
      return []
    }
  }

  async setFraudReports(reports: FraudReport[]): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEYS.FRAUD_REPORTS, JSON.stringify(reports))
    } catch {
      console.error('Failed to save fraud reports to storage')
    }
  }

  async clearAll(): Promise<void> {
    try {
      Object.values(STORAGE_KEYS).forEach((key) => {
        localStorage.removeItem(key)
      })
    } catch {
      console.error('Failed to clear storage')
    }
  }
}

/**
 * Singleton instance of the storage driver.
 * Uses API driver if token is present, otherwise falls back to localStorage.
 *
 * The API driver handles all persistence through the Django backend.
 * No component code changes needed when switching implementations.
 */
const getStorageDriver = () => {
  const token = apiService.getToken()
  return token ? apiStorageDriver : new LocalStorageDriver()
}

let storageDriver = getStorageDriver()

/**
 * Public storage service API.
 * Components use these methods directly.
 * The underlying implementation can be swapped without affecting component code.
 */
export const storageService = {
  auth: {
    getSession: () => storageDriver.getAuthSession(),
    setSession: async (session: AuthSession | null) => storageDriver.setAuthSession(session),
  },
  member: {
    getProfile: () => storageDriver.getMemberProfile(),
    setProfile: async (profile: MemberProfile | null) => storageDriver.setMemberProfile(profile),
  },
  dashboard: {
    getData: () => storageDriver.getDashboardData(),
    setData: async (data: DashboardData | null) => storageDriver.setDashboardData(data),
  },
  cooperative: {
    getAll: () => storageDriver.getCooperatives(),
    register: async (record: CooperativeRecord) => {
      const cooperatives = await storageDriver.getCooperatives()
      await storageDriver.setCooperatives([...cooperatives, record])
      return record
    },
    findByCode: async (cooperativeCode: string) => {
      const cooperatives = await storageDriver.getCooperatives()
      return cooperatives.find((item) => item.cooperativeCode.toUpperCase() === cooperativeCode.toUpperCase()) ?? null
    },
  },
  withdrawals: {
    getAll: () => storageDriver.getWithdrawals(),
    create: async (request: WithdrawalRequest) => {
      const requests = await storageDriver.getWithdrawals()
      await storageDriver.setWithdrawals([request, ...requests])
      return request
    },
    update: async (requestId: string, updater: (request: WithdrawalRequest) => WithdrawalRequest) => {
      const requests = await storageDriver.getWithdrawals()
      const updated = requests.map((request) =>
        request.id === requestId ? updater(request) : request,
      )
      await storageDriver.setWithdrawals(updated)
      return updated.find((request) => request.id === requestId) ?? null
    },
  },
  fraudReports: {
    getAll: () => storageDriver.getFraudReports(),
    create: async (report: FraudReport) => {
      const reports = await storageDriver.getFraudReports()
      await storageDriver.setFraudReports([report, ...reports])
      return report
    },
  },
  clear: () => storageDriver.clearAll(),
  updateDriver: () => {
    storageDriver = getStorageDriver()
  },
}
