import type { ReactNode } from 'react'
import {
  ArrowRight,
  BadgeCheck,
  Bell,
  ChartColumnIncreasing,
  FileSearch,
  Landmark,
  LockKeyhole,
  ShieldCheck,
  Users,
  type LucideIcon,
} from 'lucide-react'
import heroImage from './assets/hero.png'

const navigationItems = [
  { label: 'Home', href: '#home' },
  { label: 'Features', href: '#features' },
  { label: 'About Us', href: '#about' },
  { label: 'Contact', href: '#contact' },
] as const

const securityCards = [
  {
    icon: FileSearch,
    title: 'Audit trails by default',
    description:
      'Every transaction is logged, searchable, and traceable so leadership can review decisions with confidence.',
    badge: 'Live monitoring',
  },
  {
    icon: LockKeyhole,
    title: 'Multi-step approval flow',
    description:
      'Payments move through configurable sign-off stages to reduce fraud risk and enforce internal controls.',
  },
  {
    icon: ChartColumnIncreasing,
    title: 'Trust scores and insights',
    description:
      'Visual summaries surface unusual activity, contribution patterns, and governance health at a glance.',
  },
  {
    icon: Landmark,
    title: 'Cooperative finance foundation',
    description:
      'Built for transparent savings groups, lending circles, and member-owned organizations that need structure.',
    highlight: true,
  },
] as const

const trustHighlights = [
  { value: '500+', label: 'cooperatives onboarded' },
  { value: '99.9%', label: 'availability target' },
  { value: '24/7', label: 'fraud signal tracking' },
] as const

const footerColumns = [
  {
    title: 'Product',
    links: ['Trust Scores', 'Fraud Detection', 'Multi-Sig', 'Compliance'],
  },
  {
    title: 'Resources',
    links: ['Documentation', 'API Reference', 'Security Whitepaper'],
  },
  {
    title: 'Company',
    links: ['About Us', 'Careers', 'Contact'],
  },
] as const

type SecurityCard = {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
  highlight?: boolean
}

type FeatureCardProps = {
  icon: LucideIcon
  title: string
  description: string
  badge?: string
  highlight?: boolean
  children?: ReactNode
}

function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main>
        <Hero />
        <SecuritySection />
        <AboutSection />
      </main>
      <Footer />
    </div>
  )
}

function Navbar() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <a href="#home" className="text-xl font-semibold tracking-tight text-slate-950">
          VeriFund
        </a>

        <div className="hidden items-center gap-10 md:flex">
          {navigationItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-sm font-medium text-slate-500 transition-colors hover:text-blue-700"
            >
              {item.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            aria-label="Notifications"
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-blue-200 hover:text-blue-700"
          >
            <Bell className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Security"
            className="hidden rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-blue-200 hover:text-blue-700 sm:inline-flex"
          >
            <ShieldCheck className="h-4 w-4" />
          </button>
          <a
            href="#contact"
            className="inline-flex items-center justify-center rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Login
          </a>
        </div>
      </nav>
    </header>
  )
}

