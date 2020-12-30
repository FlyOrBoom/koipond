"use strict"

const canvas = document.querySelector("canvas")
const timeSamples = Array(32)
const debug = document.querySelector("div")
const gl = canvas.getContext("webgl")
const pond = new KoiPond()

const vertexShaderCode = `
    attribute vec4 vPosition;
    void main() {
      gl_Position = vPosition;
    }
`

const fragmentShaderCode = `
    precision mediump float;
    uniform vec2 iResolution;
    uniform float iTime;
    uniform vec4 kois[${pond.MAX_POPULATION}];
    uniform int population;

    const int MAX_POPULATION = ${pond.MAX_POPULATION};
    const float MAX_KOI_SIZE = ${pond.MAX_KOI_SIZE};
    const int SEED = ${pond.SEED};
    const int RIPPLE_DIVS = 3;
    const float PI = 3.14159;
    const float TAU = 6.28319;
    const float BEVEL = .4;

    // BEGIN Insert Koi.frag here
    // END

    void main() {
      mainImage(gl_FragColor, gl_FragCoord.xy);
    }
`

// setup GLSL program
const program = createProgramFromSources(gl, [vertexShaderCode, fragmentShaderCode])

// look up where the vertex data needs to go.
const handles = {
    position: gl.getAttribLocation(program, "vPosition"),
    resolution: gl.getUniformLocation(program, "iResolution"),
    time: gl.getUniformLocation(program, "iTime"),
    kois: gl.getUniformLocation(program, "kois"),
    population: gl.getUniformLocation(program, "population")
}

const positionBuffer = gl.createBuffer();

// Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, // first triangle
    -1, 1,
    1, -1,
    -1, 1, // second triangle
    1, -1,
    1, 1,
]), gl.STATIC_DRAW);

gl.vertexAttribPointer(
    handles.position,
    2, // 2 components per iteration
    gl.FLOAT, // the data is 32bit floats
    false, // don't normalize the data
    0, // 0 = move forward size * sizeof(type) each iteration to get the next position
    0, // start at the beginning of the buffer
)

gl.useProgram(program)
gl.enableVertexAttribArray(handles.position)

let then = 0
let time = 0
let running = false

function render(now) {
    now *= 0.001 // convert to seconds
    const elapsedTime = Math.min(now - then, 0.1)

    timeSamples.shift()
    timeSamples.push(elapsedTime)
    debug.innerText = Math.round(10 * timeSamples.length / timeSamples.reduce((a, b) => a + b, 0)) / 10 + ' fps'

    time += elapsedTime
    then = now

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    gl.uniform2f(handles.resolution, gl.canvas.width, gl.canvas.height)
    gl.uniform1f(handles.time, time)
    gl.uniform4fv(handles.kois, pond.kois)
    gl.uniform1i(handles.population, pond.population)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    if(running) requestAnimationFrame(render)
}

function stop () {
    running = false
}
function start () {
    if(running) return
    running = true
    requestAnimationFrame(render)
}
start()

function resize () {
    resizeCanvasToDisplaySize(gl.canvas, 1)
}
window.addEventListener('resize',resize)
resize()

