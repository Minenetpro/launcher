<template>
  <div class="flex flex-col items-center justify-center h-full">
    <div class="text-4xl tracking-tight">Welcome to Minenet.pro</div>
    <div class="text-xl text-gray-300 tracking-tight">Minecraft launcher, reimagined.</div>
  </div>
</template>
<script lang=ts setup>

defineProps<{ value: string }>()

const emit = defineEmits(['input'])

</script>
