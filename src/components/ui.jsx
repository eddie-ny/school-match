import { cloneElement, isValidElement, useId, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export function Badge({ children, tone = 'gray' }) {
  const tones = {
    gray: 'bg-neutral-100 text-neutral-700',
    green: 'bg-brand-green/25 text-neutral-800',
    orange: 'bg-brand-orange/25 text-neutral-800',
  }
  return <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full ${tones[tone]}`}>{children}</span>
}

export function VerifiedBadges({ item }) {
  return (
    <div className="flex flex-wrap gap-2">
      {item.demo && <Badge tone="orange">Sample data</Badge>}
      {!item.verified && !item.demo && <Badge>Unverified</Badge>}
      {item.verified && <Badge tone="green">Verified</Badge>}
    </div>
  )
}

// Shown in place of detail for visitors and expired-trial users.
export function Gate({ text }) {
  const { user } = useAuth()
  return (
    <div className="rounded-xl border border-dashed border-brand-orange p-4 bg-brand-orange/10">
      <p className="text-sm mb-3">{text || (user ? 'Subscribe to see the full details.' : 'Sign in to see more.')}</p>
      {user ? (
        <Link to="/pricing" className="btn btn-orange">See plans</Link>
      ) : (
        <div className="flex gap-3">
          <Link to="/login" className="btn btn-outline">Sign in</Link>
          <Link to="/signup" className="btn btn-orange">Sign up free</Link>
        </div>
      )}
    </div>
  )
}

export function PageTitle({ title, sub }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl md:text-3xl font-bold">{title}</h1>
      {sub && <p className="text-neutral-600 mt-1">{sub}</p>}
    </div>
  )
}

export function Segmented({ options, value, onChange }) {
  return (
    <div className="inline-flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`min-h-11 px-4 rounded-full border-2 text-sm font-semibold ${
            value === o.value ? 'bg-brand-green border-brand-green text-neutral-900' : 'bg-white border-neutral-300'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Field({ label, children, hint }) {
  const id = useId()
  // Link the label to its input or select so tapping the label focuses it and screen readers announce it.
  const linkable = isValidElement(children) && ['input', 'select', 'textarea'].includes(children.type)
  return (
    <div>
      <label className="label" htmlFor={linkable ? id : undefined}>{label}</label>
      {linkable ? cloneElement(children, { id }) : children}
      {hint && <p className="text-xs text-neutral-500 mt-1">{hint}</p>}
    </div>
  )
}

export function RequireAuth({ children, needProfile }) {
  const { user, loading, profileComplete } = useAuth()
  if (loading) return <p>Loading...</p>
  if (!user) {
    return (
      <div className="space-y-4 max-w-xl">
        <div className="card space-y-3">
          <h2 className="text-xl font-bold">See where your results can take you</h2>
          <p className="text-neutral-600">Enter your grades, pick what you want to study and we show every school that offers it, ranked by your chances.</p>
          <div className="flex flex-wrap gap-2">
            {['Strong match', 'Good chance', 'Worth a try'].map((l) => (
              <span key={l} className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-100 text-neutral-400">
                {l}
              </span>
            ))}
          </div>
          <LockedRows rows={['Your aggregate', 'Schools that fit you']} />
        </div>
        <Gate text="Sign up free to check your eligibility. Your first 24 hours are on us." />
      </div>
    )
  }
  if (needProfile && !profileComplete) {
    return (
      <div className="card">
        <h2 className="font-bold text-lg mb-2">Complete your profile first</h2>
        <p className="mb-4 text-neutral-600">We need the SHS you attended and the program you studied before you can use this feature.</p>
        <Link to="/profile" className="btn btn-orange">Complete profile</Link>
      </div>
    )
  }
  return children
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Date of birth as three dropdowns (day, month, year). Years start near the typical student age
// so nobody has to scroll far. Calls onChange with "YYYY-MM-DD", or "" until the date is complete and real.
export function DobPicker({ value, onChange }) {
  const [y0, m0, d0] = value ? value.split('-') : ['', '', '']
  const thisYear = new Date().getFullYear()
  const years = Array.from({ length: 56 }, (_, i) => thisYear - 10 - i) // e.g. 2016 down to 1961

  const update = (d, m, y) => {
    if (!d || !m || !y) return onChange('')
    const dt = new Date(Number(y), Number(m) - 1, Number(d))
    const real = dt.getFullYear() === Number(y) && dt.getMonth() === Number(m) - 1 && dt.getDate() === Number(d)
    onChange(real ? `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` : '')
  }

  // Keep what the person picked even while the date is still incomplete.
  const [parts, setParts] = useState({ d: d0 ? String(Number(d0)) : '', m: m0 ? String(Number(m0)) : '', y: y0 || '' })
  const set = (k) => (e) => {
    const next = { ...parts, [k]: e.target.value }
    setParts(next)
    update(next.d, next.m, next.y)
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <select className="input" value={parts.d} onChange={set('d')} aria-label="Day">
        <option value="">Day</option>
        {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => <option key={d} value={d}>{d}</option>)}
      </select>
      <select className="input" value={parts.m} onChange={set('m')} aria-label="Month">
        <option value="">Month</option>
        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
      </select>
      <select className="input" value={parts.y} onChange={set('y')} aria-label="Year">
        <option value="">Year</option>
        {years.map((y) => <option key={y} value={y}>{y}</option>)}
      </select>
    </div>
  )
}

function Lock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

// Placeholder rows that tease what is behind the sign-in. They are drawn bars, never real data,
// so nothing hidden can be read from the page source.
export function LockedRows({ rows = ['Entry requirements', 'Cut-off aggregate', 'Fees'] }) {
  return (
    <div className="space-y-2">
      {rows.map((r, i) => (
        <div key={r} className="flex items-center justify-between gap-3 text-sm">
          <span className="text-neutral-500">{r}</span>
          <span className="inline-flex items-center gap-1.5 text-neutral-400">
            <span className="h-3 rounded bg-neutral-200" style={{ width: `${48 + ((i * 17) % 40)}px` }} />
            <Lock />
          </span>
        </div>
      ))}
    </div>
  )
}
