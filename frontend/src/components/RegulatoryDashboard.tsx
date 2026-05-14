import React from 'react'
import {
  CheckCircle,
  Flag,
  Radio,
  Download,
  Calendar,
  Database,
  Lock,
  Clock,
  FileText,
  Code,
  RefreshCw,
} from 'lucide-react'

type StatCardProps = {
  title: string
  value: string | number
  subtext: string
  icon: React.ComponentType<{ size: number; className: string }>
  trend?: string
  color?: 'blue' | 'emerald'
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  color = 'blue',
}) => (
  <div className="bg-white border border-gray-100 p-6 rounded-xl shadow-sm">
    <div className="flex justify-between items-start mb-4">
      <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{title}</h3>
      <Icon
        size={16}
        className={color === 'blue' ? 'text-blue-500' : 'text-emerald-500'}
      />
    </div>
    <div className="flex items-baseline gap-2">
      <span className="text-3xl font-bold text-gray-900">{value}</span>
      {trend && <span className="text-[10px] font-bold text-emerald-500">{trend}</span>}
    </div>
    <p className="text-[10px] text-gray-400 mt-1 font-medium">{subtext}</p>
  </div>
)

export const RegulatoryStats: React.FC = () => (
  <div className="grid grid-cols-3 gap-6 mb-8">
    <StatCard
      title="Global Compliance"
      value="94.2%"
      trend="+1.4% from last quarter"
      subtext=""
      icon={CheckCircle}
      color="emerald"
    />
    <StatCard
      title="Pending AML Flags"
      value="127"
      subtext="Across 14 registered cooperatives"
      icon={Flag}
    />
    <StatCard
      title="Active Data Nodes"
      value="4,092"
      subtext="State Federation Sync Active"
      icon={Radio}
    />
  </div>
)

