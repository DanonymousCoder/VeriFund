import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Check, Landmark, BadgeCheck, Lock, Shield } from 'lucide-react'
import { storageService } from '../services/storage'

const Stepper: React.FC = () => {
  const steps = [
    { label: 'Identity', completed: true },
    { label: 'Account', completed: true },
    { label: 'Authorize', active: true },
  ]

  return (
    <div className="flex items-center justify-between w-full max-w-xs mx-auto mb-8 relative">
      <div className="absolute top-4 left-0 w-full h-[1px] bg-gray-200 -z-0" />

      {steps.map((step, idx) => (
        <div key={idx} className="flex flex-col items-center z-10">
          <div
            className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
              step.completed
                ? 'bg-[#10B981] text-white'
                : step.active
                ? 'bg-[#005AD2] text-white shadow-lg shadow-blue-100'
                : 'bg-gray-100 text-gray-400'
            }`}
          >
            {step.completed ? <Check size={14} strokeWidth={3} /> : idx + 1}
          </div>
          <span
            className={`mt-2 text-[10px] font-bold uppercase tracking-wider ${
              step.active ? 'text-[#005AD2]' : 'text-gray-400'
            }`}
          >
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}

const BankPreview: React.FC = () => (
  <div className="bg-[#EBF2FF] border border-blue-100 rounded-md p-4 flex items-center justify-between mb-6">
    <div className="flex items-center gap-4">
      <div className="bg-white p-2 rounded-md shadow-sm">
        <Landmark size={20} className="text-gray-700" />
      </div>
      <div className="text-left">
        <p className="text-sm font-bold text-gray-900 leading-tight">Guaranty Trust Bank</p>
        <p className="text-xs text-gray-500 font-mono">Savings •••• 4589</p>
      </div>
    </div>
    <BadgeCheck size={20} className="text-[#10B981] fill-emerald-50" />
  </div>
)

const MandateAuthorization: React.FC = () => {
  const navigate = useNavigate()
  const [agreed, setAgreed] = useState(false)

  const handleAuthorize = async () => {
    if (!agreed) return

    const session = await storageService.auth.getSession()
    const profile = await storageService.member.getProfile()

    if (session) {
      await storageService.auth.setSession({
        ...session,
        verificationStatus: 'verified',
        onboardingComplete: true,
        timestamp: Date.now(),
      })
    }

    if (profile) {
      await storageService.member.setProfile({
        ...profile,
        verificationStatus: 'verified',
        onboardingComplete: true,
      })
    }

    navigate('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-6 font-sans">
      <div className="bg-white w-full max-w-lg rounded-xl border border-gray-100 shadow-sm p-10 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Mandate Authorization</h1>
        <p className="text-xs text-gray-500 mb-8">Step 3 of 3: Securely authorize direct debit for your contributions.</p>

        <Stepper />

        <div className="bg-white border border-gray-100 rounded-lg p-6 mb-6 text-left shadow-sm">
          <h2 className="text-sm font-bold text-gray-900 mb-3">Authorize Direct Debit</h2>
          <p className="text-[11px] text-gray-500 leading-relaxed mb-6">
            By authorizing this mandate, you allow VeriFund to securely automate your scheduled
            contributions from the linked account. You can manage or revoke this authorization
            at any time in your settings.
          </p>

          <BankPreview />
        </div>

        <div className="space-y-6">
          <div className="flex items-start gap-3 text-left">
            <input
              type="checkbox"
              id="mandate-terms"
              checked={agreed}
              onChange={() => setAgreed(!agreed)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-[#005AD2] focus:ring-[#005AD2]"
            />
            <label htmlFor="mandate-terms" className="text-[11px] text-gray-500 leading-relaxed">
              I agree to the <a href="#" className="text-[#005AD2] font-bold hover:underline">Direct Debit Mandate Terms</a> and authorize my bank to debit my account for scheduled VeriFund contributions.
            </label>
          </div>

          <button
            onClick={handleAuthorize}
            disabled={!agreed}
            className={`w-full py-3.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 transition-all ${
              agreed ? 'bg-[#005AD2] text-white hover:bg-blue-700' : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            Authorize & Finish <Lock size={14} />
          </button>

          <div className="text-center">
            <Link to="/dashboard" className="text-[11px] font-bold text-[#005AD2] hover:underline">
              Skip to dashboard
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 text-gray-400">
            <Shield size={12} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Secured by NIBSS</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MandateAuthorization
