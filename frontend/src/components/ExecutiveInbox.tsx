import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, CheckCircle2, Clock, ShieldCheck, Wallet } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useMemberProfile } from '../hooks/useMemberData'
import { storageService } from '../services/storage'
import type { CooperativeRecord, FraudReport, WithdrawalRequest } from '../types/storage'
import verifundLogo from '../assets/verifund-logo.png'

export default function ExecutiveInbox() {
  const { session } = useAuth()
  const { profile } = useMemberProfile()
  const [cooperative, setCooperative] = useState<CooperativeRecord | null>(null)
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([])
  const [reports, setReports] = useState<FraudReport[]>([])

  useEffect(() => {
    const load = async () => {
      if (!profile?.cooperativeCode) return
      const found = await storageService.cooperative.findByCode(profile.cooperativeCode)
      const allWithdrawals = await storageService.withdrawals.getAll()
      const allReports = await storageService.fraudReports.getAll()
      setCooperative(found)
      setWithdrawals(allWithdrawals.filter((item) => item.cooperativeCode === profile.cooperativeCode))
      setReports(allReports.filter((item) => item.cooperativeCode === profile.cooperativeCode))
    }

    load()
  }, [profile?.cooperativeCode])

  const pendingRequests = useMemo(() => withdrawals.filter((item) => item.status === 'pending_signatures'), [withdrawals])

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-gray-900">
      <main className="mx-auto max-w-7xl px-6 py-10 lg:px-8">
        <div className="mb-8 flex flex-col gap-4 rounded-2xl border border-gray-100 bg-white p-6 shadow-sm md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <img src={verifundLogo} alt="VeriFund" className="h-12 w-12" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Executive inbox</p>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">{cooperative?.cooperativeName ?? 'Executive workspace'}</h1>
              <p className="text-sm text-gray-500">{session?.email}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/authorize"
              className="inline-flex items-center gap-2 rounded-full bg-[#005AD2] px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
            >
              Open Signature Room <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
            >
              Full Dashboard <ShieldCheck className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <MiniStat title="Pending Signatures" value={pendingRequests.length} icon={Clock} />
          <MiniStat title="Fraud Alerts" value={reports.length} icon={AlertTriangle} />
          <MiniStat title="Signed Today" value={Math.max(0, withdrawals.reduce((count, item) => count + item.approvals.length, 0))} icon={CheckCircle2} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Withdrawal Requests</h2>
            <p className="mt-1 text-xs text-gray-500">Executives can review amount, destination and decide to approve or reject from the multi-signature room.</p>
            <div className="mt-5 space-y-3">
              {pendingRequests.length > 0 ? (
                pendingRequests.map((item) => (
                  <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-gray-900">NGN {item.amount.toLocaleString()}</p>
                        <p className="text-xs text-gray-500">{item.purpose}</p>
                      </div>
                      <span className="rounded-full bg-blue-50 px-2 py-1 text-[10px] font-bold uppercase tracking-widest text-blue-700">
                        {item.aiRiskStatus === 'blocked' ? 'AI BLOCKED' : 'PENDING'}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">Destination: {item.destinationAccount}</p>
                    <p className="text-xs text-gray-500">Initiated by: {item.initiatedBy}</p>
                    <p className="text-xs text-gray-500">Approvals: {item.approvals.length} · Rejections: {item.rejections.length}</p>
                  </div>
                ))
              ) : (
                <EmptyState text="No pending withdrawal requests right now." />
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Executive Rules</h2>
              <ul className="mt-4 space-y-3 text-sm text-gray-600">
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Co-sign withdrawal requests only.</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Cannot initiate withdrawals.</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Cannot invite or remove members.</li>
                <li className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-500" /> Cannot sign twice or approve own request.</li>
              </ul>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Fraud Alerts</h2>
              <div className="mt-4 space-y-3">
                {reports.length > 0 ? (
                  reports.slice(0, 3).map((item) => (
                    <div key={item.id} className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-gray-500">
                        <AlertTriangle className="h-4 w-4 text-rose-500" /> {item.category}
                      </div>
                      <p className="mt-2 text-sm text-gray-700">{item.details}</p>
                    </div>
                  ))
                ) : (
                  <EmptyState text="No fraud reports yet." />
                )}
              </div>
            </section>

            <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold uppercase tracking-widest text-gray-700">Activity Feed</h2>
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <span className="flex items-center gap-2"><Wallet className="h-4 w-4 text-gray-400" /> Awaiting signature review</span>
                  <span className="rounded bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">Live</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                  <span className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gray-400" /> AI fraud monitoring</span>
                  <span className="rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Enabled</span>
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  )
}

function MiniStat({ title, value, icon: Icon }: { title: string; value: number | string; icon: React.ComponentType<{ size?: number; className?: string }> }) {
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

function EmptyState({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 p-4 text-sm text-gray-500">{text}</div>
}
