import React, { useState } from 'react'
import { Grid3X3, RefreshCw, Lock, Check, ArrowRight } from 'lucide-react'
import verifundLogo from '../assets/verifund-logo.png'

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

export const VerificationForm: React.FC = () => {
  const [bvn, setBvn] = useState('')

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Visual Accent */}
      <div className="h-1 w-full bg-[#005AD2]" />

      <div className="p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verify your Identity</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-8">
          Please provide your Bank Verification Number to securely link your account.
        </p>

        <form className="space-y-6">
          {/* BVN Input */}
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              BVN Entry (11 Digits)
            </label>
            <div className="relative">
              <input
                type="text"
                value={bvn}
                onChange={(e) => setBvn(e.target.value)}
                placeholder="e.g. 12345678901"
                inputMode="numeric"
                maxLength={11}
                className="w-full bg-[#F8FAFC] border border-gray-100 rounded-md py-3 px-4 text-sm font-mono placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
              />
              <Grid3X3 className="absolute right-3 top-3 text-gray-300 w-4 h-4" />
            </div>
          </div>

          {/* Status Indicator */}
          <div className="bg-gray-50 border border-gray-100 border-dashed rounded-md p-4 flex gap-3">
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
            <p className="text-[11px] text-gray-500 leading-normal">
              Verifying with CBN database...
            </p>
          </div>

          {/* Name Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">First Name</label>
              <input
                type="text"
                value="Amaka"
                disabled
                className="w-full bg-[#F8FAFC] border border-gray-100 rounded-md py-3 px-4 text-sm text-gray-500"
              />
            </div>
            <div className="space-y-2">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Name</label>
              <input
                type="text"
                value="Obi"
                disabled
                className="w-full bg-[#F8FAFC] border border-gray-100 rounded-md py-3 px-4 text-sm text-gray-500"
              />
            </div>
          </div>
        </form>
      </div>

      {/* Footer Action Area */}
      <div className="bg-[#E5EFFF] p-6 border-t border-gray-100">
        <button className="w-full bg-[#005AD2] text-white py-3.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
          Proceed to Account <ArrowRight size={16} />
        </button>
      </div>
    </div>
  )
}

const IdentityVerificationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-6">
      {/* Brand Label */}
      <div className="mb-12 flex items-center gap-2">
        <img src={verifundLogo} alt="VeriFund" className="h-8 w-8" />
        <span className="text-lg font-bold text-gray-900 tracking-tight">VeriFund</span>
      </div>

      <div className="w-full max-w-lg">
        <Stepper currentStep={0} />
        <VerificationForm />
      </div>

      {/* Compliance Footer */}
      <div className="mt-8 flex items-center gap-2 text-gray-400">
        <Lock size={12} />
        <span className="text-[10px] font-medium uppercase tracking-widest">Secured via National Identity Service</span>
      </div>
    </div>
  )
}

export default IdentityVerificationPage
