"use client"

import { FormEvent, KeyboardEvent, ReactNode, useEffect, useRef, useState } from "react"
import { supabase } from "../lib/supabase"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

const STORAGE_KEY = "jmg-grupo-estar-chat"

function formatInline(text: string): ReactNode[] {
  return text.split(/(\*\*.*?\*\*)/g).filter(Boolean).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>
    }
    return <span key={index}>{part}</span>
  })
}

function formatAssistantText(text: string) {
  return text.split("\n").map((line, index) => {
    const trimmed = line.trim()
    if (!trimmed) return <div className="chatSpacer" key={index} />
    if (trimmed.startsWith("- ")) {
      return <div className="chatBullet" key={index}><span>•</span><div>{formatInline(trimmed.slice(2))}</div></div>
    }
    return <div className="chatLine" key={index}>{formatInline(line)}</div>
  })
}

export default function Home() {
  const [loadingSession, setLoadingSession] = useState(true)
  const [logged, setLogged] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [question, setQuestion] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [busy, setBusy] = useState(false)
  const chatEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setLogged(Boolean(data.session))
      setLoadingSession(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => setLogged(Boolean(session)))
    return () => data.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!logged) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) setMessages(JSON.parse(saved))
    } catch {
      localStorage.removeItem(STORAGE_KEY)
    }
  }, [logged])

  useEffect(() => {
    if (!logged) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages))
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, busy, logged])

  async function login(e: FormEvent) {
    e.preventDefault()
    setError("")
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError("Correo electrónico o contraseña incorrectos.")
  }

  function newChat() {
    setMessages([])
    setQuestion("")
    localStorage.removeItem(STORAGE_KEY)
  }

  async function ask(e: FormEvent) {
    e.preventDefault()
    const userText = question.trim()
    if (!userText || busy) return

    const previousMessages = messages.slice(-8)
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: userText,
    }

    setMessages(current => [...current, userMessage])
    setQuestion("")
    setBusy(true)

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const accessToken = sessionData.session?.access_token

      if (!accessToken) {
        setMessages(current => [...current, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Tu sesión venció. Cerrá sesión e ingresá nuevamente para continuar.",
        }])
        return
      }

      const history = previousMessages
        .map(message => `${message.role === "user" ? "USUARIO" : "ASISTENTE"}: ${message.content}`)
        .join("\n\n")

      const preguntaConContexto = history
        ? `Continuá esta conversación usando los datos disponibles de Grupo Estar. Tomá el historial solamente como contexto conversacional; verificá siempre las cifras contra los datos de Supabase.\n\nHISTORIAL:\n${history}\n\nNUEVA PREGUNTA DEL USUARIO:\n${userText}`
        : userText

      const { data, error } = await supabase.functions.invoke("grupo-estar-ai", {
        body: { pregunta: preguntaConContexto },
        headers: { Authorization: `Bearer ${accessToken}` },
      })

      if (error) {
        setMessages(current => [...current, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "No pude procesar la consulta en este momento. Intentá nuevamente.",
        }])
      } else {
        setMessages(current => [...current, {
          id: crypto.randomUUID(),
          role: "assistant",
          content: data?.respuesta ?? "La consulta no devolvió una respuesta.",
        }])
      }
    } catch {
      setMessages(current => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "Ocurrió un error inesperado al consultar. Intentá nuevamente.",
      }])
    } finally {
      setBusy(false)
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      e.currentTarget.form?.requestSubmit()
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
    <main className="assistantPage chatPage">
      <header>
        <div className="brand"><span className="logo">▥</span><div><strong>JMG Data & AI</strong><small>Grupo Estar</small></div></div>
        <div className="headerActions">
          <button className="secondaryButton" onClick={newChat}>Nuevo chat</button>
          <button className="logout" onClick={() => supabase.auth.signOut()}>Cerrar sesión</button>
        </div>
      </header>

      <section className="chatShell">
        <div className="chatIntro">
          <h1>Asistente de Gestión</h1>
          <p>Preguntá sobre producción, resultados, costos e indicadores. Podés continuar la conversación con preguntas de seguimiento.</p>
        </div>

        <div className="messages" aria-live="polite">
          {messages.length === 0 && (
            <div className="emptyChat">
              <div className="emptyIcon">▥</div>
              <strong>¿Qué querés analizar?</strong>
              <p>Por ejemplo: “¿Cómo viene el tambo?” o “¿Qué cambió respecto de mayo?”</p>
            </div>
          )}

          {messages.map(message => (
            <div className={`messageRow ${message.role}`} key={message.id}>
              <div className="messageAvatar">{message.role === "user" ? "Tú" : "AI"}</div>
              <div className="messageBubble">
                {message.role === "assistant" ? formatAssistantText(message.content) : message.content}
              </div>
            </div>
          ))}

          {busy && (
            <div className="messageRow assistant">
              <div className="messageAvatar">AI</div>
              <div className="messageBubble typing"><span></span><span></span><span></span></div>
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        <form className="chatComposer" onSubmit={ask}>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribí tu consulta..."
            rows={2}
            disabled={busy}
          />
          <button type="submit" disabled={busy || !question.trim()} aria-label="Enviar consulta">Enviar</button>
          <small>Enter para enviar · Shift + Enter para nueva línea</small>
        </form>
      </section>
    </main>
  )
}
