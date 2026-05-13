import { Building2, Mail, Phone, User } from 'lucide-react'
import { Link } from 'react-router-dom'
import { AuthInput } from './AuthInput'

export function SignUp() {
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

          <form className="space-y-1">
            <AuthInput label="Full Name" icon={User} placeholder="Jane Doe" />
            <AuthInput
              label="Email Address"
              icon={Mail}
              type="email"
              placeholder="jane.doe@example.com"
            />
            <AuthInput label="Phone Number" icon={Phone} placeholder="+1 (555) 000-0000" />
            <AuthInput
              label="Cooperative Name"
              icon={Building2}
              placeholder="Central Valley Coop"
            />

            <button
              type="submit"
              className="mt-6 w-full rounded-md bg-[#005AD2] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
            >
              Create Account
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
