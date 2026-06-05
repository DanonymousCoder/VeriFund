import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, Grid3X3, RefreshCw, Lock, Check, ArrowRight } from 'lucide-react'
import verifundLogo from '../assets/verifund-logo.png'
import { useMemberProfile } from '../hooks/useMemberData'
import { apiService } from '../services/api'
import { storageService } from '../services/storage'
import { APIError } from '../types/api'

type Step = { label: string; status: 'completed' | 'active' | 'pending' }

const Stepper: React.FC<{ currentStep?: number }> = ({ currentStep = 0 }) => {
  const labels = ['Account', 'Authorize', 'Done']

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
            {index < labels.length - 1 && <div className={`flex-1 h-px mx-4 ${index < currentStep ? 'bg-emerald-500' : 'bg-gray-200'}`} />}
          </React.Fragment>
        )
      })}
    </div>
  )
}

export const VerificationForm: React.FC = () => {
  const { profile, save } = useMemberProfile()
  const [bvn, setBvn] = useState(profile?.bvn ?? '')
  const [address, setAddress] = useState('')
  const [dob, setDob] = useState('')
  const [gender, setGender] = useState<'1' | '2'>('1')
  const [agreed, setAgreed] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isCreated, setIsCreated] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (profile?.bvn) {
      setBvn(profile.bvn)
    }
  }, [profile?.bvn])

  const handleCreateVirtualAccount = async () => {
    if (!profile) {
      setError('Profile unavailable. Please sign in again.')
      return
    }

    const bvnValid = /^\d{11}$/.test(bvn)
    if (!bvnValid || !address.trim() || !dob || !agreed) {
      setError('Enter a valid BVN, address, date of birth, and accept the terms to continue.')
      setIsCreated(false)
      return
    }

    const cooperativeId = profile.cooperativeId || profile.cooperativeCode
    if (!cooperativeId) {
      setError('Cooperative context unavailable. Please sign in again.')
      return
    }

    setIsSubmitting(true)
    setError('')
    try {
      const currentMember = await apiService.getCurrentMember()
      const response = await apiService.createVirtualAccount({
        cooperative_id: cooperativeId,
        bvn,
        dob,
        address: address.trim(),
        gender,
        phone_number: currentMember.phone_number,
        email: currentMember.email,
      })

      setIsCreated(true)
      await save({
        ...profile,
        bvn,
        virtualAccountNumber: response.virtual_account.virtual_account_number,
        verificationStatus: 'verified',
        onboardingComplete: true,
      })
    } catch (err) {
      if (err instanceof APIError) {
        const details = typeof err.data === 'object' && err.data !== null ? JSON.stringify(err.data) : err.message
        setError(details)
      } else {
        setError(err instanceof Error ? err.message : 'Failed to create virtual account')
      }
      setIsCreated(false)
    } finally {
      setIsSubmitting(false)
    }
  }

  const cooperativeDetails = async () => {
    if (!profile?.cooperativeCode) return null
    return storageService.cooperative.findByCode(profile.cooperativeCode)
  }

  const [cooperativeSummary, setCooperativeSummary] = useState<{
    cooperativeName: string
    adminName: string
    monthlyContributionAmount: number
  } | null>(null)

  React.useEffect(() => {
    const loadCooperative = async () => {
      const cooperative = await cooperativeDetails()
      if (!cooperative) return
      setCooperativeSummary({
        cooperativeName: cooperative.cooperativeName,
        adminName: cooperative.adminName,
        monthlyContributionAmount: cooperative.monthlyContributionAmount,
      })
    }
    loadCooperative()
  }, [profile?.cooperativeCode])

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Visual Accent */}
      <div className="h-1 w-full bg-[#005AD2]" />

      <div className="p-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">Create your Squad virtual account</h2>
        <p className="text-xs text-gray-500 leading-relaxed mb-8">
          Squad verifies the BVN when the virtual account is created. There is no separate BVN verification step.
        </p>

        <form className="space-y-6">
          {cooperativeSummary ? (
            <div className="rounded-md border border-blue-100 bg-blue-50 p-3 text-[11px] text-blue-800">
              <p className="font-bold">{cooperativeSummary.cooperativeName}</p>
              <p>Admin: {cooperativeSummary.adminName}</p>
              <p>Monthly Amount: NGN {cooperativeSummary.monthlyContributionAmount.toLocaleString()}</p>
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              BVN
            </label>
            <div className="relative">
              <input
                type="text"
                value={bvn}
                onChange={(e) => setBvn(e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="e.g. 22222222222"
                inputMode="numeric"
                maxLength={11}
                className="w-full bg-[#F8FAFC] border border-gray-100 rounded-md py-3 px-4 text-sm font-mono placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
              />
              <Grid3X3 className="absolute right-3 top-3 text-gray-300 w-4 h-4" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Date of Birth
            </label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full bg-[#F8FAFC] border border-gray-100 rounded-md py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Residential Address
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Enter your residential address"
              rows={3}
              className="w-full bg-[#F8FAFC] border border-gray-100 rounded-md py-3 px-4 text-sm placeholder-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-widest">
              Gender
            </label>
            <div className="relative">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as '1' | '2')}
                className="w-full appearance-none bg-[#F8FAFC] border border-gray-100 rounded-md py-3 px-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-600 transition-all"
              >
                <option value="1">Male</option>
                <option value="2">Female</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-3.5 text-gray-400 w-4 h-4" />
            </div>
          </div>

          {/* Status Indicator */}
          <div className="bg-gray-50 border border-gray-100 border-dashed rounded-md p-4 flex gap-3">
            <RefreshCw className="w-4 h-4 text-gray-400 animate-spin shrink-0" />
            <p className="text-[11px] text-gray-500 leading-normal">
              {isCreated ? 'Virtual account created and BVN verified by Squad.' : 'Squad will validate the BVN during virtual account creation.'}
            </p>
          </div>

          {error ? <p className="text-[11px] font-semibold text-red-500">{error}</p> : null}

          <label className="flex items-start gap-3 text-[11px] text-gray-600">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-[#005AD2]"
            />
            I accept cooperative terms, contribution rules, and debit authorization policies.
          </label>

          <button
            type="button"
            onClick={handleCreateVirtualAccount}
            disabled={isSubmitting}
            className="w-full rounded-md border border-blue-100 bg-blue-50 py-3 text-[11px] font-bold uppercase tracking-widest text-[#005AD2] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSubmitting ? 'Creating Account...' : 'Create Virtual Account'}
          </button>
        </form>
      </div>

      {/* Footer Action Area */}
      <div className="bg-[#E5EFFF] p-6 border-t border-gray-100">
        {isCreated && agreed ? (
          <Link
            to="/verify/account"
            className="w-full bg-[#005AD2] text-white py-3.5 rounded-md font-bold text-sm flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors"
          >
            Proceed to Account <ArrowRight size={16} />
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className="w-full cursor-not-allowed rounded-md bg-gray-200 py-3.5 text-sm font-bold text-gray-500"
          >
            Create the Squad account and accept terms to continue
          </button>
        )}
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
        <span className="text-[10px] font-medium uppercase tracking-widest">Secured via Squad virtual account verification</span>
      </div>
    </div>
  )
}

export default IdentityVerificationPage
