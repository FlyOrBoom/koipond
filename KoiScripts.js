class KoiPond {
    constructor () {
        this.DIMENSIONS = 2

        this.ATTRIBUTES_PER_KOI = this.DIMENSIONS + 2
        this.MAX_POPULATION = 64
        this.MAX_KOI_SIZE = 0.3
        this.RIPPLE_COUNT = 6
        this.SEED = Math.round(Math.random()*128)

        this.SPEED = 4e-3

        this.population = 1
        this.kois = new Float32Array(this.MAX_POPULATION*this.ATTRIBUTES_PER_KOI)
                        .map( (koiAttribute, index) => {
                            const r = Math.random()
                            switch( index%4 ){
                                case 0: case 1: return r-0.5
                                case 2: return r*2*Math.PI
                                case 3: return r*10
                            }
                        })
        this.ripples = new Float32Array(this.RIPPLE_COUNT*this.DIMENSIONS).map( _=> (Math.random()*2-1))
    }
    add (babies) {
        this.population += babies
        this.population = Math.max(0,Math.min(this.population,this.MAX_POPULATION))
    }
    update (time, delta) {
        for (let i = 0; i < this.population; i++) {

            const ID = i*this.ATTRIBUTES_PER_KOI
	    
            var [x,y,theta,style] = this.kois.slice(ID,this.ATTRIBUTES_PE_KOI)
            
            const n = this.noise(time*this.SPEED+style*100)*delta;
            
            theta += n*Math.PI*this.SPEED*32
	    
            const bimodal = this.normal(n+1)+this.normal(n-1) // Move fastest when rotating slightly
            x -= Math.cos(theta+Math.PI/2)*this.SPEED*bimodal
            y += Math.sin(theta+Math.PI/2)*this.SPEED*bimodal

            this.kois[ID+0] = this.torus(x,1)
            this.kois[ID+1] = this.torus(y,1)
            this.kois[ID+2] = this.mod(theta,2*Math.PI)
            this.kois[ID+3] = style
        }
    }
    mod = (a,b) => a-b*Math.floor(a/b)
    torus = (a,b) => this.mod(a-b,2*b)-b
    normal = (a) => Math.exp(-a*a)

    noise(x){
        let y = 0
        for(let i = 0; i<5; i+=0.5){
            const e = Math.exp(i)
            y += Math.sin(x*e)
        }
        return y
    }

    set background(color){
        document.body.style.background = color
    }
}
class KoiOverlay {
    constructor () {
        this.overlay = document.querySelector('svg')
        this.namespace = 'http://www.w3.org/2000/svg'
    }
    render () {
        const ripple = document.createElementNS(this.namespace,'circle')
        ripple.setAttribute('class','ripple')
        ripple.setAttribute('cx',Math.random()-.5)
        ripple.setAttribute('cy',Math.random()-.5)
        this.overlay.append(ripple) 
        setTimeout(()=>{ripple.remove()},5000)
        setTimeout(()=>{this.render()},Math.random()*512)
    }
}"use strict"

const canvas = document.querySelector("canvas")
const svg = document.querySelector("svg")
const debug = document.querySelector("div")
const gl = canvas.getContext("webgl")
const pond = new KoiPond()
const overlay = new KoiOverlay()

pond.background = "hsl(150deg,50%,80%)"

overlay.render()
const defaultShaderType = [
    'VERTEX_SHADER',
    'FRAGMENT_SHADER',
];

/**
 * Wrapped logging function.
 * @param {string} msg The message to log.
 */
function error(msg) {
    if (window.console) {
        if (window.console.error) {
            window.console.error(msg);
        } else if (window.console.log) {
            window.console.log(msg);
        }
    }
}

/**
 * Creates a program, attaches shaders, binds attrib locations, links the
 * program and calls useProgram.
 * @param {WebGLShader[]} shaders The shaders to attach
 * @param {string[]} [opt_attribs] An array of attribs names. Locations will be assigned by index if not passed in
 * @param {number[]} [opt_locations] The locations for the. A parallel array to opt_attribs letting you assign locations.
 * @param {module:webgl-utils.ErrorCallback} opt_errorCallback callback for errors. By default it just prints an error to the console
 *        on error. If you want something else pass an callback. It's passed an error message.
 * @memberOf module:webgl-utils
 */
