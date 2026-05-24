import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchCompany(session.user.id)
      else setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setUser(session?.user ?? null)
        if (session?.user) fetchCompany(session.user.id)
        else { setCompany(null); setLoading(false) }
      }
    )
    return () => subscription.unsubscribe()
  }, [])

  async function fetchCompany(userId) {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('owner_id', userId)
      .single()
    setCompany(data)
    setLoading(false)
  }

  async function signUp(email, password, companyName, phone) {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { company_name: companyName } }
    })
    if (error) throw error
    if (data.user) {
      await supabase.from('companies')
        .update({ name: companyName, phone })
        .eq('owner_id', data.user.id)
    }
    return data
  }

  async function signIn(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email, password
    })
    if (error) throw error
    return data
  }

  async function signOut() {
    await supabase.auth.signOut()
  }

  async function updateCompany(updates) {
    if (!company) return
    const { data, error } = await supabase
      .from('companies')
      .update(updates)
      .eq('id', company.id)
      .select()
      .single()
    if (!error) setCompany(data)
    return { data, error }
  }

  const trialDaysLeft = company
    ? Math.max(0, Math.ceil(
        (new Date(company.trial_end) - new Date()) / 86400000
      ))
    : 7

  const isTrialActive = company?.plan === 'trial' && trialDaysLeft > 0
  const isPro = ['pro', 'business'].includes(company?.plan)

  return (
    <AuthContext.Provider value={{
      user, company, loading,
      signUp, signIn, signOut,
      updateCompany,
      trialDaysLeft,
      isTrialActive,
      isPro,
      refreshCompany: () => user && fetchCompany(user.id)
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
