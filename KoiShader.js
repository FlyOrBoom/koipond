
const timeSamples = Array(32)

const gradient = gl.createTexture()
const gradient_png = new Image()
gradient_png.onload = () => {
    gl.bindTexture(gl.TEXTURE_2D,gradient)
    gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,gradient_png)
    gl.generateMipmap(gl.TEXTURE_2D)
}
gradient_png.src = "gradient.png"

const vert = `
    attribute vec4 vPosition;
    void main() {
      gl_Position = vPosition;
    }
`

const frag = `
    precision mediump float;

    uniform vec2 iResolution;
    uniform float iTime;
    uniform vec4 kois[${pond.MAX_POPULATION}];
    uniform int population;
    uniform vec2 ripples[${pond.RIPPLE_COUNT}];

    uniform sampler2D gradientSampler;

    const int MAX_POPULATION = ${pond.MAX_POPULATION};
    const float MAX_KOI_SIZE = ${pond.MAX_KOI_SIZE};
    const int SEED = ${pond.SEED};

    const float PI  = 3.14159;
    const float TAU = 6.28319;
    const float PHI = 1.61803;
    const vec2 V = vec2(0,1);
    const vec2 H = vec2(1,0);

    #define aa 3./iResolution.x
    
    // BEGIN Insert Koi.frag here
    // END

    void main() {
       mainImage(gl_FragColor, gl_FragCoord.xy);
    }
`

// setup GLSL program
const program = createProgramFromSources(gl, [vert, frag])

// look up where the vertex data needs to go.
const handles = {
    position: gl.getAttribLocation(program, "vPosition"),
    resolution: gl.getUniformLocation(program, "iResolution"),
    time: gl.getUniformLocation(program, "iTime"),
    kois: gl.getUniformLocation(program, "kois"),
    population: gl.getUniformLocation(program, "population"),
    ripples: gl.getUniformLocation(program, "ripples"),
    gradientSampler: gl.getUniformLocation(program, "gradientSampler")
}

const positionBuffer = gl.createBuffer();

// Bind it to ARRAY_BUFFER (think of it as ARRAY_BUFFER = positionBuffer)
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, // first triangle
    +1, -1,
    -1, +1,
    -1, +1, // second triangle
    +1, -1,
    +1, +1,
]), gl.STATIC_DRAW)

gl.vertexAttribPointer(
    handles.position,
    2, // 2 components per iteration
    gl.FLOAT, // the data is 32bit floats
    false, // don't normalize the data
    0, // 0 = move forward size * sizeof(type) each iteration to get the next position
    0, // start at the beginning of the buffer
)

gl.enable(gl.CULL_FACE)
gl.cullFace(gl.BACK)

gl.useProgram(program)
gl.enableVertexAttribArray(handles.position)

let then = 0
let time = 0
let running = false

function prerender(){
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D,gradient)
    gl.uniform1i(handles.gradientSampler,0)
}
function render(now) {
    now *= 0.001 // convert to seconds
    const delta = Math.min(now - then, 0.1)

    timeSamples.shift()
    timeSamples.push(delta)
    debug.innerText = Math.round(10 * timeSamples.length / timeSamples.reduce((a, b) => a + b, 0)) / 10 + ' fps'

    time += delta
    then = now
    
    pond.update(time, delta)

    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)

    gl.uniform2f(handles.resolution, gl.canvas.width, gl.canvas.height)
    gl.uniform1f(handles.time, time)
    gl.uniform4fv(handles.kois, pond.kois)
    gl.uniform1i(handles.population, pond.population)
    gl.uniform2fv(handles.ripples, pond.ripples)

    gl.drawArrays(gl.TRIANGLES, 0, 6)

    if(running) requestAnimationFrame(render)
}

function stop () {
    running = false
}
function start () {
    if(running) return
    running = true
    prerender()
    requestAnimationFrame(render)
}

start()

function resize () {
    resizeCanvasToDisplaySize(gl.canvas, 1.0)
}
window.addEventListener('resize',resize)
resize()

