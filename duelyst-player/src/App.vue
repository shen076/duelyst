<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'

type ResourceType = 'units' | 'fx' | 'icons' | 'particles'

type FrameRect = {
  x: number
  y: number
  width: number
  height: number
}

type SpriteFrame = {
  key: string
  action: string
  index: number
  frame: FrameRect
  rotated: boolean
  sourceSize: {
    width: number
    height: number
  }
  offset: {
    x: number
    y: number
  }
}

type SpriteSheet = {
  name: string
  textureFileName: string
  frames: SpriteFrame[]
}

type PlistEntry = {
  name: string
  path: string
  loader: () => Promise<string>
}

type ImageEntry = {
  name: string
  path: string
  loader: () => Promise<string>
}

const resourceTypes: ResourceType[] = ['units', 'fx', 'icons', 'particles']
const noPrefixAction = 'noPrefix'

const plistModules = import.meta.glob('../../app/resources/{units,fx,icons,particles}/*.plist', {
  query: '?raw',
  import: 'default',
})

const imageModules = import.meta.glob(
  '../../app/resources/{units,fx,icons,particles}/*.{png,img}',
  {
    query: '?url',
    import: 'default',
  },
)

const selectedType = ref<ResourceType | ''>('')
const selectedPlist = ref('')
const selectedAction = ref('')
const shouldLoop = ref(true)
const secondsPerFrame = ref(0.08)
const isPlaying = ref(false)
const frameCursor = ref(0)
const currentSheet = ref<SpriteSheet | null>(null)
const spriteImage = ref<HTMLImageElement | null>(null)
const statusMessage = ref('选择资源类型和 plist 后开始播放。')
const canvasRef = ref<HTMLCanvasElement | null>(null)
const timerId = ref<number | null>(null)

const plistByType = computed<Record<ResourceType, PlistEntry[]>>(() => {
  return buildResourceMap(plistModules) as Record<ResourceType, PlistEntry[]>
})

const imageByType = computed<Record<ResourceType, ImageEntry[]>>(() => {
  return buildResourceMap(imageModules) as Record<ResourceType, ImageEntry[]>
})

const plistOptions = computed(() => {
  if (!selectedType.value) return []
  return plistByType.value[selectedType.value]
})

const selectedPlistEntry = computed(() => {
  if (!selectedType.value || !selectedPlist.value) return undefined
  return plistByType.value[selectedType.value].find((entry) => entry.name === selectedPlist.value)
})

const actionOptions = computed(() => {
  if (!currentSheet.value) return []
  return [...new Set(currentSheet.value.frames.map((frame) => frame.action))].sort((a, b) => {
    if (a === noPrefixAction) return -1
    if (b === noPrefixAction) return 1
    return a.localeCompare(b)
  })
})

const selectedFrames = computed(() => {
  if (!currentSheet.value || !selectedAction.value) return []
  return currentSheet.value.frames
    .filter((frame) => frame.action === selectedAction.value)
    .sort((a, b) => a.index - b.index || a.key.localeCompare(b.key))
})

const activeFrame = computed(() => selectedFrames.value[frameCursor.value])

watch(selectedType, () => {
  stopPlayback()
  selectedPlist.value = ''
  selectedAction.value = ''
  currentSheet.value = null
  spriteImage.value = null
  frameCursor.value = 0
  clearCanvas()
})

watch(selectedPlist, async () => {
  stopPlayback()
  selectedAction.value = ''
  currentSheet.value = null
  spriteImage.value = null
  frameCursor.value = 0
  clearCanvas()

  if (!selectedType.value || !selectedPlistEntry.value) return

  try {
    statusMessage.value = '正在读取 plist 和贴图...'
    const plistText = await selectedPlistEntry.value.loader()
    const sheet = parsePlist(plistText, selectedPlist.value)
    const imageEntry = imageByType.value[selectedType.value].find(
      (entry) => entry.name === removeExtension(sheet.textureFileName),
    )

    if (!imageEntry) {
      throw new Error(`找不到贴图：${sheet.textureFileName}`)
    }

    currentSheet.value = sheet
    spriteImage.value = await loadImage(await imageEntry.loader())
    selectedAction.value = actionOptions.value[0] ?? ''
    statusMessage.value = `已加载 ${sheet.frames.length} 帧。`
    await nextTick()
    drawCurrentFrame()
  } catch (error) {
    statusMessage.value = error instanceof Error ? error.message : '资源加载失败。'
  }
})

