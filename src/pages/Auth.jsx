import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { isMinorFromDob } from '../lib/api'
import { DobPicker, Field, PageTitle } from '../components/ui'

export function Login() {
  const { signIn, user } = useAuth()
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => { if (user) nav('/') }, [user, nav])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await signIn(email, password)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <PageTitle title="Sign in" />
      <form onSubmit={submit} className="card space-y-4">
        <Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
        <Field label="Password"><input className="input" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></Field>
        {error && <p className="text-red-700 text-sm">{error}</p>}
        <button className="btn btn-orange w-full" disabled={busy}>{busy ? 'Signing in...' : 'Sign in'}</button>
        <p className="text-sm"><Link to="/forgot-password" className="underline">Forgot your password?</Link></p>
        <p className="text-sm">New here? <Link to="/signup" className="underline font-semibold">Create an account</Link></p>
      </form>
    </div>
  )
}

export function Signup() {
  const { signUp, user } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({
    fullName: '', phone: '', email: '', password: '', dateOfBirth: '',
    parentName: '', parentPhone: '', parentEmail: '', consent: false,
  })
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [sentTo, setSentTo] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const minor = isMinorFromDob(f.dateOfBirth)

  useEffect(() => { if (user) nav('/profile') }, [user, nav])

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!f.dateOfBirth) return setError('Please choose your full date of birth (day, month and year).')
    if (f.password.length < 8) return setError('Password must be at least 8 characters.')
    if (!f.consent) return setError('Please accept the privacy notice to continue.')
    if (minor && (!f.parentName || !f.parentPhone || !f.parentEmail)) return setError('A parent or guardian name, phone and email are required for under 18s.')
    setBusy(true)
    try {
      const res = await signUp(f)
      if (res.needsConfirm) setSentTo(f.email)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (sentTo) {
    return (
      <div className="max-w-md mx-auto card space-y-3">
        <h1 className="text-2xl font-bold">Check your email</h1>
        <p>We sent a confirmation link to <b>{sentTo}</b>. Click it to finish creating your account. Your 24-hour free trial starts when you sign up.</p>
        <p className="text-sm text-neutral-600">Nothing arrived? Check your spam folder, then try again in a few minutes.</p>
        <Link to="/login" className="btn btn-orange">Go to sign in</Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <PageTitle title="Create your account" sub="Your 24-hour free trial starts when you sign up." />
      <form onSubmit={submit} className="card space-y-4">
        <Field label="Full name"><input className="input" required value={f.fullName} onChange={set('fullName')} /></Field>
        <Field label="Phone"><input className="input" type="tel" required value={f.phone} onChange={set('phone')} placeholder="024 000 0000" /></Field>
        <Field label="Email"><input className="input" type="email" required value={f.email} onChange={set('email')} /></Field>
        <Field label="Password" hint="At least 8 characters."><input className="input" type="password" required value={f.password} onChange={set('password')} /></Field>
        <Field label="Date of birth"><DobPicker value={f.dateOfBirth} onChange={(v) => { setF((cur) => ({ ...cur, dateOfBirth: v })); setError('') }} /></Field>

        {minor && (
          <div className="rounded-xl border-2 border-brand-green p-4 space-y-4 bg-brand-green/10">
            <p className="text-sm font-semibold">You are under 18. A parent or guardian must confirm your account. Your account stays limited until they do.</p>
            <Field label="Parent or guardian name"><input className="input" value={f.parentName} onChange={set('parentName')} /></Field>
            <Field label="Parent or guardian phone"><input className="input" type="tel" value={f.parentPhone} onChange={set('parentPhone')} /></Field>
            <Field label="Parent or guardian email"><input className="input" type="email" value={f.parentEmail} onChange={set('parentEmail')} /></Field>
          </div>
        )}

        <label className="flex gap-3 items-start text-sm">
          <input type="checkbox" className="mt-1 w-5 h-5" checked={f.consent} onChange={set('consent')} />
          <span>I agree to the <Link to="/privacy" className="underline">privacy notice</Link>{minor ? ' and my parent or guardian has been told about it' : ''}.</span>
        </label>

        {error && <p className="text-red-700 text-sm">{error}</p>}
        <button className="btn btn-orange w-full" disabled={busy}>{busy ? 'Creating...' : 'Create account'}</button>
        <p className="text-sm">Already have an account? <Link to="/login" className="underline font-semibold">Sign in</Link></p>
      </form>
    </div>
  )
}

export function ForgotPassword() {
  const { requestPasswordReset } = useAuth()
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      await requestPasswordReset(email)
      setDone(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      <PageTitle title="Reset your password" />
      {done ? (
        <div className="card space-y-3">
          <p>If an account exists for <b>{email}</b>, a reset link is on its way.</p>
          <Link to="/login" className="btn btn-orange">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="card space-y-4">
          <Field label="Email"><input className="input" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></Field>
          {error && <p className="text-red-700 text-sm">{error}</p>}
          <button className="btn btn-orange w-full" disabled={busy}>{busy ? 'Sending...' : 'Send reset link'}</button>
        </form>
      )}
    </div>
  )
}

export function ResetPassword() {
  const { recovering, setNewPassword, user } = useAuth()
  const nav = useNavigate()
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (pw.length < 8) return setError('Password must be at least 8 characters.')
    setBusy(true)
    try {
      await setNewPassword(pw)
      setDone(true)
      setTimeout(() => nav('/'), 1500)
    } catch (err) {
      setError(err.message)
    } finally {
      setBusy(false)
    }
  }

  if (!recovering && !user) {
    return (
      <div className="max-w-md mx-auto card space-y-3">
        <p>This reset link is missing or expired.</p>
        <Link to="/forgot-password" className="btn btn-orange">Request a new link</Link>
      </div>
    )
  }

  return (
    <div className="max-w-md mx-auto">
      <PageTitle title="Choose a new password" />
      {done ? <p className="card">Password updated. Taking you home...</p> : (
        <form onSubmit={submit} className="card space-y-4">
          <Field label="New password" hint="At least 8 characters."><input className="input" type="password" required value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
          {error && <p className="text-red-700 text-sm">{error}</p>}
          <button className="btn btn-orange w-full" disabled={busy}>{busy ? 'Saving...' : 'Save password'}</button>
        </form>
      )}
    </div>
  )
}