function createProgram(
    gl, shaders, opt_attribs, opt_locations, opt_errorCallback) {
    const errFn = opt_errorCallback || error;
    const program = gl.createProgram();
    shaders.forEach(function(shader) {
        gl.attachShader(program, shader);
    });
    if (opt_attribs) {
        opt_attribs.forEach(function(attrib, ndx) {
            gl.bindAttribLocation(
                program,
                opt_locations ? opt_locations[ndx] : ndx,
                attrib);
        });
    }
    gl.linkProgram(program);

    // Check the link status
    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
        // something went wrong with the link
        const lastError = gl.getProgramInfoLog(program);
        errFn('Error in program linking:' + lastError);

        gl.deleteProgram(program);
        return null;
    }
    return program;
}


/**
 * Loads a shader.
 * @param {WebGLRenderingContext} gl The WebGLRenderingContext to use.
 * @param {string} shaderSource The shader source.
 * @param {number} shaderType The type of shader.
 * @param {module:webgl-utils.ErrorCallback} opt_errorCallback callback for errors.
 * @return {WebGLShader} The created shader.
 */
function loadShader(gl, shaderSource, shaderType, opt_errorCallback) {
    const errFn = opt_errorCallback || error;
    // Create the shader object
    const shader = gl.createShader(shaderType);

    // Load the shader source
    gl.shaderSource(shader, shaderSource);

    // Compile the shader
    gl.compileShader(shader);

    // Check the compile status
    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        // Something went wrong during compilation; get the error
        const lastError = gl.getShaderInfoLog(shader);
        errFn('*** Error compiling shader \'' + shader + '\':' + lastError + `\n` + shaderSource.split('\n').map((l, i) => `${i + 1}: ${l}`).join('\n'));
        gl.deleteShader(shader);
        return null;
    }

    return shader;
}

/**
 * Creates a program from 2 sources.
 *
 * @param {WebGLRenderingContext} gl The WebGLRenderingContext
 *        to use.
 * @param {string[]} shaderSourcess Array of sources for the
 *        shaders. The first is assumed to be the vertex shader,
 *        the second the fragment shader.
 * @param {string[]} [opt_attribs] An array of attribs names. Locations will be assigned by index if not passed in
 * @param {number[]} [opt_locations] The locations for the. A parallel array to opt_attribs letting you assign locations.
 * @param {module:webgl-utils.ErrorCallback} opt_errorCallback callback for errors. By default it just prints an error to the console
 *        on error. If you want something else pass an callback. It's passed an error message.
 * @return {WebGLProgram} The created program.
 * @memberOf module:webgl-utils
 */
function createProgramFromSources(
    gl, shaderSources, opt_attribs, opt_locations, opt_errorCallback) {
    const shaders = [];
    for (let ii = 0; ii < shaderSources.length; ++ii) {
        shaders.push(loadShader(
            gl, shaderSources[ii], gl[defaultShaderType[ii]], opt_errorCallback));
    }
    return createProgram(gl, shaders, opt_attribs, opt_locations, opt_errorCallback);
}

/**
 * Resize a canvas to match the size its displayed.
 * @param {HTMLCanvasElement} canvas The canvas to resize.
 * @param {number} [multiplier] amount to multiply by.
 *    Pass in window.devicePixelRatio for native pixels.
 * @return {boolean} true if the canvas was resized.
 * @memberOf module:webgl-utils
 */
function resizeCanvasToDisplaySize(canvas, multiplier) {
    multiplier = multiplier || 1;
    const width = canvas.clientWidth * multiplier | 0;
    const height = canvas.clientHeight * multiplier | 0;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}


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

    // BEGIN Insert Koi.frag here
/* 
 * Koi Pond by Xing Liu (MIT License, 2020)
 * [WIP]
 *
 * Includes code by...
 * - Dave Hoskins: Hash without Sine (https://www.shadertoy.com/view/4djSRW)
 * - Inigo Quilez: 2D SDFs (https://www.iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm)
 *
 */

//-- UTILS
float smin(float a, float b, float k)
{
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}
mat2 rot(float theta)
{
    float x = cos(theta);
    float y = sin(theta);
    return mat2(x,-y,y,x);
}

