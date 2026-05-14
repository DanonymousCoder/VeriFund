import React from 'react'
import { Send, ShieldCheck, CheckCircle2 } from 'lucide-react'

type StatusStepProps = {
  label: string
  time?: string
  completed?: boolean
  active?: boolean
  inactive?: boolean
}

const StatusStep: React.FC<StatusStepProps> = ({ label, time, completed, active }) => {
  let dotColor = 'bg-gray-300'
  if (completed) dotColor = 'bg-emerald-500'
  if (active) dotColor = 'bg-blue-500'

  return (
    <div className="flex gap-4 relative z-10">
      <div className={`w-5 h-5 rounded-full border-2 border-white flex items-center justify-center flex-shrink-0 ${dotColor}`}>
        {completed && <CheckCircle2 size={14} className="text-white" />}
      </div>
      <div>
        <p className={`text-sm font-bold ${completed || active ? 'text-gray-900' : 'text-gray-400'}`}>
          {label}
        </p>
        {time && <p className="text-[10px] text-gray-400">{time}</p>}
      </div>
    </div>
  )
}

export const WithdrawalHeader: React.FC = () => (
  <div className="flex justify-between items-end mb-8">
    <div>
      <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">Ref: WR-8492-AX</span>
      <h1 className="text-4xl font-bold text-gray-900 mt-1">Multi-Sig Authorization</h1>
    </div>
    <div className="flex gap-3">
      <button className="px-6 py-2.5 border border-gray-200 text-gray-600 font-bold text-xs rounded hover:bg-gray-50 transition-colors">
        Save Draft
      </button>
      <button className="px-6 py-2.5 bg-[#005AD2] text-white font-bold text-xs rounded flex items-center gap-2 hover:bg-blue-700 transition-all">
        Request Signatures <Send size={14} />
      </button>
    </div>
  </div>
)

type SignatoryItemProps = {
  name?: string
  role: string
  status: 'Signed' | 'Pending' | 'Unassigned'
  avatar?: string
}

export const SignatoryItem: React.FC<SignatoryItemProps> = ({ name, role, status, avatar }) => {
  const statusStyles = {
    Signed: 'bg-emerald-50 text-emerald-600 border-emerald-100',
    Pending: 'bg-blue-50 text-blue-600 border-blue-100',
    Unassigned: 'text-blue-600',
  } as const

  return (
    <div className="flex items-center justify-between p-4 border border-gray-100 rounded-lg mb-3 last:mb-0 bg-white shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gray-100 overflow-hidden border border-gray-200">
          {avatar ? (
            <img src={avatar} alt={name || 'Unassigned'} />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-gray-400">👤</div>
          )}
        </div>
        <div>
          <p className="text-sm font-bold text-gray-900">{name || 'Unassigned'}</p>
          <p className="text-[10px] text-gray-400 uppercase font-bold tracking-tight">{role}</p>
        </div>
      </div>
      {status === 'Unassigned' ? (
        <button className="text-[10px] font-bold uppercase text-blue-600 hover:underline">Assign Signatory</button>
      ) : (
        <span className={`text-[9px] font-bold px-2 py-1 rounded-full border ${statusStyles[status]}`}>
          {status === 'Signed' ? '✓ Signed' : '🕒 Pending'}
        </span>
      )}
    </div>
  )
}

export const AIRiskProfile: React.FC = () => (
  <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6 shadow-sm">
    <div className="flex justify-between items-center mb-4">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
        <ShieldCheck size={14} className="text-emerald-500" /> AI Risk Profile
      </h3>
    </div>
    <div className="flex items-baseline gap-1 mb-4">
      <span className="text-4xl font-bold text-gray-900">15</span>
      <span className="text-gray-400 text-sm">%</span>
      <span className="ml-auto bg-emerald-50 text-emerald-600 text-[9px] font-bold px-2 py-0.5 rounded">
        LOW RISK
      </span>
    </div>
    <ul className="space-y-3 pt-3 border-t border-gray-50">
      {['Destination History', 'Velocity Check'].map((item) => (
        <li key={item} className="flex justify-between text-[11px] text-gray-500 font-medium">
          {item} <span className="text-emerald-500 font-bold">✓</span>
        </li>
      ))}
      <li className="flex justify-between text-[11px] text-gray-500 font-medium">
        Amount vs Baseline <span className="text-gray-900 font-bold">Normal</span>
      </li>
    </ul>
  </div>
)

export const TransactionStatus: React.FC = () => (
  <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
    <h3 className="text-sm font-bold text-gray-900 mb-6">Status</h3>
    <div className="space-y-6 relative before:absolute before:left-[9px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">
      <StatusStep label="Submitted" time="Today, 09:41 AM" completed />
      <StatusStep label="AI Risk Checked" time="Today, 09:42 AM" completed />
      <StatusStep label="Signatures Pending" time="Awaiting 2 of 3" active />
      <StatusStep label="Funds Released" />
    </div>
  </div>
)

const MultiSigAuthorization: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <main className="overflow-y-auto p-12">
        <div className="max-w-6xl mx-auto">
          <WithdrawalHeader />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 space-y-6">
              {/* Withdrawal Details Form Area */}
              <div className="bg-white border-t-4 border-t-blue-600 border border-gray-100 rounded-xl p-8 shadow-sm">
                <h2 className="text-sm font-bold text-gray-900 mb-6">Withdrawal Details</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Amount
                    </label>
                    <input
                      type="text"
                      placeholder="0.00"
                      className="w-full px-4 py-3 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Account
                    </label>
                    <input
                      type="text"
                      placeholder="Select account"
                      className="w-full px-4 py-3 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">
                      Purpose
                    </label>
                    <textarea
                      placeholder="Enter withdrawal purpose"
                      rows={3}
                      className="w-full px-4 py-3 border border-gray-200 rounded-md focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-8 shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                    <ShieldCheck size={18} className="text-blue-600" /> Multi-Signature Requirement
                  </h2>
                  <span className="text-[10px] text-gray-500 bg-gray-50 px-2 py-1 rounded">1 of 3 Signatures</span>
                </div>
                <SignatoryItem name="Sarah Jenkins" role="Treasurer" status="Signed" />
                <SignatoryItem name="Marcus Thorne" role="Executive 1" status="Pending" />
                <SignatoryItem role="Executive 2" status="Unassigned" />
              </div>
            </div>

            <aside className="lg:col-span-4">
              <AIRiskProfile />
              <TransactionStatus />
            </aside>
          </div>
        </div>
      </main>
    </div>
  )
}

export default MultiSigAuthorization
