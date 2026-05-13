import type { LucideIcon } from 'lucide-react'
import type { InputHTMLAttributes } from 'react'

interface AuthInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  icon: LucideIcon
}

export function AuthInput({ label, icon: Icon, type = 'text', placeholder, ...props }: AuthInputProps) {
  return (
    <div className="mb-4">
      <label className="mb-2 block text-[10px] font-bold uppercase tracking-widest text-gray-500">
        {label}
      </label>
      <div className="group relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Icon className="h-4 w-4 text-gray-400 transition-colors group-focus-within:text-blue-600" />
        </div>
        <input
          type={type}
          className="block w-full rounded-md border border-gray-200 px-3 py-2.5 pl-10 pr-3 text-sm placeholder-gray-300 transition-all focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
          placeholder={placeholder}
          {...props}
        />
      </div>
    </div>
  )
}
