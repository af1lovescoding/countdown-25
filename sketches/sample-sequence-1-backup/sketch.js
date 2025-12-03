import { createEngine } from "../_shared/engine.js"
import { Spring } from "../_shared/spring.js"

const { renderer, input, math, run, finish, } = createEngine()
const { ctx, canvas } = renderer
run(update)

const spring = new Spring({
	position: -canvas.width,
	frequency: 0.50,
	halfLife: 0.3
})


function update(dt) {

	if (input.isPressed()) {
		spring.target = canvas.width
	}
	else {
		spring.target = 0
	}

	spring.step(dt)

	const x = canvas.width / 2 + spring.position;
	const y = canvas.height / 2;

	ctx.fillStyle = "black"
	ctx.fillRect(0, 0, canvas.width, canvas.height)

	ctx.fillStyle = "white"
	ctx.textBaseline = "middle"
	ctx.font = `${canvas.height}px Helvetica Neue, Helvetica , bold`
	ctx.textAlign = "center"
	ctx.translate(x, y)
	ctx.rotate(math.toRadian(-spring.velocity * 0.03))
	ctx.fillText("1", 0, 0)

	if (spring.position >= canvas.width - 10) {
		finish()
	}

}
