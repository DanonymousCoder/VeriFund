import { Building2, Mail, User, Landmark, CheckCircle2, Phone, MapPin, Calendar } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthInput } from './AuthInput'
import verifundLogo from '../assets/verifund-logo.png'
import { apiService } from '../services/api'
import { storageService } from '../services/storage'
import { APIError } from '../types/api'

type RegistrationResult = {
  cooperativeCode: string
  inviteCode: string
  inviteLink: string
  virtualAccountNumber: string
}

type ExecContact = {
  name: string
  email: string
  phone: string
}

const generateInviteCode = () => {
  return `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`
}

export default function AdminRegisterCooperative() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [identityVerified, setIdentityVerified] = useState(false)
  const [mode, setMode] = useState<'create' | 'join'>('create')
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const [formData, setFormData] = useState({
    adminName: '',
    adminBvn: '',
    adminEmail: '',
    state: '',
    cooperativeName: '',
    cooperativeType: 'thrift',
    registrationNumber: '',
    monthlyContributionAmount: '',
    debitDayOfMonth: '',
  })
  const [executives, setExecutives] = useState<ExecContact[]>([
    { name: '', email: '', phone: '' },
    { name: '', email: '', phone: '' },
  ])
  const [joinData, setJoinData] = useState({
    cooperativeCode: '',
    adminEmail: '',
    adminBvn: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { placeholder, value } = e.target
    const fieldMap: Record<string, keyof typeof formData> = {
      'e.g. Ada Okafor': 'adminName',
      '11-digit BVN': 'adminBvn',
      'admin@cooperative.org': 'adminEmail',
      'e.g. Lagos': 'state',
      'e.g. Unity Farmers Cooperative': 'cooperativeName',
      'e.g. RC-2024-0012': 'registrationNumber',
      'e.g. 25000': 'monthlyContributionAmount',
      '1-28': 'debitDayOfMonth',
    }
    const field = fieldMap[placeholder]
    if (field) {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleExecutiveChange = (index: number, field: keyof ExecContact, value: string) => {
    setExecutives((prev) => prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)))
  }

  const verifyAdminIdentity = () => {
    const nameIsValid = formData.adminName.trim().split(' ').length >= 2
    const bvnIsValid = /^\d{11}$/.test(formData.adminBvn)
    const verified = nameIsValid && bvnIsValid
    setIdentityVerified(verified)

    if (!verified) {
      alert('Identity verification failed. Ensure full name and 11-digit BVN are valid.')
      return
    }

    alert('Identity verified successfully.')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.adminName ||
      !formData.adminBvn ||
      !formData.adminEmail ||
      !formData.state ||
      !formData.cooperativeName ||
      !formData.registrationNumber ||
      !formData.monthlyContributionAmount ||
      !formData.debitDayOfMonth
    ) {
      alert('Please fill in all fields.')
      return
    }

    if (!identityVerified) {
      alert('Please verify admin BVN identity before registering the cooperative.')
      return
    }

    const hasTwoExecutives = executives.every(
      (exec) => exec.name.trim() && (exec.email.trim() || exec.phone.trim()),
    )
    if (!hasTwoExecutives) {
      alert('Please assign two executives with name and email or phone.')
      return
    }

    setLoading(true)

    try {
      const cooperativeTypeMap = {
        thrift: 'THRIFT',
        credit: 'CREDIT',
        multipurpose: 'MULTIPURPOSE',
      } as const

      const cooperativeResponse = await apiService.createCooperative({
        name: formData.cooperativeName,
        registration_number: formData.registrationNumber,
        state: formData.state,
        cooperative_type: cooperativeTypeMap[formData.cooperativeType as keyof typeof cooperativeTypeMap],
        treasurer_bvn: formData.adminBvn,
      })

      const cooperativeCode = cooperativeResponse.id
      const virtualAccountNumber = cooperativeResponse.squad_virtual_account_number
      const inviteCode = generateInviteCode()
      const inviteLink = `${window.location.origin}/signup?invite=${inviteCode}`

      await storageService.cooperative.register({
        adminName: formData.adminName,
        adminBvn: formData.adminBvn,
        bvnVerified: identityVerified,
        adminEmail: formData.adminEmail,
        state: formData.state,
        cooperativeName: formData.cooperativeName,
        cooperativeType: formData.cooperativeType as 'thrift' | 'credit' | 'multipurpose',
        registrationNumber: formData.registrationNumber,
        cooperativeCode,
        virtualAccountNumber,
        monthlyContributionAmount: Number(formData.monthlyContributionAmount),
        debitDayOfMonth: Number(formData.debitDayOfMonth),
        inviteCode,
        inviteLink,
        executives: executives.map((exec, index) => ({
          id: `EX-${index + 1}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
          name: exec.name,
          email: exec.email || undefined,
          phone: exec.phone || undefined,
          status: 'invited',
        })),
        aiBlockEnabled: true,
        createdAt: Date.now(),
      })

      setResult({ cooperativeCode, inviteCode, inviteLink, virtualAccountNumber })
    } catch (error) {
      console.error('Failed to register cooperative:', error)
      let errorMessage = 'Registration failed. Please try again.'
      if (error instanceof APIError) {
        if (typeof error.data === 'object' && error.data !== null) {
          const details = Object.entries(error.data)
            .map(([key, value]) => {
              if (Array.isArray(value)) {
                return `${key}: ${value.join(', ')}`
              }
              return `${key}: ${String(value)}`
            })
            .join('\n')
          errorMessage = details || error.message
        } else {
          errorMessage = error.message
        }
      } else if (error instanceof Error) {
        errorMessage = error.message
      }
      alert(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const handleJoinExisting = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinData.cooperativeCode || !joinData.adminEmail || !joinData.adminBvn) {
      alert('Fill cooperative code, admin email, and BVN to join existing cooperative.')
      return
    }

    const cooperative = await storageService.cooperative.findByCode(joinData.cooperativeCode)
    if (!cooperative) {
      alert('Cooperative not found.')
      return
    }

    const emailMatch = cooperative.adminEmail.toLowerCase() === joinData.adminEmail.toLowerCase()
    const bvnMatch = cooperative.adminBvn === joinData.adminBvn
    if (!emailMatch || !bvnMatch) {
      alert('Identity mismatch. Admin email/BVN does not match cooperative records.')
      return
    }

    const memberId = `ADMIN-${Math.random().toString(36).slice(2, 8).toUpperCase()}`
    await storageService.auth.setSession({
      memberId,
      cooperativeId: cooperative.cooperativeCode,
      email: cooperative.adminEmail,
      name: cooperative.adminName,
      activeRole: 'admin',
      availableRoles: ['admin', 'member'],
      trustScore: 92,
      verificationStatus: 'verified',
      onboardingComplete: true,
      timestamp: Date.now(),
    })

    await storageService.member.setProfile({
      memberId,
      name: cooperative.adminName,
      email: cooperative.adminEmail,
      bvn: cooperative.adminBvn,
      cooperativeId: cooperative.cooperativeCode,
      cooperativeCode: cooperative.cooperativeCode,
      cooperativeName: cooperative.cooperativeName,
      virtualAccountNumber: cooperative.virtualAccountNumber,
      role: 'admin',
      savingsBalance: cooperative.monthlyContributionAmount * 20,
      contributions: 20,
      trustScore: 92,
      verificationStatus: 'verified',
      termsAccepted: true,
      onboardingComplete: true,
    })

    navigate('/dashboard')
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] p-6">
      <div className="w-full max-w-xl rounded-2xl border border-gray-100 bg-white p-8 shadow-sm">
        <div className="mb-8 flex items-center gap-3">
          <img src={verifundLogo} alt="VeriFund" className="h-9 w-9" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Register Cooperative</h1>
            <p className="text-xs uppercase tracking-widest text-gray-500">Admin Onboarding</p>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-2 rounded-lg border border-gray-100 bg-gray-50 p-1 text-sm">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`rounded-md px-3 py-2 font-semibold ${mode === 'create' ? 'bg-white text-[#005AD2] shadow-sm' : 'text-gray-500'}`}
          >
            Create New Cooperative
          </button>
          <button
            type="button"
            onClick={() => setMode('join')}
            className={`rounded-md px-3 py-2 font-semibold ${mode === 'join' ? 'bg-white text-[#005AD2] shadow-sm' : 'text-gray-500'}`}
          >
            Join Existing Cooperative
          </button>
        </div>

        {mode === 'create' ? (
        <form onSubmit={handleSubmit} className="space-y-1">
          <AuthInput
            label="Admin Name"
            icon={User}
            placeholder="e.g. Ada Okafor"
            value={formData.adminName}
            onChange={handleChange}
          />
          <AuthInput
            label="Admin BVN"
            icon={Landmark}
            placeholder="11-digit BVN"
            value={formData.adminBvn}
            onChange={handleChange}
          />
          <AuthInput
            label="Admin Email"
            icon={Mail}
            type="email"
            placeholder="admin@cooperative.org"
            value={formData.adminEmail}
            onChange={handleChange}
          />
          <AuthInput
            label="State"
            icon={MapPin}
            placeholder="e.g. Lagos"
            value={formData.state}
            onChange={handleChange}
          />
          <AuthInput
            label="Cooperative Name"
            icon={Building2}
            placeholder="e.g. Unity Farmers Cooperative"
            value={formData.cooperativeName}
            onChange={handleChange}
          />
          <div className="mb-5">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
              Cooperative Type
            </label>
            <select
              value={formData.cooperativeType}
              onChange={(e) => setFormData((prev) => ({ ...prev, cooperativeType: e.target.value }))}
              className="w-full rounded-md border border-gray-200 px-3 py-3 text-sm text-gray-700"
            >
              <option value="thrift">Thrift</option>
              <option value="credit">Credit</option>
              <option value="multipurpose">Multipurpose</option>
            </select>
          </div>
          <AuthInput
            label="Registration Number"
            icon={Landmark}
            placeholder="e.g. RC-2024-0012"
            value={formData.registrationNumber}
            onChange={handleChange}
          />
          <AuthInput
            label="Monthly Contribution Amount (NGN)"
            icon={Calendar}
            placeholder="e.g. 25000"
            value={formData.monthlyContributionAmount}
            onChange={handleChange}
          />
          <AuthInput
            label="Debit Day (1-28)"
            icon={Calendar}
            placeholder="1-28"
            value={formData.debitDayOfMonth}
            onChange={handleChange}
          />

          <div className="mt-4 rounded-lg border border-gray-100 bg-gray-50 p-4">
            <h3 className="mb-3 text-xs font-bold uppercase tracking-widest text-gray-700">Assign Executives</h3>
            {executives.map((exec, index) => (
              <div key={index} className="mb-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <input
                  value={exec.name}
                  onChange={(e) => handleExecutiveChange(index, 'name', e.target.value)}
                  placeholder={`Executive ${index + 1} Name`}
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
                <input
                  value={exec.email}
                  onChange={(e) => handleExecutiveChange(index, 'email', e.target.value)}
                  placeholder="Email"
                  className="rounded-md border border-gray-200 px-3 py-2 text-sm"
                />
                <div className="relative">
                  <Phone size={14} className="pointer-events-none absolute left-2 top-2.5 text-gray-400" />
                  <input
                    value={exec.phone}
                    onChange={(e) => handleExecutiveChange(index, 'phone', e.target.value)}
                    placeholder="Phone"
                    className="w-full rounded-md border border-gray-200 py-2 pl-7 pr-3 text-sm"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={verifyAdminIdentity}
            className={`mt-5 w-full rounded-md border py-3 text-sm font-bold transition-colors ${
              identityVerified
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            {identityVerified ? 'Identity Verified' : 'Verify BVN Identity'}
          </button>

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-md bg-[#005AD2] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register Cooperative'}
          </button>
        </form>
        ) : (
          <form onSubmit={handleJoinExisting} className="space-y-3">
            <input
              value={joinData.cooperativeCode}
              onChange={(e) => setJoinData((prev) => ({ ...prev, cooperativeCode: e.target.value }))}
              placeholder="Cooperative code (e.g. VF-ABCD-1234)"
              className="w-full rounded-md border border-gray-200 px-3 py-3 text-sm"
            />
            <input
              value={joinData.adminEmail}
              onChange={(e) => setJoinData((prev) => ({ ...prev, adminEmail: e.target.value }))}
              placeholder="Admin email"
              className="w-full rounded-md border border-gray-200 px-3 py-3 text-sm"
            />
            <input
              value={joinData.adminBvn}
              onChange={(e) => setJoinData((prev) => ({ ...prev, adminBvn: e.target.value.replace(/\D/g, '') }))}
              placeholder="11-digit admin BVN"
              className="w-full rounded-md border border-gray-200 px-3 py-3 text-sm"
              maxLength={11}
            />

            <button
              type="submit"
              className="mt-2 w-full rounded-md bg-[#005AD2] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              Access Cooperative Dashboard
            </button>
          </form>
        )}

        {result ? (
          <div className="mt-6 rounded-lg border border-emerald-100 bg-emerald-50 p-4">
            <div className="mb-3 flex items-center gap-2 text-emerald-700">
              <CheckCircle2 size={16} />
              <p className="text-xs font-bold uppercase tracking-widest">Cooperative Registered</p>
            </div>
            <p className="text-sm text-emerald-900">
              Cooperative Code: <span className="font-bold">{result.cooperativeCode}</span>
            </p>
            <p className="mt-1 text-sm text-emerald-900">
              Virtual Account: <span className="font-bold">{result.virtualAccountNumber}</span>
            </p>
            <p className="mt-1 text-sm text-emerald-900">
              Invite Code: <span className="font-bold">{result.inviteCode}</span>
            </p>
            <p className="mt-1 break-all text-xs text-emerald-900">
              Invite Link: <span className="font-bold">{result.inviteLink}</span>
            </p>
          </div>
        ) : null}

        <div className="mt-6 flex items-center justify-between text-sm">
          <Link to="/" className="font-semibold text-gray-500 hover:text-gray-700">
            Back to landing
          </Link>
          <Link to="/signup" className="font-bold text-[#005AD2] hover:underline">
            Continue to member signup
          </Link>
        </div>
      </div>
    </div>
  )
}
