import { useState, type ReactNode } from 'react'
import { Link, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import {
  ArrowRight,
  BadgeCheck,
  ChartColumnIncreasing,
  FileSearch,
  Landmark,
  Mail,
  LockKeyhole,
  Menu,
  Phone,
  ShieldCheck,
  Users,
  X,
  type LucideIcon,
} from 'lucide-react'
import { Login, MemberDashboard, SignUp } from './components'
import IdentityVerification from './components/IdentityVerification'
import BankLinkLayout from './components/BankLinkLayout'
import PublicProfileDashboard from './components/PublicProfileDashboard'
import MultiSigAuthorization from './components/MultiSigAuthorization'
import RegulatoryDashboard from './components/RegulatoryDashboard'
import MandateAuthorization from './components/MandateAuthorization'
import AdminRegisterCooperative from './components/AdminRegisterCooperative'
import AdminOverview from './components/AdminOverview'
import ExecutiveInbox from './components/ExecutiveInbox'
import heroImage from './assets/hero.png'
import verifundLogo from './assets/verifund-logo.png'

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
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireOnboarding>
            <MemberDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/verify" element={<IdentityVerification />} />
      <Route path="/verify/account" element={<BankLinkLayout />} />
      <Route path="/verify/authorize" element={<MandateAuthorization />} />
      <Route path="/admin/register" element={<AdminRegisterCooperative />} />
      <Route
        path="/admin/overview"
        element={
          <ProtectedRoute requireOnboarding>
            <AdminOverview />
          </ProtectedRoute>
        }
      />
      <Route
        path="/executive/inbox"
        element={
          <ProtectedRoute requireOnboarding>
            <ExecutiveInbox />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute requireOnboarding>
            <PublicProfileDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/authorize"
        element={
          <ProtectedRoute requireOnboarding>
            <MultiSigAuthorization />
          </ProtectedRoute>
        }
      />
      <Route
        path="/regulatory"
        element={
          <ProtectedRoute requireOnboarding>
            <RegulatoryDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ProtectedRoute({ children, requireOnboarding = false }: { children: ReactNode; requireOnboarding?: boolean }) {
  const { isAuthenticated, isLoading, session } = useAuth()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-slate-600">
        Loading...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requireOnboarding && !session?.onboardingComplete) {
    return <Navigate to="/verify" replace />
  }

  return <>{children}</>
}

function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main>
        <Hero />
        <SecuritySection />
        <AboutSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  )
}

