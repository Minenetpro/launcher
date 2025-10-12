import { LauncherApp, LauncherAppPlugin } from './'
import { ModpackService } from '../modpack/ModpackService'
import { InstanceService } from '../instance/InstanceService'
import { LaunchService } from '../launch/LaunchService'
import { UserService } from '../user/UserService'
import { JavaService } from '../java/JavaService'
import { VersionService } from '../version/VersionService'
import { kSettings } from '../settings'
import { MarketType, findMatchedVersion, getAutoOrManuallJava, getAutoSelectedJava } from '@xmcl/runtime-api'

/**
 * Plugin to handle CurseForge modpack installation and launch via localhost server
 * 
 * Behavior:
 * - If the modpack instance already exists: Launches the game immediately
 * - If the modpack instance doesn't exist: Opens the modpack page in the app for manual installation
 * 
 * Usage: http://localhost:25555/curseforge/install?projectId=123&fileId=456
 * Optional parameters:
 * - icon: Icon URL for the modpack
 * - server: Server address to auto-join after launch
 * - port: Server port (default: 25565)
 */
export const pluginCurseforgeInstaller: LauncherAppPlugin = (app) => {
  const logger = app.getLogger('CurseforgeInstaller')

  // Allowed CORS origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://www.minenet.pro',
    'http://www.minenet.pro',
  ]

  // Helper function to set CORS headers
  const setCorsHeaders = (response: any, origin?: string) => {
    if (origin && allowedOrigins.includes(origin)) {
      response.headers['Access-Control-Allow-Origin'] = origin
    } else if (!origin) {
      // If no origin header, allow any (for direct browser access)
      response.headers['Access-Control-Allow-Origin'] = '*'
    }
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
  }

  app.protocol.registerHandler('xmcl', async ({ request, response }) => {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      const origin = request.headers.origin as string
      setCorsHeaders(response, origin)
      response.status = 204
      return
    }

    if (request.url.pathname === '/curseforge/install') {
      const origin = request.headers.origin as string
      setCorsHeaders(response, origin)
      const projectId = request.url.searchParams.get('projectId')
      const fileId = request.url.searchParams.get('fileId')
      const icon = request.url.searchParams.get('icon')
      const server = request.url.searchParams.get('server')
      const port = request.url.searchParams.get('port')

      if (!projectId || !fileId) {
        setCorsHeaders(response, request.headers.origin as string)
        response.status = 400
        response.headers['content-type'] = 'application/json; charset=utf-8'
        response.body = JSON.stringify({
          error: 'Missing required parameters',
          message: 'Both projectId and fileId are required',
          usage: 'http://localhost:25555/curseforge/install?projectId=123&fileId=456&icon=https://example.com/icon.png'
        })
        return
      }

      const projectIdNum = parseInt(projectId, 10)
      const fileIdNum = parseInt(fileId, 10)
      const portNum = port ? parseInt(port, 10) : undefined

      if (isNaN(projectIdNum) || isNaN(fileIdNum)) {
        setCorsHeaders(response, request.headers.origin as string)
        response.status = 400
        response.headers['content-type'] = 'application/json; charset=utf-8'
        response.body = JSON.stringify({
          error: 'Invalid parameters',
          message: 'projectId and fileId must be valid integers'
        })
        return
      }

      if (port && isNaN(portNum!)) {
        setCorsHeaders(response, request.headers.origin as string)
        response.status = 400
        response.headers['content-type'] = 'application/json; charset=utf-8'
        response.body = JSON.stringify({
          error: 'Invalid parameters',
          message: 'port must be a valid integer'
        })
        return
      }

      logger.log(`Starting CurseForge modpack check: projectId=${projectIdNum}, fileId=${fileIdNum}`)
      if (server) {
        logger.log(`  Server: ${server}${portNum ? ':' + portNum : ''}`)
      }

      // Return immediate acknowledgment
      setCorsHeaders(response, origin)
      response.status = 202 // 202 Accepted - request accepted for processing
      response.headers['content-type'] = 'application/json; charset=utf-8'
      response.body = JSON.stringify({
        success: true,
        message: 'Request received and processing',
        projectId: projectIdNum,
        fileId: fileIdNum,
        status: 'processing',
        note: 'The launcher will check if the modpack is installed and either launch it or open the installation page.'
      })

      // Start the check/installation process asynchronously (don't await)
      // This prevents the HTTP request from timing out during long downloads
      ;(async () => {
        try {
          logger.log(`Checking for existing instance...`)
          const instanceService = await app.registry.get(InstanceService)
          
          // Check if an instance with this modpack already exists
          const existingInstance = Object.values(instanceService.state.all).find(inst => {
            if (inst.upstream?.type === 'curseforge-modpack') {
              return inst.upstream.modId === projectIdNum && inst.upstream.fileId === fileIdNum
            }
            return false
          })

          if (existingInstance) {
            logger.log(`Found existing instance: ${existingInstance.path}`)
            
            // Broadcast notification that we're launching
            app.controller.broadcast('notification', {
              level: 'info',
              title: 'Launching Existing Modpack',
              body: `Instance "${existingInstance.name}" is already installed, launching game...`,
            })

            try {
              // Get required services
              const userService = await app.registry.get(UserService)
              const javaService = await app.registry.get(JavaService)
              const versionService = await app.registry.get(VersionService)
              const launchService = await app.registry.get(LaunchService)
              
              // Get user
              const userState = await userService.getUserState()
              const user = Object.values(userState.users)[0]
              if (!user) {
                throw new Error('No user account found. Please add a user account in the launcher.')
              }
              
              // Get version
              await versionService.initialize()
              const local = versionService.state.local
              const versionHeader = findMatchedVersion(local,
                existingInstance.version,
                existingInstance.runtime.minecraft,
                existingInstance.runtime.forge,
                existingInstance.runtime.neoForged,
                existingInstance.runtime.fabricLoader,
                existingInstance.runtime.optifine,
                existingInstance.runtime.quiltLoader,
                existingInstance.runtime.labyMod)
                
              if (!versionHeader) {
                throw new Error('Version not found for this instance')
              }
              
              const resolvedVersion = await versionService.resolveLocalVersion(versionHeader.id)
              
              // Get Java
              const detected = getAutoSelectedJava(
                javaService.state.all,
                existingInstance.runtime.minecraft,
                existingInstance.runtime.forge,
                resolvedVersion,
              )
              const javaResult = await getAutoOrManuallJava(detected, (path: string) => javaService.resolveJava(path), existingInstance.java)
              const java = javaResult.java || javaResult.auto.java
              
              if (!java) {
                throw new Error('No suitable Java installation found')
              }
              
              // Get global settings
              const settings = await app.registry.get(kSettings)
              
              // Launch the game
              await launchService.launch({
                user,
                gameDirectory: existingInstance.path,
                version: versionHeader.id,
                java: java.path,
                hideLauncher: settings.globalHideLauncher,
                showLog: settings.globalShowLog,
                minMemory: settings.globalAssignMemory ? settings.globalMinMemory : existingInstance.minMemory,
                maxMemory: settings.globalAssignMemory ? settings.globalMaxMemory : existingInstance.maxMemory,
                vmOptions: settings.globalVmOptions,
                mcOptions: settings.globalMcOptions,
                env: settings.globalEnv,
                prependCommand: settings.globalPrependCommand,
                disableElyByAuthlib: settings.globalDisableElyByAuthlib,
                server: server ? { host: server, port: portNum } : undefined,
              })
              
              logger.log(`✓ Game launched successfully!`)
              
              // Broadcast success notification
              app.controller.broadcast('notification', {
                level: 'success',
                title: 'Game Launched',
                body: server 
                  ? `Launched "${existingInstance.name}" and connecting to ${server}${portNum ? ':' + portNum : ''}!`
                  : `Launched "${existingInstance.name}" successfully!`,
              })
            } catch (e) {
              const error = e instanceof Error ? e : new Error(String(e))
              logger.error(error, 'CurseforgeInstaller')
              
              // Broadcast error notification
              app.controller.broadcast('notification', {
                level: 'error',
                title: 'Launch Failed',
                body: error.message,
              })
            }

            return
          }

          // No existing instance found, open the modpack page in the app
          logger.log(`No existing instance found, opening modpack page in app...`)
          
          // Broadcast navigation request to open the modpack page with auto-install
          app.controller.broadcast('navigate', {
            path: `/store/curseforge/${projectIdNum}`,
            query: {
              autoInstall: 'true',
              fileId: fileIdNum.toString(),
              ...(server ? { server, port: portNum?.toString() } : {})
            }
          })
          
          // Also show a notification
          app.controller.broadcast('notification', {
            level: 'info',
            title: 'Opening Modpack Page',
            body: server
              ? `Opening modpack page. After installation, the game will connect to ${server}${portNum ? ':' + portNum : ''}.`
              : `Opening CurseForge modpack page (Project: ${projectIdNum})`,
          })
          
          // Bring the launcher window to focus
          app.controller.requireFocus()
        } catch (e) {
          const error = e instanceof Error ? e : new Error(String(e))
          logger.error(error, 'CurseforgeInstaller')
          
          // Broadcast error notification to UI
          app.controller.broadcast('notification', {
            level: 'error',
            title: 'Failed to Process Request',
            body: error.message,
          })
        }
      })().catch((e) => {
        // Safety net for any unhandled errors
        const error = e instanceof Error ? e : new Error(String(e))
        logger.error(error, 'CurseforgeInstaller')
      })
    }

    // Add a status/info endpoint
    if (request.url.pathname === '/curseforge/info') {
      const origin = request.headers.origin as string
      setCorsHeaders(response, origin)
      response.status = 200
      response.headers['content-type'] = 'application/json; charset=utf-8'
      response.body = JSON.stringify({
        service: 'CurseForge Modpack Installer',
        endpoints: {
          install: {
            path: '/curseforge/install',
            method: 'GET',
            parameters: {
              projectId: 'required - CurseForge project/mod ID (integer)',
              fileId: 'required - CurseForge file ID (integer)',
              icon: 'optional - Icon URL for the modpack',
              server: 'optional - Server address to auto-join',
              port: 'optional - Server port (default: 25565)'
            },
            example: 'http://localhost:25555/curseforge/install?projectId=123&fileId=456&server=play.example.com&port=25565',
            note: 'If the modpack is already installed, it will launch immediately. Otherwise, it will open the modpack page in the app.'
          },
          info: {
            path: '/curseforge/info',
            method: 'GET',
            description: 'Get information about this service'
          }
        },
        version: '1.0.0'
      })
      return
    }
  })

  logger.log('CurseForge modpack installer plugin loaded')
}

