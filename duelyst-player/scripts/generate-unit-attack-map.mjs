import fs from 'node:fs'
import Module, { createRequire } from 'node:module'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(__dirname, '../..')
const appRoot = path.join(projectRoot, 'app')
const outputPath = path.join(projectRoot, 'duelyst-player/unit-attacks.json')

// resources.js only uses underscore's isArray while it builds the resource table.
const originalLoad = Module._load
Module._load = function (request, parent, isMain) {
  if (request === 'underscore') return { isArray: Array.isArray }
  return originalLoad.call(this, request, parent, isMain)
}

const loadCommonJs = createRequire(import.meta.url)
const resources = loadCommonJs(path.join(appRoot, 'data/resources.js'))
const fx = loadCommonJs(path.join(appRoot, 'data/fx.js'))
Module._load = originalLoad

function walkFiles(directory, extension, result = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name)
    if (entry.isDirectory()) walkFiles(fullPath, extension, result)
    else if (entry.name.endsWith(extension)) result.push(fullPath)
  }
  return result
}

function getPath(object, dottedPath) {
  return dottedPath.split('.').reduce((value, key) => value?.[key], object)
}

function firstSprite(value) {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = firstSprite(item)
      if (found) return found
    }
  } else if (value && typeof value === 'object') {
    if (value.spriteIdentifier) return value
    for (const child of Object.values(value)) {
      const found = firstSprite(child)
      if (found) return found
    }
  }
  return null
}

const resourceByName = new Map(Object.values(resources).filter(Boolean).map((item) => [item.name, item]))
const unitsDirectory = path.join(appRoot, 'resources/units')
const output = {}

for (const plistPath of walkFiles(unitsDirectory, '.plist')) {
  const unit = path.basename(plistPath, '.plist')
  output[unit] = { attackAction: 'attack', relations: [] }
}

const factoryDirectory = path.join(appRoot, 'sdk/cards/factory')
for (const filePath of walkFiles(factoryDirectory, '.coffee')) {
  const source = fs.readFileSync(filePath, 'utf8')
  const blocks = source.split(/(?=^\s*if \(identifier == )/m)

  for (const block of blocks) {
    const animCall = block.match(/card\.setBaseAnimResource\(([\s\S]*?)\n\s*\)/)
    if (!animCall) continue

    const attackName = animCall[1].match(/\n\s*attack\s*:\s*RSX\.([\w]+)\.name/)
    if (!attackName) continue
    const attackResource = resources[attackName[1]]
    if (!attackResource?.plist?.startsWith('resources/units/')) continue

    const unit = path.basename(attackResource.plist, '.plist')
    if (!output[unit]) continue

    const releaseMatch = animCall[1].match(/attackReleaseDelay\s*:\s*([\d.]+)/)
    const soundCall = block.match(/card\.setBaseSoundResource\(([\s\S]*?)\n\s*\)/)
    const attackSoundName = soundCall?.[1].match(/\n\s*attack\s*:\s*RSX\.([\w]+)\.audio/)?.[1]
    const soundResource = attackSoundName ? resources[attackSoundName] : null

    const fxPaths = [...block.matchAll(/card\.setFXResource\(\[([^\]]*)\]\)/g)]
      .flatMap((match) => [...match[1].matchAll(/["']FX\.([^"']+)["']/g)])
      .map((match) => match[1])

    let attackFx = null
    for (const fxPath of fxPaths) {
      const attackedFx = getPath(fx, fxPath)?.UnitAttackedFX
      const sprite = firstSprite(attackedFx)
      const spriteResource = sprite ? resourceByName.get(sprite.spriteIdentifier) : null
      if (!spriteResource?.plist) continue
      attackFx = {
        plist: path.basename(spriteResource.plist, '.plist'),
        action: spriteResource.framePrefix?.replace(/_$/, '') ?? null,
        frameDelay: spriteResource.frameDelay ?? 0.08,
        offset: sprite.offset ?? { x: 0, y: 0 },
        flippedX: Boolean(sprite.flippedX),
      }
      break
    }

    const relation = {
      source: path.relative(appRoot, filePath),
      attackResource: attackName[1],
      releaseDelay: Number(releaseMatch?.[1] ?? 0),
      fx: attackFx,
      sfx: soundResource?.audio?.replace(/^resources\/sfx\//, '') ?? null,
    }

    if (!output[unit].relations.some((item) => JSON.stringify(item) === JSON.stringify(relation))) {
      output[unit].relations.push(relation)
    }
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`)
const related = Object.values(output).filter((unit) => unit.relations.length > 0).length
console.log(`Generated ${path.relative(projectRoot, outputPath)} (${related}/${Object.keys(output).length} units mapped)`)
