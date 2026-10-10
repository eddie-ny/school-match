import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { useCatalog, isLocal } from '../hooks/useCatalog'
import { Badge, Gate, PageTitle, Segmented, VerifiedBadges } from '../components/ui'

export default function Scholarships() {
  const { access } = useAuth()
  const { scholarships, loading } = useCatalog()
  const [params] = useSearchParams()
  const [funding, setFunding] = useState(params.get('funding') || 'all')
  const [where, setWhere] = useState('all')
  const full = access.level === 'full'

  const list = useMemo(
    () =>
      scholarships
        .filter((s) => funding === 'all' || s.fundingType.toLowerCase() === funding)
        .filter((s) => where === 'all' || (where === 'local' ? isLocal(s.country) : !isLocal(s.country))),
    [scholarships, funding, where]
  )

  return (
    <div>
      <PageTitle title="Scholarships" sub="Browse by funding type and country." />
      <div className="space-y-3 mb-6">
        <Segmented value={funding} onChange={setFunding} options={[{ value: 'all', label: 'Any funding' }, { value: 'partial', label: 'Partial' }, { value: 'full', label: 'Fully funded' }]} />
        <div><Segmented value={where} onChange={setWhere} options={[{ value: 'all', label: 'All' }, { value: 'local', label: 'Local' }, { value: 'intl', label: 'International' }]} /></div>
      </div>
      {!full && <div className="mb-5"><Gate /></div>}
      {loading ? <p>Loading...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {list.map((s) => (
            <div key={s.id} className="card space-y-3">
              <div className="flex gap-2 flex-wrap">
                <Badge tone="green">{s.fundingType} funding</Badge>
                <Badge>{s.country}</Badge>
              </div>
              <div>
                <h3 className="font-bold">{s.name}</h3>
                <p className="text-sm text-neutral-600">{s.funder}</p>
              </div>
              <VerifiedBadges item={s} />
              {full && (
                <dl className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                  <dt className="text-neutral-500">Level</dt><dd>{s.level || 'Not added yet'}</dd>
                  <dt className="text-neutral-500">Best aggregate</dt><dd>{s.minAggregate ?? 'Not added yet'}</dd>
                  <dt className="text-neutral-500">Deadline</dt><dd>{s.deadline || 'Not added yet'}</dd>
                  <dt className="text-neutral-500">Criteria</dt><dd>{s.criteria || 'Not added yet'}</dd>
                  {s.link && (<><dt className="text-neutral-500">Link</dt><dd><a className="underline" href={s.link} target="_blank" rel="noreferrer">Visit site</a></dd></>)}
                </dl>
              )}
            </div>
          ))}
          {list.length === 0 && <p className="text-neutral-600">No scholarships match these filters yet.</p>}
        </div>
      )}
    </div>
  )
}
