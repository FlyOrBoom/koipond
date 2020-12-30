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
float smin( float a, float b, float k )
{
    float h = clamp( 0.5+0.5*(b-a)/k, 0.0, 1.0 );
    return mix( b, a, h ) - k*h*(1.0-h);
}
mat2 rot(float theta){
    float co = cos(theta);
    float si = sin(theta);
    return mat2(co,-si,si,co);
}
float bias(float x, float b) {
    return  x/((1./b-2.)*(1.-x)+1.);
}
vec3 gamma(vec3 c)
{
    return pow(c,vec3(1./1.6));
}

//-- HASH
float hash11(float p)
{
    p = fract(p * .1031);
    p *= p + 33.33;
    p *= p + p;
    return fract(p);
}
float hash12(vec2 p)
{
    vec3 p3  = fract(vec3(p.xyx) * .1031);
    p3 += dot(p3, p3.yzx + 33.33);
    return fract((p3.x + p3.y) * p3.z);
}
vec2 hash22(vec2 p)
{
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yzx+33.33);
    return fract((p3.xx+p3.yz)*p3.zy);

}
vec4 hash42(vec2 p)
{
    vec4 p4 = fract(vec4(p.xyxy) * vec4(.1031, .1030, .0973, .1099));
    p4 += dot(p4, p4.wzxy+33.33);
    return fract((p4.xxyz+p4.yzzw)*p4.zywx);
}
vec3 hash31(float p)
{
   vec3 p3 = fract(vec3(p) * vec3(.1031, .1030, .0973));
   p3 += dot(p3, p3.yzx+33.33);
   return fract((p3.xxy+p3.yzz)*p3.zyx); 
}
vec3 hash32(vec2 p)
{
	vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973));
    p3 += dot(p3, p3.yxz+33.33);
    return fract((p3.xxy+p3.yzz)*p3.zyx);
}

//-- NOISE
float value( vec2 p )
{
    vec2 i = floor( p );
    vec2 f = fract( p );
	
	vec2 u = f*f*(3.0-2.0*f);

    return mix( mix( hash12( i + vec2(0.0,0.0) ), 
                     hash12( i + vec2(1.0,0.0) ), u.x),
                mix( hash12( i + vec2(0.0,1.0) ), 
                     hash12( i + vec2(1.0,1.0) ), u.x), u.y);
}
float fractal( vec2 p )
{
    mat2 m = mat2(.8,.6,-.6,.8);
    float f = 0.;
    f += 0.5000*(-1.0+2.0*value(p)); p *= m*2.02;
    f += 0.2500*(-1.0+2.0*value(p)); p *= m*2.03;
    f += 0.1250*(-1.0+2.0*value(p)); p *= m*2.01;
    f += 0.0625*(-1.0+2.0*value(p));

    return f/0.9375;
}
float skin(vec2 p, float style)
{
    float s = pow(
        cos(fractal(p)/2.),
        25.*ceil(style*6.) // Variation in darkness
    );
    return s*s;

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
vec4 colKoi( vec2 p, float d, int id )
{
    //-- koi STATS
    float style = hash11(float(100*id+SEED));
    
    float h = -min(d,0.); // "height" of koi

    //-- MARBLE COLORS
    vec2 q = 5.*(p+style)/MAX_KOI_SIZE;
    vec4 col = vec4(
        skin(q+2.,style),
        skin(q+3.,style),
        skin(q+4.,style),
        1
    );

    if(style>.8){
        col.r = sqrt(col.g) + col.b;
        col.g *= .3;
        col.b = .0;
    }else if(style>.6){
        col.b = col.r*col.b;
        col.g = col.b;
    }else if(style>.4){
        col.r = 1.;
        col.g = min(col.g,col.r);
        col.b = col.g*.5;
    }else{
        col.b *= col.r*col.g;
        col.g *= col.b;
        col.r *= col.g;
    }
    col.a = pow(h,.6);


    return col;
}

void mainImage( out vec4 fragColor, in vec2 fragCoord )
{
    vec2 uv = (2.0*fragCoord-iResolution.xy)/min(iResolution.x,iResolution.y); // normalize coordinates    
    vec3 col = vec3(0);
    float vignette = 1.-length(uv);
    
    if(vignette > 0.){
    
        col = vec3(.0,.05,.04); // color
        float ripples = sdRipple(uv);
        uv += ripples/50.;

        col *= 1.+fractal(uv*5.);
        
        float shadow = 0.;

        for(int id=0; id<MAX_POPULATION; id++) // front to back
        {
            if(id==population) break;

            vec3 koi = kois[id].xyz;

            if(length(uv+koi.xy)>MAX_KOI_SIZE) continue; // bounding circle
            
            //col += .5;

            vec2 p = ( uv + koi.xy ) * rot(koi.z);

            p.x+=sin(iTime+p.y*3.+float(id))*.1*p.y; // warp swimming

            float d = sdKoi(p); // exact bounds

            if(d>0.){
            
                shadow = min(shadow,
                    sdEllipseBound(
                        p-uv/8., // more abberation near the edges
                        MAX_KOI_SIZE*vec2(.3,.8)
                    )
                );

                continue;
            }

            vec4 koiCol = colKoi(p, d, id);

            col = koiCol.rgb*koiCol.w;
            
            break;
        }
        
        
        col *= 1.+2.*shadow;

        //col *= 1.+ripples/3.;
        col *= vignette;
        

        // Output to screen
        col = gamma(col);
    
    }
    
    fragColor = vec4(col,1);
}
