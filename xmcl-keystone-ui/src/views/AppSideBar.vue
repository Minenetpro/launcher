<template>
  <v-navigation-drawer
    :value="true"
    permanent
    :mini-variant="true"
    :color="sideBarColor"
    elevation="12"
    class="sidebar moveable z-10 rounded-full ml-6 shadow-xl py-1"
    :style="{ 'backdrop-filter': `blur(12px)` }"
  >
    <AppSideBarContentNext />

    <v-list nav dense class="ml-1 px-2" style=""> </v-list>
  </v-navigation-drawer>
</template>

<script lang="ts" setup>
import { kSettingsState } from "@/composables/setting";
import { injection } from "@/util/inject";
import AppSideBarContentNext from "./AppSideBarContentNext.vue";
import { vSharedTooltip } from "@/directives/sharedTooltip";
import { kTheme } from "@/composables/theme";

const { blurSidebar } = injection(kTheme);
const { state } = injection(kSettingsState);

const { t } = useI18n();
const { sideBarColor } = injection(kTheme);
const { back } = useRouter();

function goBack() {
  back();
}

//
</script>

<style scoped>
.sidebar {
  min-width: 80px;
  max-height: calc(100% - 2rem);
  display: flex;
  flex-direction: column;
  /* border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.35), 0 2px 10px rgba(0, 0, 0, 0.25); */
}
</style>
<style>
.dark .sidebar .theme--dark.v-icon {
  color: var(--icon-color);
}

.dark .sidebar .v-list-item {
  --icon-color: #d8d8d8;
}

.dark .sidebar .v-list-item:hover {
  --icon-color: #fff;
}

.v-navigation-drawer__content {
  @apply flex flex-col flex-grow-0 h-full;
}

.sidebar .v-list-item {
  background-color: transparent;
  position: relative;
}

.sidebar .v-list-item--link:before {
  background-color: transparent;
}

/* Active state indicator: small dot + icon accent */
.sidebar .v-list-item--active::after {
  content: "";
  position: absolute;
  width: 55px;
  height: 55px;
  border-radius: 15px;
  background-color: #ffffff;
  opacity: 0.15;
}

.sidebar .v-list-item--active .v-icon {
  color: var(--color-primary);
}

.sidebar .theme--dark.v-list-item--active:hover:before {
  opacity: 0.5;
}

.sidebar .theme--light.v-list-item--active:before {
  opacity: 0.25;
  background-color: gray;
}

.avatar
  .v-list-group__header.v-list-item--active:not(:hover):not(:focus):before {
  opacity: 0.24;
}
</style>
