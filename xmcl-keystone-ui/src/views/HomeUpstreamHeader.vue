<template>
  <v-card
    class="flex flex-col items-center justify-center gap-4 p-6"
    :style="{ borderColor: '', 'backdrop-filter': `blur(10px)` }"
  >
    <v-img
      v-if="!dense"
      :height="150"
      :width="150"
      max-width="150"
      :src="value.icon"
      class="rounded-lg"
    />
    <a class="text-xl font-bold" target="browser" :href="value.url">
      {{ value.title }}
    </a>
    <span class="text-center description text-sm">{{ value.description }}</span>
    <span
      class="flex justify-center gap-2"
      :class="{
        'flex-wrap': !dense,
      }"
    >
      <CategoryChip
        v-for="v of value.categories"
        :key="v.id"
        :item="v"
        :small="dense"
        outlined
      />
    </span>
    <span>
      <v-btn text color="primary" @click="push(value.store)">
        <v-icon left class="material-icons-outlined"> open_in_new </v-icon>
        {{ t("store.name") }}
      </v-btn>
    </span>
  </v-card>
</template>
<script lang="ts" setup>
import CategoryChip, { CategoryChipProps } from "@/components/CategoryChip.vue";
import InfoHighlight, { Highlight } from "@/components/InfoHighlight.vue";
import { kTheme } from "@/composables/theme";
import { injection } from "@/util/inject";

export interface UpstreamHeaderProps {
  url: string;
  icon: string;
  title: string;
  description: string;
  infos: Highlight[];
  categories: CategoryChipProps[];
  type: "curseforge" | "modrinth" | "ftb";
  store: string;
}

const { push } = useRouter();
const { t } = useI18n();
defineProps<{
  value: UpstreamHeaderProps;
  dense?: boolean;
}>();

const { cardColor, blurCard } = injection(kTheme);
</script>
<style scoped>
.infos {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}
.infos.dense {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}
/* when width > 1024px */
@media (min-width: 1024px) {
  .infos {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
  .infos.dense {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

.description {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
}

.v-card {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
}
</style>
