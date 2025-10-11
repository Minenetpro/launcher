import { HAS_DEV_SERVER } from '@/constant'
import { ElectronUpdateOperation, ReleaseInfo } from '@xmcl/runtime-api'
import { LauncherAppUpdater } from '@xmcl/runtime/app'
import { AbortableTask, BaseTask, Task, task } from '@xmcl/task'
import { spawn } from 'child_process'
import { shell } from 'electron'
import { createWriteStream } from 'fs'
import { writeFile } from 'fs-extra'
import { existsSync } from 'original-fs'
import { basename, dirname, join } from 'path'
import { PassThrough, Readable } from 'stream'
import { pipeline } from 'stream/promises'
import { Logger } from '~/infra'
import { AnyError } from '@xmcl/utils'
import { checksum } from '~/util/fs'
import ElectronLauncherApp from '../ElectronLauncherApp'
import { ensureElevateExe } from './elevate'

/**
 * Download the update zip file from GitHub releases
 */
export class DownloadUpdateTask extends AbortableTask<void> {
  private abortController = new AbortController()
  private version: string
  private fileName: string

  constructor(private app: ElectronLauncherApp, private destination: string, version: string) {
    super()
    this.version = version.startsWith('v') ? version.substring(1) : version
    this.fileName = `minenet-${this.version}-win.zip`
  }

  protected async process(): Promise<void> {
    const url = `https://github.com/Minenetpro/launcher/releases/download/v${this.version}/${this.fileName}`
    
    try {
      this.abortController = new AbortController()
      
      // Download the update file
      const response = await this.app.fetch(url, { signal: this.abortController.signal })
      
      if (!response.ok) {
        throw new AnyError('DownloadError', `Failed to download update from ${url}`, {}, { status: response.status })
      }

      this._total = parseInt(response.headers.get('Content-Length') || '0', 10)
      this._progress = 0

      const tracker = new PassThrough({
        transform: (chunk, encoding, callback) => {
          this._progress += chunk.length
          this.update(chunk.length)
          callback(undefined, chunk)
        },
      })

      await pipeline(Readable.fromWeb(response.body as any), tracker, createWriteStream(this.destination))
    } catch (e) {
      if (this.isAbortedError(e)) {
        return
      }
      throw new AnyError('UpdateDownloadError', `Failed to download update: ${e}`, { cause: e }, { url })
    }
  }

  protected abort(isCancelled: boolean): void {
    this.abortController.abort(Object.assign(new Error(), { name: 'AbortError' }))
  }

  protected isAbortedError(e: any): boolean {
    return e instanceof Error && e.name === 'AbortError'
  }
}

export class HintUserDownloadTask extends BaseTask<void> {
  protected async runTask(): Promise<void> {
    shell.openExternal('https://github.com/Minenetpro/launcher/releases')
  }

  protected async cancelTask(): Promise<void> {
  }

  protected async pauseTask(): Promise<void> {
  }

  protected async resumeTask(): Promise<void> {
  }
}

async function getUpdateBatArgs(updateZipPath: string, appDataPath: string, elevatePath?: string): Promise<string[]> {
  const batPath = join(appDataPath, 'AutoUpdate.bat')
  const extractPath = join(appDataPath, 'update_extracted')
  const appPath = dirname(process.execPath)
  
  await writeFile(batPath, [
    '@echo off',
    'chcp 65001',
    '%WinDir%\\System32\\timeout.exe 2',
    `taskkill /f /im "${basename(process.argv[0])}"`,
    `powershell -Command "Expand-Archive -Force -Path '${updateZipPath}' -DestinationPath '${extractPath}'"`,
    `xcopy /E /Y /I "${extractPath}\\*" "${appPath}\\"`,
    `start /b "" /d "${process.cwd()}" ${process.argv.map((s) => `"${s}"`).join(' ')}`,
  ].join('\r\n'))

  return elevatePath
    ? [
      elevatePath,
      batPath,
    ]
    : [
      'cmd.exe',
      '/c',
      batPath,
    ]
}

function isSameVersion(a: string, b: string) {
  if (a.startsWith('v')) {
    a = a.substring(1)
  }
  if (b.startsWith('v')) {
    b = b.substring(1)
  }
  return a === b
}

export class ElectronUpdater implements LauncherAppUpdater {
  private logger: Logger

  constructor(private app: ElectronLauncherApp) {
    this.logger = app.getLogger('ElectronUpdater')
  }

  async #getLatestVersion(): Promise<string> {
    this.logger.log('Fetching latest version from API')
    const response = await this.app.fetch('https://www.minenet.pro/api/launcher/version')
    
    if (!response.ok) {
      throw new AnyError('UpdateError', `Failed to fetch version info: ${await response.text()}`, {}, { status: response.status })
    }
    
    const data = await response.json() as { release: string }
    const version = data.release
    this.logger.log(`Latest version from API: ${version}`)
    return version
  }

  checkUpdateTask(): Task<ReleaseInfo> {
    return task('checkUpdate', async () => {
      const latestVersion = await this.#getLatestVersion()
      
      const updateInfo: ReleaseInfo = {
        name: `v${latestVersion}`,
        body: `New version ${latestVersion} is available`,
        date: new Date().toISOString(),
        files: [{
          name: `minenet-${latestVersion}-win.zip`,
          url: `https://github.com/Minenetpro/launcher/releases/download/v${latestVersion}/minenet-${latestVersion}-win.zip`,
        }],
        newUpdate: !isSameVersion(this.app.version, latestVersion),
        operation: this.app.platform.os === 'windows' 
          ? ElectronUpdateOperation.AutoUpdater 
          : ElectronUpdateOperation.Manual,
      }

      this.logger.log(`Current version: ${this.app.version}, Latest: ${latestVersion}, Has update: ${updateInfo.newUpdate}`)

      return updateInfo
    })
  }

  downloadUpdateTask(updateInfo: ReleaseInfo): Task<void> {
    if (this.app.platform.os === 'windows') {
      const updatePath = join(this.app.appDataPath, 'pending_update.zip')
      return new DownloadUpdateTask(this.app, updatePath, updateInfo.name)
    }
    return new HintUserDownloadTask()
  }

  async installUpdateAndQuit(updateInfo: ReleaseInfo): Promise<void> {
    if (HAS_DEV_SERVER) {
      this.logger.log('Currently is development environment. Skip to install update')
      return
    }

    if (this.app.platform.os === 'windows') {
      await this.quitAndInstallWindows()
    } else {
      // For non-Windows, just open the releases page
      shell.openExternal('https://github.com/Minenetpro/launcher/releases')
    }
  }

  private async quitAndInstallWindows() {
    const updateZipPath = join(this.app.appDataPath, 'pending_update.zip')

    this.logger.log(`Installing update from ${updateZipPath}`)

    if (!existsSync(updateZipPath)) {
      throw new Error(`No update found: ${updateZipPath}`)
    }

    const elevatePath = await ensureElevateExe(this.app.appDataPath)

    const args = await getUpdateBatArgs(updateZipPath, this.app.appDataPath, elevatePath)
    this.logger.log(`Install from windows: ${args.join(' ')}`)
    
    const child = spawn(args[0], args.slice(1), {
      cwd: this.app.appDataPath,
      detached: true,
      stdio: 'ignore',
    })
    child.unref()
    this.app.quit()
  }
}
