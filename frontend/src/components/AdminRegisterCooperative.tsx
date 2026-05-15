import { Building2, Mail, User, Landmark, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AuthInput } from './AuthInput'
import verifundLogo from '../assets/verifund-logo.png'
import { storageService } from '../services/storage'

type RegistrationResult = {
  cooperativeCode: string
  virtualAccountNumber: string
}

const generateCooperativeCode = (cooperativeName: string) => {
  const acronym = cooperativeName
    .split(' ')
    .filter(Boolean)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4)
  const suffix = Math.floor(1000 + Math.random() * 9000)
  return `VF-${acronym || 'COOP'}-${suffix}`
}

const generateVirtualAccountNumber = () => {
  return `91${Math.floor(10000000 + Math.random() * 90000000)}`
}

export default function AdminRegisterCooperative() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<RegistrationResult | null>(null)
  const [formData, setFormData] = useState({
    adminName: '',
    adminEmail: '',
    cooperativeName: '',
    registrationNumber: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { placeholder, value } = e.target
    const fieldMap: Record<string, keyof typeof formData> = {
      'e.g. Ada Okafor': 'adminName',
      'admin@cooperative.org': 'adminEmail',
      'e.g. Unity Farmers Cooperative': 'cooperativeName',
      'e.g. RC-2024-0012': 'registrationNumber',
    }
    const field = fieldMap[placeholder]
    if (field) {
      setFormData((prev) => ({ ...prev, [field]: value }))
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.adminName || !formData.adminEmail || !formData.cooperativeName || !formData.registrationNumber) {
      alert('Please fill in all fields.')
      return
    }

    setLoading(true)

    try {
      const cooperativeCode = generateCooperativeCode(formData.cooperativeName)
      const virtualAccountNumber = generateVirtualAccountNumber()

      await storageService.cooperative.register({
        adminName: formData.adminName,
        adminEmail: formData.adminEmail,
        cooperativeName: formData.cooperativeName,
        registrationNumber: formData.registrationNumber,
        cooperativeCode,
        virtualAccountNumber,
        createdAt: Date.now(),
      })

      setResult({ cooperativeCode, virtualAccountNumber })
    } catch (error) {
      console.error('Failed to register cooperative:', error)
      alert('Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
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

        <form onSubmit={handleSubmit} className="space-y-1">
          <AuthInput
            label="Admin Name"
            icon={User}
            placeholder="e.g. Ada Okafor"
            value={formData.adminName}
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
            label="Cooperative Name"
            icon={Building2}
            placeholder="e.g. Unity Farmers Cooperative"
            value={formData.cooperativeName}
            onChange={handleChange}
          />
          <AuthInput
            label="Registration Number"
            icon={Landmark}
            placeholder="e.g. RC-2024-0012"
            value={formData.registrationNumber}
            onChange={handleChange}
          />

          <button
            type="submit"
            disabled={loading}
            className="mt-5 w-full rounded-md bg-[#005AD2] py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Registering...' : 'Register Cooperative'}
          </button>
        </form>

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
