// DATA LAYER.
// Auth, profile, results and documents now talk to Supabase.
// The catalog (schools, programs, scholarships) still uses local starter data until step 5.
// Payments are not wired yet (step 6): the browser can never write subscriptions.

import { supabase } from './supabase'
import { seedSchools, seedPrograms, seedScholarships } from '../data/seed'
import { CORE_SUBJECTS } from './constants'

const fail = (error, fallback) => {
  if (error) throw new Error(friendly(error) || fallback)
}

function friendly(error) {
  const m = (error.message || '').toLowerCase()
  if (m.includes('invalid login')) return 'Wrong email or password.'
  if (m.includes('email not confirmed')) return 'Please confirm your email first. Check your inbox for the link.'
  if (m.includes('rate limit') || m.includes('too many')) return 'Too many attempts. Please wait a few minutes and try again.'
  if (m.includes('password') && m.includes('characters')) return 'Password is too short.'
  return error.message
}

export function isMinorFromDob(dob) {
  if (!dob) return false
  const d = new Date(dob)
  const now = new Date()
  let age = now.getFullYear() - d.getFullYear()
  const m = now.getMonth() - d.getMonth()
  if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--
  return age < 18
}

// ---------- Auth ----------

// Returns { needsConfirm: true } when the project requires email confirmation.
export async function signUp(form) {
  const meta = {
    full_name: form.fullName,
    phone: form.phone,
    date_of_birth: form.dateOfBirth,
  }
  if (isMinorFromDob(form.dateOfBirth)) {
    meta.parent_name = form.parentName
    meta.parent_phone = form.parentPhone
    meta.parent_email = form.parentEmail
  }
  const { data, error } = await supabase.auth.signUp({
    email: form.email,
    password: form.password,
    options: { data: meta, emailRedirectTo: window.location.origin },
  })
  fail(error, 'Could not create your account.')
  return { needsConfirm: !data.session }
}

export async function signIn(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password })
  fail(error, 'Could not sign in.')
}

export async function signOut() {
  // 'local' ends this browser's session without waiting on other devices.
  await supabase.auth.signOut({ scope: 'local' })
}