float gradient(vec2 p)
{
    return texture2D(gradientSampler,p-.5).r-.5;
}
//-- DISTANCE FUNCTIONS
float sdCircle( vec2 p, float r )
{
    return length(p) - r;
}
float sdDroplet( vec2 p, float r )
{
    return length(p-vec2(0,r)) - r;
}
float sdEgg( vec2 p, float r )
{
    const float k = sqrt(3.0);
    p.x = abs(p.x);
    return ((p.y<0.0)       ? length(vec2(p.x,  p.y    )) - r :
            (k*(p.x+r)<p.y) ? length(vec2(p.x,  p.y-k*r)) :
                              length(vec2(p.x+r,p.y    )) - 2.0*r);
}
float sdFins(vec2 p, float r, float size)
{
    float side = sign(p.x)*PI/2.;
    p.x = abs(p.x)-r/2.-size*3.;
    return smin(
        sdCircle(p-vec2(0,cos(4.*iTime+p.y*8.+side)/8.-r/8.)/4.,size/2.),
        sdCircle(p,size),
        1.2*r
    );
}
vec3 palette(float style)
{
    float s = mod(style,10.);
    
    if ( s<1. )
        return vec3(.1,.1,.2); // black

    if ( s<2. )
        return vec3(.96,.33,.13); // chestnut

    if ( s<3. )
        return vec3(.9,.2,.2); // red
        
    if ( s<4. )
        return vec3(.9,.8,.8); // white
        
    if ( s<5. )
        return vec3(.8,.8,.9); //sky
        
    if ( s<6. )
        return vec3(.9,.3,.2); // orange
        
    if ( s<7. )
        return vec3(.9,.6,.7); // pink
        
    if ( s<8. )
        return vec3(.9,.9,.8); // sand
        
    if ( s<9. )
        return vec3(.3,.3,.9); // blue
    
    return vec3(.99,.72,.33); // gold
    
}
vec4 Koi(vec2 p,mat2 ro,float style)
{    
    vec3 col = palette(style);

    float d = 1.;

    float R = MAX_KOI_SIZE / (1.+fract(style)/4.);
    float r =    0.20*R; // length of koi's semi-minor axis
    float body = 0.50*R;
    float tail = 0.10*R;
    float fins = 0.04*R;
    float eyes = 0.02*R;
    const vec2 v = vec2(0,1);
    const vec2 h = vec2(1,0);

    p *= ro;
    float dx = sin(4.*(iTime+style)+p.y*4.);
    dx /= 8.;
    dx *= p.y;
    p.x += dx;

    d = sdEgg(p,r); // body
    
    d = smin(d,
        sdCircle(p+r*v,r/2.),
        1.5*r); // head
    d = smin(d,
        sdDroplet(p-(body+tail/2.)*v,tail),
        2.1*r); // tail
    d = smin(d,
        sdCircle(p-(cos(4.*iTime)/32.*h)-(body+tail*2.)*v,0.),
        1.3*r); //tail

    float sdEyes = length(vec2(abs(p.x)-5.*eyes,p.y+1.2*r));

    float f = sdFins(p,r,fins);

    if(d<f){
        vec2 q = (p+fract(style))/MAX_KOI_SIZE;
        float t = 0.; // threshold
        t = clamp(
            (p.y-body*.9)*32.,
            0.,
            1. // keep out of tail
        ); 

        float m1 = gradient(q);
        float m2 = mod(m1*PI,1.)-.5;
        if(m1>t)
            col = mix(col,palette(style+2.),.8);
        
        if(m2>t)
            col = mix(col,palette(style-2.),.8);
        
        if(sdEyes<eyes) col = vec3(0);
    }

    d = min(d,f);
    d /= r;

    col = clamp(col,0.,1.);
    
    return vec4(col,d);
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (2.0*fragCoord-iResolution.xy)/min(iResolution.x,iResolution.y); // normalize coordinates    
    
    fragColor = vec4(0);

    for(int id=0; id<MAX_POPULATION; id++) // front to back
    {
        if(id==population) break;

        vec4 koi = kois[id];
        
        vec2 p = koi.xy;
        mat2 ro = rot(koi.z);
        float style = koi.w;
     
        p += uv;
        p = mod(p-1.,2.)-1.; // tile
        
        if(length(p)>MAX_KOI_SIZE) continue; // skip to next koi if outside bounding circle
        
        vec4 koiCol = Koi(p,ro,style); // exact bounds

        if(koiCol.a<0.) // if within koi use its color
        {
            fragColor = vec4(koiCol.rgb,1.);
            return;
        }
        
    }
        
}
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

