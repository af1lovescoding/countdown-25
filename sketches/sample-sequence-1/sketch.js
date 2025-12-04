import { createEngine } from "../_shared/engine.js"
import { Spring } from "../_shared/spring.js"
import { NoisyEllipseMask } from "../_shared/noisyEllipseMask.js"
import { Iris } from "./iris.js"
import { EyeballMask } from "./eyeballMask.js"
import { Rectangle } from "./rectangle.js"

const { renderer, input, math, run, finish } = createEngine()
const { ctx, canvas } = renderer

// Create mask instance with configuration
const mask = new NoisyEllipseMask(canvas, input, {
  margin: 40,
  ellipseVertices: 320,
  noiseStrength: 50,
  noiseSpeed: 2.0,
  noiseDistance: 15.0,
  springFrequency: 1,
  springHalfLife: 0.1
})

let irises = []
let eyeballMasks = []
let rectangle = null
const EYE_COUNT = 5
const irisSize = 150
const eyeballMaskSize = 200
let SEED = 6264  // Change this value to get different arrangements
let visibleEyeCount = 1  // Start with only one eye visible
let eyesClicked = new Set()  // Track which eyes have been clicked
let showRectangle = false  // Flag to show rectangle when last eye is clicked

// Seeded random number generator
function createSeededRandom(seed) {
  let value = seed
  return function() {
    value = (value * 9301 + 49297) % 233280
    return value / 233280
  }
}

// Generate grid vertices and place eyes without overlap
function generateEyePositions(canvasWidth, canvasHeight, eyeCount, minSpacing, eyeSize, rectangle = null, random = Math.random) {
  // Create a dense grid of vertices
  // Grid spacing should be smaller than minSpacing to allow random selection
  const gridSpacing = minSpacing * 0.8 // Dense grid, 80% of min spacing
  
  // Calculate safe bounds: eyes must be at least eyeSize away from edges
  const minX = eyeSize
  const maxX = canvasWidth - eyeSize /2
  const minY = eyeSize
  const maxY = canvasHeight - eyeSize /2
  
  // Calculate grid dimensions within safe bounds
  const availableWidth = maxX - minX
  const availableHeight = maxY - minY
  const cols = Math.ceil(availableWidth / gridSpacing)
  const rows = Math.ceil(availableHeight / gridSpacing)
  
  // Calculate rectangle bounds if provided
  let rectMinX = null, rectMaxX = null, rectMinY = null, rectMaxY = null
  if (rectangle) {
    rectMinX = rectangle.x - rectangle.width / 2 - eyeSize / 2 // Add eye radius padding
    rectMaxX = rectangle.x + rectangle.width / 2 + eyeSize / 2
    rectMinY = rectangle.y - rectangle.height / 2 - eyeSize / 2
    rectMaxY = rectangle.y + rectangle.height / 2 + eyeSize / 2
  }
  
  // Generate all grid points within safe bounds
  const gridPoints = []
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x = minX + col * gridSpacing + gridSpacing / 2 // Center in grid cell
      const y = minY + row * gridSpacing + gridSpacing / 2
      
      // Make sure point is within safe bounds
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        // Check if point overlaps with rectangle (if rectangle exists)
        let overlapsRectangle = false
        if (rectangle && rectMinX !== null) {
          if (x >= rectMinX && x <= rectMaxX && y >= rectMinY && y <= rectMaxY) {
            overlapsRectangle = true
          }
        }
        
        if (!overlapsRectangle) {
          gridPoints.push({ x, y })
        }
      }
    }
  }
  
  // Shuffle grid points randomly using seeded random
  for (let i = gridPoints.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [gridPoints[i], gridPoints[j]] = [gridPoints[j], gridPoints[i]]
  }
  
  // Select points ensuring no overlap
  const selectedPositions = []
  const minSpacingSquared = minSpacing * minSpacing
  
  for (const point of gridPoints) {
    // Check if this point is far enough from all already selected points
    let isValid = true
    for (const selected of selectedPositions) {
      const dx = point.x - selected.x
      const dy = point.y - selected.y
      const distanceSquared = dx * dx + dy * dy
      
      if (distanceSquared < minSpacingSquared) {
        isValid = false
        break
      }
    }
    
    if (isValid) {
      selectedPositions.push(point)
      
      // Stop if we have enough positions
      if (selectedPositions.length >= eyeCount) {
        break
      }
    }
  }
  
  return selectedPositions
}

