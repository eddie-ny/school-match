// This mirrors the database rule public.has_full_access() so the screens can show the right
// message. It is for display only. The database is what actually decides who can read what
// (row-level security), so editing this in the browser gains nobody anything.
export function getAccess(user, now = Date.now()) {
  if (!user) return { level: 'visitor', detail: 'Sign in to see more.' }

  // Under 18: limited until a parent confirms.
  if (user.isMinor && !user.parent?.confirmedAt) {
    return { level: 'summary', detail: 'Waiting for parent or guardian confirmation.', needsParent: true }
  }

  const sub = user.subscription
  if (sub && sub.status === 'active' && new Date(sub.expiresAt).getTime() > now) {
    return { level: 'full', detail: 'Subscriber', expiresAt: sub.expiresAt }
  }

  if (user.trialEndsAt && new Date(user.trialEndsAt).getTime() > now) {
    return { level: 'full', detail: 'Free trial', trial: true, expiresAt: user.trialEndsAt }
  }

  if (!user.trialEndsAt) {
    return { level: 'summary', detail: 'No free trial on this account. Subscribe for full details.', noTrial: true }
  }
  return { level: 'summary', detail: 'Trial ended. Subscribe for full details.' }
}

export const hasFull = (user) => getAccess(user).level === 'full'

export function timeLeft(iso) {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'expired'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  if (h >= 48) return `${Math.floor(h / 24)} days`
  return `${h}h ${m}m`
}
