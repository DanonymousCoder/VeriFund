import { Eye, Lock, Mail, Shield } from 'lucide-react'
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AuthInput } from './AuthInput'
import { storageService } from '../services/storage'
import { apiService } from '../services/api'
import verifundLogo from '../assets/verifund-logo.png'
import { APIError } from '../types/api'

export function Login() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

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
    if (!formData.email || !formData.password) {
      alert('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      // Login with API using phone number or email
      // Backend expects phone_number, so we'll use email but backend should accept both
      await apiService.login({
        phone_number: formData.email, // Backend API expects phone_number
        password: formData.password,
      })

      // Token is auto-stored by apiService
      storageService.updateDriver()

      // Get current member details
      const currentMember = await apiService.getCurrentMember()

      // Role-aware navigation
      if (currentMember.role === 'ADMIN' || currentMember.role === 'TREASURER') {
        navigate('/admin/overview')
      } else if (currentMember.role === 'EXECUTIVE1' || currentMember.role === 'EXECUTIVE2') {
        navigate('/executive/inbox')
      } else {
        // Member - check if onboarded
        const profile = await storageService.member.getProfile()
        if (profile?.onboardingComplete) {
          navigate('/dashboard')
        } else {
          navigate('/verify')
        }
      }
    } catch (error) {
      console.error('Login failed:', error)
      let errorMessage = 'Login failed. Please check your credentials and try again.'
      if (error instanceof APIError) {
        if (error.status === 401) {
          errorMessage = 'Invalid phone number or password.'
        } else if (typeof error.data === 'object' && error.data !== null) {
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

        <form onSubmit={handleSubmit} className="space-y-4">
          <AuthInput
            label="Phone Number or Email"
            icon={Mail}
            placeholder="08012345678 or name@example.com"
            value={formData.email}
            onChange={handleChange}
          />

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