export async function requestPasswordReset(email) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/reset-password`,
  })
  fail(error, 'Could not send the reset email.')
}

export async function setNewPassword(password) {
  const { error } = await supabase.auth.updateUser({ password })
  fail(error, 'Could not update your password.')
}

// Builds the user object the pages expect, from several tables. Every read is limited by
// row-level security, so a student only ever gets their own rows.
export async function getCurrentUser() {
  const { data: sess } = await supabase.auth.getSession()
  const uid = sess.session?.user?.id
  if (!uid) return null

  const [prof, parent, sub, docs, res, adm] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', uid).maybeSingle(),
    supabase.from('parent_contacts').select('name, phone, email, confirmed_at').eq('student_id', uid).maybeSingle(),
    supabase.from('subscriptions').select('*').eq('user_id', uid).maybeSingle(),
    supabase.from('documents').select('id, doc_type, file_path, uploaded_at').eq('student_id', uid).order('uploaded_at'),
    supabase.from('results').select('id, kind, exam, sat_score, result_grades(subject, subject_type, grade)').eq('student_id', uid).eq('exam', 'WASSCE').maybeSingle(),
    supabase.from('admin_users').select('role').eq('user_id', uid).maybeSingle(),
  ])
  if (prof.error) throw new Error(prof.error.message)
  const p = prof.data
  if (!p) return null // profile row is created by the signup trigger; should always exist

  let results = null
  if (res.data) {
    const grades = {}
    const electives = []
    for (const g of res.data.result_grades || []) {
      grades[g.subject] = g.grade
      if (g.subject_type === 'elective') electives.push(g.subject)
    }
    results = { mode: res.data.kind, grades, electives, sat: res.data.sat_score ?? '' }
  }

  return {
    id: p.id,
    fullName: p.full_name,
    email: p.email,
    phone: p.phone,
    dateOfBirth: p.date_of_birth,
    isMinor: p.is_minor,
    role: adm.data ? 'admin' : 'student',
    createdAt: p.created_at,
    trialEndsAt: p.trial_ends_at,
    profile: {
      shsAttended: p.shs_attended || '',
      shsProgram: p.shs_program || '',
      fundingType: p.funding_type || '',
      desiredPrograms: p.desired_programs || '',
    },
    parent: parent.data ? { name: parent.data.name, phone: parent.data.phone, email: parent.data.email, confirmedAt: parent.data.confirmed_at } : null,
    subscription: sub.data ? { plan: sub.data.plan, status: sub.data.status, expiresAt: sub.data.expires_at, autoRenew: sub.data.auto_renew } : null,
    documents: (docs.data || []).map((d) => ({ id: d.id, name: d.file_path.split('/').pop(), path: d.file_path, uploadedAt: d.uploaded_at })),
    results,
  }
}

// ---------- Profile ----------
export async function saveProfile(userId, profile) {
  const { error } = await supabase
    .from('profiles')
    .update({
      shs_attended: profile.shsAttended,
      shs_program: profile.shsProgram,
      funding_type: profile.fundingType || null,
      desired_programs: profile.desiredPrograms,
    })
    .eq('id', userId)
  fail(error, 'Could not save your profile.')
}

// ---------- Results ----------
export async function saveResults(userId, { mode, grades, electives, sat }) {
  const { data: row, error } = await supabase
    .from('results')
    .upsert({ student_id: userId, exam: 'WASSCE', kind: mode, sat_score: sat ? Number(sat) : null }, { onConflict: 'student_id,exam' })
    .select('id')
    .single()
  fail(error, 'Could not save your results.')

  const del = await supabase.from('result_grades').delete().eq('result_id', row.id)
  fail(del.error, 'Could not save your results.')

  const rows = Object.entries(grades).map(([subject, grade]) => ({
    result_id: row.id,
    subject,
    subject_type: CORE_SUBJECTS.includes(subject) ? 'core' : 'elective',
    grade,
  }))
  if (rows.length) {
    const ins = await supabase.from('result_grades').insert(rows)
    fail(ins.error, 'Could not save your grades.')
  }
}

// ---------- Documents (private Storage bucket, one folder per student) ----------
export async function uploadDocument(userId, file) {
  const safe = file.name.replace(/[^\w.\- ]+/g, '_')
  const path = `${userId}/${Date.now()}-${safe}`
  const up = await supabase.storage.from('documents').upload(path, file, { contentType: file.type })
  fail(up.error, 'Upload failed.')
  const ins = await supabase.from('documents').insert({ student_id: userId, file_path: path })
  if (ins.error) {
    await supabase.storage.from('documents').remove([path])
    fail(ins.error, 'Could not record the document.')
  }
}

export async function removeDocument(doc) {
  const a = await supabase.storage.from('documents').remove([doc.path])
  fail(a.error, 'Could not delete the file.')
  const b = await supabase.from('documents').delete().eq('id', doc.id)
  fail(b.error, 'Could not delete the record.')
}

// ---------- Catalog (local starter data until step 5) ----------
const IMPORT_KEY = 'sm_imported'
const imported = () => {
  try {
    return JSON.parse(localStorage.getItem(IMPORT_KEY)) || { schools: [], programs: [], scholarships: [] }
  } catch {
    return { schools: [], programs: [], scholarships: [] }
  }
}

export async function listSchools() { return [...seedSchools, ...imported().schools] }
export async function listPrograms() { return [...seedPrograms, ...imported().programs] }
export async function listScholarships() { return [...seedScholarships, ...imported().scholarships] }

export async function importCatalog(kind, rows) {
  const cur = imported()
  cur[kind] = [...cur[kind], ...rows]
  localStorage.setItem(IMPORT_KEY, JSON.stringify(cur))
  return cur[kind].length
}
export async function clearImports() {
  localStorage.removeItem(IMPORT_KEY)
}

// ---------- Admin ----------
// Row-level security lets only admins read every profile and subscription.
export async function listUsers() {
  const [p, s] = await Promise.all([
    supabase.from('profiles').select('id, full_name, email, phone, is_minor, trial_ends_at, created_at, profile_complete').order('created_at', { ascending: false }),
    supabase.from('subscriptions').select('user_id, plan, status, expires_at'),
  ])
  fail(p.error, 'Could not load users.')
  const subs = Object.fromEntries((s.data || []).map((x) => [x.user_id, x]))
  return (p.data || []).map((u) => ({
    id: u.id,
    fullName: u.full_name,
    email: u.email,
    phone: u.phone,
    isMinor: u.is_minor,
    role: 'student',
    createdAt: u.created_at,
    trialEndsAt: u.trial_ends_at,
    profileComplete: u.profile_complete,
    subscription: subs[u.id] ? { plan: subs[u.id].plan, status: subs[u.id].status, expiresAt: subs[u.id].expires_at } : null,
  }))
}
