import { useState, useRef, useEffect } from 'react'

const BACKEND_URL = 'http://localhost:4000'
const WS_URL = 'ws://localhost:4000'

function App() {
  const [page, setPage] = useState('deploy')
  const [repoUrl, setRepoUrl] = useState('')
  const [logs, setLogs] = useState([])
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [liveUrl, setLiveUrl] = useState('')
  const [deploys, setDeploys] = useState([])
  const logsEndRef = useRef(null)

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs])

  useEffect(() => {
    if (page === 'history') fetchDeploys()
  }, [page])

  async function fetchDeploys() {
    try {
      const res = await fetch(`${BACKEND_URL}/deploys`)
      const data = await res.json()
      setDeploys(data)
    } catch (err) {
      console.error('Could not fetch deploys')
    }
  }

  async function handleDeploy() {
    if (!repoUrl.trim()) return
    setLogs([])
    setError('')
    setLiveUrl('')
    setStatus('deploying')

    let buildId

    try {
      const response = await fetch(`${BACKEND_URL}/deploy`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repoUrl: repoUrl.trim() }),
      })
      if (!response.ok) {
        const data = await response.json()
        setError(data.error || 'Server error')
        setStatus('error')
        return
      }
      const data = await response.json()
      buildId = data.buildId
    } catch (err) {
      setError('Could not reach the backend. Is it running?')
      setStatus('error')
      return
    }

    const ws = new WebSocket(`${WS_URL}/${buildId}`)

    ws.onmessage = (event) => {
      const message = event.data
      if (message.startsWith('DEPLOY_COMPLETE:')) {
        const port = message.split(':')[1]
        setLiveUrl(`http://localhost:${port}`)
        setStatus('done')
        ws.close()
        return
      }
      if (message.startsWith('ERROR:')) {
        setError(message.replace('ERROR: ', ''))
        setStatus('error')
        ws.close()
        return
      }
      setLogs((prev) => [...prev, message])
    }

    ws.onerror = () => {
      setError('WebSocket connection failed.')
      setStatus('error')
    }
  }

  async function handleStop(deployId) {
    try {
      await fetch(`${BACKEND_URL}/stop/${deployId}`, { method: 'POST' })
      fetchDeploys()
    } catch (err) {
      console.error('Could not stop container')
    }
  }

  function openLink(url) {
    window.open(url, '_blank')
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <div style={styles.nav}>
          <span style={styles.navBrand}>AutoDeploy.live</span>
          <div style={styles.navLinks}>
            <button
              style={page === 'deploy' ? {...styles.navBtn, ...styles.navBtnActive} : styles.navBtn}
              onClick={() => setPage('deploy')}
            >Deploy</button>
            <button
              style={page === 'history' ? {...styles.navBtn, ...styles.navBtnActive} : styles.navBtn}
              onClick={() => setPage('history')}
            >History</button>
          </div>
        </div>

        {page === 'deploy' && (
          <div>
            <p style={styles.subtitle}>Paste a public GitHub URL. Your app builds and runs automatically.</p>

            <div style={styles.inputRow}>
              <input
                style={styles.input}
                type="text"
                placeholder="https://github.com/username/repo"
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleDeploy()}
                disabled={status === 'deploying'}
              />
              <button
                style={{...styles.button, opacity: status === 'deploying' ? 0.6 : 1}}
                onClick={handleDeploy}
                disabled={status === 'deploying'}
              >
                {status === 'deploying' ? 'Building...' : 'Deploy'}
              </button>
            </div>

            {error && <div style={styles.errorBox}>{error}</div>}

            {logs.length > 0 && (
              <div style={styles.terminal}>
                {logs.map((line, i) => (
                  <div key={i} style={styles.logLine}>
                    <span style={styles.prompt}>$</span> {line}
                  </div>
                ))}
                {status === 'deploying' && (
                  <div style={styles.logLine}>
                    <span style={styles.cursor}>█</span>
                  </div>
                )}
                <div ref={logsEndRef} />
              </div>
            )}

            {status === 'done' && liveUrl && (
              <div style={styles.successBox}>
                <div style={{ marginBottom: '8px', fontWeight: '600' }}>Your app is live!</div>
                <span
                  style={styles.liveLink}
                  onClick={() => openLink(liveUrl)}
                >{liveUrl}</span>
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#8b949e' }}>Click the link to open your deployed app</div>
              </div>
            )}
          </div>
        )}

        {page === 'history' && (
          <div>
            <p style={styles.subtitle}>All past deploys</p>
            {deploys.length === 0 && (
              <div style={{ color: '#8b949e', fontSize: '14px' }}>No deploys yet. Go to Deploy tab to create your first one.</div>
            )}
            {deploys.map((deploy) => (
              <div key={deploy.id} style={styles.deployCard}>
                <div style={styles.deployCardTop}>
                  <span style={styles.deployRepo}>{deploy.repo.replace('https://github.com/', '')}</span>
                  <span style={{
                    ...styles.statusBadge,
                    background: deploy.status === 'live' ? '#1a2f1a' : '#2d1b1b',
                    color: deploy.status === 'live' ? '#3fb950' : '#f85149',
                    border: deploy.status === 'live' ? '1px solid #3fb950' : '1px solid #f85149',
                  }}>{deploy.status}</span>
                </div>
                <div style={styles.deployMeta}>
                  <span>{deploy.language}</span>
                  <span style={{ margin: '0 8px' }}>·</span>
                  <span>{new Date(deploy.created_at).toLocaleString()}</span>
                  {deploy.port && (
                    <span>
                      <span style={{ margin: '0 8px' }}>·</span>
                      <span
                        style={styles.deployLink}
                        onClick={() => openLink(`http://localhost:${deploy.port}`)}
                      >localhost:{deploy.port}</span>
                    </span>
                  )}
                </div>
                {deploy.status === 'live' && (
                  <button style={styles.stopBtn} onClick={() => handleStop(deploy.id)}>Stop container</button>
                )}
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    background: '#0d1117',
    display: 'flex',
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingTop: '40px',
    fontFamily: "'Courier New', monospace",
  },
  container: { width: '100%', maxWidth: '700px', padding: '0 20px' },
  nav: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '32px',
    paddingBottom: '16px',
    borderBottom: '1px solid #21262d',
  },
  navBrand: { color: '#e6edf3', fontSize: '18px', fontWeight: '600' },
  navLinks: { display: 'flex', gap: '8px' },
  navBtn: {
    background: 'transparent',
    border: '1px solid #30363d',
    borderRadius: '6px',
    color: '#8b949e',
    padding: '6px 14px',
    fontSize: '13px',
    cursor: 'pointer',
    fontFamily: "'Courier New', monospace",
  },
  navBtnActive: { color: '#e6edf3', borderColor: '#58a6ff' },
  subtitle: { color: '#8b949e', fontSize: '14px', marginBottom: '24px' },
  inputRow: { display: 'flex', gap: '10px', marginBottom: '16px' },
  input: {
    flex: 1,
    background: '#161b22',
    border: '1px solid #30363d',
    borderRadius: '6px',
    padding: '10px 14px',
    color: '#e6edf3',
    fontSize: '14px',
    outline: 'none',
    fontFamily: "'Courier New', monospace",
  },
  button: {
    background: '#238636',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    padding: '10px 20px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    fontFamily: "'Courier New', monospace",
  },
  terminal: {
    background: '#010409',
    border: '1px solid #30363d',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
    maxHeight: '400px',
    overflowY: 'auto',
  },
  logLine: { color: '#3fb950', fontSize: '13px', lineHeight: '1.6', whiteSpace: 'pre-wrap', wordBreak: 'break-all' },
  prompt: { color: '#58a6ff', marginRight: '8px' },
  cursor: { color: '#3fb950' },
  errorBox: {
    background: '#2d1b1b',
    border: '1px solid #f85149',
    borderRadius: '6px',
    padding: '12px 16px',
    color: '#f85149',
    fontSize: '13px',
    marginTop: '8px',
  },
  successBox: {
    background: '#1a2f1a',
    border: '1px solid #3fb950',
    borderRadius: '6px',
    padding: '16px',
    color: '#3fb950',
    fontSize: '13px',
    marginTop: '16px',
  },
  liveLink: { color: '#58a6ff', fontSize: '14px', cursor: 'pointer', textDecoration: 'underline' },
  deployCard: {
    background: '#161b22',
    border: '1px solid #21262d',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '10px',
  },
  deployCardTop: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' },
  deployRepo: { color: '#e6edf3', fontSize: '14px', fontWeight: '500' },
  statusBadge: { fontSize: '11px', padding: '2px 8px', borderRadius: '20px', fontWeight: '500' },
  deployMeta: { color: '#8b949e', fontSize: '12px' },
  deployLink: { color: '#58a6ff', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline' },
  stopBtn: {
    marginTop: '10px',
    background: 'transparent',
    border: '1px solid #f85149',
    borderRadius: '6px',
    color: '#f85149',
    padding: '4px 12px',
    fontSize: '12px',
    cursor: 'pointer',
    fontFamily: "'Courier New', monospace",
  },
}

export default App