import { onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router/composables'

declare const navigationBridge: {
  on(listener: (navigation: { path: string; query?: Record<string, string> }) => void): void
  off(listener: (navigation: { path: string; query?: Record<string, string> }) => void): void
}

export function useNavigationBridge() {
  const { push } = useRouter()

  function handleNavigation(navigation: { path: string; query?: Record<string, string> }) {
    // Navigate to the specified path with query parameters
    push({
      path: navigation.path,
      query: navigation.query || {},
    })
  }

  onMounted(() => {
    if (typeof navigationBridge !== 'undefined') {
      navigationBridge.on(handleNavigation)
    }
  })

  onUnmounted(() => {
    if (typeof navigationBridge !== 'undefined') {
      navigationBridge.off(handleNavigation)
    }
  })
}

