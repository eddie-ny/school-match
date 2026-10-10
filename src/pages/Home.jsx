import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCatalog, isLocal } from '../hooks/useCatalog'
import { FIELDS } from '../lib/constants'
import { Badge, LockedRows, Segmented, VerifiedBadges } from '../components/ui'

const tasks = [
  { to: '/schools', title: 'Find a School', text: 'Search local and international schools and programs.', bar: 'border-l-brand-orange' },
  { to: '/abroad', title: 'Study Abroad', text: 'Compare entry rules, English waivers and costs.', bar: 'border-l-brand-green' },
  { to: '/scholarships', title: 'Find Scholarships', text: 'Browse funding by type and country.', bar: 'border-l-brand-orange' },
  { to: '/eligibility', title: 'Check My Eligibility', text: 'Enter your results and see where you stand.', bar: 'border-l-brand-green' },
]

const steps = [
  { n: '1', title: 'Explore', text: 'Search schools, programs and scholarships in one place.' },
  { n: '2', title: 'Compare', text: 'See requirements, fees and cut-offs side by side.' },
  { n: '3', title: 'Check', text: 'Enter your results and see where you stand.' },
  { n: '4', title: 'Decide', text: 'Pick your target and your backups with confidence.' },
]

export default function Home() {
  const { user, access } = useAuth()
  const { schools, programs, scholarships, loading } = useCatalog()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [where, setWhere] = useState('all')
  const [funding, setFunding] = useState('all')
  const [showAll, setShowAll] = useState(false)
  const [field, setField] = useState('')

  // One summary card per result. Schools count as self-funded options.
  const results = useMemo(() => {
    const out = []
    if (funding === 'all' || funding === 'self') {
      schools.forEach((x) => out.push({ kind: 'school', id: x.id, title: x.name, place: x.country, local: isLocal(x.country), tag: 'Self-funded', item: x }))
    }
    if (funding !== 'self') {
      scholarships.forEach((x) => {
        const ft = x.fundingType === 'Full' ? 'full' : 'partial'
        if (funding === 'all' || funding === ft) {
          out.push({ kind: 'scholarship', id: x.id, title: x.name, place: x.country, local: isLocal(x.country), tag: `${x.fundingType} funding`, item: x })
        }
      })
    }
    return out.filter((r) => where === 'all' || (where === 'local' ? r.local : !r.local))
  }, [schools, scholarships, where, funding])

  const fieldPrograms = useMemo(() => programs.filter((p) => p.field === field), [programs, field])
  const fieldSchoolCount = new Set(fieldPrograms.map((p) => p.schoolId)).size
  const full = access.level === 'full'
  const TEASE = 3 // how many programs a visitor sees before the rest are locked

  const go = (e) => {
    e.preventDefault()
    nav(`/schools${q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''}`)
  }

  const countries = Object.entries(
    schools.reduce((acc, s) => ({ ...acc, [s.country]: (acc[s.country] || 0) + 1 }), {})
  ).sort((a, b) => b[1] - a[1])

  return (
    <div className="space-y-14">
      {/* Hero: one big search, like a search engine */}
      <section className="rounded-3xl bg-brand-orange-soft border border-brand-orange/40 px-5 py-10 md:px-12 md:py-14">
        <h1 className="text-3xl md:text-5xl font-bold leading-tight text-neutral-900 max-w-2xl">
          Find the right school for your results.
        </h1>
        <p className="mt-3 text-neutral-700 max-w-xl">
          Search local and international schools, check your eligibility and find scholarships. Free for 24 hours.
        </p>

        <form onSubmit={go} className="mt-6 flex flex-col sm:flex-row gap-3 max-w-2xl">
          <input
            className="input !min-h-14 !rounded-2xl flex-1"
            placeholder="Search a school, program or country"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            aria-label="Search"
          />
          <button className="btn btn-orange !min-h-14 !rounded-2xl">Search</button>
        </form>

        {!user && (
          <div className="mt-6">
            <Link to="/signup" className="btn btn-green">Start free trial</Link>
          </div>
        )}
      </section>

      {/* Four task cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {tasks.map((t) => (
          <Link key={t.to} to={t.to} className={`rounded-2xl border border-neutral-200 border-l-8 ${t.bar} p-5 hover:shadow-md transition-shadow`}>
            <h2 className="text-lg font-bold">{t.title}</h2>
            <p className="text-neutral-600 mt-1">{t.text}</p>
          </Link>
        ))}
      </section>

      {/* Filters and one summary card per result */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Browse</h2>
        <div className="space-y-3">
          <Segmented
            value={where}
            onChange={setWhere}
            options={[{ value: 'all', label: 'All' }, { value: 'local', label: 'Local' }, { value: 'intl', label: 'International' }]}
          />
          <div>
            <Segmented
              value={funding}
              onChange={setFunding}
              options={[
                { value: 'all', label: 'Any funding' },
                { value: 'self', label: 'Self-funded' },
                { value: 'partial', label: 'Partial' },
                { value: 'full', label: 'Fully funded' },
              ]}
            />
          </div>
        </div>
        {!loading && <p className="text-sm text-neutral-600">{results.length} result{results.length === 1 ? '' : 's'}</p>}

        {loading ? (
          <p>Loading...</p>
        ) : results.length === 0 ? (
          <p className="text-neutral-600">Nothing matches these filters yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {(showAll ? results : results.slice(0, 6)).map((r) => (
              <div key={`${r.kind}-${r.id}`} className="card flex flex-col gap-3 hover:border-brand-orange transition-colors">
                <div className="flex flex-wrap gap-2">
                  <Badge tone={r.kind === 'school' ? 'orange' : 'green'}>{r.kind === 'school' ? 'School' : 'Scholarship'}</Badge>
                  <Badge>{r.tag}</Badge>
                </div>
                <div>
                  <h3 className="font-bold">{r.title}</h3>
                  <p className="text-sm text-neutral-600">{r.place}</p>
                </div>
                <VerifiedBadges item={r.item} />
                {!full && <LockedRows rows={r.kind === 'school' ? ['Entry requirements', 'Fees'] : ['Who can apply', 'Deadline']} />}
                {user ? (
                  <Link to={r.kind === 'school' ? `/schools/${r.id}` : '/scholarships'} className="btn btn-outline mt-auto">
                    {access.level === 'full' ? 'View details' : 'Read more'}
                  </Link>
                ) : (
                  <Link to="/login" className="btn btn-outline mt-auto">Sign in to see more</Link>
                )}
              </div>
            ))}
          </div>
        )}
        {!loading && results.length > 6 && (
          <button className="btn btn-outline" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show fewer' : `Show all ${results.length} results`}
          </button>
        )}
      </section>

      {/* Live counts from the data we actually hold. Nothing invented. */}
      {!loading && (
        <section className="grid grid-cols-3 gap-3 text-center">
          {[
            [schools.filter((x) => !x.demo).length, 'Schools'],
            [programs.filter((x) => !x.demo).length, 'Programs'],
            [scholarships.filter((x) => !x.demo).length, 'Scholarships'],
          ].map(([n, label]) => (
            <div key={label} className="rounded-2xl border border-neutral-200 py-5">
              <p className="font-heading text-2xl md:text-3xl font-bold text-brand-orange">{n}</p>
              <p className="text-sm text-neutral-600">{label}</p>
            </div>
          ))}
        </section>
      )}

      {/* Program first: pick a field, see a taste, the rest is locked */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">What do you want to study?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {FIELDS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setField(field === f.id ? '' : f.id)}
              aria-pressed={field === f.id}
              className={`text-left rounded-2xl border-2 p-4 min-h-24 transition ${
                field === f.id ? 'border-brand-orange bg-brand-orange-soft' : 'border-neutral-200 hover:border-brand-orange'
              }`}
            >
              <p className="font-heading font-bold">{f.id}</p>
              <p className="text-sm text-neutral-600 mt-1">{f.blurb}</p>
            </button>
          ))}
        </div>

        {field && (
          <div className="rounded-3xl border border-neutral-200 p-4 md:p-6 space-y-4">
            {fieldPrograms.length === 0 ? (
              <p className="text-neutral-600">No {field} programs have been added yet. Check back soon.</p>
            ) : (
              <>
                <p className="font-semibold">
                  {fieldPrograms.length} {field} program{fieldPrograms.length === 1 ? '' : 's'} at {fieldSchoolCount} school{fieldSchoolCount === 1 ? '' : 's'}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {(full ? fieldPrograms : fieldPrograms.slice(0, TEASE)).map((p) => (
                    <div key={p.id} className="card flex flex-col gap-3">
                      <div>
                        <h3 className="font-bold">{p.name}</h3>
                        <p className="text-sm text-neutral-600">{p.schoolName}</p>
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {p.level && <Badge>{p.level}</Badge>}
                        {p.demo && <Badge tone="orange">Sample data</Badge>}
                      </div>
                      {full ? (
                        <Link to={`/schools/${p.schoolId}`} className="btn btn-outline mt-auto">View details</Link>
                      ) : (
                        <LockedRows rows={['Entry requirements', 'Cut-off aggregate', 'Fees', 'Your chances']} />
                      )}
                    </div>
                  ))}
                  {!full && fieldPrograms.length > TEASE && (
                    <div className="card flex flex-col items-center justify-center text-center gap-2 bg-neutral-50 border-dashed">
                      <p className="font-heading text-2xl font-bold text-brand-orange">+{fieldPrograms.length - TEASE}</p>
                      <p className="text-sm text-neutral-600">more {field} programs are waiting for you</p>
                    </div>
                  )}
                </div>
                {!full && (
                  <div className="rounded-2xl bg-brand-orange-soft p-4 md:p-5 space-y-3">
                    <p className="font-semibold">
                      {user ? 'Subscribe to unlock requirements, fees, cut-offs and your chances.' : 'Sign up free to see requirements, fees, cut-offs and your chances.'}
                    </p>
                    <div className="flex flex-wrap gap-3">
                      {user ? (
                        <Link to="/pricing" className="btn btn-orange">See plans</Link>
                      ) : (
                        <>
                          <Link to="/signup" className="btn btn-orange">Sign up free</Link>
                          <Link to="/login" className="btn btn-outline">Sign in</Link>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </section>

      {/* Countries */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Where do you want to study?</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {countries.map(([country, n]) => (
            <Link
              key={country}
              to={`/schools?q=${encodeURIComponent(country)}`}
              className="rounded-2xl border border-neutral-200 p-4 min-h-24 hover:border-brand-green hover:shadow-sm transition"
            >
              <p className="font-heading font-bold">{country}</p>
              <p className="text-sm text-neutral-600 mt-1">{n} school{n === 1 ? '' : 's'}</p>
              {isLocal(country) && <span className="inline-block mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-green/30">Local</span>}
            </Link>
          ))}
        </div>
      </section>

      {/* Journey */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">How it works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl bg-neutral-50 p-5">
              <span className="inline-flex w-9 h-9 rounded-full bg-brand-green items-center justify-center font-heading font-bold">{s.n}</span>
              <h3 className="font-bold mt-3">{s.title}</h3>
              <p className="text-sm text-neutral-600 mt-1">{s.text}</p>
            </div>
          ))}
        </div>
      </section>

      {!user && (
        <section className="rounded-3xl border-2 border-brand-green p-6 md:p-10 text-center space-y-3">
          <h2 className="text-2xl font-bold">See where your results can take you</h2>
          <p className="text-neutral-600">Create an account, add your grades and get your matches. The first 24 hours are free.</p>
          <Link to="/signup" className="btn btn-orange">Create free account</Link>
        </section>
      )}
    </div>
  )
}
