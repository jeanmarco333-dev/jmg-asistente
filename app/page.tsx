"use client"

import { FormEvent, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"

export default function Home() {
  const [loadingSession, setLoadingSession] = useState(true)
  const [logged, setLogged] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [question, setQuestion] = useState("")
  const [answer, setAnswer] = useState("")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLogged(Boolean(data.session))
      setLoadingSession(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setLogged(Boolean(session)))
    return () => data.subscription.unsubscribe()
  }, [])

  async function login(e: FormEvent) {
    e.preventDefault()
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError("Correo electrónico o contraseña incorrectos.")
  }

  async function ask(e: FormEvent) {
    e.preventDefault()
    if (!question.trim()) return
    setBusy(true)
    setAnswer("")

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        setAnswer("Diagnóstico: no hay una sesión activa de Supabase. Cerrá sesión e ingresá nuevamente.")
        return
      }

      const { data, error } = await supabase.functions.invoke("grupo-estar-ai", {
        body: { pregunta: question.trim() },
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (error) {
        let detail = error.message || "Error desconocido"
        const context = (error as any).context
        if (context && typeof context.json === "function") {
          try {
            const body = await context.json()
            detail += ` | Respuesta: ${JSON.stringify(body)}`
          } catch {
            // Si la respuesta no es JSON, conservamos el mensaje original.
          }
        }
        setAnswer(`Diagnóstico Supabase: ${detail}`)
      } else {
        setAnswer(data?.respuesta ?? `Respuesta recibida: ${JSON.stringify(data)}`)
      }
    } catch (err) {
      setAnswer(`Diagnóstico inesperado: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setBusy(false)
    }
  }

  if (loadingSession) return <main className="center">Cargando…</main>

  if (!logged) {
    return (
      <main className="loginPage">
        <section className="brandPanel">
          <div className="brand"><span className="logo">▥</span><div><strong>JMG Data & AI</strong><small>Asistente de Gestión</small></div></div>
          <div className="pitch"><h1>Inteligencia de gestión al servicio de Grupo Estar</h1><p>Consultá los datos operativos y financieros de la compañía mediante un asistente de inteligencia artificial, en un entorno privado y seguro.</p><ul><li>♢ &nbsp; Acceso restringido y cifrado</li><li>▥ &nbsp; Respuestas basadas en datos de gestión</li></ul></div>
          <small className="copyright">© 2026 Grupo Estar. Uso interno.</small>
        </section>
        <section className="loginPanel"><form className="card" onSubmit={login}><h2>Iniciar sesión</h2><p>Introducí tus credenciales para acceder al asistente.</p><label>Correo electrónico</label><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="nombre@grupoestar.com" required/><label>Contraseña</label><input type="password" value={password} onChange={e => setPassword(e.target.value)} required/>{error && <div className="error">{error}</div>}<button>Acceder</button><small>El acceso está reservado al personal autorizado de Grupo Estar.</small></form></section>
      </main>
    )
  }

  return (
    <main className="assistantPage">
      <header><div className="brand"><span className="logo">▥</span><div><strong>JMG Data & AI</strong><small>Grupo Estar</small></div></div><button className="logout" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button></header>
      <section className="assistant"><h1>Asistente de Gestión</h1><p>Consultá información de Grupo Estar en lenguaje natural.</p><form onSubmit={ask}><textarea value={question} onChange={e => setQuestion(e.target.value)} placeholder="Ej.: ¿Cómo evolucionaron las ventas?" rows={4}/><button disabled={busy}>{busy ? "Consultando…" : "Consultar"}</button></form>{answer && <div className="answer"><strong>Respuesta</strong><p>{answer}</p></div>}</section>
    </main>
  )
}
