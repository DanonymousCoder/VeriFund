import React from 'react'
import { Check, ChevronDown, Hash, ShieldCheck, Info, ArrowRight, Lock } from 'lucide-react'

type Step = { label: string; status: 'completed' | 'active' | 'pending' }

const Stepper: React.FC<{ currentStep?: number }> = ({ currentStep = 0 }) => {
  const labels = ['Identity', 'Account', 'Authorize']

  return (
    <div className="flex items-center justify-center w-full max-w-md mx-auto mb-10">
      {labels.map((label, index) => {
        const status: Step['status'] = index < currentStep ? 'completed' : index === currentStep ? 'active' : 'pending'
        return (
          <React.Fragment key={label}>
            <div className="flex flex-col items-center relative">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  status === 'completed' ? 'bg-emerald-500 text-white' : status === 'active' ? 'bg-[#005AD2] text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {status === 'completed' ? <Check size={16} strokeWidth={3} /> : index + 1}
              </div>
              <span className={`absolute -bottom-6 text-[10px] font-bold uppercase tracking-widest ${status === 'active' ? 'text-[#005AD2]' : 'text-gray-400'}`}>
                {label}
              </span>
            </div>
            {index < labels.length - 1 && <div className={`flex-1 h-[1px] mx-4 ${index < currentStep ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

const BankAccountForm: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Visual Accent */}
      <div className="h-1 w-full bg-[#005AD2]" />

      <div className="p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Link Your Bank Account</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-8">
          Select your primary institution and enter your account number to synchronize your profile.
        </p>

        <form className="space-y-6">
          {/* Institution Selection */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Institution</label>
            <div className="relative">
              <select className="w-full appearance-none bg-[#F8FAFC] border border-gray-100 rounded-md py-3 px-4 text-sm text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all">
                <option>Select a bank...</option>
              </select>
              <ChevronDown className="absolute right-3 top-3.5 text-gray-400 w-4 h-4" />
            </div>
          </div>

          {/* Account Number Input */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Account Number</label>
            <div className="relative">
              <input
                type="text"
                placeholder="e.g. 0123456789"
                className="w-full bg-[#F8FAFC] border border-gray-100 rounded-md py-3 px-4 text-sm font-mono placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
              />
              <Hash className="absolute right-3 top-3 text-gray-300 w-4 h-4" />
            </div>
          </div>

          {/* Verify Button */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 bg-blue-50 border border-blue-100 text-[#005AD2] font-bold text-[11px] py-3 rounded-md hover:bg-blue-100 transition-colors uppercase tracking-widest"
          >
            <ShieldCheck size={16} /> Verify Account
          </button>

          {/* Information Notice */}
          <div className="bg-gray-50 border border-gray-100 border-dashed rounded-md p-4 flex gap-3">
            <Info className="text-gray-400 w-5 h-5 shrink-0" />
            <p className="text-[11px] text-gray-500 leading-normal">
              Account details will appear here once verified. Ensure the name matches your registered BVN profile.
            </p>
          </div>
        </form>
      </div>

      {/* Footer Action Area */}
      <div className="bg-[#E5EFFF] p-6 border-t border-gray-100">
        <button className="w-full bg-[#CADFFF] text-[#8EA9D1] py-3.5 rounded-md font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed">
          Proceed to Authorize <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

const BankLinkLayout: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-6">
      {/* Brand Label */}
      <div className="mb-12">
        <span className="text-lg font-bold text-gray-900 tracking-tight">VeriFund</span>
      </div>

      <div className="w-full max-w-lg">
        <Stepper currentStep={1} />
        <BankAccountForm />
      </div>

      {/* Compliance Footer */}
      <div className="mt-8 flex items-center gap-2 text-gray-400">
        <Lock size={12} />
        <span className="text-[10px] font-medium uppercase tracking-widest">Secured via NDIC & NIBSS Framework</span>
      </div>
    </div>
  )
}

export default BankLinkLayout
