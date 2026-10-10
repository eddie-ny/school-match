import { useAuth } from '../context/AuthContext'
import { useCatalog } from '../hooks/useCatalog'
import { Badge, Gate, PageTitle, VerifiedBadges } from '../components/ui'

export default function Abroad() {
  const { access } = useAuth()
  const { programs, schools, loading } = useCatalog()
  const full = access.level === 'full'
  const intl = programs.filter((p) => p.international)

  return (
    <div>
      <PageTitle title="Study Abroad" sub="Compare destinations: entry requirements, English test waivers, foundation options and costs." />
      {!full && <div className="mb-5"><Gate /></div>}
      {loading ? <p>Loading...</p> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {intl.map((p) => {
            const school = schools.find((s) => s.id === p.schoolId)
            return (
              <div key={p.id} className="card space-y-3">
                <div>
                  <h3 className="font-bold">{p.schoolName}</h3>
                  <p className="text-sm text-neutral-600">{school?.country} · {p.name}</p>
                </div>
                <VerifiedBadges item={p} />
                {full ? (
                  <dl className="text-sm grid grid-cols-2 gap-x-4 gap-y-1">
                    <dt className="text-neutral-500">Entry requirements</dt>
                    <dd>{p.requirements.length ? p.requirements.map((r) => `${r.subject}${r.minGrade ? ' ' + r.minGrade : ''}`).join(', ') : 'Not added yet'}</dd>
                    <dt className="text-neutral-500">English test waiver</dt>
                    <dd>{p.englishTestWaiver ? 'Possible with English C6 or better' : 'Not listed'}</dd>
                    <dt className="text-neutral-500">Foundation option</dt>
                    <dd>{p.foundationAvailable ? 'Yes' : 'Not listed'}</dd>
                    <dt className="text-neutral-500">SAT range</dt>
                    <dd>{p.satLow != null ? `${p.satLow} to ${p.satHigh}` : 'Not added yet'}</dd>
                    <dt className="text-neutral-500">Fees (USD)</dt>
                    <dd>{p.feesUsd ?? 'Not added yet'}</dd>
                  </dl>
                ) : (
                  <Badge>Details locked</Badge>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
