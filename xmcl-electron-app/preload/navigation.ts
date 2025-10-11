import { contextBridge, ipcRenderer } from 'electron'
import EventEmitter from 'events'

function createNavigationBridge() {
  const emitter = new EventEmitter()

  ipcRenderer.on('navigate', (_, navigation) => {
    emitter.emit('navigate', navigation)
  })

  return {
    on(listener: (navigation: any) => void) {
      emitter.on('navigate', listener)
    },
    off(listener: (navigation: any) => void) {
      emitter.off('navigate', listener)
    },
  }
}

contextBridge.exposeInMainWorld('navigationBridge', createNavigationBridge())