// Generate eye positions in an arch above the rectangle (mouth) in the top half (0 to height/2)
function generateEyesAroundRectangle(rectX, rectY, rectWidth, rectHeight, eyeCount, eyeSize, random) {
  const eyePositions = []
  
  // Calculate base radius - distance from rectangle edge to place eyes
  // Use the larger dimension of the rectangle plus padding
  const rectMaxDimension = Math.max(rectWidth, rectHeight)
  const baseRadius = rectMaxDimension / 2 + eyeSize * 1.5
  
  // Create an arch above the rectangle - angles from -PI to 0 (top half circle, negative sin)
  // Distribute eyes evenly across the arch
  const startAngle = -Math.PI  // Left side of arch (top)
  const endAngle = 0           // Right side of arch (top)
  const angleRange = endAngle - startAngle
  const angleStep = angleRange / (eyeCount - 1) // Distribute across arch
  
  // Generate positions in an arch above the rectangle
  for (let i = 0; i < eyeCount; i++) {
    // Base angle with some variation from seed
    const baseAngle = startAngle + i * angleStep
    const angleVariation = (random() - 0.5) * 0.2 // ±10% variation
    const angle = baseAngle + angleVariation
    
    // Radius with some variation
    const radiusVariation = (random() - 0.5) * eyeSize * 0.4 // ±20% variation
    const radius = baseRadius + radiusVariation
    
    // Calculate position (negative sin for positions above)
    const x = rectX + Math.cos(angle) * radius
    const y = rectY + Math.sin(angle) * radius
    
    // Make sure position is within canvas bounds and in top half (0 to height/2)
    const minX = eyeSize
    const maxX = canvas.width - eyeSize / 2
    const minY = eyeSize / 2 // Keep eye within canvas bounds
    const maxY = canvas.height / 2 // Top half only
    
    // Only add if in top half (0 to height/2)
    if (x >= minX && x <= maxX && y >= minY && y <= maxY && y <= canvas.height / 2) {
      eyePositions.push({ x, y })
    }
  }
  
  // Filter out overlapping eyes
  const minSpacing = eyeSize * 1.8
  const minSpacingSquared = minSpacing * minSpacing
  const filteredPositions = []
  
  for (const pos of eyePositions) {
    let isValid = true
    for (const selected of filteredPositions) {
      const dx = pos.x - selected.x
      const dy = pos.y - selected.y
      const distanceSquared = dx * dx + dy * dy
      
      if (distanceSquared < minSpacingSquared) {
        isValid = false
        break
      }
    }
    
    if (isValid) {
      filteredPositions.push(pos)
    }
  }
  
  return filteredPositions
}

// Function to create eyes with a given seed
async function createEyes(seed) {
  // Clear existing eyes
  irises = []
  eyeballMasks = []
  visibleEyeCount = 1  // Reset to show only first eye
  eyesClicked.clear()  // Reset clicked tracking
  showRectangle = false  // Reset rectangle visibility
  
  // Create seeded random number generator
  const seededRandom = createSeededRandom(seed)
  
  // Create rectangle in the center of the canvas (grid center) if not exists
  if (!rectangle) {
    const rectWidth = canvas.width * 0.05	
    const rectHeight = canvas.height * 0.3
    rectangle = new Rectangle(
      canvas.width / 2,
      canvas.height / 2,
      rectWidth,
      rectHeight,
      "#000000"
    )
  }
  
  // Generate eye positions around the rectangle
  const eyePositions = generateEyesAroundRectangle(
    rectangle.x,
    rectangle.y,
    rectangle.width,
    rectangle.height,
    EYE_COUNT,
    eyeballMaskSize,
    seededRandom
  )
  
  // Create eyes at the generated positions
  for (const pos of eyePositions) {
    irises.push(new Iris(pos.x, pos.y, irisSize))
    eyeballMasks.push(new EyeballMask(pos.x, pos.y, eyeballMaskSize))
  }
  
  // Load all irises and masks
  await Promise.all([
    ...irises.map(iris => iris.load()),
    ...eyeballMasks.map(mask => mask.load())
  ])
}

// Check if a point is inside an eye
function isPointInEye(x, y, eyeballMask) {
  const maskRadius = eyeballMask.getRadius()
  const dx = x - eyeballMask.x
  const dy = y - eyeballMask.y
  const distance = Math.sqrt(dx * dx + dy * dy)
  return distance <= maskRadius
}

