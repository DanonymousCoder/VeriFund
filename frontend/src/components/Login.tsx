import { Building2, Eye, Lock, Mail, Shield } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthInput } from './AuthInput'

export function Login() {
  const [showPassword, setShowPassword] = useState(false)

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F8FAFC] p-6">
      <div className="mb-10 text-center">
        <h1 className="mb-1 text-4xl font-bold text-gray-900">VeriFund</h1>
        <p className="text-xs font-bold uppercase tracking-widest text-gray-500">
          Cooperative Financial Services
        </p>
      </div>

      <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white p-10 shadow-sm">
        <h2 className="mb-8 text-center text-xl font-bold text-gray-800">Member Login</h2>

        <form>
          <AuthInput label="Cooperative ID" icon={Building2} placeholder="e.g. VF-90210" />
          <AuthInput label="Member Email" icon={Mail} placeholder="name@cooperative.org" />

          <div className="relative">
            <AuthInput
              label="Password"
              icon={Lock}
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
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
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-md bg-[#005AD2] py-3.5 text-sm font-bold text-white transition-all hover:bg-blue-700"
          >
            Login <span className="text-lg">→</span>
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