watch(selectedAction, () => {
  stopPlayback()
  frameCursor.value = 0
  drawCurrentFrame()
})

watch(secondsPerFrame, () => {
  if (isPlaying.value) {
    stopPlayback()
    startPlayback()
  }
})

onMounted(() => {
  const firstType = resourceTypes.find((type) => plistByType.value[type].length > 0)
  if (firstType) selectedType.value = firstType
})

function buildResourceMap(
  modules: Record<string, () => Promise<unknown>>,
): Record<ResourceType, Array<PlistEntry | ImageEntry>> {
  const map: Record<ResourceType, Array<PlistEntry | ImageEntry>> = {
    units: [],
    fx: [],
    icons: [],
    particles: [],
  }

  for (const [path, loader] of Object.entries(modules)) {
    const type = resourceTypes.find((item) => path.includes(`/app/resources/${item}/`))
    if (!type) continue

    const fileName = path.split('/').pop() ?? ''
    map[type].push({
      name: removeExtension(fileName),
      path,
      loader: loader as () => Promise<string>,
    })
  }

  for (const entries of Object.values(map)) {
    entries.sort((a, b) => a.name.localeCompare(b.name))
  }

  return map
}

function parsePlist(plistText: string, plistName: string): SpriteSheet {
  const document = new DOMParser().parseFromString(plistText, 'application/xml')
  const parserError = document.querySelector('parsererror')
  if (parserError) throw new Error(`plist 解析失败：${plistName}`)

  const rootDict = document.querySelector('plist > dict')
  if (!rootDict) throw new Error(`plist 缺少根 dict：${plistName}`)

  const framesDict = getValueAfterKey(rootDict, 'frames', 'dict')
  const metadataDict = getValueAfterKey(rootDict, 'metadata', 'dict')
  const textureFileName = metadataDict ? getStringAfterKey(metadataDict, 'textureFileName') : ''
  if (!framesDict) throw new Error(`plist 缺少 frames：${plistName}`)
  if (!textureFileName) throw new Error(`plist 缺少 metadata.textureFileName：${plistName}`)

  const frames: SpriteFrame[] = []
  const children = Array.from(framesDict.children)

  for (let index = 0; index < children.length; index += 1) {
    const node = children[index]
    if (!node) continue
    if (node.tagName !== 'key') continue

    const frameKey = node.textContent?.trim() ?? ''
    const frameDict = nextElement(node)
    if (!frameKey || frameDict?.tagName !== 'dict') continue

    const frameText = getStringAfterKey(frameDict, 'frame')
    const sourceSizeText = getStringAfterKey(frameDict, 'sourceSize')
    const offsetText = getStringAfterKey(frameDict, 'offset')
    const rotatedNode = getValueAfterKey(frameDict, 'rotated')

    frames.push({
      key: frameKey,
      action: getActionName(plistName, frameKey),
      index: getFrameIndex(frameKey),
      frame: parseFrameRect(frameText),
      rotated: rotatedNode?.tagName === 'true',
      sourceSize: parseSize(sourceSizeText),
      offset: parsePoint(offsetText),
    })
  }

  if (frames.length === 0) throw new Error(`plist 没有可播放帧：${plistName}`)

  return {
    name: plistName,
    textureFileName,
    frames,
  }
}

function getValueAfterKey(parent: Element, keyName: string, tagName?: string): Element | null {
  const children = Array.from(parent.children)

  for (let index = 0; index < children.length - 1; index += 1) {
    const node = children[index]
    const next = children[index + 1]
    if (!node || !next) continue
    if (node.tagName === 'key' && node.textContent?.trim() === keyName) {
      return !tagName || next.tagName === tagName ? next : null
    }
  }

  return null
}

function getStringAfterKey(parent: Element, keyName: string): string {
  return getValueAfterKey(parent, keyName, 'string')?.textContent?.trim() ?? ''
}

function nextElement(node: Element): Element | null {
  let next = node.nextElementSibling
  while (next && next.tagName === '#text') next = next.nextElementSibling
  return next
}

