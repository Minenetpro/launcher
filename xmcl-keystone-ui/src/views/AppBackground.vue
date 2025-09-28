<template>
  <div class="absolute z-0 h-full w-full">
    <video
      ref="videoRef"
      class="absolute z-0 h-full w-full object-cover"
      :style="{ filter: `blur(2px)`, 'object-fit': 'cover' }"
      autoplay
      loop
      muted
      playsinline
      preload="auto"
    />
    <template v-if="backgroundImageOverride">
      <transition name="fade-transition">
        <img
          :key="backgroundImageOverride"
          :src="backgroundImageOverride"
          class="z-1 absolute h-full w-full"
        />
      </transition>
      <div class="img-container" />
    </template>

    <transition name="fade-transition">
      <div
        v-if="backgroundColorOverlay && !isHome"
        class="z-3 absolute h-full w-full"
        :style="{ background: backgroundColor }"
      />
    </transition>
  </div>
</template>
<script lang="ts" setup>
import Hls from "hls.js";
import { injection } from "@/util/inject";
import { kTheme } from "@/composables/theme";
import { kInstanceLaunch } from "@/composables/instanceLaunch";

/* const HLS_URL =
  "https://stream.mux.com/N2Lcv1sByrqy8yJcU00ngo02vbRCa5PxtHM5jh9ofTt6w.m3u8"; */

const HLS_URL =
  "https://stream.mux.com/iFU5SIzlbKW01vtXLkJljRRek7yKj34g00NtLbaCXLZQ8.m3u8";

const {
  sideBarColor,
  backgroundColorOverlay,
  backgroundColor,
  blur,
  backgroundImageOverride,
} = injection(kTheme);
const videoRef = ref(null as null | HTMLVideoElement);

const route = useRoute();
const isHome = computed(() => route.path === "/");

let hls: Hls | undefined;

const { gameProcesses } = injection(kInstanceLaunch);

watch(
  computed(() => gameProcesses.value.length),
  (cur, last) => {
    if (cur > 0 && last === 0) {
      videoRef.value?.pause();
    } else if (cur === 0 && last > 0) {
      videoRef.value?.play();
    }
  }
);

onMounted(() => {
  const video = videoRef.value;
  if (!video) return;

  if (Hls.isSupported()) {
    hls = new Hls({ enableWorker: true });
    hls.loadSource(HLS_URL);
    hls.attachMedia(video);
    hls.on(Hls.Events.MEDIA_ATTACHED, () => {
      video.play().catch(() => {});
    });
  } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = HLS_URL;
    video.play().catch(() => {});
  }
});

onBeforeUnmount(() => {
  if (hls) {
    hls.destroy();
    hls = undefined;
  }
});
</script>
<style scoped>
.img-container {
  background: radial-gradient(
    ellipse at top right,
    transparent,
    v-bind(sideBarColor) 72%
  );
  position: absolute;
  min-width: 100%;
  min-height: 100%;
  z-index: 4;
}
</style>
