import { useEffect, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { listUsers, importCatalog, listSchools, clearImports } from '../lib/api'
import { parseCsv, rowsToSchools, rowsToPrograms, rowsToScholarships } from '../lib/csv'
import { Badge, Field, PageTitle } from '../components/ui'

const SHEETS = [
  { kind: 'schools', label: 'Schools sheet', cols: 'school_name, country, type, category, city, website, verified' },
  { kind: 'programs', label: 'Programs sheet', cols: 'school_name, program_name, level, field, fees_usd, duration_years, min_core_maths, min_core_english, min_core_science, required_electives, cutoff_aggregate, cutoff_year, sat_low, sat_high, english_test_waiver, foundation_available, verified' },
  { kind: 'scholarships', label: 'Scholarships sheet', cols: 'name, funder, country, funding_type, level, min_aggregate, min_sat, criteria, deadline, link, verified' },
]

function Importer({ sheet }) {
  const [msg, setMsg] = useState('')
  const onFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const rows = parseCsv(await file.text())
    if (!rows.length) return setMsg('No rows found. Check the file is a CSV with a header row.')
    let converted
    if (sheet.kind === 'schools') converted = rowsToSchools(rows)
    else if (sheet.kind === 'programs') converted = rowsToPrograms(rows, await listSchools())
    else converted = rowsToScholarships(rows)
    await importCatalog(sheet.kind, converted)
    setMsg(`Imported ${converted.length} rows.`)
    e.target.value = ''
  }
  return (
    <div className="card space-y-2">
      <h3 className="font-bold">{sheet.label}</h3>
      <p className="text-xs text-neutral-500">Columns: {sheet.cols}</p>
      <input type="file" accept=".csv" onChange={onFile} className="text-sm" />
      {msg && <p className="text-sm font-semibold">{msg}</p>}
    </div>
  )
}

export default function Admin() {
  const { user, loading } = useAuth()
  const [users, setUsers] = useState([])

  useEffect(() => { listUsers().then(setUsers) }, [])

  if (loading) return <p>Loading...</p>
  if (user?.role !== 'admin') return <p>Admins only.</p>

  return (
    <div className="space-y-8">
      <PageTitle title="Admin" sub="Sign-ups come from the database. Spreadsheet import is still browser-only until step 5. Authenticator 2FA for admins is not added yet." />

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Sign-ups ({users.length})</h2>
        <div className="overflow-x-auto card !p-0">
          <table className="w-full text-sm">
            <thead className="text-left bg-neutral-50">
              <tr><th className="p-3">Name</th><th className="p-3">Email</th><th className="p-3">Phone</th><th className="p-3">Access</th><th className="p-3">Profile</th></tr>
            </thead>
            <tbody>
              {users.map((u) => {
                const now = Date.now()
                const subbed = u.subscription?.status === 'active' && new Date(u.subscription.expiresAt).getTime() > now
                const trial = u.trialEndsAt && new Date(u.trialEndsAt).getTime() > now
                const label = subbed ? 'Subscriber' : trial ? 'Trial' : u.trialEndsAt ? 'Expired' : 'No trial'
                return (
                  <tr key={u.id} className="border-t border-neutral-200">
                    <td className="p-3">{u.fullName}{u.isMinor && ' (under 18)'}</td>
                    <td className="p-3">{u.email}</td>
                    <td className="p-3">{u.phone}</td>
                    <td className="p-3"><Badge tone={subbed || trial ? 'green' : 'orange'}>{label}</Badge></td>
                    <td className="p-3">{u.profileComplete ? 'Complete' : 'Incomplete'}</td>
                  </tr>
                )
              })}
              {users.length === 0 && (
                <tr><td className="p-3 text-neutral-500" colSpan={5}>No sign-ups yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-xl font-bold">Spreadsheet import (CSV)</h2>
        <p className="text-sm text-neutral-600">Import schools first, then programs so they link to the right school. Export your Excel sheet as CSV.</p>
        <div className="grid gap-4 md:grid-cols-3">{SHEETS.map((s) => <Importer key={s.kind} sheet={s} />)}</div>
        <button className="btn btn-outline" onClick={async () => { await clearImports(); location.reload() }}>Remove all imported rows</button>
      </section>
    </div>
  )
}
