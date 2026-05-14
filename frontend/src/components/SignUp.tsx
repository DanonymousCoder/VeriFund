import { Building2, Mail, Phone, User, Eye, Lock } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthInput } from './AuthInput'
import { storageService } from '../services/storage'

export function SignUp() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cooperativeName: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { placeholder, value } = e.target
    const fieldMap: Record<string, keyof typeof formData> = {
      'Jane Doe': 'name',
      'jane.doe@example.com': 'email',
      '+1 (555) 000-0000': 'phone',
      'Central Valley Coop': 'cooperativeName',
    }
    const field = fieldMap[placeholder]
    if (field) {
      setFormData(prev => ({ ...prev, [field]: value }))
    }
  }

  const generateCooperativeID = (cooperativeName: string) => {
    const abbrev = cooperativeName
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 3)
    const random = Math.random().toString(36).substring(2, 7).toUpperCase()
    return `COOP-${abbrev}-${random}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.cooperativeName || !formData.password) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const cooperativeId = generateCooperativeID(formData.cooperativeName)
      const memberId = `MEM-${Math.random().toString(36).substring(2, 9).toUpperCase()}`

      // Save session
      await storageService.auth.setSession({
        memberId,
        cooperativeId,
        email: formData.email,
        name: formData.name,
        trustScore: 75,
        verificationStatus: 'pending',
        timestamp: Date.now(),
      })

      // Save member profile
      await storageService.member.setProfile({
        memberId,
        name: formData.name,
        email: formData.email,
        cooperativeId,
        cooperativeName: formData.cooperativeName,
        savingsBalance: 0,
        contributions: 0,
        trustScore: 75,
        verificationStatus: 'pending',
      })

      alert(`✓ Account created!\n\nYour Cooperative ID: ${cooperativeId}\n\nUse this + your email to login.`)
      navigate('/dashboard')
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
        <div className="z-10">
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
              label="Cooperative Name"
              icon={Building2}
              placeholder="Central Valley Coop"
              value={formData.cooperativeName}
              onChange={handleChange}
            />

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
