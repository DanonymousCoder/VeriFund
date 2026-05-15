/**
 * API types for VeriFund backend integration.
 * Maps to Django backend endpoints and Squad payment provider.
 */

// ============= Auth & Member Types =============

export type APIRole = 'MEMBER' | 'ADMIN' | 'EXECUTIVE1' | 'EXECUTIVE2' | 'TREASURER'

export type APIMemberResponse = {
  id: string
  first_name: string
  last_name: string
  phone_number: string
  email: string
  bvn_verified: boolean
  bvn_verified_at: string | null
  role: APIRole
  is_active: boolean
  created_at: string
}

export type AuthRegisterRequest = {
  bvn: string
  first_name: string
  last_name: string
  phone_number: string
  email: string
  password: string
}

export type AuthRegisterResponse = {
  member: APIMemberResponse
  token: string
}

export type AuthLoginRequest = {
  phone_number: string
  password: string
}

export type AuthLoginResponse = {
  token: string
  member_id: string
  role: APIRole
}

// ============= Cooperative Types =============

export type CooperativeType = 'THRIFT' | 'CREDIT' | 'MULTIPURPOSE'

export type APICooperativeResponse = {
  id: string
  name: string
  registration_number: string
  state: string
  cooperative_type: CooperativeType
  squad_virtual_account_number: string
  squad_customer_id: string
  health_score: number
  health_score_updated_at: string
  is_active: boolean
  created_at: string
}

export type CreateCooperativeRequest = {
  name: string
  registration_number: string
  state: string
  cooperative_type: CooperativeType
  treasurer_bvn: string
}

export type CooperativeTrustScoreResponse = {
  cooperative_id: string
  cooperative_name: string
  health_score: number
  breakdown: {
    member_verification_rate: number
    contribution_regularity: number
    withdrawal_pattern: number
    transparency_index: number
    ai_risk_signal: number
  }
  badge: string
  top_features: Array<{
    feature: string
    impact: number
    direction: string
  }>
}

export type CooperativeRegulatorSummaryResponse = {
  cooperative: APICooperativeResponse
  trust: CooperativeTrustScoreResponse
  controls: {
    member_bvn_gate: boolean
    contribution_collection: string
    withdrawal_control: string
  }
  totals: {
    total_contributions: number
    contribution_volume_kobo: number
    flagged_contributions: number
    total_withdrawals: number
    withdrawal_volume_kobo: number
    released_withdrawals: number
    high_risk_withdrawals: number
    total_signatures: number
  }
}

// ============= Contribution Types =============

export type CreateVirtualAccountRequest = {
  cooperative_id: string
  bvn: string
  dob: string // MM/DD/YYYY
  address: string
  gender: '1' | '2' // 1 = male, 2 = female
  phone_number: string
  email: string
}

export type APIVirtualAccountResponse = {
  id: string
  member_id: string
  cooperative_id: string
  customer_identifier: string
  virtual_account_number: string
  account_name: string
  bank_name: string
  status: string
  created_at: string
  updated_at: string
}

export type CreateVirtualAccountResponse = {
  virtual_account: APIVirtualAccountResponse
  cooperative: Pick<APICooperativeResponse, 'id' | 'name' | 'squad_virtual_account_number' | 'squad_customer_id'>
  instructions: {
    payment_channel: string
    message: string
    webhook_expected: boolean
  }
}

export type VirtualAccountListResponse = {
  member_id: string
  virtual_accounts: APIVirtualAccountResponse[]
}

export type SimulateContributionRequest = {
  cooperative_id: string
  amount_kobo: number
}

export type APIContributionResponse = {
  id: string
  member_id: string
  cooperative_id: string
  amount_kobo: number
  squad_transaction_ref: string
  mandate_id: string | null
  contribution_virtual_account_id: string
  payment_channel: string
  status: 'CONFIRMED' | 'PENDING' | 'FAILED'
  anomaly_score: number
  contributed_at: string
}

export type ContributionHistoryResponse = {
  member_id: string
  contributions: APIContributionResponse[]
}

export type ContributionAuditResponse = {
  cooperative: Pick<APICooperativeResponse, 'id' | 'name' | 'registration_number' | 'squad_virtual_account_number' | 'squad_customer_id'>
  summary: {
    total_contributions: number
    total_amount_kobo: number
    average_amount_kobo: number
    flagged_count: number
    contribution_virtual_accounts: number
    direct_debit_mandates: number
  }
  recent_contributions: APIContributionResponse[]
  virtual_accounts: APIVirtualAccountResponse[]
  mandates: Array<{
    id: string
    squad_mandate_id: string
    merchant_reference: string
    status: string
    ready_to_debit: boolean
  }>
}

export type CreateMandateRequest = {
  cooperative_id: string
  amount_kobo: number
  account_number: string
  bank_code: string
  debit_day: number
  bvn: string
  address: string
  customer_email: string
  description: string
}

export type CreateMandateResponse = {
  message: string
  mandate_id: string
  merchant_reference: string
  status: string
  ready_to_debit: boolean
}

export type GetMandateResponse = {
  mandate: {
    id: string
    squad_mandate_id: string
    merchant_reference: string
    status: string
    ready_to_debit: boolean
    is_approved: boolean
  }
  provider_result: {
    success: boolean
    message: string
    data: {
      merchant_reference: string
      mandate_id: string
      ready_to_debit: boolean
      is_approved: boolean
      status: string
    }
  }
}

