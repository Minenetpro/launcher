import { contextBridge, ipcRenderer } from 'electron'
import EventEmitter from 'events'

function createNotificationBridge() {
  const emitter = new EventEmitter()

  ipcRenderer.on('notification', (_, notification) => {
    emitter.emit('notification', notification)
  })

  return {
    on(listener: (notification: any) => void) {
      emitter.on('notification', listener)
    },
    off(listener: (notification: any) => void) {
      emitter.off('notification', listener)
    },
  }
}

contextBridge.exposeInMainWorld('notificationBridge', createNotificationBridge())


