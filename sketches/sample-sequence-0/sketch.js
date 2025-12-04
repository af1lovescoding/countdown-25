import { createEngine } from "../_shared/engine.js"
import { NoisyEllipseMask } from "../_shared/noisyEllipseMask.js"

const { renderer, input, math, run, finish, } = createEngine()
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

// Fly state
const fly = { 
    x: 0,
    y: 0,
    radius: 25,
    vx: 0,
    vy: 0,
    visible: true,
    noiseOffsetX: Math.random() * 1000,
    noiseOffsetY: Math.random() * 1000,
    noiseTime: 0,
    wanderTargetX: 0,
    wanderTargetY: 0,
    wanderTime: 0
}

// Background color (0 = white, 1 = black)
let backgroundColor = 0

// Tracking state
let hoverTime = 0
let isHovering = false
const TRACKING_DURATION = 2 // seconds

// Fly movement parameters
const FLYING_SPEED = 200 // pixels per second - tweak this to adjust speed
const NOISE_AMPLITUDE = 500 // amplitude of organic noise movement
const NOISE_SPEED = 5.5 // speed of noise oscillation
const ORGANIC_JITTER = 10 // amount of random jitter for organic feel
const WANDER_FORCE = 1500 // force toward random wander targets
const WANDER_CHANGE_INTERVAL = 3 // seconds between wander target changes

// Tracking square parameters
const TRACKING_SQUARE_SIZE = 200 // size of the tracking square
const TRACKING_SQUARE_STROKE = 2 // stroke width

// Initialization flag
let initialized = false

// Simple noise function using sine waves for organic movement
function noise(t, offset) {
    return Math.sin(t * 0.5 + offset) * 0.5 + 
           Math.sin(t * 1.3 + offset * 1.7) * 0.3 + 
           Math.sin(t * 2.1 + offset * 2.3) * 0.2
}

