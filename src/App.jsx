import React, { useEffect, useState, useRef } from 'react'

// Simulateur 3D de torréfaction de café avec intégration Way2tech.ai

function parseParams() {
  const p = new URLSearchParams(window.location.search)
  const keys = ['session_id','learner_id','resource_id','api_key','callback_url']
  const out = {}
  keys.forEach(k => out[k] = p.get(k))
  out.mode = p.get('mode') || 'learning'
  return out
}

function nowISO() { return new Date().toISOString() }

async function sendWithRetry(url, payload, apiKey, maxAttempts = 3) {
  let attempt = 0
  let lastErr = null
  while (attempt < maxAttempts) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey
        },
        body: JSON.stringify(payload)
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      return await res.json()
    } catch (err) {
      lastErr = err
      attempt += 1
      const delay = Math.pow(2, attempt) * 500
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw lastErr
}

// Composant 3D du torréfacteur utilisant Canvas
function Roaster3D({ temperature, progress, running, drumSpeed }) {
  const canvasRef = useRef(null)
  const animationRef = useRef(null)
  const rotationRef = useRef(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height

    function draw() {
      ctx.clearRect(0, 0, width, height)
      
      // Fond avec gradient
      const bgGrad = ctx.createLinearGradient(0, 0, 0, height)
      bgGrad.addColorStop(0, '#1a1a2e')
      bgGrad.addColorStop(1, '#16213e')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // Dessiner la base de la machine (perspective 3D)
      ctx.save()
      ctx.translate(width/2, height/2)
      
      // Corps de la machine - aspect métallique
      const bodyGrad = ctx.createLinearGradient(-150, -100, 150, 100)
      bodyGrad.addColorStop(0, '#4a5568')
      bodyGrad.addColorStop(0.5, '#718096')
      bodyGrad.addColorStop(1, '#2d3748')
      ctx.fillStyle = bodyGrad
      
      // Corps principal (trapèze pour effet 3D)
      ctx.beginPath()
      ctx.moveTo(-120, -80)
      ctx.lineTo(120, -80)
      ctx.lineTo(150, 80)
      ctx.lineTo(-150, 80)
      ctx.closePath()
      ctx.fill()
      ctx.strokeStyle = '#1a202c'
      ctx.lineWidth = 3
      ctx.stroke()

      // Tambour de torréfaction (cylindre rotatif)
      if (running) {
        rotationRef.current += drumSpeed
      }
      
      const drumCenterY = -20
      const drumRadius = 50
      const drumWidth = 180
      
      // Ombre du tambour
      ctx.fillStyle = 'rgba(0,0,0,0.3)'
      ctx.beginPath()
      ctx.ellipse(0, drumCenterY + 5, drumWidth/2, drumRadius*0.3, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Corps du tambour avec lueur de chaleur
      const tempRatio = Math.min(temperature / 250, 1)
      const drumGrad = ctx.createRadialGradient(0, drumCenterY, 0, 0, drumCenterY, drumRadius)
      drumGrad.addColorStop(0, `rgba(255, ${200 - tempRatio * 150}, ${100 - tempRatio * 100}, 1)`)
      drumGrad.addColorStop(0.7, `rgba(${150 + tempRatio * 105}, ${100 - tempRatio * 50}, 50, 1)`)
      drumGrad.addColorStop(1, '#8b4513')
      
      ctx.fillStyle = drumGrad
      ctx.beginPath()
      ctx.ellipse(0, drumCenterY, drumWidth/2, drumRadius, 0, 0, Math.PI * 2)
      ctx.fill()
      
      // Grille du tambour (rotation)
      ctx.strokeStyle = 'rgba(139, 69, 19, 0.6)'
      ctx.lineWidth = 2
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI / 4) + rotationRef.current
        const x1 = Math.cos(angle) * drumRadius * 0.8
        const y1 = Math.sin(angle) * drumRadius * 0.3 + drumCenterY
        const x2 = Math.cos(angle + Math.PI) * drumRadius * 0.8
        const y2 = Math.sin(angle + Math.PI) * drumRadius * 0.3 + drumCenterY
        ctx.beginPath()
        ctx.moveTo(x1, y1)
        ctx.lineTo(x2, y2)
        ctx.stroke()
      }

      // Grains de café à l'intérieur (animés)
      if (running) {
        ctx.fillStyle = '#8b4513'
        for (let i = 0; i < 12; i++) {
          const beanAngle = (i * Math.PI / 6) + rotationRef.current * 1.5
          const beanX = Math.cos(beanAngle) * (drumRadius * 0.6)
          const beanY = Math.sin(beanAngle) * (drumRadius * 0.2) + drumCenterY
          ctx.beginPath()
          ctx.ellipse(beanX, beanY, 4, 6, beanAngle, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      // Jauge de température sur le côté
      const gaugeX = 180
      const gaugeY = -40
      const gaugeHeight = 120
      
      // Fond de la jauge
      ctx.fillStyle = '#2d3748'
      ctx.fillRect(gaugeX - 15, gaugeY - gaugeHeight/2, 30, gaugeHeight)
      ctx.strokeStyle = '#4a5568'
      ctx.lineWidth = 2
      ctx.strokeRect(gaugeX - 15, gaugeY - gaugeHeight/2, 30, gaugeHeight)
      
      // Remplissage de température
      const tempHeight = (temperature / 250) * gaugeHeight
      const tempGrad = ctx.createLinearGradient(0, gaugeY + gaugeHeight/2, 0, gaugeY - gaugeHeight/2)
      tempGrad.addColorStop(0, '#10b981')
      tempGrad.addColorStop(0.5, '#f59e0b')
      tempGrad.addColorStop(1, '#ef4444')
      ctx.fillStyle = tempGrad
      ctx.fillRect(gaugeX - 13, gaugeY + gaugeHeight/2 - tempHeight, 26, tempHeight)
      
      // Étiquettes de la jauge
      ctx.fillStyle = '#e2e8f0'
      ctx.font = '10px monospace'
      ctx.textAlign = 'left'
      ctx.fillText('250°C', gaugeX + 20, gaugeY - gaugeHeight/2 + 5)
      ctx.fillText('0°C', gaugeX + 20, gaugeY + gaugeHeight/2 + 5)

      // Panneau de contrôle
      const panelY = 100
      ctx.fillStyle = '#374151'
      ctx.fillRect(-100, panelY, 200, 40)
      ctx.strokeStyle = '#1f2937'
      ctx.lineWidth = 2
      ctx.strokeRect(-100, panelY, 200, 40)
      
      // Voyant d'état
      const lightX = -70
      const lightY = panelY + 20
      ctx.beginPath()
      ctx.arc(lightX, lightY, 8, 0, Math.PI * 2)
      ctx.fillStyle = running ? '#10b981' : '#6b7280'
      ctx.fill()
      if (running) {
        ctx.shadowColor = '#10b981'
        ctx.shadowBlur = 15
        ctx.fill()
        ctx.shadowBlur = 0
      }
      
      // Affichage numérique
      ctx.fillStyle = '#000'
      ctx.fillRect(-20, panelY + 8, 80, 24)
      ctx.fillStyle = '#00ff00'
      ctx.font = 'bold 14px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(`${Math.round(temperature)}°C`, 20, panelY + 25)

      // Effet vapeur/fumée quand chaud et en marche
      if (running && temperature > 180) {
        for (let i = 0; i < 3; i++) {
          const steamY = drumCenterY - drumRadius - 20 - Math.random() * 30
          const steamX = (Math.random() - 0.5) * 60
          const steamSize = 15 + Math.random() * 15
          ctx.fillStyle = `rgba(200, 200, 200, ${0.1 + Math.random() * 0.2})`
          ctx.beginPath()
          ctx.arc(steamX, steamY, steamSize, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      ctx.restore()
    }

    function animate() {
      draw()
      animationRef.current = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [temperature, running, drumSpeed])

  return (
    <canvas 
      ref={canvasRef} 
      width={600} 
      height={400}
      className="w-full rounded-lg shadow-2xl"
    />
  )
}

export default function App() {
  const params = parseParams()
  const [sessionParams] = useState(params)
  const [message, setMessage] = useState('')
  const [stage, setStage] = useState('idle') // idle, preheating, roasting, cooling, finished

  // État de la simulation
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [targetTime, setTargetTime] = useState(300)
  const [temperature, setTemperature] = useState(25)
  const [targetTemp, setTargetTemp] = useState(220)
  const [drumSpeed, setDrumSpeed] = useState(0.02)
  const [events, setEvents] = useState([])
  const intervalRef = useRef(null)
  const startedAtRef = useRef(null)

  const hasValidParams = sessionParams.session_id && sessionParams.api_key && sessionParams.callback_url

  useEffect(() => {
    if (running) {
      startedAtRef.current = new Date()
      setEvents(ev => [...ev, { ts: nowISO(), code: 'ACTION.START', label: 'Démarrage de la torréfaction' }])
      
      intervalRef.current = setInterval(() => {
        setProgress(p => {
          const np = p + 1
          
          // Gestion des étapes
          if (np < 60) {
            setStage('preheating')
            setTemperature(t => Math.min(targetTemp, t + 3))
          } else if (np < targetTime - 30) {
            setStage('roasting')
            const tempVariation = (Math.random() - 0.5) * 2
            setTemperature(t => Math.max(180, Math.min(250, t + tempVariation)))
            
            if (Math.random() < 0.15) {
              const crackStage = np < targetTime / 2 ? 'Premier crack' : 'Second crack'
              setEvents(ev => [...ev, { 
                ts: nowISO(), 
                code: 'EVENT.CRACK', 
                label: crackStage,
                meta: { temperature: Math.round(temperature), time: np }
              }])
            }
          } else if (np < targetTime) {
            setStage('cooling')
            setTemperature(t => Math.max(60, t - 4))
          } else {
            setStage('finished')
            setRunning(false)
          }
          
          return np
        })
      }, 1000)
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [running, targetTime, targetTemp])

  function start() {
    if (!hasValidParams) {
      setMessage('⚠️ Mode démo: Les paramètres ne seront pas envoyés (paramètres manquants)')
    } else {
      setMessage('Simulation démarrée - Les résultats seront envoyés')
    }
    setEvents([])
    setProgress(0)
    setTemperature(25)
    setStage('idle')
    setRunning(true)
  }

  function stop() {
    setRunning(false)
    setStage('finished')
    setEvents(ev => [...ev, { ts: nowISO(), code: 'ACTION.STOP', label: 'Arrêt manuel' }])
  }

  async function finishAndSend() {
    if (!hasValidParams) {
      setMessage('✓ Simulation terminée (Mode démo - aucune donnée envoyée)')
      return
    }

    const endedAt = new Date()
    const startedAt = startedAtRef.current || new Date(endedAt.getTime() - progress*1000)

    const timeScore = Math.max(0, 100 - Math.abs(targetTime - progress) / targetTime * 100)
    const tempStability = Math.max(0, 100 - Math.abs(targetTemp - temperature) / targetTemp * 100)
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
        { code: 'PEAK_TEMP', label: 'Température finale', value: Math.round(temperature), unit: '°C' }
      ],
      events,
      competencies: [],
      artifacts: [
        { type: 'file', label: 'Session log', url: 'data:application/json;base64,' + btoa(JSON.stringify({ events })) }
      ],
      raw_logs: [`Simulation 3D générée. progress=${progress}`],
      diagnostics: {
        simulator_version: '2.0.0-3d',
        engine: 'react-canvas-3d',
        user_agent: navigator.userAgent
      }
    }

    setMessage('📤 Envoi des résultats...')
    try {
      if (!sessionParams.callback_url.startsWith('https://')) {
        throw new Error('callback_url doit être en HTTPS')
      }
      const res = await sendWithRetry(sessionParams.callback_url, payload, sessionParams.api_key, 3)
      setMessage('✓ Résultats envoyés avec succès: ' + (res?.message || 'OK'))
    } catch (err) {
      console.error(err)
      setMessage('❌ Échec envoi résultats: ' + (err?.message || String(err)))
    }
  }

  useEffect(() => {
    if (!running && progress > 0 && stage === 'finished') {
      finishAndSend()
    }
  }, [running, stage])

  const stageLabels = {
    idle: '⏸️ En attente',
    preheating: '🔥 Préchauffage',
    roasting: '☕ Torréfaction',
    cooling: '❄️ Refroidissement',
    finished: '✓ Terminé'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="bg-slate-800 shadow-2xl rounded-xl p-6 mb-4 border border-slate-700">
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
            ☕ Simulateur 3D Torréfacteur de Café
          </h1>
          <p className="text-slate-300 text-sm mb-4">
            Simulation interactive avec visualisation 3D et intégration Way2tech.ai
          </p>

          {!hasValidParams && (
            <div className="bg-amber-900 bg-opacity-30 border border-amber-600 text-amber-200 p-3 rounded-lg mb-4">
              ⚠️ Mode démo: Paramètres manquants (session_id, api_key, callback_url). La simulation fonctionnera mais aucune donnée ne sera envoyée.
            </div>
          )}

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Gauche: Visualisation 3D */}
            <div className="space-y-4">
              <div className="bg-slate-900 rounded-xl p-4 border border-slate-700">
                <Roaster3D 
                  temperature={temperature}
                  progress={progress}
                  running={running}
                  drumSpeed={drumSpeed}
                />
              </div>

              {/* Indicateur d'étape */}
              <div className="bg-slate-700 rounded-lg p-4 text-center">
                <div className="text-2xl font-bold text-white mb-1">{stageLabels[stage]}</div>
                <div className="text-slate-300">{progress}s / {targetTime}s</div>
                <div className="w-full bg-slate-600 h-2 rounded-full mt-2 overflow-hidden">
                  <div 
                    className="bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 h-full transition-all duration-300"
                    style={{ width: `${(progress / targetTime) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Droite: Contrôles et informations */}
            <div className="space-y-4">
              {/* Contrôles */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">⚙️ Contrôles</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Temps cible (secondes)</label>
                    <input 
                      type="number" 
                      value={targetTime} 
                      onChange={e => setTargetTime(Number(e.target.value))} 
                      disabled={running}
                      className="w-full p-2 bg-slate-600 text-white rounded border border-slate-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Température cible (°C)</label>
                    <input 
                      type="number" 
                      value={targetTemp} 
                      onChange={e => setTargetTemp(Number(e.target.value))} 
                      disabled={running}
                      className="w-full p-2 bg-slate-600 text-white rounded border border-slate-500 disabled:opacity-50"
                    />
                  </div>
                  <div>
                    <label className="text-slate-300 text-sm block mb-1">Vitesse du tambour</label>
                    <input 
                      type="range" 
                      min="0.01" 
                      max="0.08" 
                      step="0.01"
                      value={drumSpeed} 
                      onChange={e => setDrumSpeed(Number(e.target.value))}
                      disabled={running}
                      className="w-full disabled:opacity-50"
                    />
                    <div className="text-xs text-slate-400 text-center">{(drumSpeed * 100).toFixed(0)} RPM</div>
                  </div>
                  <div className="flex gap-2 pt-2">
                    {!running ? (
                      <button 
                        onClick={start} 
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                      >
                        ▶️ Démarrer
                      </button>
                    ) : (
                      <button 
                        onClick={stop} 
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold py-3 px-4 rounded-lg transition"
                      >
                        ⏹️ Arrêter
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Métriques */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">📊 Métriques</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-600 p-3 rounded">
                    <div className="text-xs text-slate-400">Température</div>
                    <div className="text-2xl font-bold text-orange-400">{Math.round(temperature)}°C</div>
                  </div>
                  <div className="bg-slate-600 p-3 rounded">
                    <div className="text-xs text-slate-400">Progression</div>
                    <div className="text-2xl font-bold text-blue-400">{Math.round((progress/targetTime)*100)}%</div>
                  </div>
                </div>
              </div>

              {/* Journal d'événements */}
              <div className="bg-slate-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-white mb-3">📝 Événements</h3>
                <div className="bg-slate-900 rounded p-3 h-40 overflow-y-auto">
                  {events.length === 0 ? (
                    <div className="text-slate-500 text-sm">Aucun événement</div>
                  ) : (
                    events.slice().reverse().slice(0, 10).map((e, i) => (
                      <div key={i} className="text-xs text-slate-300 mb-1 font-mono">
                        <span className="text-green-400">{e.code}</span> — {e.label}
                        {e.meta && <span className="text-slate-500"> {JSON.stringify(e.meta)}</span>}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {message && (
            <div className="mt-4 bg-slate-700 text-white p-3 rounded-lg text-sm border border-slate-600">
              {message}
            </div>
          )}
        </div>

        <div className="text-center text-slate-500 text-xs">
          Simulateur v2.0 avec rendu 3D — Way2tech.ai integration
        </div>
      </div>
    </div>
  )
}