async function init() {
  renderer.resize()
  await new Promise(resolve => requestAnimationFrame(resolve))
  renderer.resize()
  
  // Create initial eyes
  await createEyes(SEED)
  
  // Create button to change seed
  const button = document.createElement("button")
  button.textContent = `Change Seed (Current: ${SEED})`
  button.style.position = "fixed"
  button.style.top = "10px"
  button.style.left = "10px"
  button.style.zIndex = "1000"
  button.style.padding = "10px 20px"
  button.style.fontSize = "14px"
  button.style.cursor = "pointer"
  button.onclick = async () => {
    SEED = Math.floor(Math.random() * 10000)
    button.textContent = `Change Seed (Current: ${SEED})`
    await createEyes(SEED)
  }
  document.body.appendChild(button)
  
  run(update)
}

// Helper function to update iris position with boundary constraint
function updateIrisPosition(iris, eyeballMask, mouseX, mouseY) {
  // Calculate desired iris position (mouse position)
  const desiredX = mouseX
  const desiredY = mouseY

  // Get mask center and radius
  const maskCenterX = eyeballMask.x
  const maskCenterY = eyeballMask.y
  const maskRadius = eyeballMask.getRadius()

  // Calculate iris radius (approximate - using half the size)
  const irisRadius = iris.size / 2

  // Maximum distance from mask center so that half iris stays inside
  // When half iris is outside, it blocks: maskRadius - irisRadius/2
  const maxDistance = maskRadius - irisRadius / 2

  // Calculate distance from mask center to desired position
  const dx = desiredX - maskCenterX
  const dy = desiredY - maskCenterY
  const distance = Math.sqrt(dx * dx + dy * dy)

  // Constrain the position if it exceeds the maximum distance
  let constrainedX = desiredX
  let constrainedY = desiredY

  if (distance > maxDistance) {
    // Normalize direction and scale to max distance
    const angle = Math.atan2(dy, dx)
    constrainedX = maskCenterX + Math.cos(angle) * maxDistance
    constrainedY = maskCenterY + Math.sin(angle) * maxDistance
  }

  // Update iris position
  iris.setPosition(constrainedX, constrainedY)
}

function update(dt) {
  // Update mask animation
  mask.update(dt)

  // Get mouse position
  let mouseX = null
  let mouseY = null
  
  if (input.hasStarted()) {
    const canvasRect = canvas.getBoundingClientRect()
    const pixelRatio = window.devicePixelRatio
    mouseX = (input.getX() / pixelRatio - canvasRect.left) * pixelRatio
    mouseY = (input.getY() / pixelRatio - canvasRect.top) * pixelRatio
  }

  // Handle click detection
  if (input.isDown() && mouseX !== null && mouseY !== null) {
    // Check if clicked on any visible eye
    for (let i = 0; i < visibleEyeCount && i < irises.length; i++) {
      if (!eyesClicked.has(i)) {
        const eyeballMask = eyeballMasks[i]
        if (isPointInEye(mouseX, mouseY, eyeballMask)) {
          eyesClicked.add(i)
          // Reveal next eye if not all are visible yet
          if (visibleEyeCount < EYE_COUNT) {
            visibleEyeCount++
          }
          // Check if all visible eyes have been clicked and all eyes are displayed
          if (eyesClicked.size === visibleEyeCount && visibleEyeCount === EYE_COUNT) {
            showRectangle = true
          }
          console.log(`Eye ${i} clicked. Total clicked: ${eyesClicked.size}/${visibleEyeCount} visible, ${EYE_COUNT} total`)
          break
        }
      }
    }
  }

  // Apply mask and draw content inside
  mask.applyMask(ctx, () => {
    // Update and draw visible eyes only
    for (let i = 0; i < visibleEyeCount && i < irises.length; i++) {
      const iris = irises[i]
      const eyeballMask = eyeballMasks[i]
      
      // Update iris position if mouse is available
      if (mouseX !== null && mouseY !== null) {
        updateIrisPosition(iris, eyeballMask, mouseX, mouseY)
      }
      
      // Draw eye
      ctx.save()
      eyeballMask.createClipPath(ctx)
      iris.draw(ctx)
      ctx.restore()
      eyeballMask.drawStroke(ctx)
    }

    // Draw rectangle when last eye is clicked (draw on top)
    if (rectangle && showRectangle) {
      rectangle.draw(ctx)
    }
  })
}

init()