function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false)
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <Link to="/" className="flex items-center gap-2 text-xl font-semibold tracking-tight text-slate-950">
          <img src={verifundLogo} alt="VeriFund" className="h-7 w-7" />
          <span>VeriFund</span>
        </Link>

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

        <div className="hidden md:flex items-center gap-3 sm:gap-4">
          <Link
            to="/signup"
            className="inline-flex items-center justify-center rounded-full bg-blue-700 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-800"
          >
            Signup
          </Link>
          <Link
            to="/admin/register"
            className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
          >
            Admin Register
          </Link>
        </div>

        <div className="md:hidden flex items-center">
          <button
            type="button"
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((s) => !s)}
            className="rounded-md p-2 text-slate-700 hover:bg-slate-100"
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </nav>

      {mobileOpen ? (
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-6 pb-4">
            <div className="space-y-3 py-3">
              {navigationItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-base font-medium text-slate-700 hover:text-blue-700"
                  onClick={() => setMobileOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </div>

            <div className="flex flex-col gap-3 pb-4">
              <Link
                to="/signup"
                onClick={() => setMobileOpen(false)}
                className="w-full rounded-full bg-blue-700 px-4 py-2.5 text-center text-sm font-semibold text-white"
              >
                Signup
              </Link>
              <Link
                to="/admin/register"
                onClick={() => setMobileOpen(false)}
                className="w-full rounded-full border border-slate-300 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-900"
              >
                Admin Register
              </Link>
            </div>
          </div>
        </div>
      ) : null}
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
            <Link
              to="/admin/register"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800"
            >
              Register Cooperative
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#features"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              Explore features
            </a>
            <Link
              to="/signup"
              className="inline-flex items-center justify-center rounded-full border border-slate-300 bg-white px-6 py-3.5 text-sm font-semibold text-slate-900 transition hover:border-slate-400 hover:bg-slate-50"
            >
              View demo
            </Link>
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
          <div className="relative overflow-hidden rounded-4xl border border-slate-200 bg-white p-3 shadow-2xl shadow-slate-200/70">
            <img
              src={heroImage}
              alt="VeriFund analytics dashboard preview"
              className="h-full w-full rounded-3xl object-cover"
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
        <div className="rounded-4xl border border-slate-200 bg-slate-950 p-10 text-white shadow-xl shadow-slate-200/50">
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
          <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
            <Users className="h-10 w-10 text-blue-700" />
            <h3 className="mt-5 text-xl font-semibold text-slate-950">Built for member trust</h3>
            <p className="mt-3 text-sm leading-7 text-slate-600">
              Clear records and consistent workflows help teams explain decisions and keep members aligned.
            </p>
          </div>
          <div className="rounded-4xl border border-slate-200 bg-white p-8 shadow-sm">
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

function ContactSection() {
  const handleContactSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const formData = new FormData(event.currentTarget)
    const name = String(formData.get('name') || '').trim()
    const email = String(formData.get('email') || '').trim()
    const subject = String(formData.get('subject') || '').trim()
    const message = String(formData.get('message') || '').trim()

    const mailSubject = encodeURIComponent(subject || 'VeriFund support request')
    const mailBody = encodeURIComponent(
      [`Name: ${name || 'Not provided'}`, `Email: ${email || 'Not provided'}`, '', message || ''].join('\n')
    )

    window.location.href = `mailto:support@verifund.co?subject=${mailSubject}&body=${mailBody}`
  }

  return (
    <section id="contact" className="bg-white py-24">
      <div className="mx-auto grid max-w-7xl gap-8 px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8">
        <div className="rounded-4xl border border-slate-200 bg-slate-950 p-10 text-white shadow-xl shadow-slate-200/50">
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-blue-300">Contact</p>
          <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Talk to the VeriFund team.</h2>
          <p className="mt-5 max-w-2xl text-base leading-8 text-slate-300">
            Need help with onboarding, cooperative registration, or account verification? Our team can guide you
            through the setup and answer implementation questions.
          </p>

          <div className="mt-8 grid gap-3 sm:grid-cols-2">
            <a
              href="mailto:support@verifund.co"
              className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
            >
              <Mail className="h-4 w-4 text-blue-700" />
              support@verifund.co
            </a>
            <a
              href="tel:+2348000000000"
              className="inline-flex items-center gap-2 rounded-full border border-white/15 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              <Phone className="h-4 w-4 text-cyan-300" />
              +234 800 000 0000
            </a>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6">
            <h3 className="text-lg font-semibold text-white">Support hours</h3>
            <p className="mt-2 text-sm leading-7 text-slate-300">Monday to Friday, 9:00 AM to 6:00 PM WAT.</p>
          </div>
        </div>

        <div className="rounded-4xl border border-slate-200 bg-slate-50 p-8 shadow-sm">
          <h3 className="text-xl font-semibold text-slate-950">Send a message</h3>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            Use this form to send the support team a direct email draft with your details and request.
          </p>

          <form onSubmit={handleContactSubmit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Name</label>
              <input
                name="name"
                type="text"
                required
                placeholder="Your full name"
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Email</label>
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Subject</label>
              <input
                name="subject"
                type="text"
                required
                placeholder="How can we help?"
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-bold uppercase tracking-[0.24em] text-slate-500">Message</label>
              <textarea
                name="message"
                rows={5}
                required
                placeholder="Tell us what you need help with..."
                className="block w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-300 focus:border-blue-600 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              className="inline-flex w-full items-center justify-center rounded-full bg-blue-700 px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-blue-700/20 transition hover:-translate-y-0.5 hover:bg-blue-800"
            >
              Send message
            </button>
          </form>
        </div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="bg-slate-950 px-6 py-16 text-white lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-12 border-b border-white/10 pb-12 md:grid-cols-4">
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <img src={verifundLogo} alt="VeriFund" className="h-7 w-7" />
            <h4 className="text-xl font-semibold tracking-tight">VeriFund</h4>
          </div>
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
                  <a className="transition hover:text-white" href="#">
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
