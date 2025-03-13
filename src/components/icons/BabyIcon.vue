<template>
  <svg-icon type="mdi" :path="path" :size="size" :fill="fill" :color="color"></svg-icon>
</template>

<script setup>
import SvgIcon from '@jamescoyle/vue-icon'
import { mdiBabyFaceOutline } from '@mdi/js'

defineProps({
  size: {
    type: [Number, String],
    default: 32
  },
  fill: {
    type: Boolean,
    default: true
  },
  color: {
    type: String,
    default: "#FFD600"
  }
})

const path = mdiBabyFaceOutline
</script> 