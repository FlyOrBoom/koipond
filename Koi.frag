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
float value( in vec2 p )
{
    vec2 i = floor( p );
    vec2 f = fract( p );
	
	vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( dot( hash2( i + vec2(0.0,0.0) ), f - vec2(0.0,0.0) ), 
                     dot( hash2( i + vec2(1.0,0.0) ), f - vec2(1.0,0.0) ), u.x),
                mix( dot( hash2( i + vec2(0.0,1.0) ), f - vec2(0.0,1.0) ), 
                     dot( hash2( i + vec2(1.0,1.0) ), f - vec2(1.0,1.0) ), u.x), u.y);
}


float skin(vec2 p, float d, float style)
{
    float r = hash(style);
    return .3*d+pow(
        cos(value(p/2.+r*100.)),
        50.
    );

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
float sdVesica(vec2 p, float r, float d)
{
    return length(abs(p)-vec2(-d,0))-r;
}
float sdGinko(vec2 p, float r, float m)
{
    float cut = sdCircle(vec2(abs(p.x)-r,-p.y),r);
    return max(sdCircle(p,r),-cut);
}
float sdCrescent(vec2 p, float r)
{
    return max(
        sdCircle(vec2(abs(p.x)-r/2.,p.y),r),
        -sdCircle(vec2(abs(p.x)-r/2.,p.y-r/1.9),r)
    );
}
float sdKoi(vec2 p)
{
    float d = 1.;

    float r =    0.15*MAX_KOI_SIZE; // length of koi's semi-minor axis
    float head = 0.30*MAX_KOI_SIZE;
    float body = 0.50*MAX_KOI_SIZE;
    float tail = 0.30*MAX_KOI_SIZE;
    float fins = 0.13*MAX_KOI_SIZE;

    if(p.y < 0. ) { // if pixel in head
        d = sdEllipseApprox(p,vec2(r,head));
    } else if(p.y>body){ // if pixel in tail
        d = sdGinko(p-vec2(0,body),tail,2.5);
    }else {
        float vesica_r = (body*body/r+r)/2.; //radii of the two circles that intersect to form a body-high vesica
        d = sdVesica(p,vesica_r,vesica_r-r);
    }
    d = min(d,sdCrescent(p,fins));
    d /= r;
    return d;
}

//-- KOI
vec3 colKoi(vec2 p, float d, float style)
{        
    vec2 q = (p+style)/MAX_KOI_SIZE;
        
    vec3 col = vec3(1);
        
    if(skin(5.*q+3.,d,style)<.8){
    
        if(style>.8) {
            col = vec3(1,0,0);
        } else if(style>.6) { // Shiro
            col = vec3(1,.5,0);
        } else if(style>.4) {
            col = vec3(1,0,.5);
        } else if(style>.2) {
            col = vec3(0,0,1);
        } else { // Tancho
            col = vec3(0,.5,1);
        }
        
    }
            
    float h = clamp(-d,0.,1.); // "height" of koi
    
    col = clamp(col,0.,1.);
    
    //col *= ceil(3.*h)/6.+.5; // shadow
    
    return col;
}

vec2 warp(vec2 p, mat2 r, float style, float ripple){
    p *= r;
    p.x += sin(8.*(iTime+style)+p.y*3.)*.1*p.y;
    return p;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (2.0*fragCoord-iResolution.xy)/min(iResolution.x,iResolution.y); // normalize coordinates    
    vec3 col = vec3(1); // background color
    float ripple = value(uv*2.+iTime*2.);
    uv *= 1.+ripple/64.;

    bool shadow = false;
    
    for(int id=0; id<MAX_POPULATION; id++) // front to back
    {
        if(id==population) break;

        vec4 koi = kois[id];
        
        vec2 p = koi.xy;
        mat2 r = rot(koi.z);
        float style = koi.w;
        
        p += uv;
        p = mod(p-1.,2.)-1.; // tile
        
        if(length(p)>MAX_KOI_SIZE) continue; // skip to next koi if outside bounding circle

        vec2 pKoi = warp(p,r,style,ripple);
        
        float eyes = length(vec2(abs(pKoi.x)-.03,pKoi.y+.06)-vec2(0.,0.));
        if(eyes<0.01) { // eyeballs
            col = vec3(0);
            break;
        }

        float d = sdKoi(pKoi); // exact bounds

        if(d<3.) // if within koi use its color
        {
            col = colKoi(uv, d, style);
        }
        if(d<.2)
        {
            if(d>0.) col *= 0.;
            break;
        }
        
        
        vec2 pShadow = warp(p-uv/16.,r,style,ripple);

        shadow = shadow || sdKoi(pShadow)<0.;
    }
    
    uv *= 1.-ripple/12.;

    
    fragColor = vec4(col,1);
    
}
