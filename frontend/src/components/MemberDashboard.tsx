import {
  AlertTriangle,
  CheckSquare,
  HelpCircle,
  LayoutDashboard,
  Plus,
  Settings,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

type NavItem = {
  name: string
  icon: LucideIcon
  active?: boolean
}

const navItems: NavItem[] = [
  { name: 'Dashboard', icon: LayoutDashboard, active: true },
  { name: 'Trust Score', icon: ShieldCheck },
  { name: 'Withdrawals', icon: Wallet },
  { name: 'Fraud Alerts', icon: AlertTriangle },
  { name: 'Verification', icon: CheckSquare },
]

const contributionHistory = [
  { date: 'Sep 15, 2023', amount: '₦25,000', status: 'Confirmed', ref: 'SQD-8821' },
  { date: 'Aug 15, 2023', amount: '₦25,000', status: 'Confirmed', ref: 'SQD-8821' },
  { date: 'Jul 15, 2023', amount: '₦25,000', status: 'Flagged', ref: 'SQD-8821' },
  { date: 'Jun 15, 2023', amount: '₦25,000', status: 'Confirmed', ref: 'SQD-8821' },
] as const

function Sidebar() {
  return (
    <aside className="flex h-screen w-64 flex-col border-r border-gray-100 bg-white p-4">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="rounded bg-gray-800 p-1.5">
          <Wallet className="h-4 w-4 text-white" />
        </div>
        <span className="font-bold text-gray-900">VeriFund</span>
      </div>

      <div className="mb-6 flex items-center gap-3 rounded-lg bg-gray-50 p-3">
        <div className="h-10 w-10 overflow-hidden rounded-full bg-gray-300">
          <img
            src="/avatar-placeholder.jpg"
            alt="Profile"
            className="h-full w-full object-cover"
          />
        </div>
        <div>
          <p className="text-[10px] font-bold text-gray-900">VeriFund Member</p>
          <p className="font-mono text-[10px] text-gray-500">VF-90210</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.name}
            type="button"
            className={`flex w-full items-center gap-3 rounded-md px-3 py-2 text-xs font-medium transition-colors ${
              item.active ? 'bg-[#005AD2] text-white' : 'text-gray-500 hover:bg-gray-50'
            }`}
          >
            <item.icon size={16} />
            {item.name}
          </button>
        ))}
      </nav>

      <div className="space-y-4 border-t border-gray-100 pt-4">
        <button
          type="button"
          className="flex w-full items-center justify-center gap-2 rounded-md bg-[#005AD2] py-2 text-[10px] font-bold text-white"
        >
          <Plus size={14} /> New Withdrawal
        </button>
        <div className="space-y-1">
          <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-xs text-gray-500">
            <Settings size={16} /> Settings
          </button>
          <button type="button" className="flex w-full items-center gap-3 px-3 py-2 text-xs text-gray-500">
            <HelpCircle size={16} /> Help
          </button>
        </div>
      </div>
    </aside>
  )
}

function DashboardHeader() {
  return (
    <div className="grid grid-cols-3 gap-6 mb-6">
      <div className="col-span-2 relative overflow-hidden rounded-xl border border-blue-100 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Total Cooperative Balance
            </h3>
            <p className="mt-1 text-2xl font-bold text-gray-900">₦1,250,000</p>
          </div>
          <span className="flex items-center gap-1 rounded bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-600">
            <CheckSquare size={10} /> VERIFIED MEMBER
          </span>
        </div>
        <p className="text-xs text-gray-500">
          Your contributions: <span className="font-bold text-gray-900">₦450,000</span>
        </p>
        <div className="absolute right-0 top-0 h-full w-1 bg-blue-500" />
      </div>

      <div className="flex flex-col items-center justify-center rounded-xl border border-gray-100 bg-white p-6 shadow-sm relative">
        <h3 className="mb-4 text-[10px] font-bold uppercase tracking-widest text-gray-400">Trust Score</h3>
        <div className="relative flex h-24 w-24 items-center justify-center">
          <div className="absolute inset-0 rounded-lg border-4 border-emerald-400 rotate-45" />
          <div className="text-center">
            <p className="text-xl font-bold leading-none text-gray-800">85</p>
            <p className="text-[10px] text-gray-400">/100</p>
          </div>
        </div>
        <span className="mt-4 rounded-full bg-blue-50 px-3 py-1 text-[9px] font-bold uppercase tracking-tighter text-blue-600">
          Excellent Standing
        </span>
      </div>
    </div>
  )
}

function HistoryTable() {
  return (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-50 p-4">
        <h3 className="text-xs font-bold text-gray-700">Contribution History</h3>
        <button type="button" className="flex items-center gap-1 text-[10px] font-bold text-blue-600">
          View All <Plus size={10} className="rotate-45" />
        </button>
      </div>
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-50 text-[10px] font-bold uppercase text-gray-400">
            <th className="px-6 py-4">Date</th>
            <th className="px-6 py-4">Amount</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4">Squad Ref</th>
          </tr>
        </thead>
        <tbody className="text-xs text-gray-600">
          {contributionHistory.map((row) => (
            <tr key={`${row.date}-${row.ref}`} className="border-b border-gray-50 last:border-0">
              <td className="px-6 py-4">{row.date}</td>
              <td className="px-6 py-4 font-bold text-gray-900">{row.amount}</td>
              <td className="px-6 py-4">
                <span
                  className={`rounded px-2 py-1 text-[9px] font-bold ${
                    row.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-400'
                  }`}
                >
                  {row.status === 'Confirmed' ? '✓ Confirmed' : '⚠ Flagged'}
                </span>
              </td>
              <td className="px-6 py-4 font-mono text-[10px]">{row.ref}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function StatCard({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{title}</p>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  )
}

export function MemberDashboard() {
  return (
    <div className="flex min-h-screen bg-[#F8FAFC] text-gray-900">
      <Sidebar />

      <main className="flex-1 p-8 lg:p-10">
        <div className="mb-8 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Member Overview</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">Dashboard</h1>
          </div>
          <p className="text-sm text-gray-500">Welcome back, trusted member.</p>
        </div>

        <DashboardHeader />

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <StatCard title="Savings Balance" value="₦450,000" />
          <StatCard title="Pending Withdrawals" value="₦75,000" />
          <StatCard title="Verified Actions" value="24" />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
          <HistoryTable />

          <div className="space-y-6">
            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">Quick Actions</h2>
              <div className="mt-4 space-y-3">
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  Request withdrawal <Plus size={14} className="text-gray-400" />
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  View trust report <ShieldCheck size={14} className="text-gray-400" />
                </button>
                <button
                  type="button"
                  className="flex w-full items-center justify-between rounded-lg border border-gray-100 px-4 py-3 text-sm text-gray-700 transition hover:bg-gray-50"
                >
                  Support center <HelpCircle size={14} className="text-gray-400" />
                </button>
              </div>
            </section>

            <section className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-700">Trust Insights</h2>
              <div className="mt-4 space-y-4">
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Contribution consistency</span>
                    <span>91%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 w-[91%] rounded-full bg-[#005AD2]" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Verification health</span>
                    <span>85%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 w-[85%] rounded-full bg-emerald-500" />
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                    <span>Fraud risk signals</span>
                    <span>12%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100">
                    <div className="h-2 w-[12%] rounded-full bg-amber-400" />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </div>
      </main>
    </div>
  )
}