export type DebitMandateRequest = {
  mandate_id: string
  amount_kobo: number
  narration: string
  customer_email: string
  pass_charge: boolean
}

export type DebitMandateResponse = {
  mandate_id: string
  transaction_reference: string
  provider_result: {
    success: boolean
    message: string
    data: {
      transaction_ref: string
      mandate_id: string
      status: string
      amount: number
    }
  }
}

export type WebhookEventsResponse = {
  events: Array<{
    id: string
    event_name: string
    transaction_reference: string
    signature_valid: boolean
    processing_status: string
    error_detail: string | null
    created_at: string
    processed_at: string
  }>
}

// ============= Withdrawal Types =============

export type CreateWithdrawalRequest = {
  cooperative_id: string
  amount_kobo: number
  destination_account: string
  destination_bank_code: string
  purpose: string
}

export type AccountLookupRequest = {
  destination_bank_code: string
  destination_account: string
}

export type AccountLookupResponse = {
  bank_code: string
  account_number: string
  account_name: string
  provider_message: string
}

export type APISignatureResponse = {
  id: string
  signed_by: string
  role: APIRole
  signed_at: string
}

export type APIWithdrawalResponse = {
  id: string
  cooperative_id: string
  requested_by: string
  amount_kobo: number
  destination_account: string
  destination_bank_code: string
  destination_account_name?: string
  purpose: string
  ai_risk_score: number
  status: 'PARTIALLY_SIGNED' | 'TRANSFER_PENDING' | 'RELEASED' | 'FAILED' | 'BLOCKED'
  squad_transfer_ref: string | null
  last_transfer_status?: string
  transfer_error_detail?: string | null
  created_at: string
  signatures: APISignatureResponse[]
}

export type SignWithdrawalRequest = {
  role: APIRole
}

export type SignWithdrawalResponse = {
  withdrawal_id: string
  signatures_collected: number
  signatures_required: number
  status: string
  signatures: APISignatureResponse[]
}

export type PendingWithdrawalsResponse = {
  pending: APIWithdrawalResponse[]
  cooperative_id: string
}

export type ReQueryWithdrawalResponse = {
  withdrawal: APIWithdrawalResponse
  provider_result: {
    success: boolean
    message: string
    data: {
      transaction_reference: string
      status: string
    }
  }
}

// ============= Notification Types =============

export type SendSMSRequest = {
  phone_number: string
  message: string
}

export type SendSMSResponse = {
  status: 'sent' | 'queued_local' | 'failed'
  recipient: string
  provider_response?: Record<string, unknown>
  detail?: string
}

export type NotificationHistoryResponse = {
  notifications: Array<{
    id: string
    channel: string
    recipient: string
    message: string
    status: string
    provider_response: string
    error_detail: string | null
    created_at: string
  }>
  filters: {
    recipient: string | null
    status: string | null
    limit: number
  }
}

// ============= AI Service Types =============

export type ScoreTransactionRequest = {
  amount_kobo: number
  rolling_90d_mean: number
  days_since_last_contribution: number
  member_transaction_count: number
  cooperative_flagged_rate: number
}

export type ScoreTransactionResponse = {
  anomaly_score: number
  flagged: boolean
  reason: string
  model: string
}

export type ScoreCooperativeRequest = {
  cooperative_id: string
  breakdown: {
    contribution_regularity_score: number
    withdrawal_frequency: number
    member_churn_rate: number
    avg_transaction_size: number
    num_large_withdrawals_30d: number
    bvn_verification_rate: number
    avg_withdrawal_risk: number
    flagged_ratio: number
    net_asset_trend_90d: number
  }
}

export type ScoreCooperativeResponse = {
  cooperative_id: string
  risk_score: number
  health_score: number
  top_features: Array<{
    feature: string
    impact: number
    direction: string
  }>
  feature_snapshot: Record<string, unknown>
  model: string
}

export type TriageReportRequest = {
  report_text: string
  reporter_cooperative_id: string
}

export type TriageReportResponse = {
  intent: string
  corroboration_score: number
  evidence_summary: string
  escalate: boolean
  model: string
}

export type HealthScoresResponse = {
  scores: Record<string, number>
}

export type AnalyzeGraphRequest = {
  cooperative_id: string
}

export type AnalyzeGraphResponse = {
  cooperative_id: string
  summary: {
    node_count: number
    edge_count: number
    member_count: number
    flagged_contribution_count: number
    risky_withdrawal_count: number
  }
  nodes: Array<{
    id: string
    label: string
    type: string
    risk_level: string
    meta: Record<string, unknown>
  }>
  edges: Array<{
    source: string
    target: string
    relation: string
  }>
  suspicious_clusters: Array<{
    cluster_type: string
    node_ids: string[]
    score: number
    reason: string
  }>
  model: string
}

// ============= Error Types =============

export type APIErrorResponse = {
  detail?: string
  [key: string]: unknown
}

export class APIError extends Error {
  status: number
  data: APIErrorResponse

  constructor(
    status: number,
    data: APIErrorResponse,
    message?: string
  ) {
    super(message || data.detail || `API Error: ${status}`)
    this.name = 'APIError'
    this.status = status
    this.data = data
  }
}
