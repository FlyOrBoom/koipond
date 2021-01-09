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
                                case 0: case 1: return r*2-1
                                case 2: return r*2*Math.PI
                                case 3: return r*10
                            }
                        })
        this.ripples = new Float32Array(this.RIPPLE_COUNT*this.DIMENSIONS).map( _=> Math.random()*2-1 )
    }
    add (babies) {
        this.population += babies
        this.population = Math.max(0,Math.min(this.population,this.MAX_POPULATION))
    }
    update (time, delta) {
        for (let i = 0; i < this.population; i++) {

            const ID = i*this.ATTRIBUTES_PER_KOI
	    
            var [x,y,theta,style] = this.kois.slice(ID,this.ATTRIBUTES_PE_KOI)
            
            const [n,dn] = noise(time*this.SPEED+style*100);
            
            theta = n*Math.PI
	    
            const bimodal = normal(dn/100+1)+normal(dn/100-1) // Move fastest when rotating slightly
            x -= Math.cos(theta+Math.PI/2)*this.SPEED*bimodal
            y += Math.sin(theta+Math.PI/2)*this.SPEED*bimodal

            this.kois[ID+0] = torus(x,1)
            this.kois[ID+1] = torus(y,1)
            this.kois[ID+2] = mod(theta,2*Math.PI)
            this.kois[ID+3] = style
        }
    }
}
function mod(a,b){
    return a-b*Math.floor(a/b)
}
function torus(a,b){
    return mod(a-b,2*b)-b
}
function normal(a){
    return Math.exp(-a*a)
}
function noise(x){
    let y = 0, dy = 0
    for(let i = 0; i<5; i+=0.5){
        const e = Math.exp(i)
    	y += Math.sin(x*e)
        dy += e*Math.cos(x*e)
    }
    return [y,dy]
}
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
    uniform vec2 ripples[${pond.RIPPLE_COUNT}];

    const int MAX_POPULATION = ${pond.MAX_POPULATION};
    const float MAX_KOI_SIZE = ${pond.MAX_KOI_SIZE};
    const int SEED = ${pond.SEED};
    const int RIPPLE_COUNT = ${pond.RIPPLE_COUNT};

    const float PI = 3.14159;
    const float TAU = 6.28319;

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

//-- HASH
float hash(float p)
{
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}
highp float hash(highp vec2 p)
{
    vec3 p3 = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
vec2 hash2(vec2 p)
{
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);
}


//-- NOISE
float gradient( vec2 p )
{
    vec2 i = floor( p );
    vec2 f = fract( p );
	
	vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( dot( hash2( i + vec2(0,0) ), f - vec2(0,0) ), 
                     dot( hash2( i + vec2(1,0) ), f - vec2(1,0) ), u.x),
                mix( dot( hash2( i + vec2(0,1) ), f - vec2(0,1) ), 
                     dot( hash2( i + vec2(1,1) ), f - vec2(1,1) ), u.x), u.y);
}

float skin(vec2 p)
{
    return gradient(p);
}
//-- DISTANCE FUNCTIONS
float sdCircle( vec2 p, float r )
{
    return length(p) - r;
}

