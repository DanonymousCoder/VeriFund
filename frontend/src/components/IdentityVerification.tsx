import React from 'react'
import { Grid3X3, CheckCircle2, RefreshCw, Lock } from 'lucide-react'

type StepperProps = { currentStep: number }

export const Stepper: React.FC<StepperProps> = ({ currentStep }) => {
  const steps = ['Identity', 'Account', 'Authorize']

  return (
    <div className="flex w-full mb-8 border-b border-gray-100">
      {steps.map((step, index) => {
        const isActive = index === currentStep
        return (
          <div key={step} className="flex-1 text-center relative pb-3">
            <span
              className={`text-[10px] font-bold uppercase tracking-widest ${
                isActive ? 'text-blue-600' : 'text-gray-400'
              }`}
            >
              {step}
            </span>
            {isActive && <div className="absolute bottom-0 left-0 w-full h-[2px] bg-blue-600" />}
          </div>
        )
      })}
    </div>
  )
}

export const VerificationForm: React.FC = () => {
  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="p-8 border-b border-gray-50">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Verify your Identity</h2>
        <p className="text-xs text-gray-500 leading-relaxed">
          Please provide your Bank Verification Number to securely link your account.
        </p>
      </div>

      <div className="p-8 space-y-6">
        {/* BVN Input */}
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
            BVN ENTRY (11 DIGITS)
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
              <Grid3X3 className="w-4 h-4 text-gray-400" />
            </div>
            <input
              type="text"
              value="22***4321"
              readOnly
              className="w-full pl-10 pr-10 py-3 bg-white border border-emerald-400 rounded-md text-sm font-medium focus:outline-none"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Status Indicator */}
        <div className="bg-blue-50 border border-blue-100 rounded-md py-3 px-4 flex items-center gap-3">
          <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
          <span className="text-xs font-medium text-blue-700">Verifying with CBN database...</span>
        </div>

        {/* Name Fields */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">First Name</label>
            <input
              type="text"
              value="Amaka"
              disabled
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900"
            />
          </div>
          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">Last Name</label>
            <input
              type="text"
              value="Obi"
              disabled
              className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-900"
            />
          </div>
        </div>
      </div>

      {/* Footer / CTA */}
      <div className="p-8 pt-0 text-center">
        <button className="w-full bg-[#005AD2] text-white py-3.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors">
          Proceed <span>→</span>
        </button>
        <div className="mt-4 flex items-center justify-center gap-2 text-gray-400">
          <Lock size={12} />
          <span className="text-[10px] font-medium tracking-tight">Secured by National Identity Service</span>
        </div>
      </div>
    </div>
  )
}

const IdentityVerificationPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDFDFD] flex flex-col items-center justify-center p-6">
      {/* Brand Logo */}
      <div className="flex items-center gap-2 mb-8">
        <div className="w-6 h-6 border-2 border-blue-600 rounded-md flex items-center justify-center">
          <div className="w-3 h-3 bg-blue-600 rounded-full" />
        </div>
        <span className="text-xl font-bold text-gray-900">VeriFund</span>
      </div>

      <div className="w-full max-w-md">
        <Stepper currentStep={0} />
        <VerificationForm />
      </div>
    </div>
  )
}

export default IdentityVerificationPage
