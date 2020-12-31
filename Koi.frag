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
float skin(vec2 p, float style)
{
    return floor(0.5+pow(
        cos(value(p)/2.),
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
float sdEllipseApprox(vec2 p, vec2 r) 
{
    float k0 = length(p/r);
    float k1 = length(p/(r*r));
    return k0*(k0-1.0)/k1;
}
float sdVesica(vec2 p, float r, float d)
{
    return length(abs(p)-vec2(-d,0))-r;
}
float sdGinko(vec2 p, float r, float m)
{
    float bias = (sign(p.x)*sin(iTime*8.))*.3+1.;
    float cut = sdCircle(vec2(abs(p.x)-r*bias,-p.y),r*bias);
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
    float tail = 0.30*MAX_KOI_SIZE;
    float fins = 0.10*MAX_KOI_SIZE;

    if(p.y < 0. ) { // if pixel is at the head
        d = sdEllipseApprox(p,vec2(r,head));
    } else if(p.y>body){
        d = sdGinko(p-vec2(0,body),tail,2.5);
    }else {
        float vesica_r = (body*body/r+r)/2.; //radii of the two circles that intersect to form a body-high vesica
        d = sdVesica(p,vesica_r,vesica_r-r);
    }
    d = min(d,sdCrescent(p,fins));
    d /= r;
    return d;
}
float sdRipple(vec2 uv)
{
    float h = 0.;
    for (float x = -1.; x<1.; x+=RIPPLE_DIVS)
    {
        for (float y=-1.; y<1.; y+=RIPPLE_DIVS)
        {
	    vec2 p = vec2(x,y);
            vec2 displacement = vec2(hash(p.xy),hash(p.yx))*2.-1.;
            
            float radius = length(uv-p-displacement);

            float n = iTime-length(displacement)*5.;
            float frequency = radius*80.;
            
            float wave = sin(frequency-(TAU*n));

            h += wave;	

        }
    }
    return h;
}

//-- KOI
vec3 colKoi(vec2 p, float d, int id)
{
    vec3 outline = vec3(0);
    if(d>0.) return outline;
        
    float style = hash(float(100*id+SEED));
    vec2 q = 5.*(p+style)/MAX_KOI_SIZE;
    float mask = skin(q+3.,style);
    
    if(style>.8) return mask*vec3(0,.5,1);
    if(style>.6) return mask+vec3(1,0,0);
    if(style>.4) return mask+vec3(1,.5,0);
    return mask*vec3(1.,.5,.5)+vec3(1,.3,0);
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (2.0*fragCoord-iResolution.xy)/min(iResolution.x,iResolution.y); // normalize coordinates    
    vec3 col = vec3(0);
    
    float ripples = sdRipple(uv);
    
    uv+=ripples/800.;

    col *= 2.;

    float shadow = 0.;

    for(int id=0; id<MAX_POPULATION; id++) // front to back
    {
        if(id==population) { // background color if no fish found
            col = vec3(0.8);
            break;
        }

        vec3 koi = kois[id].xyz;

        if(length(uv+koi.xy)>MAX_KOI_SIZE) continue; // bounding circle

        //col += .5;

        vec2 p = (uv+koi.xy)*rot(koi.z);

        p.x+=sin(iTime+p.y*3.+float(id))*.1*p.y; // warp swimming

        float d = sdKoi(p); // exact bounds

        if(d<.2){
            col = colKoi(p, d, id);
            break;
        }

        shadow = min(shadow,
            sdEllipseBound(
                p-uv/8., // more abberation near the edges
                MAX_KOI_SIZE*vec2(.3,.8)
            )
        );
    }

    col *= 1.+.5*shadow*shadow*shadow;
    //col += ripples;

    fragColor = vec4(col,1);
}
