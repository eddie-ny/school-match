import { useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCatalog, isLocal } from '../hooks/useCatalog'
import { Badge, Gate, PageTitle, Segmented, VerifiedBadges } from '../components/ui'
import { FIELDS } from '../lib/constants'

export function Schools() {
  const { user } = useAuth()
  const { schools, programs, loading } = useCatalog()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const where = params.get('where') || 'all'
  const field = params.get('field') || ''

  const setParam = (k, v) => {
    const next = new URLSearchParams(params)
    if (v) next.set(k, v)
    else next.delete(k)
    setParams(next, { replace: true })
  }

  const list = useMemo(
    () =>
      schools
        .filter((s) => where === 'all' || (where === 'local' ? isLocal(s.country) : !isLocal(s.country)))
        .filter((s) => (s.name + ' ' + (s.city || '') + ' ' + s.country).toLowerCase().includes(q.toLowerCase()))
        .filter((s) => !field || programs.some((p) => p.schoolId === s.id && (p.field || '').toLowerCase() === field.toLowerCase())),
    [schools, programs, q, where, field]
  )

  return (
    <div>
      <PageTitle title="Find a School" sub="Local and international schools and programs." />
      <div className="space-y-3 mb-6">
        <input className="input" placeholder="Search by school, city or country" value={q} onChange={(e) => setParam('q', e.target.value)} />
        <div className="flex flex-wrap items-center gap-3">
          <Segmented value={where} onChange={(v) => setParam('where', v === 'all' ? '' : v)} options={[{ value: 'all', label: 'All' }, { value: 'local', label: 'Local' }, { value: 'intl', label: 'International' }]} />
          <select className="input !w-auto" value={field} onChange={(e) => setParam('field', e.target.value)} aria-label="Field of study">
            <option value="">Any field</option>
            {FIELDS.map((f) => <option key={f.id}>{f.id}</option>)}
          </select>
        </div>
        <p className="text-sm text-neutral-600">{loading ? 'Loading...' : `${list.length} result${list.length === 1 ? '' : 's'}`}</p>
      </div>
      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((s) => {
            const count = programs.filter((p) => p.schoolId === s.id).length
            return (
              <div key={s.id} className="card flex flex-col gap-3 hover:border-brand-orange transition-colors">
                <div>
                  <h3 className="font-bold">{s.name}</h3>
                  <p className="text-sm text-neutral-600">{[s.city, s.country].filter(Boolean).join(', ')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {s.type && <Badge>{s.type}</Badge>}
                  <Badge>{count} program{count === 1 ? '' : 's'}</Badge>
                </div>
                <VerifiedBadges item={s} />
                {user ? <Link to={`/schools/${s.id}`} className="btn btn-outline mt-auto">Read more</Link>
                  : <Link to="/signup" className="btn btn-outline mt-auto">Sign in to see more</Link>}
              </div>
            )
          })}
          {list.length === 0 && <p className="text-neutral-600">No schools match these filters yet.</p>}
        </div>
      )}
    </div>
  )
}

export function SchoolDetail() {
  const { id } = useParams()
  const { user, access } = useAuth()
  const { schools, programs, loading } = useCatalog()
  const school = schools.find((s) => s.id === id)

  if (loading) return <p>Loading...</p>
  if (!school) return <p>School not found. <Link to="/schools" className="underline">Back to schools</Link></p>
  if (!user) return <Gate />

  const progs = programs.filter((p) => p.schoolId === school.id)
  const full = access.level === 'full'

  return (
    <div className="space-y-5">
      <Link to="/schools" className="text-sm underline">Back to schools</Link>
      <div>
        <h1 className="text-2xl font-bold">{school.name}</h1>
        <p className="text-neutral-600">{[school.city, school.country].filter(Boolean).join(', ')}</p>
        <div className="mt-2"><VerifiedBadges item={school} /></div>
      </div>

      {full ? (
        <>
          {school.website && <a href={school.website} target="_blank" rel="noreferrer" className="underline">{school.website}</a>}
          <h2 className="text-lg font-bold">Programs</h2>
          {progs.length === 0 && <p className="text-neutral-600">No programs added yet.</p>}
          {progs.map((p) => (
            <div key={p.id} className="card space-y-2">
              <h3 className="font-bold">{p.name}</h3>
              <div className="flex flex-wrap gap-2">
                {p.level && <Badge>{p.level}</Badge>}
                {p.field && <Badge>{p.field}</Badge>}
                {p.demo && <Badge tone="orange">Sample data</Badge>}
              </div>
              <dl className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                <dt className="text-neutral-500">Fees (USD)</dt><dd>{p.feesUsd ?? 'Not added yet'}</dd>
                <dt className="text-neutral-500">Cut-off aggregate</dt><dd>{p.cutoffAggregate != null ? `${p.cutoffAggregate} (${p.cutoffYear ?? 'year unknown'})` : 'Not added yet'}</dd>
                <dt className="text-neutral-500">Requirements</dt>
                <dd>{p.requirements.length ? p.requirements.map((r) => `${r.subject}${r.minGrade ? ' ' + r.minGrade : ''}`).join(', ') : 'Not added yet'}</dd>
              </dl>
            </div>
          ))}
        </>
      ) : (
        <>
          <p>{progs.length} program{progs.length === 1 ? '' : 's'} listed.</p>
          <Gate />
        </>
      )}
    </div>
  )
}