function Hero() {
  return (
    <section id="home" className="relative overflow-hidden">
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(180deg,#f8fbff_0%,#eef4ff_48%,#f8fafc_100%)]" />
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:px-8 lg:py-28">
        <div className="max-w-2xl space-y-8">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/80 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.24em] text-blue-700 shadow-sm">
            <span className="h-2 w-2 rounded-full bg-blue-600" />
            Secure financial cooperatives
          </div>
          <div className="space-y-5">
            <h1 className="text-4xl font-bold tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
              Building trust in every contribution.
            </h1>
            <p className="max-w-xl text-lg leading-8 text-slate-600">
              VeriFund provides an institutional-grade foundation for cooperative finance. It keeps the
              experience simple for members while preserving the controls leaders need to operate safely.
            </p>
          </div>

          <div className="flex flex-wrap gap-4">
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800"
            >
              Join a cooperative
              <ArrowRight className="h-4 w-4" />
            </a>
            <a
              href="#about"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              View demo
            </a>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {trustHighlights.map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/70 bg-white/80 p-4 shadow-sm">
                <div className="text-2xl font-bold text-slate-950">{item.value}</div>
                <div className="mt-1 text-sm text-slate-500">{item.label}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative">
          <div className="absolute -left-8 -top-8 h-36 w-36 rounded-full bg-blue-200/40 blur-3xl" />
          <div className="absolute -bottom-10 right-0 h-44 w-44 rounded-full bg-cyan-200/40 blur-3xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-200/70">
            <img
              src={heroImage}
              alt="VeriFund analytics dashboard preview"
              className="h-full w-full rounded-[1.5rem] object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  )
}

function FeatureCard({ icon: Icon, title, description, badge, highlight, children }: FeatureCardProps) {
  return (
    <article
      className={`rounded-3xl border bg-white p-7 shadow-sm shadow-slate-200/60 transition hover:-translate-y-0.5 hover:shadow-lg ${
        highlight ? 'border-blue-200 md:col-span-2' : 'border-slate-200'
      }`}
    >
      <div className={`mb-5 inline-flex h-12 w-12 items-center justify-center rounded-2xl ${highlight ? 'bg-blue-700 text-white' : 'bg-blue-50 text-blue-700'}`}>
        <Icon className="h-5 w-5" />
      </div>

      <div className="space-y-3">
        <h3 className="text-xl font-semibold tracking-tight text-slate-950">{title}</h3>
        <p className="text-sm leading-7 text-slate-600">{description}</p>
      </div>

      {badge ? (
        <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-rose-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-rose-600">
          <span className="h-2 w-2 rounded-full bg-rose-500" />
          {badge}
        </div>
      ) : null}

      {children ? <div className="mt-6">{children}</div> : null}
    </article>
  )
}

function SecuritySection() {
  return (
    <section id="features" className="border-y border-slate-200 bg-white py-24">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto max-w-3xl text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-700">Security first</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight text-slate-950 sm:text-4xl">
            Institutional security with practical execution.
          </h2>
          <p className="mt-4 text-base leading-8 text-slate-600">
            The platform is built to reduce risk, surface anomalies, and create a clear record of every action
            so cooperatives can focus on growth instead of manual reconciliation.
          </p>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {securityCards.map((card: SecurityCard) => (
            <FeatureCard
              key={card.title}
              icon={card.icon}
              title={card.title}
              description={card.description}
              badge={card.badge}
              highlight={card.highlight}
            >
              {card.highlight ? (
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    { label: 'Alerts resolved', value: '128' },
                    { label: 'Approval steps', value: '4' },
                    { label: 'Audits passed', value: '36' },
                  ].map((item) => (
                    <div key={item.label} className="rounded-2xl bg-slate-50 p-4">
                      <div className="text-2xl font-semibold text-slate-950">{item.value}</div>
                      <div className="mt-1 text-sm text-slate-500">{item.label}</div>
                    </div>
                  ))}
                </div>
              ) : null}
            </FeatureCard>
          ))}
        </div>
      </div>
    </section>
  )
}

function AboutSection() {
  return (
    <section id="about" className="bg-slate-50 py-24">
      <div className="mx-auto grid max-w-7xl gap-10 px-6 lg:grid-cols-[1.2fr_0.8fr] lg:px-8">
        <div className="rounded-[2rem] border border-slate-200 bg-slate-950 p-10 text-white shadow-xl shadow-slate-200/50">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">About VeriFund</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
            A modern operating layer for cooperative finance.
          </h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            VeriFund combines transparent member activity, traceable approvals, and clear reporting in a single
            system. The result is a calmer operating model with fewer manual checks and better visibility.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {['Member transparency', 'Governance controls', 'Reliable reporting'].map((item) => (
              <div key={item} className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm text-slate-200">
                <BadgeCheck className="h-4 w-4 text-cyan-300" />
                {item}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-6">
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <Users className="h-10 w-10 text-blue-700" />
            <h3 className="mt-5 text-xl font-semibold text-slate-950">Built for member trust</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Clear records and consistent workflows help teams explain decisions and keep members aligned.
            </p>
          </div>
          <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm">
            <ShieldCheck className="h-10 w-10 text-blue-700" />
            <h3 className="mt-5 text-xl font-semibold text-slate-950">Designed for control</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Governance, compliance, and alerting are surfaced in a way that reduces friction instead of adding it.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer id="contact" className="bg-slate-950 px-6 py-16 text-white lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 border-b border-white/10 pb-12 md:grid-cols-4">
        <div className="space-y-5">
          <h4 className="text-xl font-semibold tracking-tight">VeriFund</h4>
          <p className="max-w-xs text-sm leading-7 text-slate-400">
            Pioneering transparency and security in cooperative finance through practical, maintainable product
            design.
          </p>
        </div>

        {footerColumns.map((column) => (
          <div key={column.title}>
            <h5 className="mb-5 text-xs font-semibold uppercase tracking-[0.24em] text-slate-500">
              {column.title}
            </h5>
            <ul className="space-y-3 text-sm text-slate-400">
              {column.links.map((link) => (
                <li key={link}>
                  <a className="transition hover:text-white" href="#home">
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="mx-auto flex max-w-7xl flex-col gap-4 pt-8 text-xs uppercase tracking-[0.24em] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
        <p>© 2026 VeriFund Cooperative System. All rights reserved.</p>
        <div className="flex gap-6">
          <span>Privacy Policy</span>
          <span>Terms of Service</span>
        </div>
      </div>
    </footer>
  )
}

export default App