function getActionName(plistName: string, frameKey: string): string {
  const frameBaseName = removeExtension(frameKey)
  const withoutPlistPrefix = frameBaseName.startsWith(`${plistName}_`)
    ? frameBaseName.slice(plistName.length + 1)
    : frameBaseName
  const match = withoutPlistPrefix.match(/^(.*)_\d+$/)
  const action = match?.[1] ?? ''

  return action || noPrefixAction
}

function getFrameIndex(frameKey: string): number {
  const match = removeExtension(frameKey).match(/_(\d+)$/)
  return match?.[1] ? Number.parseInt(match[1], 10) : 0
}

function parseFrameRect(value: string): FrameRect {
  const numbers = parseNumbers(value)
  return {
    x: numbers[0] ?? 0,
    y: numbers[1] ?? 0,
    width: numbers[2] ?? 0,
    height: numbers[3] ?? 0,
  }
}

function parseSize(value: string): { width: number; height: number } {
  const numbers = parseNumbers(value)
  return {
    width: numbers[0] ?? 0,
    height: numbers[1] ?? 0,
  }
}

function parsePoint(value: string): { x: number; y: number } {
  const numbers = parseNumbers(value)
  return {
    x: numbers[0] ?? 0,
    y: numbers[1] ?? 0,
  }
}

function parseNumbers(value: string): number[] {
  return Array.from(value.matchAll(/-?\d+(?:\.\d+)?/g), (match) => Number.parseFloat(match[0]))
}

function removeExtension(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, '')
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('贴图加载失败。'))
    image.src = src
  })
}

function playAction() {
  if (!currentSheet.value || !selectedAction.value || selectedFrames.value.length === 0) return
  stopPlayback()
  frameCursor.value = 0
  drawCurrentFrame()
  startPlayback()
}

function startPlayback() {
  if (!selectedFrames.value.length) return

  isPlaying.value = true
  const intervalMs = Math.max(secondsPerFrame.value, 0.01) * 1000
  timerId.value = window.setInterval(() => {
    const nextFrame = frameCursor.value + 1

    if (nextFrame >= selectedFrames.value.length) {
      if (!shouldLoop.value) {
        stopPlayback()
        return
      }

      frameCursor.value = 0
    } else {
      frameCursor.value = nextFrame
    }

    drawCurrentFrame()
  }, intervalMs)
}

function stopPlayback() {
  if (timerId.value !== null) {
    window.clearInterval(timerId.value)
    timerId.value = null
  }
  isPlaying.value = false
}

function drawCurrentFrame() {
  const canvas = canvasRef.value
  const image = spriteImage.value
  const frame = activeFrame.value

  if (!canvas || !image || !frame) {
    clearCanvas()
    return
  }

  const displayWidth = frame.sourceSize.width || frame.frame.width
  const displayHeight = frame.sourceSize.height || frame.frame.height
  const scale = Math.max(1, Math.floor(260 / Math.max(displayWidth, displayHeight)))
  canvas.width = displayWidth * scale
  canvas.height = displayHeight * scale

  const context = canvas.getContext('2d')
  if (!context) return

  context.imageSmoothingEnabled = false
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.save()
  context.scale(scale, scale)

  const drawX = (displayWidth - frame.frame.width) / 2 + frame.offset.x
  const drawY = (displayHeight - frame.frame.height) / 2 - frame.offset.y

  if (frame.rotated) {
    context.translate(drawX, drawY + frame.frame.width)
    context.rotate((-90 * Math.PI) / 180)
    context.drawImage(
      image,
      frame.frame.x,
      frame.frame.y,
      frame.frame.height,
      frame.frame.width,
      0,
      0,
      frame.frame.height,
      frame.frame.width,
    )
  } else {
    context.drawImage(
      image,
      frame.frame.x,
      frame.frame.y,
      frame.frame.width,
      frame.frame.height,
      drawX,
      drawY,
      frame.frame.width,
      frame.frame.height,
    )
  }

  context.restore()
}

function clearCanvas() {
  const canvas = canvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return

  context.clearRect(0, 0, canvas.width, canvas.height)
}
</script>

