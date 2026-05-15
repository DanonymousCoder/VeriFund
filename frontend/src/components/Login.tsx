import { Building2, Eye, Lock, Mail, Shield } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthInput } from './AuthInput'
import { storageService } from '../services/storage'
import type { AuthSession, UserRole } from '../types/storage'
import verifundLogo from '../assets/verifund-logo.png'

export function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [cooperativePreview, setCooperativePreview] = useState<{
    cooperativeName: string
    adminName: string
    monthlyContributionAmount: number
  } | null>(null)

  const [formData, setFormData] = useState({
    cooperativeCode: '',
    email: '',
    password: '',
    role: 'member',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { placeholder, value } = e.target
    const fieldMap: Record<string, keyof typeof formData> = {
      'e.g. VF-ABCD-1234': 'cooperativeCode',
      'name@cooperative.org': 'email',
      '••••••••': 'password',
    }
    const field = fieldMap[placeholder]
    if (field) {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.cooperativeCode || !formData.email || !formData.password) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const cooperative = await storageService.cooperative.findByCode(formData.cooperativeCode)
      if (!cooperative) {
        alert('Cooperative code not found. Ask your admin to register the cooperative first.')
        return
      }

      const availableRoles: UserRole[] = ['member']
      if (cooperative.adminEmail.toLowerCase() === formData.email.toLowerCase()) {
        availableRoles.push('admin')
      }
      const executiveMatch = cooperative.executives.find(
        (exec) => exec.email?.toLowerCase() === formData.email.toLowerCase(),
      )
      if (executiveMatch) {
        availableRoles.push('executive')
      }

      const selectedRole = formData.role as UserRole
      if (!availableRoles.includes(selectedRole)) {
        alert(`This account does not have ${selectedRole} access for this cooperative.`)
        return
      }

      // Try to get saved session with matching email
      const existingProfile = await storageService.member.getProfile()

      if (existingProfile && existingProfile.email === formData.email && existingProfile.cooperativeId === cooperative.cooperativeCode) {
        // Valid login
        const roleOnLogin = selectedRole
        const onboardingComplete = roleOnLogin === 'member' ? (existingProfile.onboardingComplete ?? false) : true
        const session = {
          memberId: existingProfile.memberId,
          cooperativeId: existingProfile.cooperativeId,
          email: existingProfile.email,
          name: existingProfile.name,
          activeRole: roleOnLogin,
          availableRoles,
          trustScore: existingProfile.trustScore,
          verificationStatus: existingProfile.verificationStatus,
          onboardingComplete,
          timestamp: Date.now(),
        }
        await storageService.auth.setSession(session as AuthSession)
        navigate(
          roleOnLogin === 'admin'
            ? '/admin/overview'
            : roleOnLogin === 'executive'
              ? '/executive/inbox'
              : onboardingComplete
                ? '/dashboard'
                : '/verify',
        )
      } else {
        // New member under a valid cooperative
        const memberId = `MEM-${Math.random().toString(36).substring(2, 9).toUpperCase()}`
        const roleOnLogin = selectedRole
        const onboardingComplete = roleOnLogin !== 'member'
        const session = {
          memberId,
          cooperativeId: cooperative.cooperativeCode,
          email: formData.email,
          name: roleOnLogin === 'admin' ? cooperative.adminName : 'Demo Member',
          activeRole: roleOnLogin,
          availableRoles,
          trustScore: 75,
          verificationStatus: onboardingComplete ? 'verified' : 'pending',
          onboardingComplete,
          timestamp: Date.now(),
        }
        await storageService.auth.setSession(session as AuthSession)
        
        // Also save demo profile
        await storageService.member.setProfile({
          memberId,
          name: 'Demo Member',
          email: formData.email,
          cooperativeId: cooperative.cooperativeCode,
          cooperativeCode: cooperative.cooperativeCode,
          cooperativeName: cooperative.cooperativeName,
          virtualAccountNumber: cooperative.virtualAccountNumber,
          role: roleOnLogin,
          savingsBalance: 1250000,
          contributions: 24,
          trustScore: 75,
          verificationStatus: onboardingComplete ? 'verified' : 'pending',
          termsAccepted: onboardingComplete,
          onboardingComplete,
        })

        navigate(
          roleOnLogin === 'admin'
            ? '/admin/overview'
            : roleOnLogin === 'executive'
              ? '/executive/inbox'
              : '/verify',
        )
      }
    } catch (error) {
      console.error('Login failed:', error)
      alert('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] p-6">
      <div className="mb-10 text-center">
        <div className="flex items-center gap-3 mb-4">
          <img src={verifundLogo} alt="VeriFund" className="h-10 w-10" />
          <h1 className="text-4xl font-bold text-gray-900">VeriFund</h1>
        </div>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Cooperative Financial Services
        </p>
      </div>

      <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-10 shadow-sm">
        <h2 className="mb-8 text-center text-xl font-bold text-gray-800">Member Login</h2>

        <form onSubmit={handleSubmit}>
          <AuthInput
            label="Cooperative Code"
            icon={Building2}
            placeholder="e.g. VF-ABCD-1234"
            value={formData.cooperativeCode}
            onChange={async (e) => {
              handleChange(e)
              const code = e.target.value.trim()
              if (code.length < 6) {
                setCooperativePreview(null)
                return
              }

              const cooperative = await storageService.cooperative.findByCode(code)
              if (!cooperative) {
                setCooperativePreview(null)
                return
              }

              setCooperativePreview({
                cooperativeName: cooperative.cooperativeName,
                adminName: cooperative.adminName,
                monthlyContributionAmount: cooperative.monthlyContributionAmount,
              })
            }}
          />
          {cooperativePreview ? (
            <div className="mb-4 rounded-lg border border-blue-100 bg-blue-50 p-3 text-xs text-blue-800">
              <p className="font-bold">{cooperativePreview.cooperativeName}</p>
              <p>Admin: {cooperativePreview.adminName}</p>
              <p>Monthly Contribution: NGN {cooperativePreview.monthlyContributionAmount.toLocaleString()}</p>
            </div>
          ) : null}
          <AuthInput
            label="Member Email"
            icon={Mail}
            placeholder="name@cooperative.org"
            value={formData.email}
            onChange={handleChange}
          />

          <div className="mb-5">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-widest text-gray-500">Access as</label>
            <select
              value={formData.role}
              onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
              className="w-full rounded-md border border-gray-200 px-3 py-3 text-sm text-gray-700"
            >
              <option value="member">Member</option>
              <option value="admin">Cooperative Admin</option>
              <option value="executive">Executive / Co-signer</option>
            </select>
          </div>

          <div className="relative">
            <AuthInput
              label="Password"
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
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

          <div className="mt-2 text-right">
            <a href="#" className="text-[10px] font-bold uppercase tracking-tighter text-blue-600">
              Forgot Password?
            </a>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-md bg-[#005AD2] py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Logging in...' : <>Login <span className="text-lg">→</span></>}
          </button>
        </form>

        <div className="mt-6 flex items-center justify-center space-x-2 rounded-md border border-blue-100 bg-blue-50 py-2.5">
          <Shield className="h-3.5 w-3.5 text-blue-400" />
          <span className="text-[10px] font-bold uppercase tracking-tight text-blue-600">
            Secured by 256-bit Encryption
          </span>
        </div>
      </div>

      <p className="mt-8 text-sm text-gray-600">
        New to VeriFund?{' '}
        <Link to="/signup" className="font-bold text-blue-600">
          Sign Up Cooperative
        </Link>
      </p>
    </div>
  )
}
