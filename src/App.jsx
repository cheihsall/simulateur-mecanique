import React, { useEffect, useState, useRef } from 'react'
import axios from 'axios'

// Simple coffee roaster simulator UI + Way2tech integration

function parseParams() {
  const p = new URLSearchParams(window.location.search)
  const keys = ['session_id','learner_id','resource_id','api_key','callback_url']
  const out = {}
  keys.forEach(k => out[k] = p.get(k))
  // also accept mode
  out.mode = p.get('mode') || 'learning'
  return out
}

function nowISO() { return new Date().toISOString() }

async function sendWithRetry(url, payload, apiKey, maxAttempts = 3) {
  let attempt = 0
  let lastErr = null
  while (attempt < maxAttempts) {
    try {
      const res = await axios.post(url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        timeout: 10000
      })
      return res.data
    } catch (err) {
      lastErr = err
      attempt += 1
      const delay = Math.pow(2, attempt) * 500
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastErr
}

export default function App() {
  const params = parseParams()
  const [sessionParams, setSessionParams] = useState(params)
  const [message, setMessage] = useState('')

  // simulation state
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0) // seconds elapsed
  const [targetTime, setTargetTime] = useState(300) // roast seconds default 5 min
  const [temperature, setTemperature] = useState(200) // °C
  const [events, setEvents] = useState([])
  const [metrics, setMetrics] = useState([])
  const [competencies, setCompetencies] = useState([])
  const intervalRef = useRef(null)
  const startedAtRef = useRef(null)

  useEffect(() => {
    // persist params to localStorage
    try { localStorage.setItem('sim_session_params', JSON.stringify(sessionParams)) } catch(e){}
  }, [sessionParams])

  useEffect(() => {
    if (running) {
      startedAtRef.current = new Date()
      setEvents(ev => [...ev, { ts: nowISO(), code: 'ACTION.START', label: 'Démarrage de la torréfaction' }])
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          const np = p + 1
          // simulate a temperature drift
          setTemperature(t => Math.max(100, Math.min(250, t + (Math.random()-0.5)*4)))
          // occasionally log events
          if (Math.random() < 0.1) {
            setEvents(ev => [...ev, { ts: nowISO(), code: 'ACTION.PRESS', label: 'Ajustement', meta: { temperature: Math.round(temperature) } }])
          }
          if (np >= targetTime) {
            // stop
            setRunning(false)
          }
          return np
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running])

  function start() {
    if (!sessionParams.session_id || !sessionParams.api_key || !sessionParams.callback_url) {
      setMessage('Paramètres manquants — assurez-vous que session_id, api_key et callback_url sont fournis dans l’URL.')
      return
    }
    setMessage('Simulation démarrée')
    setEvents([])
    setMetrics([])
    setCompetencies([])
    setProgress(0)
    setRunning(true)
  }

  function stop() {
    setRunning(false)
    setEvents(ev => [...ev, { ts: nowISO(), code: 'ACTION.STOP', label: 'Arrêt manuel' }])
  }

  async function finishAndSend() {
    const endedAt = new Date()
    const startedAt = startedAtRef.current || new Date(endedAt.getTime() - progress*1000)

    // compute score (toy model): targetTime reached -> better score
    const timeScore = Math.max(0, 100 - Math.abs(targetTime - progress) / targetTime * 100)
    const tempStability = Math.max(0, 100 - Math.abs(200 - temperature))
    const score = Math.round(Math.min(100, (timeScore*0.7 + tempStability*0.3)))

    const payload = {
      schema_version: '1.0.0',
      session_id: sessionParams.session_id,
      resource_id: sessionParams.resource_id || 'resource-unknown',
      learner_id: sessionParams.learner_id || 'learner-unknown',
      mode: sessionParams.mode || 'learning',
      started_at: startedAt.toISOString(),
      ended_at: endedAt.toISOString(),
      summary: {
        score: score,
        status: 'completed',
        grade: score >= 85 ? 'A' : (score >= 70 ? 'B' : 'C')
      },
      metrics: [
        { code: 'TIME_TOTAL', label: 'Temps total', value: progress, unit: 's' },
        { code: 'PEAK_TEMP', label: 'Température finale (C)', value: Math.round(temperature), unit: '°C' }
      ],
      events,
      competencies,
      artifacts: [
        { type: 'file', label: 'Session log (inline)', url: 'data:application/json;base64,' + btoa(JSON.stringify({ events, metrics })) }
      ],
      raw_logs: [
        `Simulation générée localement. progress=${progress}`
      ],
      diagnostics: {
        simulator_version: '1.0.0',
        engine: 'react-vite',
        user_agent: navigator.userAgent
      }
    }

    setMessage('Envoi des résultats...')
    try {
      if (!sessionParams.callback_url.startsWith('https://')) {
        throw new Error('callback_url doit être en HTTPS')
      }
      const res = await sendWithRetry(sessionParams.callback_url, payload, sessionParams.api_key, 3)
      setMessage('Résultats envoyés: ' + (res?.message || 'OK'))
    } catch (err) {
      console.error(err)
      setMessage('Échec envoi résultats: ' + (err?.message || String(err)))
    }
  }

  useEffect(() => {
    // when running transitions to stopped by interval
    if (!running && progress > 0) {
      // simulation ended; send results
      finishAndSend()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running])

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-4xl mx-auto bg-white shadow rounded-lg p-6">
        <h1 className="text-2xl font-semibold mb-2">Simulateur Torréfacteur de Café</h1>
        <p className="text-sm text-slate-600 mb-4">Lecture des paramètres de démarrage depuis l’URL et envoi des résultats au callback de Way2tech.ai.</p>

        <section className="mb-4">
          <h2 className="font-medium">Paramètres de session</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
            <div className="p-3 border rounded"><strong>session_id:</strong> <span className="mono">{sessionParams.session_id || '—'}</span></div>
            <div className="p-3 border rounded"><strong>learner_id:</strong> <span className="mono">{sessionParams.learner_id || '—'}</span></div>
            <div className="p-3 border rounded"><strong>resource_id:</strong> <span className="mono">{sessionParams.resource_id || '—'}</span></div>
            <div className="p-3 border rounded"><strong>api_key:</strong> <span className="mono">{sessionParams.api_key ? '*****' : '—'}</span></div>
            <div className="sm:col-span-2 p-3 border rounded"><strong>callback_url:</strong> <span className="mono break-all">{sessionParams.callback_url || '—'}</span></div>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="font-medium">Contrôles de la simulation</h2>
          <div className="flex gap-3 items-center mt-3">
            <label className="flex items-center gap-2">Temps cible (s)
              <input type="number" value={targetTime} onChange={e => setTargetTime(Number(e.target.value))} className="ml-2 p-1 border rounded w-28" />
            </label>
            <label className="flex items-center gap-2">Température initiale (°C)
              <input type="number" value={Math.round(temperature)} onChange={e => setTemperature(Number(e.target.value))} className="ml-2 p-1 border rounded w-24" />
            </label>
            <div>
              {!running ? (
                <button onClick={start} className="bg-green-600 text-white px-4 py-2 rounded">Démarrer</button>
              ) : (
                <button onClick={stop} className="bg-red-500 text-white px-4 py-2 rounded">Arrêter</button>
              )}
            </div>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="font-medium">Tableau de bord</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
            <div className="p-3 border rounded">
              <div className="text-sm text-slate-500">Progress</div>
              <div className="text-xl font-semibold">{progress}s / {targetTime}s</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-sm text-slate-500">Température</div>
              <div className="text-xl font-semibold">{Math.round(temperature)} °C</div>
            </div>
            <div className="p-3 border rounded">
              <div className="text-sm text-slate-500">Événements</div>
              <div className="text-lg">{events.length}</div>
            </div>
          </div>
        </section>

        <section className="mb-4">
          <h2 className="font-medium">Logs / Événements récents</h2>
          <div className="mt-2 h-40 overflow-auto p-2 bg-slate-800 text-slate-100 rounded">
            {events.length === 0 ? <div className="text-slate-400">Aucun événement</div> : events.slice().reverse().map((e,i) => (
              <div key={i} className="text-xs">[{e.ts}] {e.code} — {e.label} {e.meta ? JSON.stringify(e.meta) : ''}</div>
            ))}
          </div>
        </section>

        <div className="mt-4 text-sm text-slate-700">{message}</div>

        <div className="mt-6 text-xs text-slate-500">Note: Ce simulateur est un prototype. Il suit le schéma de résultats attendu par Way2tech.ai et envoie le payload à l’URL fournie avec l’en-tête x-api-key.</div>
      </div>
    </div>
  )
}
