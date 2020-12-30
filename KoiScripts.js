class KoiPond {
    constructor () {
        this.ATTRIBUTES_PER_KOI = 4
        this.MAX_POPULATION = 64
        this.MAX_KOI_SIZE = 0.5
        this.SEED = Math.round(Math.random()*128)

        this.population = 1
        this.kois = new Float32Array(this.MAX_POPULATION*this.ATTRIBUTES_PER_KOI)
                     .map( koiAttribute => Math.random()-0.5 )
    }
    add ( babies ) {
        this.population += babies
        this.population = Math.max(0,Math.min(this.population,this.MAX_POPULATION))
    }
    update ( delta ) {
        for (let i = 0; i < this.MAX_POPULATION; i+= this.ATTRIBUTES_PER_KOI) {
            const ID = i*this.ATTRIBUTES_PER_KOI
            var x = kois[ID+0]
            var y = kois[ID+1]
            var theta = kois[ID+3]
            // fishes[ID+4] is for something. Dunno what yet
        }
    }
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
    precision highp float;
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
/* 
 * Koi Pond by Xing Liu (MIT License, 2020)
 * [WIP]
 *
 * Includes code by...
 * - Dave Hoskins: Hash without Sine (https://www.shadertoy.com/view/4djSRW)
 * - Inigo Quilez: 2D SDFs (https://www.iquilezles.org/www/articles/distfunctions2d/distfunctions2d.htm)
 * - Basmanov Daniil: Regular polygon SDF (https://www.shadertoy.com/view/MtScRG)
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
vec3 gamma(vec3 c)
{
    return pow(c,vec3(1./1.6));
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

//-- NOISE
float value(vec2 p)
{
    vec2 i = floor(p);
    vec2 f = fract(p);
	
	vec2 u = f*f*(3.-2.*f);

    return mix( mix(hash(i+vec2(0,0)),
                    hash(i+vec2(1,0)),
                    u.x),
                    
                mix(hash(i+vec2(0,1)),
                    hash(i+vec2(1,1)),
                    u.x),
                    
                u.y) - 0.5;
}
float fractal(vec2 p)
{
    return
      value(p)
    + value(p*2.)/2.
    + value(p*4.)/4.
    + value(p*8.)/8.
    ;
}
float skin(vec2 p, float style)
{
    return round(pow(
        cos(fractal(p)/2.),
        50.*ceil(style*6.) // Variation in darkness
    ));

}
//-- DISTANCE FUNCTIONS
float sdCircle( vec2 p, float r )
{
    return length(p) - r;
}

float sdEllipseBound(vec2 p, vec2 r) // Bound
{
    return sdCircle(p*vec2(r.y/r.x,1),r.y);
}
float sdEllipseApprox(vec2 p, vec2 r) // Bound + smoothly connects with other SDFs
{
    return mix(
        sdEllipseBound(p,r),
        abs(p.x)-r.x,
        max(0.,r.y-abs(p.y))/r.y
    );
}

float sdVesica(vec2 p, float r, float d)
{
    return length(abs(p)-vec2(-d,0))-r;
}
float sdGinko(vec2 p, float r, float m)
{
    float bias = .7+(sign(p.x)*sin(iTime*2.))/2.;
    float cut = sdEllipseBound(vec2(abs(p.x),-p.y)-r,vec2(r,r*m/bias));
    return max(sdCircle(p,r),-cut);
}
float sdCrescent(vec2 p, float r)
{
    return max(
        sdCircle(vec2(abs(p.x)-r/2.,p.y),r),
        -sdCircle(vec2(abs(p.x)-r/2.,p.y-r/1.9),r)
    );
}
float sdPolygon(vec2 p, float vertices, float radius)
{
    float segmentAngle = TAU/vertices;
    float halfSegmentAngle = segmentAngle*0.5;

    float angleRadians = atan(p.x, p.y);
    float repeat = mod(angleRadians, segmentAngle) - halfSegmentAngle;
    float inradius = radius*cos(halfSegmentAngle);
    float circle = length(p);
    float x = sin(repeat)*circle;
    float y = cos(repeat)*circle - inradius;

    float inside = min(y, 0.0);
    float corner = radius*sin(halfSegmentAngle);
    float outside = length(vec2(max(abs(x) - corner, 0.0), y))*step(0.0, y);
    return inside + outside;
}
float sdKoi(vec2 p)
{
    float d = 1.;

    float r =    0.10*MAX_KOI_SIZE; // length of koi's semi-minor axis
    float head = 0.25*MAX_KOI_SIZE;
    float body = 0.50*MAX_KOI_SIZE;
    float tail = 0.20*MAX_KOI_SIZE;
    float fins = 0.10*MAX_KOI_SIZE;

    if(p.y < 0. ) { // if pixel is at the head
        d = sdEllipseApprox(p,vec2(r,head));
    } else {
        float vesica_r = (body*body/r+r)/2.; //radii of the two circles that intersect to form a body-high vesica
        d = sdVesica(p,vesica_r,vesica_r-r);
    }
    d = smin(d,sdGinko(p-vec2(0,body),tail,2.5),0.05);
    d = min(d,sdCrescent(p,fins));
    d *= exp2(-p.x*p.x*2000.)*.6+.4;
    d /= r;
    return d;
}
float sdRipple(vec2 p)
{
    return fractal(p+iTime);
}

//-- KOI
vec3 colKoi(vec2 p, float d, int id)
{
    float style = hash(float(100*id+SEED));
    
    //-- MARBLE COLORS
    vec2 q = 5.*(p+style)/MAX_KOI_SIZE;
    vec3 col = vec3(1.,vec2(skin(q+3.,style)));
        
    float h = min(-2.*d,1.); // "height" of koi
    
    return col;//*pow(h,.6);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (2.0*fragCoord-iResolution.xy)/min(iResolution.x,iResolution.y); // normalize coordinates    
    vec3 col = vec3(0);
    float vignette = 1.;//-length(uv);
    
    if(vignette > 0.){
    
        col = vec3(.4); // color
        float ripples = sdRipple(uv);
        uv += ripples/50.;

        //col *= 1.+round(fractal(uv*5.)*2.)/2.;
        col *= 2.;
        
        float shadow = 0.;

        for(int id=0; id<MAX_POPULATION; id++) // front to back
        {
            if(id==population) break;

            vec3 koi = kois[id].xyz;

            if(length(uv+koi.xy)>MAX_KOI_SIZE) continue; // bounding circle
            
            //col += .5;

            vec2 p = (uv+koi.xy)*rot(koi.z);

            p.x+=sin(iTime+p.y*3.+float(id))*.1*p.y; // warp swimming

            float d = sdKoi(p); // exact bounds

            if(d<0.1){
                col *= 0.;
                col += colKoi(p, d, id);
                if(d>0.) col *= 0.;
                break;
            }
            
            shadow = min(shadow,
                sdEllipseBound(
                    p-uv/8., // more abberation near the edges
                    MAX_KOI_SIZE*vec2(.3,.8)
                )
            );
        }
        
        col *= 1.+.5*shadow;
        //col *= 1.+ripples/3.;
        col *= vignette;
        
        col = gamma(col);
    }
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
    resizeCanvasToDisplaySize(gl.canvas, 0.5) // Half resolution sampling
}
window.addEventListener('resize',resize)
resize()

