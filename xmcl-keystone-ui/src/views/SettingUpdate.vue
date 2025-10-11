<template>
  <div>
    <SettingHeader v-if="!disableUpdate">
      {{ t("setting.update") }}
    </SettingHeader>
    <v-list-item v-if="!disableUpdate">
      <v-list-item-action class="self-center">
        <v-btn
          v-shared-tooltip="_ => t('setting.checkUpdate')"
          icon
          :loading="checkingUpdate"
          @click="checkUpdate"
        >
          <v-icon>refresh</v-icon>
        </v-btn>
      </v-list-item-action>
      <v-list-item-content>
        <v-list-item-title>
          {{
            t("setting.latestVersion")
          }}
        </v-list-item-title>
        <v-list-item-subtitle>
          v{{ version }}
          {{
            hasNewUpdate && updateInfo ? `-> ${updateInfo.name}` : ""
          }}
        </v-list-item-subtitle>
      </v-list-item-content>
      <v-list-item-action class="self-center">
        <v-btn
          :loading="checkingUpdate || installing"
          :disabled="updateStatus === 'none'"
          :color="updateStatus !== 'none' ? 'primary' : ''"
          :text="updateStatus === 'none'"
          @click="showUpdateInfo()"
        >
          {{
            updateStatus === "none"
              ? t("launcherUpdate.alreadyLatest")
              : updateStatus === "pending"
                ? t("launcherUpdate.updateToThisVersion")
                : t("launcherUpdate.installAndQuit")
          }}
        </v-btn>
      </v-list-item-action>
    </v-list-item>
  </div>
</template>
<script lang="ts" setup>
import SettingHeader from '@/components/SettingHeader.vue'
import { vSharedTooltip } from '@/directives/sharedTooltip'
import { injection } from '@/util/inject'
import { useDialog } from '../composables/dialog'
import { kUpdateSettings } from '../composables/setting'

const { show: showUpdateInfo } = useDialog('update-info')
const disableUpdate = false // state.env !== 'raw'
const { updateInfo, installing, updateStatus, checkUpdate, checkingUpdate, version } = injection(kUpdateSettings)
const hasNewUpdate = computed(() => updateInfo.value?.name !== version.value)
const { t } = useI18n()

</script>