<template>
  <main class="player-shell">
    <section class="toolbar" aria-label="Sprite player controls">
      <label>
        <span>资源类型</span>
        <select v-model="selectedType">
          <option disabled value="">选择类型</option>
          <option v-for="type in resourceTypes" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
      </label>

      <label>
        <span>plist</span>
        <select v-model="selectedPlist" :disabled="!selectedType">
          <option disabled value="">选择 plist</option>
          <option v-for="plist in plistOptions" :key="plist.path" :value="plist.name">
            {{ plist.name }}
          </option>
        </select>
      </label>

      <label>
        <span>action</span>
        <select v-model="selectedAction" :disabled="!currentSheet">
          <option disabled value="">选择 action</option>
          <option v-for="action in actionOptions" :key="action" :value="action">
            {{ action }}
          </option>
        </select>
      </label>

      <fieldset class="radio-group">
        <legend>循环播放</legend>
        <label>
          <input v-model="shouldLoop" type="radio" :value="true" />
          是
        </label>
        <label>
          <input v-model="shouldLoop" type="radio" :value="false" />
          否
        </label>
      </fieldset>

      <label class="compact">
        <span>每帧秒数</span>
        <input v-model.number="secondsPerFrame" type="number" min="0.01" step="0.01" />
      </label>

      <button
        type="button"
        :disabled="!selectedAction || selectedFrames.length === 0"
        @click="playAction"
      >
        Play
      </button>
    </section>

    <section class="stage" aria-label="Sprite preview">
      <canvas ref="canvasRef" width="260" height="260" />
    </section>

    <footer class="status-bar">
      <span>{{ statusMessage }}</span>
      <span v-if="activeFrame">
        {{ activeFrame.key }} ({{ frameCursor + 1 }}/{{ selectedFrames.length }})
      </span>
    </footer>
  </main>
</template>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  min-width: 320px;
  background: #17191f;
  color: #edf2f7;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    sans-serif;
}

button,
input,
select {
  font: inherit;
}

.player-shell {
  min-height: 100vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
}

.toolbar {
  display: grid;
  grid-template-columns:
    minmax(120px, 0.8fr) minmax(220px, 1.4fr) minmax(150px, 1fr)
    auto 120px auto;
  gap: 12px;
  align-items: end;
  padding: 16px;
  background: #222730;
  border-bottom: 1px solid #3a4350;
}

label,
.radio-group {
  display: grid;
  gap: 6px;
}

label span,
.radio-group legend {
  color: #aab6c5;
  font-size: 12px;
}

select,
input[type='number'] {
  width: 100%;
  height: 38px;
  border: 1px solid #4a5667;
  border-radius: 6px;
  background: #12151a;
  color: #f8fafc;
  padding: 0 10px;
}

select:disabled,
button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.radio-group {
  grid-auto-flow: column;
  align-items: center;
  border: 0;
  margin: 0;
  padding: 0;
}

.radio-group label {
  grid-auto-flow: column;
  align-items: center;
  color: #f8fafc;
}

.compact {
  min-width: 110px;
}

button {
  height: 38px;
  min-width: 88px;
  border: 0;
  border-radius: 6px;
  background: #38bdf8;
  color: #071018;
  cursor: pointer;
  font-weight: 700;
}

.stage {
  display: grid;
  place-items: center;
  min-height: 420px;
  padding: 24px;
  background:
    linear-gradient(45deg, #252932 25%, transparent 25%),
    linear-gradient(-45deg, #252932 25%, transparent 25%),
    linear-gradient(45deg, transparent 75%, #252932 75%),
    linear-gradient(-45deg, transparent 75%, #252932 75%);
  background-color: #1b1f27;
  background-position:
    0 0,
    0 12px,
    12px -12px,
    -12px 0;
  background-size: 24px 24px;
}

canvas {
  width: min(520px, 80vw);
  height: auto;
  max-height: 70vh;
  object-fit: contain;
  image-rendering: pixelated;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 16px;
  background: #101318;
  color: #cbd5e1;
  border-top: 1px solid #303844;
  font-size: 13px;
}

@media (max-width: 980px) {
  .toolbar {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .toolbar,
  .status-bar {
    grid-template-columns: 1fr;
    display: grid;
  }

  .radio-group {
    justify-content: start;
  }
}
</style>
