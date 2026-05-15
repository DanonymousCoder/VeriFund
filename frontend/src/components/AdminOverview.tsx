import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bell,
  Download,
  Landmark,
  Mail,
  ShieldAlert,
  ShieldCheck,
  Users,
  Wallet,
} from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useMemberProfile } from '../hooks/useMemberData'
import { storageService } from '../services/storage'
import type { CooperativeRecord, FraudReport, WithdrawalRequest } from '../types/storage'
import verifundLogo from '../assets/verifund-logo.png'

export default function AdminOverview() {
  const { session } = useAuth()
  const { profile } = useMemberProfile()
  const [cooperative, setCooperative] = useState<CooperativeRecord | null>(null)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [fraudReports, setFraudReports] = useState<FraudReport[]>([])
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      if (!profile?.cooperativeCode) return

      const found = await storageService.cooperative.findByCode(profile.cooperativeCode)
      const allWithdrawals = await storageService.withdrawals.getAll()
      const allFraudReports = await storageService.fraudReports.getAll()

      setCooperative(found)
      setWithdrawals(allWithdrawals.filter((item) => item.cooperativeCode === profile.cooperativeCode))
      setFraudReports(allFraudReports.filter((item) => item.cooperativeCode === profile.cooperativeCode))
    }

    load()
  }, [profile?.cooperativeCode])

  const copyInvite = async () => {
    if (!cooperative?.inviteLink) return
    await navigator.clipboard.writeText(cooperative.inviteLink)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1800)
  }

  const roleLabel = session?.activeRole === 'admin' ? 'Cooperative Admin' : 'Admin'

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900">
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img src={verifundLogo} alt="VeriFund" className="h-12 w-12" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{roleLabel} workspace</p>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{cooperative?.cooperativeName ?? 'Cooperative Overview'}</h1>
              <p className="text-sm text-gray-500">{cooperative?.cooperativeCode ?? session?.cooperativeId}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/admin/register"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Register Cooperative <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/authorize"
              className="inline-flex items-center gap-2 rounded-full bg-[#005AD2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Initiate Withdrawal <Wallet className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <StatCard title="Monthly Contribution" value={`NGN ${(cooperative?.monthlyContributionAmount ?? 0).toLocaleString()}`} icon={Landmark} />
          <StatCard title="Virtual Account" value={cooperative?.virtualAccountNumber ?? 'Locked'} icon={ShieldCheck} />
          <StatCard title="Executive Invites" value={cooperative?.executives.length ?? 0} icon={Users} />
          <StatCard title="Alerts" value={fraudReports.length} icon={Bell} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className="space-y-6">
            <Card title="Cooperative Snapshot" description="Core setup and governance controls for the cooperative.">
              <div className="grid gap-3 md:grid-cols-2">
                <InfoRow label="State" value={cooperative?.state ?? '—'} />
                <InfoRow label="Type" value={cooperative?.cooperativeType ?? '—'} />
                <InfoRow label="Registration Number" value={cooperative?.registrationNumber ?? '—'} />
                <InfoRow label="Debit Date" value={cooperative ? `Day ${cooperative.debitDayOfMonth}` : '—'} />
              </div>
              <div className="mt-4 rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-600">
                <p className="font-semibold text-gray-800">Access control</p>
                <p className="mt-1">The Squad virtual account is system-controlled. Admins can view balances and activity, but cannot directly move funds.</p>
              </div>
            </Card>

            <Card title="Invite Center" description="Share cooperative access with members and executives.">
              <div className="space-y-3">
                <InviteItem label="Invite Code" value={cooperative?.inviteCode ?? 'Generate a cooperative first'} actionText="Copy code" onAction={copyInvite} />
                <InviteItem label="Invite Link" value={cooperative?.inviteLink ?? 'Generate a cooperative first'} actionText={copied ? 'Copied' : 'Copy link'} onAction={copyInvite} />
                <InviteItem label="Members onboarding" value="Invite link/code + BVN + cooperative terms" actionText="Open signup" href="/signup" />
              </div>
            </Card>

            <Card title="Executive Assignment" description="Two co-signers are required before withdrawals can be released.">
              <div className="space-y-3">
                {(cooperative?.executives ?? []).map((exec) => (
                  <div key={exec.id} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                    <div>
                      <p className="font-semibold text-gray-900">{exec.name}</p>
                      <p className="text-xs text-gray-500">{exec.email || exec.phone || 'No contact set'}</p>
                    </div>
                    <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">
                      {exec.status}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                <ShieldAlert className="h-4 w-4" />
                Executives receive invite links for their roles and can only co-sign. They cannot invite members or sign twice.
              </div>
            </Card>
          </section>

          <aside className="space-y-6">
            <Card title="Pending Withdrawals" description="Requests waiting for executive signatures.">
              <div className="space-y-3">
                {withdrawals.filter((item) => item.status === 'pending_signatures').length > 0 ? (
                  withdrawals
                    .filter((item) => item.status === 'pending_signatures')
                    .map((item) => (
                      <div key={item.id} className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-semibold text-gray-900">NGN {item.amount.toLocaleString()}</p>
                            <p className="text-xs text-gray-500">{item.purpose}</p>
                          </div>
                          <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">{item.status}</span>
                        </div>
                        <p className="mt-2 text-xs text-gray-500">Destination: {item.destinationAccount}</p>
                        <p className="text-xs text-gray-500">Initiated by: {item.initiatedBy}</p>
                      </div>
                    ))
                ) : (
                  <EmptyState text="No withdrawal requests awaiting signature." />
                )}
              </div>
            </Card>

            <Card title="Fraud Alerts" description="Recent anonymous reports and AI flagged items.">
              <div className="space-y-3">
                {fraudReports.length > 0 ? (
                  fraudReports.map((item) => (
                    <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{item.category}</p>
                      <p className="mt-2 text-sm text-gray-700">{item.details}</p>
                      <p className="mt-2 text-[10px] text-gray-400">Anonymous: {item.anonymous ? 'Yes' : 'No'}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No fraud reports yet." />
                )}
              </div>
            </Card>

            <Card title="Reports" description="Monthly governance and fraud reporting.">
              <div className="space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <span className="flex items-center gap-2"><Download className="h-4 w-4 text-gray-400" /> Monthly report</span>
                  <span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Ready</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-white px-4 py-3 shadow-sm">
                  <span className="flex items-center gap-2"><Mail className="h-4 w-4 text-gray-400" /> Executive invites</span>
                  <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Sent</span>
                </div>
              </div>
            </Card>
          </aside>
        </div>
      </main>
    </div>
  )
}

function Card({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
      <div className="mb-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">{title}</h2>
        <p className="mt-1 text-xs text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  )
}

function StatCard({ title, value, icon: Icon }: { title: string; value: string | number; icon: React.ComponentType<{ className?: string; size?: number }> }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
        <Icon size={16} className="text-blue-600" />
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
      <p className="mt-2 text-sm font-semibold text-gray-900">{value}</p>
    </div>
  )
}

function InviteItem({ label, value, actionText, onAction, href }: { label: string; value: string; actionText: string; onAction?: () => void; href?: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
          <p className="mt-1 break-all text-sm font-semibold text-gray-900">{value}</p>
        </div>
        {href ? (
          <Link to={href} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
            {actionText}
          </Link>
        ) : (
          <button type="button" onClick={onAction} className="rounded-full bg-white px-3 py-1.5 text-xs font-bold text-blue-700 shadow-sm">
            {actionText}
          </button>
        )}
      </div>
    </div>
  )
}

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">{text}</div>
}
