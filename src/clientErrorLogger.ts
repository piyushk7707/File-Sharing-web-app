// Client-side global error logger
// Stores recent errors in localStorage under 'clientErrors' and logs to console

function safeStringify(obj: any) {
  try {
    return typeof obj === 'string' ? obj : JSON.stringify(obj)
  } catch (e) {
    return String(obj)
  }
}

export default function initClientErrorLogger() {
  const sendToStorage = (payload: any) => {
    try {
      const existing = localStorage.getItem('clientErrors') || '[]'
      const arr = JSON.parse(existing)
      arr.push({ time: new Date().toISOString(), payload })
      localStorage.setItem('clientErrors', JSON.stringify(arr.slice(-50)))
    } catch (e) {
      // ignore
    }
  }

  window.addEventListener('error', (event: ErrorEvent) => {
    const err = {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
      stack: event.error ? (event.error as any).stack : undefined,
    }
    console.error('Global client error:', err)
    sendToStorage(err)
  })

  window.addEventListener('unhandledrejection', (ev: PromiseRejectionEvent) => {
    const reason = ev.reason
    console.error('Unhandled Rejection:', reason)
    const payload = { unhandledRejection: reason && (reason.stack || reason.message || safeStringify(reason)) }
    sendToStorage(payload)
    // If server-side forwarding is enabled via ERROR_LOGS_TOKEN, POST the log
    try {
      const token = (window as any).ERROR_LOGS_TOKEN || (window as any).env && (window as any).env.ERROR_LOGS_TOKEN
      if (token) fetch('/__client-log', { method: 'POST', headers: { 'content-type': 'application/json', 'x-error-logs-token': token }, body: JSON.stringify(payload) }).catch(()=>{})
    } catch (e) {}
  })

  const origConsoleError = console.error.bind(console)
  console.error = (...args: any[]) => {
    try {
      const payload = { consoleError: args }
      sendToStorage(payload)
      const token = (window as any).ERROR_LOGS_TOKEN || (window as any).env && (window as any).env.ERROR_LOGS_TOKEN
      if (token) fetch('/__client-log', { method: 'POST', headers: { 'content-type': 'application/json', 'x-error-logs-token': token }, body: JSON.stringify(payload) }).catch(()=>{})
    } catch (e) { /* ignore */ }
    origConsoleError(...args)
  }
}
