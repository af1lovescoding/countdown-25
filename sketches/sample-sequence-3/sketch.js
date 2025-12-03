import { createEngine } from "../_shared/engine.js"
import { Spring } from "../_shared/spring.js"
import { Instance1 } from "./instance-1.js"
import { Instance2 } from "./instance-2.js"
import { Instance3 } from "./instance-3.js"

const { renderer, input, run, finish } = createEngine()
const { ctx, canvas } = renderer

const spring = new Spring({
  position: 0,
  frequency: 2.5,
  halfLife: 0.05
})

const INSTANCE_COUNT = 900
const WIGGLE_DISTANCE = 20
const WIGGLE_SPEED = 10

let artBoards = []
let hoverPoint = { x: 0, y: 0 }
let wiggleTime = 0

  let instanceInitialPositions = []
  let instanceFinalPositions = []
let instanceSpringsX = []
let instanceSpringsY = []

// Initialize ArtBoards
async function initArtBoards() {
  renderer.resize()
  await new Promise(resolve => requestAnimationFrame(resolve))
  renderer.resize()
  
  hoverPoint.x = canvas.width / 2
  hoverPoint.y = canvas.height / 2
  
  // CHANGE SIZE OF INSTANCES HERE
  const size = Math.min(canvas.width, canvas.height) * 0.055
  const artBoardClasses = [Instance1, Instance2, Instance3]

  for (let i = 0; i < INSTANCE_COUNT; i++) {
    const x = Math.random() * canvas.width
    const y = Math.random() * canvas.height
    
    const ArtBoardClass = artBoardClasses[i % 3]
    const artBoard = new ArtBoardClass(x, y, size, size)
    await artBoard.load()
    artBoards.push(artBoard)
    
    instanceSpringsX.push(new Spring({
      position: x,
      frequency: 2.5,
      halfLife: 0.05
    }))
    instanceSpringsY.push(new Spring({
      position: y,
      frequency: 2.5,
      halfLife: 0.05
    }))
    
    instanceInitialPositions.push({ x, y })
    instanceFinalPositions.push({ x, y })
  }
  
  const rectangles = []
  const rectWidth = canvas.width * 0.1
  const rectHeight = canvas.height * 0.8
  const gap = canvas.width * 0.05
  const totalWidth = 3 * rectWidth + 2 * gap
  const startX = (canvas.width - totalWidth) / 2
  const centerY = canvas.height / 2
  
  for (let i = 0; i < 3; i++) {
    rectangles.push({
      x: startX + i * (rectWidth + gap),
      y: centerY - rectHeight / 2,
      width: rectWidth,
      height: rectHeight
    })
  }
  
  const instancesPerRect = Math.floor(INSTANCE_COUNT / 3)
  const remainder = INSTANCE_COUNT % 3
  let instanceIndex = 0
  
  for (let rectIndex = 0; rectIndex < 3; rectIndex++) {
    const rect = rectangles[rectIndex]
    const countForThisRect = instancesPerRect + (rectIndex < remainder ? 1 : 0)
    
    const minX = rect.x
    const maxX = rect.x + rect.width
    const minY = rect.y
    const maxY = rect.y + rect.height - size
    
    for (let i = 0; i < countForThisRect; i++) {
      instanceFinalPositions[instanceIndex].x = minX + Math.random() * (maxX - minX)
      instanceFinalPositions[instanceIndex].y = minY + Math.random() * (maxY - minY)
      instanceIndex++
    }
  }
}

initArtBoards().then(() => {
  run(update)
})


function update(dt) {

  if (input.isPressed()) {
    spring.target = 0
  }
  else {
    spring.target = 1
  }

  spring.step(dt)

  const scale = Math.max(spring.position, 0)
  wiggleTime += dt * WIGGLE_SPEED
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  const rectWidth = canvas.width * 0.1
  const rectHeight = canvas.height * 0.8
  const gap = canvas.width * 0.05
  const totalWidth = 3 * rectWidth + 2 * gap
  const startX = (canvas.width - totalWidth) / 2
  const centerY = canvas.height / 2

  ctx.fillStyle = "white" 
  for (let i = 0; i < 3; i++) {
    const x = startX + i * (rectWidth + gap)
    const y = centerY - rectHeight / 2
    ctx.fillRect(x, y, rectWidth, rectHeight)
  }

  const instanceSize = Math.min(canvas.width, canvas.height) * 0.15

  // Convert mouse coordinates to canvas coordinates
  const canvasRect = canvas.getBoundingClientRect()
  const pixelRatio = window.devicePixelRatio
  const mouseX = (input.getX() / pixelRatio - canvasRect.left) * pixelRatio
  const mouseY = (input.getY() / pixelRatio - canvasRect.top) * pixelRatio
  
  const distX = Math.abs(mouseX - hoverPoint.x)
  const normalizedDistX = Math.min(1, distX / canvas.width)
  const blendX = 1 - (normalizedDistX * normalizedDistX * (3 - 2 * normalizedDistX))
  
  const distY = Math.abs(mouseY - hoverPoint.y)
  const normalizedDistY = Math.min(1, distY / canvas.height)
  const blendY = 1 - (normalizedDistY * normalizedDistY * (3 - 2 * normalizedDistY))

  for (let i = 0; i < INSTANCE_COUNT; i++) {
    const blendedX = instanceInitialPositions[i].x * (1 - blendX) + instanceFinalPositions[i].x * blendX
    const blendedY = instanceInitialPositions[i].y * (1 - blendY) + instanceFinalPositions[i].y * blendY
    
    const currentX = instanceSpringsX[i].position
    const currentY = instanceSpringsY[i].position
    const dx = currentX - hoverPoint.x
    const dy = currentY - hoverPoint.y
    const distance = Math.sqrt(dx * dx + dy * dy)
    
    const maxDist = Math.sqrt(canvas.width * canvas.width + canvas.height * canvas.height)
    const normalizedDistance = Math.min(1, distance / maxDist)
    const wiggleAmplitude = normalizedDistance * WIGGLE_DISTANCE
    
    const wiggleOffsetX = Math.sin(wiggleTime + i * 0.1) * wiggleAmplitude
    const wiggleOffsetY = Math.cos(wiggleTime + i * 0.1) * wiggleAmplitude

    instanceSpringsX[i].target = blendedX + wiggleOffsetX
    instanceSpringsY[i].target = blendedY + wiggleOffsetY
    instanceSpringsX[i].step(dt)
    instanceSpringsY[i].step(dt)
    
    artBoards[i].x = Math.max(0, Math.min(canvas.width - instanceSize, instanceSpringsX[i].position))
    artBoards[i].y = Math.max(0, Math.min(canvas.height - instanceSize, instanceSpringsY[i].position))
  }

  for (const artBoard of artBoards) {
    if (artBoard.image) {
      artBoard.draw(ctx, dt)
    }
  }


  if (scale <= 0) {
    finish()
  }

}
