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
float skin(vec2 p, float style)
{
    return round(pow(
        cos(value(p)/2.),
        50.*ceil(style*6.) // Variation in darkness
    ));

}
//-- DISTANCE FUNCTIONS
float sdCircle( vec2 p, float r )
{
    return length(p) - r;
}


float sdEllipse(vec2 p, vec2 ab)
{
	p = abs(p); if( ab.x > ab.y ){ p=p.yx; ab=ab.yx; }
	
	float l = ab.y*ab.y - ab.x*ab.x;
	
    float m = ab.x*p.x/l; 
	float n = ab.y*p.y/l; 
	float m2 = m*m;
	float n2 = n*n;
	
    float c = (m2 + n2 - 1.0)/3.0; 
	float c3 = c*c*c;

    float q = c3 + m2*n2*2.0;
    float d = c3 + m2*n2;
    float g = m + m*n2;

    float co;

    if( d<0.0 )
    {
        float h = acos(q/c3)/3.0;
        float s = cos(h);
        float t = sin(h)*sqrt(3.0);
        float rx = sqrt( -c*(s + t + 2.0) + m2 );
        float ry = sqrt( -c*(s - t + 2.0) + m2 );
        co = ( ry + sign(l)*rx + abs(g)/(rx*ry) - m)/2.0;
    }
    else
    {
        float h = 2.0*m*n*sqrt(d);
        float s = sign(q+h)*pow( abs(q+h), 1.0/3.0 );
        float u = sign(q-h)*pow( abs(q-h), 1.0/3.0 );
        float rx = -s - u - c*4.0 + 2.0*m2;
        float ry = (s - u)*sqrt(3.0);
        float rm = sqrt( rx*rx + ry*ry );
        co = (ry/sqrt(rm-rx) + 2.0*g/rm - m)/2.0;
    }

    float si = sqrt( max(1.0-co*co,0.0) );
 
    vec2 r = ab * vec2(co,si);
	
    return length(r-p) * sign(p.y-r.y);
}
float sdEllipseBound(vec2 p, vec2 r) // Bound
{
    return sdCircle(p*vec2(r.y/r.x,1),r.y);
}

float sdVesica(vec2 p, float r, float d)
{
    return length(abs(p)-vec2(-d,0))-r;
}
float sdGinko(vec2 p, float r, float m)
{
    float bias = .7+(sign(p.x)*sin(iTime*2.))/2.;
    float cut = sdEllipse(vec2(abs(p.x),-p.y)-r,vec2(r,r*m/bias));
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

    if(p.y < -0.01 ) { // if pixel is at the head
        d = sdEllipse(p,vec2(r,head));
    } else {
        float vesica_r = (body*body/r+r)/2.; //radii of the two circles that intersect to form a body-high vesica
        d = sdVesica(p,vesica_r,vesica_r-r);
    }
    d = smin(d,sdGinko(p-vec2(0,body),tail,2.5),0.05);
    d = min(d,sdCrescent(p,fins));
    d /= r;
    return d;
}
float sdRipple(vec2 p)
{
    return value(p+iTime);
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
    
    float ripples = sdRipple(uv);
    uv += ripples/50.;

    //col *= 1.+round(fractal(uv*5.)*2.)/2.;
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

        if(d<0.2){ // black outline
            if(d<0.){ // koi color
                col = colKoi(p, d, id);
            }
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
    //col *= 1.+ripples/3.;

    col = gamma(col);
    fragColor = vec4(col,1);
}