function update(dt) {
    // Update mask animation
    mask.update(dt)
    
    // Update noise time for organic movement
    fly.noiseTime += dt * NOISE_SPEED
    // Initialize fly position on first frame
    if (!initialized && canvas.width > 0 && canvas.height > 0) {
        fly.x = canvas.width * 0.3
        fly.y = canvas.height * 0.3
        // Set initial wander target to encourage exploration
        fly.wanderTargetX = Math.random() * canvas.width
        fly.wanderTargetY = Math.random() * canvas.height
        initialized = true
    }
    
    if (!initialized) return
    const centerX = canvas.width / 2
    const centerY = canvas.height / 2
    
    // Get mouse position
    const mouseX = input.getX()
    const mouseY = input.getY()
    
    // Calculate tracking square position (mouse in center)
    const trackingSquareX = mouseX - TRACKING_SQUARE_SIZE / 2
    const trackingSquareY = mouseY - TRACKING_SQUARE_SIZE / 2
    
    // Check if fly is inside the tracking square
    const isFlyInTrackingArea = fly.visible &&
        fly.x >= trackingSquareX &&
        fly.x <= trackingSquareX + TRACKING_SQUARE_SIZE &&
        fly.y >= trackingSquareY &&
        fly.y <= trackingSquareY + TRACKING_SQUARE_SIZE
    
    // Handle hover state
    if (isFlyInTrackingArea) {
        if (!isHovering) {
            // Start tracking
            isHovering = true
            hoverTime = 0
        }
        
        // Accumulate hover time
        hoverTime += dt
        
        // Move fly toward center
        const dx = centerX - fly.x
        const dy = centerY - fly.y
        const distanceToCenter = math.len(dx, dy)
        
        // Calculate remaining time
        const remainingTime = TRACKING_DURATION - hoverTime
        
        if (distanceToCenter > 1 && remainingTime > 0) {
            // Calculate speed needed to reach center in remaining time
            // Use either the configured speed or the speed needed to reach center in time, whichever is faster
            const requiredSpeed = distanceToCenter / remainingTime
            const speed = Math.max(FLYING_SPEED, requiredSpeed) * dt
            
            // Normalize direction and apply speed
            const moveX = (dx / distanceToCenter) * speed
            const moveY = (dy / distanceToCenter) * speed
            
            // Add organic noise to movement direction
            const noiseX = noise(fly.noiseTime, fly.noiseOffsetX) * NOISE_AMPLITUDE * dt
            const noiseY = noise(fly.noiseTime, fly.noiseOffsetY) * NOISE_AMPLITUDE * dt
            
            // Apply movement with organic noise
            fly.x += moveX + noiseX
            fly.y += moveY + noiseY
            
            // Add organic jitter (reduced when close to center)
            const jitterAmount = Math.min(distanceToCenter / 100, 1) * ORGANIC_JITTER
            fly.x += (Math.random() - 0.5) * jitterAmount * dt
            fly.y += (Math.random() - 0.5) * jitterAmount * dt
        } else {
            // Snap to center when time is up or already there
            if (hoverTime >= TRACKING_DURATION || distanceToCenter <= 1) {
                fly.x = centerX
                fly.y = centerY
            }
        }
    } else {
        // Not hovering - fly moves around more actively
        isHovering = false
        hoverTime = 0
        
        if (fly.visible) {
            // Update wander target periodically to encourage exploration
            fly.wanderTime += dt
            if (fly.wanderTime >= WANDER_CHANGE_INTERVAL) {
                // Pick a new random target anywhere on the canvas
                fly.wanderTargetX = Math.random() * canvas.width
                fly.wanderTargetY = Math.random() * canvas.height
                fly.wanderTime = 0
            }
            
            // Calculate direction toward wander target
            const wanderDx = fly.wanderTargetX - fly.x
            const wanderDy = fly.wanderTargetY - fly.y
            const wanderDist = math.len(wanderDx, wanderDy)
            
            // Add wander force (weaker when far, stronger when close to encourage exploration)
            if (wanderDist > 10) {
                const wanderStrength = WANDER_FORCE * (1 - Math.min(wanderDist / (canvas.width * 0.5), 1))
                fly.vx += (wanderDx / wanderDist) * wanderStrength * dt
                fly.vy += (wanderDy / wanderDist) * wanderStrength * dt
            }
            
            // Organic noise-based velocity changes
            const noiseVelX = noise(fly.noiseTime, fly.noiseOffsetX) * 300
            const noiseVelY = noise(fly.noiseTime, fly.noiseOffsetY + 100) * 300
            
            // Apply organic noise to velocity
            fly.vx += noiseVelX * dt
            fly.vy += noiseVelY * dt
            
            // Add random perturbations for more organic feel
            fly.vx += (Math.random() - 0.5) * 350 * dt
            fly.vy += (Math.random() - 0.5) * 350 * dt
            
            // Less damping for more erratic movement and better exploration
            fly.vx *= 0.94
            fly.vy *= 0.94
            
            // Add occasional quick direction changes (more organic)
            if (Math.random() < 0.08) {
                const burstAngle = Math.random() * Math.PI * 2
                const burstForce = 500 + Math.random() * 300
                fly.vx += Math.cos(burstAngle) * burstForce * dt
                fly.vy += Math.sin(burstAngle) * burstForce * dt
            }
            
            // Update position with velocity
            fly.x += fly.vx * dt
            fly.y += fly.vy * dt
            
            // Add additional organic position noise
            const posNoiseX = noise(fly.noiseTime * 1.7, fly.noiseOffsetX + 50) * NOISE_AMPLITUDE * dt
            const posNoiseY = noise(fly.noiseTime * 1.7, fly.noiseOffsetY + 150) * NOISE_AMPLITUDE * dt
            fly.x += posNoiseX
            fly.y += posNoiseY
            
            // Keep fly on screen with bounce effect (but allow more exploration)
            if (fly.x < fly.radius || fly.x > canvas.width - fly.radius) {
                fly.vx *= -0.7
                fly.x = math.clamp(fly.x, fly.radius, canvas.width - fly.radius)
                // Add a push away from the edge
                fly.vx += (fly.x < canvas.width / 2 ? 1 : -1) * 200 * dt
            }
            if (fly.y < fly.radius || fly.y > canvas.height - fly.radius) {
                fly.vy *= -0.7
                fly.y = math.clamp(fly.y, fly.radius, canvas.height - fly.radius)
                // Add a push away from the edge
                fly.vy += (fly.y < canvas.height / 2 ? 1 : -1) * 200 * dt
            }
        }
    }
    
    // Handle click
    if (input.isDown() && fly.visible) {
        // Check if click is on the fly
        const clickDist = math.dist(mouseX, mouseY, fly.x, fly.y)
        if (clickDist < fly.radius) {
            fly.visible = false
            backgroundColor = 1 // Change to black
        }
    }
    
    // Apply mask and draw content inside
    mask.applyMask(ctx, () => {
        // Draw background
        ctx.fillStyle = backgroundColor === 0 ? '#ffffff' : '#000000'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Draw tracking square
        ctx.strokeStyle = backgroundColor === 0 ? '#000000' : '#ffffff'
        ctx.lineWidth = TRACKING_SQUARE_STROKE
        ctx.strokeRect(trackingSquareX, trackingSquareY, TRACKING_SQUARE_SIZE, TRACKING_SQUARE_SIZE)
        
        // Draw fly
        if (fly.visible) {
            ctx.fillStyle = backgroundColor === 0 ? '#000000' : '#ffffff'
            ctx.beginPath()
            ctx.arc(fly.x, fly.y, fly.radius, 0, Math.PI * 2)
            ctx.fill()
        }
    })
}

run(update)