float sdEllipseBound(vec2 p, vec2 r)
{
    return sdCircle(p*vec2(r.y/r.x,1),r.y);
}
float sdEllipseApprox(vec2 p, vec2 r) 
{
    float k0 = length(p/r);
    float k1 = length(p/(r*r));
    return k0*(k0-1.0)/k1;
}
float sdParabola( in vec2 pos, in float wi, in float he )
{
    pos.x = abs(pos.x);

    float ik = wi*wi/he;
    float p = ik*(he-pos.y-0.5*ik)/3.0;
    float q = pos.x*ik*ik*0.25;
    
    float h = q*q - p*p*p;
    float r = sqrt(abs(h));

    float x = (h>0.0) ? 
        // 1 root
        pow(q+r,1.0/3.0) - pow(abs(q-r),1.0/3.0)*sign(r-q) :
        // 3 roots
        2.0*cos(atan(r/q)/3.0)*sqrt(p);
    
    x = min(x,wi);
    
    return length(pos-vec2(x,he-x*x/ik)) * 
           sign(ik*(pos.y-he)+pos.x*pos.x);
}
float sdDroplet( vec2 p, float r )
{
    return length(p-vec2(0.,r)) - r;
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
        r
    );
}
float sdRipple(vec2 p)
{
    float s = 0.; // sum of heights
    const float f = 32.; // frequency
    const float r = 1.5;
    int n = 2;
    float o = iTime*1.; // offset
    
    for (int i = 0; i<RIPPLE_COUNT; i++)
    {
        vec2 q = ripples[i];

        float d = length(p-q);

        if(d>r) continue;

        float x = f*d*d/r-o;
        float falloff = r-d;
        float w = mod(x,1.)*falloff;        
        
        if(w<.5) continue;

        float selective = floor(gradient(q+x)+.9);
        float h = floor(w*selective+.5)*falloff;
        s += h;
    }
    
    return clamp(s,0.,1.);
}
vec3 palette(float style)
{
    style = mod(style,10.);
    
    if ( style<1. )
        return vec3(.1,.1,.2); // black

    if ( style<2. )
        return vec3(.96,.33,.13); // chestnut

    if ( style<3. )
        return vec3(.9,.2,.2); // red
        
    if ( style<4. )
        return vec3(.9,.8,.8); // white
        
    if ( style<5. )
        return vec3(.8,.8,.9); //sky
        
    if ( style<6. )
        return vec3(.9,.3,.2); // orange
        
    if ( style<7. )
        return vec3(.9,.6,.7); // pink
        
    if ( style<8. )
        return vec3(.9,.9,.8); // sand
        
    if ( style<9. )
        return vec3(.3,.3,.9); // blue
    
    return vec3(.99,.72,.33); // gold
    
}
vec4 Koi(vec2 p,mat2 ro,float style)
{    
    vec3 col = palette(style);

    float d = 1.;
    bool shade = false;

    float r =    0.20*MAX_KOI_SIZE; // length of koi's semi-minor axis
    float body = 0.50*MAX_KOI_SIZE;
    float tail = 0.10*MAX_KOI_SIZE;
    float fins = 0.04*MAX_KOI_SIZE;
    float eyes = 0.02*MAX_KOI_SIZE;
    vec2 v = vec2(0,1);

    p *= ro;
    float dx = sin(4.*(iTime+style)+p.y*4.);
    dx /= 8.;
    dx *= p.y;
    p.x += dx;

    d = sdEgg(p,r); // body
    d = smin(d,sdCircle(p+r*v,r/2.),1.5*r);
    d = smin(d,sdDroplet(p-(body+tail/2.)*v,tail),2.1*r);

    float sdEyes = length(vec2(abs(p.x)-5.*eyes,p.y+1.2*r)-vec2(0.,0.));

    if( d<0. ){
        vec2 q = (p+hash(style))/MAX_KOI_SIZE;
        float t = 0.; // threshold
        t = min(1.,(p.y-body*.9)*16.); // keep out of tail
        t = max(t,min(1.,-d/r/16.)); // keep near edge

        float s1 = skin(4.*q-9.);
        float s2 = skin(8.*q+9.)*max(0.,s1+0.1);
        if(s1>t)
            col = mix(col,palette(style+2.),.8);
            
        if(s2>t)
            col = mix(col,palette(style-2.),.8);
    }
    
    if(sdEyes<eyes) col = vec3(0);

    float f = sdFins(p,r,fins);

    d = min(d,f);
    d /= r;

    col = clamp(col,0.,1.);
    
    return vec4(col,d);
}


void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (2.0*fragCoord-iResolution.xy)/min(iResolution.x,iResolution.y); // normalize coordinates    
    
    vec3 col = vec3(.7,.9,.8); // background color
            
    bool shadow = false;
    
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
            col = koiCol.rgb;
            break;
        }
        
    }
        
    col *= 1.+sdRipple(uv)/10.;
        
    fragColor = vec4(col,1);
    
}
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
    population: gl.getUniformLocation(program, "population"),
    ripples: gl.getUniformLocation(program, "ripples")
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
    requestAnimationFrame(render)
}
start()

function resize () {
    resizeCanvasToDisplaySize(gl.canvas, 1.0)
}
window.addEventListener('resize',resize)
resize()

