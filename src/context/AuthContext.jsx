import { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react'
import * as api from '../lib/api'
import { supabase } from '../lib/supabase'
import { getAccess } from '../lib/access'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [recovering, setRecovering] = useState(false)
  // Bumped on sign out so a slow in-flight refresh can never put the old user back.
  const generation = useRef(0)

  const refresh = useCallback(async () => {
    const gen = generation.current
    try {
      const u = await api.getCurrentUser()
      if (gen === generation.current) setUser(u)
    } catch (e) {
      console.error(e)
      if (gen === generation.current) setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') setRecovering(true)
      if (!session) {
        setUser(null)
        setLoading(false)
        return
      }
      // Do not call Supabase directly inside this callback; defer to avoid a deadlock.
      setTimeout(refresh, 0)
    })
    return () => data.subscription.unsubscribe()
  }, [refresh])

  const signUp = useCallback((form) => api.signUp(form), [])
  const signIn = useCallback((e, p) => api.signIn(e, p), [])
  const signOut = useCallback(async () => {
    generation.current += 1
    setUser(null) // the screen updates at once; the server call finishes in the background
    try {
      await api.signOut()
    } catch (e) {
      console.error(e)
    }
  }, [])
  const saveProfile = useCallback(async (p) => { await api.saveProfile(user.id, p); await refresh() }, [user, refresh])
  const saveResults = useCallback(async (r) => { await api.saveResults(user.id, r); await refresh() }, [user, refresh])
  const addDocument = useCallback(async (f) => { await api.uploadDocument(user.id, f); await refresh() }, [user, refresh])
  const removeDocument = useCallback(async (d) => { await api.removeDocument(d); await refresh() }, [refresh])

  const access = getAccess(user)
  const profileComplete = !!(user?.profile?.shsAttended && user?.profile?.shsProgram)
  const parentPending = !!(user?.isMinor && !user?.parent?.confirmedAt)

  return (
    <AuthContext.Provider
      value={{
        user, loading, access, profileComplete, parentPending, recovering,
        signUp, signIn, signOut, saveProfile, saveResults, addDocument, removeDocument, refresh,
        requestPasswordReset: api.requestPasswordReset,
        setNewPassword: async (pw) => { await api.setNewPassword(pw); setRecovering(false) },
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
