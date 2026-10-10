import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { timeLeft } from '../lib/access'

export const APP_NAME = 'SchoolMatch' // placeholder name

const links = [
  { to: '/schools', label: 'Find a School' },
  { to: '/abroad', label: 'Study Abroad' },
  { to: '/scholarships', label: 'Scholarships' },
  { to: '/eligibility', label: 'Check My Eligibility' },
]

export default function Layout() {
  const { user, access, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const nav = useNavigate()
  const handleSignOut = async () => {
    nav('/')
    await signOut()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-neutral-200 bg-white sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link to="/" className="font-heading font-bold text-xl">
            <span className="text-brand-orange">School</span>
            <span className="text-brand-green">Match</span>
          </Link>

          <nav className="hidden md:flex items-center gap-5 text-sm font-medium">
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className={({ isActive }) => (isActive ? 'text-brand-orange' : 'hover:text-brand-green')}>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            {user ? (
              <>
                <Link to="/profile" className="text-sm font-medium">{user.fullName.split(' ')[0]}</Link>
                <button onClick={handleSignOut} className="btn btn-outline !min-h-10">Sign out</button>
              </>
            ) : (
              <>
                <Link to="/login" className="btn btn-outline !min-h-10">Sign in</Link>
                <Link to="/signup" className="btn btn-orange !min-h-10">Sign up</Link>
              </>
            )}
          </div>

          <button className="md:hidden btn btn-outline !px-3" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? 'Close' : 'Menu'}
          </button>
        </div>

        {open && (
          <div className="md:hidden border-t border-neutral-200 px-4 py-3 flex flex-col gap-1" onClick={() => setOpen(false)}>
            {links.map((l) => (
              <NavLink key={l.to} to={l.to} className="py-3 font-medium">{l.label}</NavLink>
            ))}
            <Link to="/pricing" className="py-3 font-medium">Plans</Link>
            {user ? (
              <>
                <Link to="/profile" className="py-3 font-medium">My profile</Link>
                {user.role === 'admin' && <Link to="/admin" className="py-3 font-medium">Admin</Link>}
                <button onClick={handleSignOut} className="py-3 text-left font-medium">Sign out</button>
              </>
            ) : (
              <div className="flex gap-3 pt-2">
                <Link to="/login" className="btn btn-outline flex-1">Sign in</Link>
                <Link to="/signup" className="btn btn-orange flex-1">Sign up</Link>
              </div>
            )}
          </div>
        )}

        {user && access.level === 'full' && access.trial && (
          <div className="bg-brand-green/20 text-sm text-center py-2 px-4">
            Free trial: {timeLeft(access.expiresAt)} left. <Link to="/pricing" className="underline font-semibold">See plans</Link>
          </div>
        )}
        {user && access.level === 'summary' && (
          <div className="bg-brand-orange/25 text-sm text-center py-2 px-4">
            {access.needsParent
              ? 'Waiting for your parent or guardian to confirm. You can see summaries only until then.'
              : access.noTrial
              ? 'No free trial on this account. You can see summaries only.'
              : 'Your trial has ended. You can see summaries only.'}{' '}
            {!access.needsParent && <Link to="/pricing" className="underline font-semibold">Subscribe</Link>}
          </div>
        )}
      </header>

      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-neutral-200 text-sm text-neutral-600">
        <div className="max-w-5xl mx-auto px-4 py-6 flex flex-col gap-2">
          <p>{APP_NAME} is a placeholder name. Starter data is unverified. Results are guidance, not a guarantee of admission.</p>
          <div className="flex gap-4">
            <Link to="/pricing" className="underline">Plans</Link>
            <Link to="/privacy" className="underline">Privacy</Link>
            {user?.role === 'admin' && <Link to="/admin" className="underline">Admin</Link>}
          </div>
        </div>
      </footer>
    </div>
  )
}
