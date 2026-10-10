import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { SHS_PROGRAMS } from '../lib/constants'
import { Badge, Field, PageTitle, RequireAuth } from '../components/ui'
import { timeLeft } from '../lib/access'

const ALLOWED = ['application/pdf', 'image/jpeg', 'image/png']
const MAX_MB = 5

function ProfileInner() {
  const { user, access, saveProfile, addDocument, removeDocument, profileComplete, parentPending } = useAuth()
  const [p, setP] = useState(user.profile)
  const [saved, setSaved] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { setP(user.profile) }, [user.profile])

  const save = async (e) => {
    e.preventDefault()
    setError('')
    setSaved('')
    if (!p.shsAttended.trim() || !p.shsProgram) return setError('SHS attended and the program you studied are required.')
    setBusy(true)
    try {
      await saveProfile(p)
      setSaved('Profile saved.')
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (e) => {
    setError('')
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!ALLOWED.includes(file.type)) return setError('Only PDF, JPG or PNG files are allowed.')
    if (file.size > MAX_MB * 1024 * 1024) return setError(`File is too large. Maximum is ${MAX_MB} MB.`)
    try {
      await addDocument(file)
    } catch (err) {
      setError(err.message)
    }
  }

  const remove = async (d) => {
    setError('')
    try {
      await removeDocument(d)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageTitle title="My profile" />

      {!profileComplete && (
        <div className="rounded-xl bg-brand-orange/20 p-4 text-sm font-medium">
          Complete your profile: tell us the SHS you attended and the program you studied to unlock the features.
        </div>
      )}

      {parentPending && (
        <div className="card border-brand-green space-y-2">
          <h2 className="font-bold">Waiting for parent or guardian</h2>
          <p className="text-sm">
            {user.parent
              ? `${user.parent.name} (${user.parent.email}) needs to confirm your account. Your account stays limited until they do.`
              : 'A parent or guardian must confirm your account. Your account stays limited until they do.'}
          </p>
          <p className="text-xs text-neutral-500">The confirmation email is added in a later step. Until then the team confirms parents manually.</p>
        </div>
      )}
      {user.isMinor && !parentPending && <Badge tone="green">Parent confirmed</Badge>}

      <form onSubmit={save} className="card space-y-4">
        <h2 className="font-bold text-lg">School details</h2>
        <Field label="SHS attended *"><input className="input" value={p.shsAttended} onChange={(e) => setP({ ...p, shsAttended: e.target.value })} /></Field>
        <Field label="High school program studied *">
          <select className="input" value={p.shsProgram} onChange={(e) => setP({ ...p, shsProgram: e.target.value })}>
            <option value="">Select program</option>
            {SHS_PROGRAMS.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Funding" hint={user.isMinor ? 'Under 18: funding goes through your sponsor.' : ''}>
          <select className="input" value={p.fundingType} onChange={(e) => setP({ ...p, fundingType: e.target.value })}>
            <option value="">Select</option>
            <option>Self-funded</option>
            <option>Partial funding</option>
            <option>Fully funded</option>
          </select>
        </Field>
        <Field label="Desired programs (optional)"><input className="input" placeholder="e.g. Computer Science, Engineering" value={p.desiredPrograms} onChange={(e) => setP({ ...p, desiredPrograms: e.target.value })} /></Field>
        {error && <p className="text-red-700 text-sm">{error}</p>}
        {saved && <p className="text-sm font-semibold text-green-800">{saved}</p>}
        <button className="btn btn-orange" disabled={busy}>{busy ? 'Saving...' : 'Save profile'}</button>
      </form>

      <div className="card space-y-3">
        <h2 className="font-bold text-lg">Documents</h2>
        <p className="text-sm text-neutral-600">PDF, JPG or PNG, up to {MAX_MB} MB each. Only you can see these files.</p>
        <input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={onFile} className="text-sm" />
        {user.documents.length === 0 && <p className="text-sm text-neutral-500">No documents uploaded yet.</p>}
        <ul className="space-y-2">
          {user.documents.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 text-sm border border-neutral-200 rounded-lg px-3 py-2">
              <span className="truncate">{d.name.replace(/^\d+-/, '')}</span>
              <button className="underline min-h-11 px-2" onClick={() => remove(d)}>Remove</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="card space-y-2">
        <h2 className="font-bold text-lg">Access</h2>
        <p className="text-sm">{access.detail}{access.expiresAt ? `, ${timeLeft(access.expiresAt)} left` : ''}</p>
        <Link to="/pricing" className="btn btn-green">See plans</Link>
      </div>
    </div>
  )
}

export default function Profile() {
  return (
    <RequireAuth>
      <ProfileInner />
    </RequireAuth>
  )
}
