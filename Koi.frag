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
        r
    );
}
float sdRipple(vec2 p)
{
    float s = 0.; // sum of heights
    const float f = 32.; // frequency
    const float r = 1.5;
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
    bool shade = false;

    const float r =    0.20*MAX_KOI_SIZE; // length of koi's semi-minor axis
    const float body = 0.50*MAX_KOI_SIZE;
    const float tail = 0.10*MAX_KOI_SIZE;
    const float fins = 0.04*MAX_KOI_SIZE;
    const float eyes = 0.02*MAX_KOI_SIZE;
    const vec2 v = vec2(0,1);

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
        vec2 q = (p+style/10.)/MAX_KOI_SIZE;
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
