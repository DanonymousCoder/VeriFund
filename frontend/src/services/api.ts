/**
 * API Service Layer for VeriFund.
 * Handles HTTP communication with the backend API.
 */

import { APIError } from '../types/api'
import type {
  AccountLookupRequest,
  AccountLookupResponse,
  AnalyzeGraphRequest,
  AnalyzeGraphResponse,
  APICooperativeResponse,
  APIWithdrawalResponse,
  APIMemberResponse,
  AuthLoginRequest,
  AuthLoginResponse,
  AuthRegisterRequest,
  AuthRegisterResponse,
  ContributionAuditResponse,
  ContributionHistoryResponse,
  CooperativeRegulatorSummaryResponse,
  CooperativeTrustScoreResponse,
  CreateCooperativeRequest,
  CreateMandateRequest,
  CreateMandateResponse,
  CreateVirtualAccountRequest,
  CreateVirtualAccountResponse,
  CreateWithdrawalRequest,
  DebitMandateRequest,
  DebitMandateResponse,
  GetMandateResponse,
  HealthScoresResponse,
  NotificationHistoryResponse,
  PendingWithdrawalsResponse,
  ReQueryWithdrawalResponse,
  ScoreCooperativeRequest,
  ScoreCooperativeResponse,
  ScoreTransactionRequest,
  ScoreTransactionResponse,
  SendSMSRequest,
  SendSMSResponse,
  SignWithdrawalRequest,
  SignWithdrawalResponse,
  SimulateContributionRequest,
  TriageReportRequest,
  TriageReportResponse,
  VirtualAccountListResponse,
  WebhookEventsResponse,
} from '../types/api'

// Default to the currently deployed production backend. Can be overridden by VITE_API_URL.
const BASE_URL = import.meta.env.VITE_API_URL || 'https://verifund-production-0ae5.up.railway.app'
const TOKEN_STORAGE_KEY = 'verifund_api_token'
const TIMEOUT = 30000

class APIService {
  private token: string | null = null

  constructor() {
    this.token = localStorage.getItem(TOKEN_STORAGE_KEY)
  }

  setToken(token: string): void {
    this.token = token
    localStorage.setItem(TOKEN_STORAGE_KEY, token)
  }

  clearToken(): void {
    this.token = null
    localStorage.removeItem(TOKEN_STORAGE_KEY)
  }

  getToken(): string | null {
    return this.token
  }

