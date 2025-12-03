import { createEngine } from "../_shared/engine.js"
import { Spring } from "../_shared/spring.js"

const { renderer, input, math, run, finish } = createEngine()
const { ctx, canvas } = renderer

let images = []
let currentFrameIndex = 0
let dragStartY = null
let wasDragging = false
// Drag sensitivity: controls how much distance is needed to cycle through all frames
const DRAG_SENSITIVITY = 2.8

const spring = new Spring({
  position: 0,
  frequency: 1,
  halfLife: 0.1
})

// Load all images from the images folder
async function loadImages() {
  const imageCount = 16
  images = []
  
  for (let i = 1; i <= imageCount; i++) {
    const img = new Image()
    img.src = `images/${i}.png`
    await new Promise((resolve, reject) => {
      img.onload = resolve
      img.onerror = reject
    })
    images.push(img)
  }
}

// Initialize and start the loop
loadImages().then(() => {
  run(update)
})

function update(dt) {
  // Clear canvas
  ctx.fillStyle = "white"
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  
  // Get current Y position relative to canvas
  const canvasRect = canvas.getBoundingClientRect()
  const pixelRatio = window.devicePixelRatio
  const mouseY = input.getY() - canvasRect.top * pixelRatio
  
  // Handle drag start
  if (input.isDown()) {
    // Just clicked - reset to frame 1 and start tracking drag
    dragStartY = mouseY
    wasDragging = false
    currentFrameIndex = 0 // Start at frame 1 when clicking
  }
  
  // Handle dragging
  if (input.isPressed() && images.length > 0 && dragStartY !== null) {
    // Calculate relative movement from drag start
    const dragDelta = mouseY - dragStartY
    
    // Check if mouse has moved (actually dragging)
    if (Math.abs(dragDelta) > 2) { // Small threshold to detect actual movement
      wasDragging = true
    }
    
    if (wasDragging) {
      // Map relative drag movement to frame index
      // Drag down (positive delta) = higher frame numbers
      // Drag up (negative delta) = lower frame numbers
      // Apply sensitivity: divide by sensitivity to control how much distance is needed
      const normalizedDelta = (dragDelta / canvas.height) * DRAG_SENSITIVITY
      // Map to frame index: start at 0, progress through all frames
      const frameOffset = Math.round(normalizedDelta * (images.length - 1))
      currentFrameIndex = Math.max(0, Math.min(images.length - 1, frameOffset))
    }
  }
  
  // Handle drag end
  if (input.isUp()) {
    dragStartY = null
    wasDragging = false
    // Reset to frame 1 when releasing
    currentFrameIndex = 0
  }

  spring.target = input.isPressed() ? canvas.width/2 : 0
  spring.step(dt)

  ctx.rect(0,0,canvas.width,canvas.height)
  ctx.fillStyle = "black";
  ctx.fill()

  ctx.save()
  {
    // mask
    ctx.beginPath()
    const radius = spring.position
    ctx.ellipse(canvas.width / 2, canvas.height / 2,radius,radius, 0, 0, Math.PI * 2)
    // draw noisy ellipse with points and random noise
    const points = []
    const count = 32
    for (let i = 0; i < count; i++) {
      const angle = i * Math.PI * 2 / count
      const r = radius + Math.random()*30
      const x = r * Math.cos(angle)
      const y = r * Math.sin(angle)
      points.push({x,y})
    }
    ctx.save()
    ctx.translate(canvas.width / 2, canvas.height / 2)
    ctx.beginPath()
    ctx.moveTo(points[0].x, points[0].y)
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y )
    }
    ctx.closePath()
    ctx.stroke()
    ctx.restore()
    ctx.clip()

    // mask content
    ctx.rect(0,0,canvas.width,canvas.height)
    ctx.fillStyle = "white";
    ctx.fill()

    // Draw the current frame centered
    if (images.length > 0 && images[currentFrameIndex]) {
      const img = images[currentFrameIndex]
      const x = (canvas.width - img.width) / 2
      const y = (canvas.height - img.height) / 2
      ctx.drawImage(img, x, y)
    }
  }

  ctx.restore()
  
}

