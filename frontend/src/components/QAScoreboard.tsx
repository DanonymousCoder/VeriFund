import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from 'lucide-react'
import { apiService } from '../services/api'
import type { QARunFailure, QARunSummary, QAScoreboardResponse } from '../types/api'
import verifundLogo from '../assets/verifund-logo.png'

function formatWhen(value?: string) {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

function passRateColor(rate: number) {
  if (rate >= 90) return 'text-emerald-600'
  if (rate >= 70) return 'text-amber-600'
  return 'text-rose-600'
}

function envBadgeClass(env?: string) {
  if (env === 'production') return 'bg-violet-100 text-violet-700'
  if (env === 'local') return 'bg-sky-100 text-sky-700'
  return 'bg-slate-100 text-slate-700'
}

export default function QAScoreboard() {
  const [data, setData] = useState<QAScoreboardResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiService.getQAScoreboard()
      setData(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load QA scoreboard')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const summary = data?.latest_summary
  const recent = data?.recent_runs ?? []

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-3">
            <img src={verifundLogo} alt="VeriFund" className="h-9 w-9" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-slate-400">Ops</p>
              <h1 className="text-xl font-bold tracking-tight">QA Scoreboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-full bg-blue-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-800"
            >
              <ArrowLeft className="h-4 w-4" />
              Home
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <section className="mb-8 rounded-3xl border border-blue-100 bg-gradient-to-br from-white to-blue-50 p-8 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">
                <ClipboardList className="h-3.5 w-3.5" />
                quick.db powered
              </div>
              <h2 className="text-3xl font-bold tracking-tight text-slate-950">
                Live endpoint validation for demos and judges
              </h2>
              <p className="text-sm leading-7 text-slate-600">
                This page reads the read-only gateway ops endpoint at{' '}
                <code className="rounded bg-white px-1.5 py-0.5 text-xs">GET /api/ops/qa-scoreboard/</code>, which
                surfaces the latest quick.db test runs without affecting production traffic.
              </p>
            </div>
            <StatusPill data={data} loading={loading} />
          </div>
        </section>

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading && !data ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            Loading scoreboard…
          </div>
        ) : null}

        {!loading && data && !data.available ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8">
            <h3 className="text-lg font-semibold text-amber-900">No scoreboard file yet</h3>
            <p className="mt-2 text-sm leading-7 text-amber-800">
              {data.message ?? 'Run the quick.db endpoint suite to populate the SQLite file.'}
            </p>
            <pre className="mt-4 overflow-x-auto rounded-xl bg-white/80 p-4 text-xs text-slate-700">
              cd tests/quickdb-runner{'\n'}npm install{'\n'}npm run test:local
            </pre>
          </div>
        ) : null}

        {summary ? (
          <section className="mb-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] ${envBadgeClass(summary.env)}`}>
                  {summary.env ?? 'unknown'}
                </span>
                <span className="text-xs text-slate-400">{summary.runId}</span>
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-4">
                <Metric label="Pass rate" value={`${summary.passRate}%`} className={passRateColor(summary.passRate)} />
                <Metric label="Passed" value={String(summary.passed)} className="text-emerald-600" />
                <Metric label="Failed" value={String(summary.failed)} className="text-rose-600" />
                <Metric label="Total checks" value={String(summary.total)} />
              </div>
              <dl className="mt-6 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <dt className="font-medium text-slate-500">Last run</dt>
                  <dd>{formatWhen(summary.at)}</dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500">Gateway</dt>
                  <dd className="break-all">{summary.gateway ?? '—'}</dd>
                </div>
                {data?.source ? (
                  <div className="sm:col-span-2">
                    <dt className="font-medium text-slate-500">Source file</dt>
                    <dd className="break-all font-mono text-xs">{data.source}</dd>
                  </div>
                ) : null}
              </dl>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-950">
                <ShieldCheck className="h-5 w-5 text-blue-700" />
                Coverage snapshot
              </h3>
              {summary.categories ? (
                <ul className="mt-5 space-y-3">
                  {Object.entries(summary.categories).map(([name, stats]) => (
                    <li key={name} className="flex items-center justify-between rounded-2xl bg-slate-50 px-4 py-3 text-sm">
                      <span className="font-medium capitalize text-slate-700">{name}</span>
                      <span className="text-slate-500">
                        {stats.passed}/{stats.total} passed
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-4 text-sm leading-7 text-slate-500">
                  Category breakdown appears when the latest run was produced by the current quick.db runner.
                </p>
              )}
            </div>
          </section>
        ) : null}

        {(data?.latest_failures?.length ?? 0) > 0 ? (
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Latest failures</h3>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Check</th>
                    <th className="px-3 py-2">Expected</th>
                    <th className="px-3 py-2">Actual</th>
                    <th className="px-3 py-2">Latency</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.latest_failures?.map((item: QARunFailure) => (
                    <tr key={`${item.name}-${item.url}`} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-medium text-slate-800">{item.name}</td>
                      <td className="px-3 py-3 text-slate-500">{item.expected}</td>
                      <td className="px-3 py-3 text-rose-600">{item.actual}</td>
                      <td className="px-3 py-3 text-slate-500">{item.ms ?? '—'}ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {recent.length > 0 ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-8 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-950">Recent runs</h3>
            <div className="mt-5 overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-slate-200 text-xs uppercase tracking-[0.16em] text-slate-400">
                  <tr>
                    <th className="px-3 py-2">Run</th>
                    <th className="px-3 py-2">Environment</th>
                    <th className="px-3 py-2">Pass rate</th>
                    <th className="px-3 py-2">When</th>
                  </tr>
                </thead>
                <tbody>
                  {[...recent].reverse().map((run: QARunSummary) => (
                    <tr key={run.runId} className="border-b border-slate-100">
                      <td className="px-3 py-3 font-mono text-xs text-slate-700">{run.runId}</td>
                      <td className="px-3 py-3">
                        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${envBadgeClass(run.env)}`}>
                          {run.env ?? '—'}
                        </span>
                      </td>
                      <td className={`px-3 py-3 font-semibold ${passRateColor(run.passRate)}`}>{run.passRate}%</td>
                      <td className="px-3 py-3 text-slate-500">{formatWhen(run.at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  )
}

function Metric({ label, value, className = 'text-slate-950' }: { label: string; value: string; className?: string }) {
  return (
    <div className="rounded-2xl bg-slate-50 p-4">
      <div className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</div>
      <div className={`mt-2 text-2xl font-bold ${className}`}>{value}</div>
    </div>
  )
}

function StatusPill({ data, loading }: { data: QAScoreboardResponse | null; loading: boolean }) {
  if (loading && !data) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
        <Activity className="h-4 w-4 animate-pulse" />
        Checking…
      </div>
    )
  }

  if (!data?.available) {
    return (
      <div className="inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-sm font-semibold text-amber-800">
        <XCircle className="h-4 w-4" />
        Waiting for data
      </div>
    )
  }

  const rate = data.latest_summary?.passRate ?? 0
  const healthy = rate >= 90

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold ${
        healthy ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
      }`}
    >
      {healthy ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
      {data.run_count ?? 0} runs tracked
    </div>
  )
}