export const ExportCenter: React.FC = () => (
  <div className="grid grid-cols-12 gap-6 mb-8">
    {/* Custom Extract Form */}
    <div className="col-span-8 bg-white border border-gray-100 rounded-xl p-8 shadow-sm">
      <div className="flex items-center gap-2 mb-6 text-gray-900 font-bold">
        <Download size={18} className="text-blue-600" />
        <h2>Export Center</h2>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-gray-400 uppercase">
            Date Range Start
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="dd/mm/yyyy"
              className="w-full border border-gray-200 rounded p-2 text-xs"
            />
            <Calendar size={14} className="absolute right-3 top-2.5 text-gray-400" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="block text-[10px] font-bold text-gray-400 uppercase">
            Date Range End
          </label>
          <div className="relative">
            <input
              type="text"
              placeholder="dd/mm/yyyy"
              className="w-full border border-gray-200 rounded p-2 text-xs"
            />
            <Calendar size={14} className="absolute right-3 top-2.5 text-gray-400" />
          </div>
        </div>
      </div>

      <div className="mb-6 space-y-2">
        <label className="block text-[10px] font-bold text-gray-400 uppercase">
          Cooperative Type
        </label>
        <select className="w-full border border-gray-200 rounded p-2 text-xs bg-gray-50">
          <option>All Registered Types</option>
        </select>
      </div>

      <div className="mb-8">
        <label className="block text-[10px] font-bold text-gray-400 uppercase mb-3">
          Report Type (Select Multiple)
        </label>
        <div className="flex flex-wrap gap-2">
          {['Financial Statement', 'AML Report', 'Member Audit', 'Risk Assessment'].map(
            (tag, i) => (
              <label
                key={tag}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-bold cursor-pointer ${
                  i < 2
                    ? 'bg-blue-50 border-blue-200 text-blue-700'
                    : 'bg-gray-50 border-gray-200 text-gray-500'
                }`}
              >
                <input
                  type="checkbox"
                  defaultChecked={i < 2}
                  className="w-3 h-3"
                />
                {tag}
              </label>
            )
          )}
        </div>
      </div>

      <button className="bg-[#005AD2] text-white px-6 py-3 rounded font-bold text-xs flex items-center gap-2 hover:bg-blue-700">
        <Database size={14} /> Generate Custom Extract
      </button>
    </div>

    {/* Bulk Data Request Sidebar */}
    <div className="col-span-4 bg-white border border-gray-100 rounded-xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4 font-bold text-gray-900">
        <RefreshCw size={16} />
        <h3 className="text-sm">Bulk Data Request</h3>
      </div>
      <p className="text-[11px] text-gray-400 leading-relaxed mb-6">
        Schedule recurring, encrypted data dumps directly to central banking servers for macroeconomic
        analysis.
      </p>

      <div className="space-y-4 mb-6">
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
            Sync Frequency
          </label>
          <select className="w-full border border-gray-200 rounded p-2 text-xs">
            <option>Daily (EOD)</option>
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">
            Destination Endpoint URI
          </label>
          <input
            type="text"
            value="wss://cbn.gov.ng/api/v2/ingest/"
            className="w-full border border-gray-200 rounded p-2 text-[10px] font-mono text-gray-500"
            readOnly
          />
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded p-2 flex items-center gap-2">
          <Lock size={12} className="text-blue-400" />
          <span className="text-[10px] font-bold text-blue-700 font-mono">AES-256-GCM</span>
        </div>
      </div>

      <button className="w-full border border-gray-900 text-gray-900 py-3 rounded font-bold text-xs flex items-center justify-center gap-2 hover:bg-gray-50">
        <Clock size={14} /> Schedule Dump
      </button>
    </div>
  </div>
)

type Report = {
  id: string
  type: string
  params: string
  status: 'READY' | 'PROCESSING'
}

export const ReportArchive: React.FC = () => {
  const reports: Report[] = [
    { id: 'EXP-2023-1042', type: 'AML Aggregate', params: 'Credit Unions • Q3 2023', status: 'READY' },
    {
      id: 'EXP-2023-1043',
      type: 'Financial Statement',
      params: 'All Types • Oct 2023',
      status: 'PROCESSING',
    },
  ]

  return (
    <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-50 flex justify-between items-center">
        <h2 className="text-sm font-bold text-gray-900">Recent Generated Reports</h2>
        <button className="text-blue-600 text-xs font-bold flex items-center gap-1">
          View Archive <span>→</span>
        </button>
      </div>
      <table className="w-full text-left">
        <thead className="bg-[#F8FAFC] border-b border-gray-100">
          <tr className="text-[10px] font-bold text-blue-800 uppercase tracking-widest font-mono">
            <th className="px-6 py-3">Report ID</th>
            <th className="px-6 py-3">Type</th>
            <th className="px-6 py-3">Parameters</th>
            <th className="px-6 py-3">Status</th>
            <th className="px-6 py-3 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="text-[11px] font-medium text-gray-600">
          {reports.map((r) => (
            <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
              <td className="px-6 py-4 font-mono">{r.id}</td>
              <td className="px-6 py-4 font-bold text-gray-900">{r.type}</td>
              <td className="px-6 py-4">{r.params}</td>
              <td className="px-6 py-4">
                <span
                  className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                    r.status === 'READY'
                      ? 'bg-emerald-400 text-white'
                      : 'bg-blue-100 text-blue-600'
                  }`}
                >
                  ● {r.status}
                </span>
              </td>
              <td className="px-6 py-4 flex justify-end gap-3 text-gray-400">
                <FileText size={14} className="cursor-pointer hover:text-blue-600" />
                <Download size={14} className="cursor-pointer hover:text-blue-600" />
                <Code size={14} className="cursor-pointer hover:text-blue-600" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const RegulatoryDashboard: React.FC = () => {
  return (
    <div className="min-h-screen bg-[#FDFDFD]">
      <main className="overflow-y-auto p-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Regulatory Dashboard</h1>
            <p className="text-sm text-gray-500">
              Compliance monitoring, data exports, and regulatory reporting for VeriFund cooperatives.
            </p>
          </div>

          <RegulatoryStats />
          <ExportCenter />
          <ReportArchive />
        </div>
      </main>
    </div>
  )
}

export default RegulatoryDashboard
