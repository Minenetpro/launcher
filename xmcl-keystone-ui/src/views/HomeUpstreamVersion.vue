<template>
  <v-card
    class="grid-cols-10 grid items-center gap-y-4 p-3"
    :outlined="outlined"
    :style="{
      'content-visibility': 'auto',
      'backdrop-filter': `blur(${blurCard}px)`,
      borderColor: '',
    }"
  >
    <div class="col-span-6 flex items-center flex-wrap gap-2">
      <template v-for="l of version.loaders">
        <div class="ml-2 font-medium truncate">{{ version.name }}</div>
        <v-chip small label outlined :key="`loader-${l}`">
          <v-icon left v-if="getLoader(l)" v-shared-tooltip="l">{{
            getLoader(l)
          }}</v-icon>
          <span v-else>{{ l }}</span>
        </v-chip>
      </template>
      <v-chip small label outlined>
        {{ t("downloadCount", { count: version.downloads }) }}
      </v-chip>
      <v-chip small label outlined>
        {{ version.gameVersions.join(", ") }}
      </v-chip>
      <v-chip small label outlined>
        {{
          getDateString(version.datePublished, {
            timeStyle: "short",
            dateStyle: "long",
          })
        }}
      </v-chip>
    </div>
    <div class="col-span-4 justify-self-end">
      <v-btn
        v-if="!noAction"
        small
        :loading="updating"
        @click="$emit('update', version)"
        class="rounded-full"
      >
        {{ downgrade ? t("upstream.downgrade") : t("upstream.update") }}
        <v-icon right>
          {{ downgrade ? "keyboard_double_arrow_down" : "upgrade" }}
        </v-icon>
      </v-btn>
      <v-btn
        v-else
        small
        :loading="updating"
        @click="$emit('update', version)"
        class="rounded-full"
      >
        {{ t("instances.fix") }}
        <v-icon right> build </v-icon>
      </v-btn>
    </div>

    <div
      v-if="version.changelog"
      :key="`${version.id}-changelog`"
      class="col-span-13 select-text text-sm"
    >
      <div
        :style="{
          borderColor: getColorCode(
            getColorForReleaseType(version.versionType)
          ),
        }"
        class="border-l-[3px] pl-3"
      >
        <div
          class="markdown-body hover:(bg-[rgba(0,0,0,0.05)]) dark:hover:(bg-[rgba(0,0,0,0.3)]) max-h-140 overflow-auto rounded-lg bg-[rgba(0,0,0,0.07)] py-2 pl-2 text-gray-500 transition-colors hover:text-black dark:bg-[rgba(0,0,0,0.4)] dark:hover:text-gray-300"
          v-html="version.changelog"
        />
      </div>
    </div>
  </v-card>
</template>
<script lang="ts" setup>
import { useDateString } from "@/composables/date";
import { kTheme } from "@/composables/theme";
import { useVuetifyColor } from "@/composables/vuetify";
import { vSharedTooltip } from "@/directives/sharedTooltip";
import { getColorForReleaseType } from "@/util/color";
import { injection } from "@/util/inject";

export interface ProjectVersionProps {
  id: string;
  name: string;
  versionType: "release" | "beta" | "alpha";
  versionNumber: string;
  loaders: string[];
  gameVersions: string[];
  downloads: number;
  datePublished: string;
  changelog: string;
}

const props = defineProps<{
  version: ProjectVersionProps;
  downgrade?: boolean;
  color?: string;
  noAction?: boolean;
  outlined?: boolean;
  duplicating?: boolean;
  updating?: boolean;
}>();

const emit = defineEmits(["update", "duplicate", "changelog"]);
const { cardColor, blurCard } = injection(kTheme);
const version = computed(() => props.version);
const { getColorCode } = useVuetifyColor();
const { t } = useI18n();
const getLoader = (loader: string) => {
  loader = loader.toLowerCase();
  if (loader === "forge") return "$vuetify.icons.forge";
  if (loader === "fabric") return "$vuetify.icons.fabric";
  return "";
};
const { getDateString } = useDateString();

watch(
  () => props.version,
  () => {
    emit("changelog");
  },
  { immediate: true }
);
</script>

<style scoped>
.v-card {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}
</style>
