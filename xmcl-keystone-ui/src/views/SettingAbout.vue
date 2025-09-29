<template>
  <section class="mb-5 mt-2 about mx-6">

          <v-card flat class="mb-6 card" :style="{ 'backdrop-filter': `blur(12px)` }">
            <div>
              <v-card-title class="w-full flex mr-2 title">
                <v-img src="http://launcher/icons/logoDark" alt="XMCL Logo" max-width="64" class="mr-4"></v-img>
                <div>
                 Minenet.pro desktop application
                  <div class="pt-1 font-normal text-sm">
                    A fork of <a href="https://www.xmcl.app">X Minecraft Launcher</a>
                  </div>
                </div>
                <v-spacer />
                <div>
                  <div class="flex items-center justify-center flex-grow-0 gap-2">
                    <v-icon color="primary">verified</v-icon>
                    <div class="text-caption">AGPL-3.0 LICENSE</div>
                  </div>
                </div>
              </v-card-title>

              <!-- display env.env, gfw.gfw -->
              <v-textarea filled readonly class="px-4" :value="debugInfo" />
            </div>


            <v-card-text class="contributors">
              Minenet.pro desktop application v{{ version }} is <a href="https://github.com/minenetpro/launcher" target="_blank">open source</a>.
            </v-card-text>
          </v-card>

  </section>
</template>

<script lang="ts" setup>
import { kEnvironment } from '@/composables/environment'
import { injection } from '@/util/inject'
import kofi from '../assets/kofi.webp'
import { kFlights } from '@/composables/flights'

const env = injection(kEnvironment)
const flights = injection(kFlights)

const debugInfo = computed(() => {
  return JSON.stringify({ ...env.value, flights }, null, 2)
})

const { t } = useI18n()
const version = computed(() => env.value?.version ?? '')
</script>
<style scoped>

@media (min-width: 1660px) {
  .about {
    grid-column: span 2 / span 2;
  }

  .card {
    gap: 2rem;
    @apply grid grid-cols-2;
  }

  .sponsors {
    @apply col-span-2;
  }
}

.v-expansion-panel {
  background-color: transparent !important;
  border-radius: 16px !important;
}
.v-card {
  background-color: transparent !important;
  border-radius: 16px !important;
}
</style>