import { createEngine } from "../_shared/engine.js"
import { createSpringSettings, Spring } from "../_shared/spring.js"

const { renderer, input, math, run, finish, } = createEngine()
const { ctx, canvas } = renderer
run(update)

const spring = new Spring({
  position: 0
})

const settings1 = createSpringSettings({
  frequency: 3.5,
  halfLife: 1.05
})
const settings2 = createSpringSettings({
  frequency: .2,
  halfLife: 1.15
})


function update(dt) {

  if (input.isPressed()) {
    spring.target = -.1
    spring.settings = settings2
  }
  else {
    spring.target = 1
    spring.settings = settings1
  }

  spring.step(dt)

  const x = canvas.width / 2;
  const y = canvas.height / 2;
  const scale = Math.max(spring.position, 0)

  ctx.fillStyle = "black"
  ctx.fillRect(0, 0, canvas.width, canvas.height)

  ctx.fillStyle = "white"
  ctx.textBaseline = "middle"
  ctx.font = `${canvas.height}px Helvetica Neue, Helvetica , bold`
  ctx.textAlign = "center"
  ctx.translate(x, y)
  ctx.scale(scale, scale)
  ctx.fillText("0", 0, 0)

  if (scale <= 0) {
    finish()
  }

}
