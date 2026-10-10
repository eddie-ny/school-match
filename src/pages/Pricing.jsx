import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { PLANS } from '../lib/constants'
import { PageTitle } from '../components/ui'

export default function Pricing() {
  const { user, access } = useAuth()
  const [plan, setPlan] = useState('3m')
  const [auto, setAuto] = useState(false)

  return (
    <div className="max-w-2xl">
      <PageTitle title="Plans" sub="Start with the 24-hour free trial. Subscribe for full details." />
      <div className="grid grid-cols-2 gap-4 mb-5">
        {PLANS.map((p) => (
          <button
            key={p.id}
            onClick={() => setPlan(p.id)}
            className={`card text-left min-h-24 border-2 ${plan === p.id ? 'border-brand-orange bg-brand-orange/10' : ''}`}
          >
            <p className="font-heading font-bold text-lg">{p.label}</p>
            <p className="text-sm text-neutral-600">{p.priceUsd ? `$${p.priceUsd}` : 'Price to be set'}</p>
            {p.note && <p className="text-xs font-semibold text-brand-green mt-1">{p.note}</p>}
          </button>
        ))}
      </div>

      <div className="card space-y-4">
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 w-5 h-5" checked={auto} onChange={(e) => setAuto(e.target.checked)} />
          <span>Auto-renew. Cards can renew automatically. Mobile Money renewals will be a reminder to pay again.</span>
        </label>
        {user ? (
          <button className="btn btn-orange w-full" disabled>Payments are switched on in a later step</button>
        ) : (
          <Link to="/signup" className="btn btn-orange w-full">Sign up to subscribe</Link>
        )}
        <p className="text-xs text-neutral-500">
          Payments are not connected yet. When they are, the plan will activate only after Paystack confirms the payment to our server. The browser can never grant itself a plan.
        </p>
        {user && access.level === 'full' && !access.trial && (
          <p className="text-sm">Current plan runs until {new Date(access.expiresAt).toLocaleDateString()}.</p>
        )}
      </div>
    </div>
  )
}