  private async request<T>(method: string, endpoint: string, body?: unknown, isProtected = true): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    }

    if (isProtected && this.token) {
      headers.Authorization = `Bearer ${this.token}`
    }

    const controller = new AbortController()
    const timeoutId = window.setTimeout(() => controller.abort(), TIMEOUT)

    try {
      const response = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      let data: unknown = null
      try {
        data = await response.json()
      } catch {
        data = null
      }

      if (!response.ok) {
        throw new APIError(response.status, (data as Record<string, unknown>) || {})
      }

      return data as T
    } catch (error) {
      if (error instanceof APIError) {
        throw error
      }
      throw new Error(`Network error: ${error instanceof Error ? error.message : String(error)}`)
    } finally {
      window.clearTimeout(timeoutId)
    }
  }

  async register(request: AuthRegisterRequest): Promise<AuthRegisterResponse> {
    const response = await this.request<AuthRegisterResponse>('POST', '/api/auth/register/', request, false)
    this.setToken(response.token)
    return response
  }

  async login(request: AuthLoginRequest): Promise<AuthLoginResponse> {
    const response = await this.request<AuthLoginResponse>('POST', '/api/auth/login/', request, false)
    this.setToken(response.token)
    return response
  }

  async getCurrentMember(): Promise<APIMemberResponse> {
    return this.request<APIMemberResponse>('GET', '/api/members/me/')
  }

  async updateProfile(updates: Partial<APIMemberResponse>): Promise<{ member: APIMemberResponse }> {
    return this.request<{ member: APIMemberResponse }>('PATCH', '/api/members/me/', updates)
  }

  async createCooperative(request: CreateCooperativeRequest): Promise<APICooperativeResponse> {
    return this.request<APICooperativeResponse>('POST', '/api/cooperatives/', request)
  }

  async getCooperative(cooperativeId: string): Promise<APICooperativeResponse> {
    return this.request<APICooperativeResponse>('GET', `/api/cooperatives/${cooperativeId}/`)
  }

  async getCooperativeTrustScore(cooperativeId: string): Promise<CooperativeTrustScoreResponse> {
    return this.request<CooperativeTrustScoreResponse>('GET', `/api/cooperatives/${cooperativeId}/trust-score/`)
  }

  async getCooperativeRegulatorSummary(cooperativeId: string): Promise<CooperativeRegulatorSummaryResponse> {
    return this.request<CooperativeRegulatorSummaryResponse>('GET', `/api/cooperatives/${cooperativeId}/regulator-summary/`)
  }

  async createVirtualAccount(request: CreateVirtualAccountRequest): Promise<CreateVirtualAccountResponse> {
    return this.request<CreateVirtualAccountResponse>('POST', '/api/contributions/virtual-account/', request)
  }

  async listVirtualAccounts(): Promise<VirtualAccountListResponse> {
    return this.request<VirtualAccountListResponse>('GET', '/api/contributions/virtual-account/list/')
  }

  async simulateContribution(request: SimulateContributionRequest): Promise<{ success: boolean; message: string; data: { transaction_reference: string }; recorded_contribution: unknown }> {
    return this.request('POST', '/api/contributions/virtual-account/simulate/', request)
  }

  async getContributionHistory(): Promise<ContributionHistoryResponse> {
    return this.request<ContributionHistoryResponse>('GET', '/api/contributions/history/')
  }

  async getContributionAudit(cooperativeId: string): Promise<ContributionAuditResponse> {
    return this.request<ContributionAuditResponse>('GET', `/api/contributions/audit/${cooperativeId}/`)
  }

  async createMandate(request: CreateMandateRequest): Promise<CreateMandateResponse> {
    return this.request<CreateMandateResponse>('POST', '/api/contributions/mandate/', request)
  }

  async getMandate(merchantReference: string): Promise<GetMandateResponse> {
    return this.request<GetMandateResponse>('GET', `/api/contributions/mandate/${merchantReference}/`)
  }

  async debitMandate(request: DebitMandateRequest): Promise<DebitMandateResponse> {
    return this.request<DebitMandateResponse>('POST', '/api/contributions/mandate/debit/', request)
  }

  async getWebhookEvents(): Promise<WebhookEventsResponse> {
    return this.request<WebhookEventsResponse>('GET', '/api/contributions/webhooks/events/')
  }

  async createWithdrawal(request: CreateWithdrawalRequest): Promise<APIWithdrawalResponse> {
    return this.request<APIWithdrawalResponse>('POST', '/api/withdrawals/request/', request)
  }

  async lookupAccount(request: AccountLookupRequest): Promise<AccountLookupResponse> {
    return this.request<AccountLookupResponse>('POST', '/api/withdrawals/lookup/', request)
  }

  async getWithdrawal(withdrawalId: string): Promise<APIWithdrawalResponse> {
    return this.request<APIWithdrawalResponse>('GET', `/api/withdrawals/${withdrawalId}/`)
  }

  async signWithdrawal(withdrawalId: string, request: SignWithdrawalRequest): Promise<SignWithdrawalResponse> {
    return this.request<SignWithdrawalResponse>('POST', `/api/withdrawals/${withdrawalId}/sign/`, request)
  }

  async getPendingWithdrawals(cooperativeId: string): Promise<PendingWithdrawalsResponse> {
    return this.request<PendingWithdrawalsResponse>('GET', `/api/withdrawals/pending/?cooperative_id=${cooperativeId}`)
  }

  async reQueryWithdrawal(withdrawalId: string): Promise<ReQueryWithdrawalResponse> {
    return this.request<ReQueryWithdrawalResponse>('POST', `/api/withdrawals/${withdrawalId}/requery/`)
  }

  async sendSMS(request: SendSMSRequest): Promise<SendSMSResponse> {
    return this.request<SendSMSResponse>('POST', '/api/notify/sms/', request, false)
  }

  async getNotificationHistory(limit = 20): Promise<NotificationHistoryResponse> {
    return this.request<NotificationHistoryResponse>('GET', `/api/notify/history/?limit=${limit}`, undefined, false)
  }

  async scoreTransaction(request: ScoreTransactionRequest): Promise<ScoreTransactionResponse> {
    return this.request<ScoreTransactionResponse>('POST', '/api/ai/score-transaction/', request)
  }

  async scoreCooperative(request: ScoreCooperativeRequest): Promise<ScoreCooperativeResponse> {
    return this.request<ScoreCooperativeResponse>('POST', '/api/ai/score-cooperative/', request)
  }

  async getCooperativeScore(cooperativeId: string): Promise<ScoreCooperativeResponse> {
    return this.request<ScoreCooperativeResponse>('GET', `/api/ai/score-cooperative/${cooperativeId}/`)
  }

  async triageReport(request: TriageReportRequest): Promise<TriageReportResponse> {
    return this.request<TriageReportResponse>('POST', '/api/ai/triage-report/', request)
  }

  async getHealthScores(): Promise<HealthScoresResponse> {
    return this.request<HealthScoresResponse>('GET', '/api/ai/health-scores/')
  }

  async analyzeGraph(request: AnalyzeGraphRequest): Promise<AnalyzeGraphResponse> {
    return this.request<AnalyzeGraphResponse>('POST', '/api/ai/analyze-graph/', request)
  }

  async getGraphAnalysis(cooperativeId: string): Promise<AnalyzeGraphResponse> {
    return this.request<AnalyzeGraphResponse>('GET', `/api/ai/analyze-graph/${cooperativeId}/`)
  }
}

export const apiService = new APIService()
