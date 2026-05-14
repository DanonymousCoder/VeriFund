import React from 'react'
import { Search, Bell, ShieldCheck, Share2, MapPin, Users, Hash } from 'lucide-react'
import verifundLogo from '../assets/verifund-logo.png'

export const ProfileHeader: React.FC = () => {
  return (
    <header className="bg-white border-b border-gray-100">
      <nav className="flex items-center justify-between px-8 py-4 max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <img src={verifundLogo} alt="VeriFund" className="h-6 w-6" />
          <span className="text-xl font-bold text-gray-900">VeriFund</span>
        </div>
        <div className="flex items-center space-x-8">
          <div className="flex space-x-6 text-sm font-medium">
            <a href="#" className="text-blue-600 border-b-2 border-blue-600 pb-1">Trust Score</a>
            <a href="#" className="text-gray-500 hover:text-gray-900">Explore</a>
          </div>
          <div className="flex items-center space-x-4 border-l pl-6 border-gray-100">
            <Search className="w-4 h-4 text-gray-400 cursor-pointer" />
            <Bell className="w-4 h-4 text-gray-400 cursor-pointer" />
            <ShieldCheck className="w-4 h-4 text-gray-400 cursor-pointer" />
            <div className="w-8 h-8 rounded-full bg-gray-200 overflow-hidden">
              <img src="/api/placeholder/32/32" alt="User" />
            </div>
          </div>
        </div>
      </nav>

      <div className="px-8 py-10 max-w-7xl mx-auto flex justify-between items-end">
        <div className="space-y-4">
          <div className="flex items-center space-x-3">
            <span className="bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1">
              <ShieldCheck size={12} /> VeriFund Certified
            </span>
            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Public Profile</span>
          </div>
          <h1 className="text-4xl font-bold text-gray-900">Unity Wealth Cooperative</h1>
          <div className="flex items-center space-x-6 text-xs text-gray-500 font-medium">
            <span className="flex items-center gap-1.5"><Hash size={14} /> RC-123456</span>
            <span className="flex items-center gap-1.5"><MapPin size={14} /> Lagos, Nigeria</span>
            <span className="flex items-center gap-1.5"><Users size={14} /> 4,205 Members</span>
          </div>
        </div>
        <div className="flex space-x-3">
          <button className="bg-[#005AD2] text-white px-8 py-3 rounded-md font-bold text-sm shadow-lg shadow-blue-100">
            Join Cooperative
          </button>
          <button className="p-3 border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50">
            <Share2 size={18} />
          </button>
        </div>
      </div>
    </header>
  )
}

type TrustGaugeProps = { score: number }
export const TrustGauge: React.FC<TrustGaugeProps> = ({ score }) => (
  <div className="bg-white border border-gray-100 p-8 rounded-xl shadow-sm text-center">
    <h3 className="text-sm font-bold text-gray-800 mb-8">Overall Trust Score</h3>
    <div className="relative w-40 h-40 mx-auto flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 160 160">
        <circle cx="80" cy="80" r="70" stroke="#F1F5F9" strokeWidth="12" fill="none" />
        <circle
          cx="80"
          cy="80"
          r="70"
          stroke="#10B981"
          strokeWidth="12"
          fill="none"
          strokeDasharray="440"
          strokeDashoffset={440 - (440 * score) / 100}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-bold text-gray-900 leading-none">{score}</span>
        <span className="text-[10px] text-gray-400 font-bold uppercase mt-1">out of 100</span>
      </div>
    </div>
    <p className="mt-8 text-[11px] text-gray-400 leading-relaxed max-w-[220px] mx-auto">
      Excellent standing. High reliability in member verification and consistent contribution patterns.
    </p>
  </div>
)

export const ScoreBreakdown: React.FC = () => {
  const metrics = [
    { label: 'Member Verification', value: 95, color: 'bg-emerald-400' },
    { label: 'Contribution Regularity', value: 88, color: 'bg-emerald-400' },
    { label: 'Withdrawal Pattern', value: 76, color: 'bg-blue-500' },
    { label: 'Transparency', value: 98, color: 'bg-emerald-400' },
    { label: 'AI Risk Signal', value: 60, color: 'bg-gray-400' },
  ]

  return (
    <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm mt-6">
      <div className="flex items-center gap-2 mb-6 border-b border-gray-50 pb-4">
        <ShieldCheck className="w-4 h-4 text-gray-400" />
        <h3 className="text-sm font-bold text-gray-800">Score Breakdown</h3>
      </div>
      <div className="space-y-5">
        {metrics.map((m) => (
          <div key={m.label}>
            <div className="flex justify-between text-[10px] font-bold mb-2">
              <span className="text-gray-500 uppercase tracking-tight">{m.label}</span>
              <span className="text-gray-900">{m.value}%</span>
            </div>
            <div className="w-full bg-blue-50 h-2 rounded-full overflow-hidden">
              <div className={`${m.color} h-full rounded-full`} style={{ width: `${m.value}%` }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export const ActivitySignals: React.FC = () => {
  const activities = [
    { type: 'Bulk Withdrawal', id: 'TX-***892', amount: '₦***,***.00', date: 'Today, 10:23 AM', dot: 'bg-blue-500' },
    { type: 'Contribution Run', id: 'TX-***415', amount: '₦***,***.00', date: 'Yesterday', dot: 'bg-emerald-400' },
    { type: 'Member Audit', id: 'AU-***112', amount: '-', date: 'Oct 24, 2023', dot: 'bg-gray-400' },
    { type: 'Loan Disbursement', id: 'TX-***990', amount: '₦***,***.00', date: 'Oct 22, 2023', dot: 'bg-blue-500' },
    { type: 'Contribution Run', id: 'TX-***221', amount: '₦***,***.00', date: 'Oct 15, 2023', dot: 'bg-emerald-400' },
  ]

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden h-full">
      <div className="p-5 border-b border-gray-50 flex items-center gap-2">
        <ShieldCheck size={16} className="text-gray-400" />
        <h3 className="text-sm font-bold text-gray-800">Recent Activity Signals</h3>
      </div>
      <table className="w-full text-left">
        <thead className="bg-gray-50/50 border-b border-gray-100">
          <tr className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
            <th className="px-5 py-3">Type</th>
            <th className="px-5 py-3">ID</th>
            <th className="px-5 py-3 text-right">Amount</th>
            <th className="px-5 py-3 text-right">Date</th>
          </tr>
        </thead>
        <tbody className="text-[11px] text-gray-600">
          {activities.map((row, i) => (
            <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
              <td className="px-5 py-4 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full ${row.dot}`} />
                {row.type}
              </td>
              <td className="px-5 py-4 font-mono text-gray-400">{row.id}</td>
              <td className="px-5 py-4 text-right font-bold text-gray-900">{row.amount}</td>
              <td className="px-5 py-4 text-right text-gray-400">{row.date}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const PublicProfileDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileHeader />
      <main className="max-w-7xl mx-auto px-8 py-10 grid grid-cols-12 gap-8">
        <section className="col-span-12 lg:col-span-7 space-y-6">
          <TrustGauge score={82} />
          <ScoreBreakdown />
        </section>

        <aside className="col-span-12 lg:col-span-5">
          <ActivitySignals />
        </aside>
      </main>
    </div>
  )
}

export default PublicProfileDashboard
