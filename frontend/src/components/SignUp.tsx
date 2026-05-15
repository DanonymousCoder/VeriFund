import { Building2, Mail, Phone, User, Eye, Lock } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthInput } from './AuthInput'
import { storageService } from '../services/storage'
import verifundLogo from '../assets/verifund-logo.png'
import type { CooperativeRecord } from '../types/storage'

export function SignUp() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cooperativeInfo, setCooperativeInfo] = useState<CooperativeRecord | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cooperativeCode: '',
    password: '',
  })

  useEffect(() => {
    const inviteCode = searchParams.get('invite')
    if (!inviteCode) return

    const loadInviteCooperative = async () => {
      const allCooperatives = await storageService.cooperative.getAll()
      const matched = allCooperatives.find((coop) => coop.inviteCode.toUpperCase() === inviteCode.toUpperCase())
      if (matched) {
        setFormData((prev) => ({ ...prev, cooperativeCode: matched.cooperativeCode }))
        setCooperativeInfo(matched)
      }
    }

    loadInviteCooperative()
  }, [searchParams])

  const resolveCooperativeInput = async (value: string) => {
    const input = value.trim()
    if (!input) return null

    const inviteFromUrl = input.includes('invite=')
      ? input.split('invite=')[1]?.split('&')[0]
      : null
    const token = (inviteFromUrl ?? input).toUpperCase()

    const all = await storageService.cooperative.getAll()
    if (token.startsWith('INV-')) {
      return all.find((coop) => coop.inviteCode.toUpperCase() === token) ?? null
    }
    return all.find((coop) => coop.cooperativeCode.toUpperCase() === token) ?? null
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { placeholder, value } = e.target
    const fieldMap: Record<string, keyof typeof formData> = {
      'Jane Doe': 'name',
      'jane.doe@example.com': 'email',
      '+1 (555) 000-0000': 'phone',
      'e.g. VF-ABCD-1234': 'cooperativeCode',
      'e.g. INV-12ABCD or VF-ABCD-1234': 'cooperativeCode',
    }
    const field = fieldMap[placeholder]
    if (field) {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.cooperativeCode || !formData.password) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const cooperative = await resolveCooperativeInput(formData.cooperativeCode)
      if (!cooperative) {
        alert('Invalid invite/cooperative code. Ask your admin for a valid invite link or code.')
        return
      }

      const cooperativeId = cooperative.cooperativeCode
      const memberId = `MEM-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      // Save session
      await storageService.auth.setSession({
        memberId,
        cooperativeId,
        email: formData.email,
        name: formData.name,
        activeRole: 'member',
        availableRoles: ['member'],
        trustScore: 75,
        verificationStatus: 'pending',
        onboardingComplete: false,
        timestamp: Date.now(),
      })

      // Save member profile
      await storageService.member.setProfile({
        memberId,
        name: formData.name,
        email: formData.email,
        cooperativeId,
        cooperativeCode: cooperative.cooperativeCode,
        cooperativeName: cooperative.cooperativeName,
        virtualAccountNumber: cooperative.virtualAccountNumber,
        role: 'member',
        savingsBalance: 0,
        contributions: 0,
        trustScore: 75,
        verificationStatus: 'pending',
        termsAccepted: false,
        onboardingComplete: false,
      })

      alert(`✓ Account created!\n\nCooperative Code: ${cooperative.cooperativeCode}\nVirtual Account: ${cooperative.virtualAccountNumber}\n\nComplete onboarding to access your dashboard.`)
      navigate('/verify')
    } catch (error) {
      console.error('Signup failed:', error)
      alert('Signup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Dark Sidebar */}
      <div className="relative hidden overflow-hidden bg-[#0A1121] p-12 lg:flex lg:w-1/3 lg:flex-col lg:justify-between">
        <div className="z-10 flex items-center gap-2">
          <img src={verifundLogo} alt="VeriFund" className="h-6 w-6" />
          <h2 className="text-xl font-bold text-white">VeriFund</h2>
        </div>
        <div className="z-10 flex items-center space-x-4">
          <div className="h-10 w-10 overflow-hidden rounded-full border border-gray-600 bg-gray-700">
            <img src="/avatar-placeholder.jpg" alt="CTO" className="h-full w-full object-cover" />
          </div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            Chief Trust Officer
          </span>
        </div>
      </div>

      {/* Form Area */}
      <div className="flex flex-1 items-center justify-center p-8">
        <div className="w-full max-w-md">
          <header className="mb-8 text-center lg:text-left">
            <h1 className="mb-2 text-3xl font-bold text-gray-900">Create Account</h1>
            <p className="text-sm text-gray-500">Join VeriFund to secure your cooperative assets.</p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-1">
            <AuthInput
              label="Full Name"
              icon={User}
              placeholder="Jane Doe"
              value={formData.name}
              onChange={handleChange}
            />
            <AuthInput
              label="Email Address"
              icon={Mail}
              type="email"
              placeholder="jane.doe@example.com"
              value={formData.email}
              onChange={handleChange}
            />
            <AuthInput
              label="Phone Number"
              icon={Phone}
              placeholder="+1 (555) 000-0000"
              value={formData.phone}
              onChange={handleChange}
            />
            <AuthInput
              label="Invite Link / Code"
              icon={Building2}
              placeholder="e.g. INV-12ABCD or VF-ABCD-1234"
              value={formData.cooperativeCode}
              onChange={async (e) => {
                handleChange(e)
                const code = e.target.value.trim()
                if (code.length < 6) {
                  setCooperativeInfo(null)
                  return
                }
                const cooperative = await resolveCooperativeInput(code)
                setCooperativeInfo(cooperative)
              }}
            />

            {cooperativeInfo ? (
              <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
                <p className="font-bold">Joining: {cooperativeInfo.cooperativeName}</p>
                <p>Admin: {cooperativeInfo.adminName}</p>
                <p>Monthly Contribution: NGN {cooperativeInfo.monthlyContributionAmount.toLocaleString()}</p>
                <p>Debit Day: {cooperativeInfo.debitDayOfMonth}</p>
              </div>
            ) : null}

            <div className="relative">
              <AuthInput
                label="Password"
                icon={Lock}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={formData.password}
                onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-9 text-gray-400 transition-colors hover:text-gray-600"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                <Eye size={16} />
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-md bg-[#005AD2] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <footer className="mt-8 text-center">
            <p className="px-4 text-[11px] leading-relaxed text-gray-500">
              By creating an account, you agree to our{' '}
              <a href="#" className="font-bold text-blue-600">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="font-bold text-blue-600">
                Privacy Policy
              </a>
              .
            </p>
            <p className="mt-6 text-sm text-gray-600">
              Want to create a cooperative instead?{' '}
              <Link to="/admin/register" className="font-bold text-blue-600">
                Register as admin
              </Link>
            </p>
            <p className="mt-3 text-sm text-gray-600">
              Already have an account?{' '}
              <Link to="/login" className="font-bold text-blue-600">
                Sign in
              </Link>
            </p>
          </footer>
        </div>
      </div>
    </div>
  )
}
