import { LauncherApp, LauncherAppPlugin } from './'

const SERVICE = 'minenet'
const ACCOUNT = 'clerk'

function decodeJwtPayload(token: string): any | undefined {
  try {
    const parts = token.split('.')
    if (parts.length < 2) return undefined
    const payload = parts[1]
    const json = Buffer.from(payload, 'base64url').toString('utf-8')
    return JSON.parse(json)
  } catch {
    return undefined
  }
}

async function getStatus(app: LauncherApp) {
  const token = await app.secretStorage.get(SERVICE, ACCOUNT)
  if (!token) {
    return { authenticated: false }
  }
  const payload = decodeJwtPayload(token) || {}
  const exp = typeof payload.exp === 'number' ? payload.exp : undefined
  const expISO = exp ? new Date(exp * 1000).toISOString() : undefined
  return {
    authenticated: true,
    exp,
    expISO,
    sub: payload.sub,
    email: payload.email,
    iss: payload.iss,
    token,
  }
}

export const pluginMinenetAuth: LauncherAppPlugin = (app) => {
  const logger = app.getLogger('MinenetAuth')

  // Handle incoming browser callbacks to localhost server (xmcl protocol)
  app.protocol.registerHandler('xmcl', async ({ request, response }) => {
    if (request.url.pathname === '/minenet') {
      const jwt = request.url.searchParams.get('jwt')
      if (jwt) {
        try {
          await app.secretStorage.put(SERVICE, ACCOUNT, jwt)
          logger.log('Stored Minenet Clerk JWT.')
          response.status = 200
          response.headers['content-type'] = 'text/html; charset=utf-8'
          response.body = Buffer.from(
            '<!doctype html><html><body><h3>Authentication saved.</h3><p>You can return to the app.</p></body></html>',
            'utf-8',
          )
        } catch (e) {
          logger.error(e as any)
          response.status = 500
          response.body = 'Failed to store token'
        }
        return
      }
      response.status = 400
      response.body = 'Missing jwt'
      return
    }

    if (request.url.pathname === '/minenet/status') {
      const status = await getStatus(app)
      response.status = 200
      response.headers['content-type'] = 'application/json; charset=utf-8'
      response.body = JSON.stringify(status)
      return
    }

    if (request.url.pathname === '/minenet/logout') {
      await app.secretStorage.put(SERVICE, ACCOUNT, '')
      response.status = 200
      response.headers['content-type'] = 'application/json; charset=utf-8'
      response.body = JSON.stringify({ ok: true })
      return
    }
  })

  // Expose renderer-friendly endpoints via http://launcher/*
  app.protocol.registerHandler('http', async ({ request, response }) => {
    if (request.url.host === 'launcher') {
      if (request.url.pathname === '/minenet/status') {
        const status = await getStatus(app)
        response.status = 200
        response.headers['content-type'] = 'application/json; charset=utf-8'
        response.body = JSON.stringify(status)
      } else if (request.url.pathname === '/minenet/logout') {
        await app.secretStorage.put(SERVICE, ACCOUNT, '')
        response.status = 200
        response.headers['content-type'] = 'application/json; charset=utf-8'
        response.body = JSON.stringify({ ok: true })
      } else if (request.url.pathname === '/minenet/servers') {
        const token = await app.secretStorage.get(SERVICE, ACCOUNT)
        const base = 'http://localhost:3001'
        const r = await app.fetch(`${base}/api/servers`, { headers: { authorization: `Bearer ${token}` } })
        response.status = r.status
        response.headers['content-type'] = r.headers.get('content-type') || 'application/json; charset=utf-8'
        response.body = await r.text()
      }
    }
  })

  // Decorate outgoing requests to minenet with Authorization header if available
  app.protocol.registerHandler('https', async ({ request }) => {
    if (request.url.host === 'www.minenet.pro' || request.url.host === 'minenet.pro') {
      const token = await app.secretStorage.get(SERVICE, ACCOUNT)
      if (token) request.headers['authorization'] = `Bearer ${token}`
    }
  })
  app.protocol.registerHandler('http', async ({ request }) => {
    if (request.url.host === 'localhost' && request.url.port === '3001') {
      const token = await app.secretStorage.get(SERVICE, ACCOUNT)
      if (token) request.headers['authorization'] = `Bearer ${token}`
    }
  })
}

