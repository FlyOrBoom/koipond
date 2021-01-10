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
vec4 Koi(vec2 p,float style)
{    
    vec3 col = palette(style);

    float d = 1.;

    float R = MAX_KOI_SIZE / (1.+fract(style)/4.);
    float r =    0.20*R; // length of koi's semi-minor axis
    float body = 0.50*R;
    float tail = 0.10*R;
    float fins = 0.04*R;
    float eyes = 0.02*R;

    float dx = sin(4.*(iTime+style)+p.y*4.);
    dx /= 8.;
    dx *= p.y;
    p.x += dx;

    d = sdEgg(p,r); // body
    
    d = smin(d,
        sdCircle(p+r*V,r/2.),
        1.5*r); // head
    d = smin(d,
        sdDroplet(p-(body+tail/2.)*V,tail),
        2.1*r); // tail
    d = smin(d,
        sdCircle(p-(cos(4.*iTime)/32.*H)-(body+tail*2.)*V,0.),
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
        float style = koi.w;
     
        p += uv;
        p = mod(p-1.,2.)-1.; // tile
        p *= rot(koi.z);
        
        if(length(vec2(p.x*2.,p.y*1.4-.1))>MAX_KOI_SIZE) continue; // skip to next koi if outside bounding circle
        vec4 koiCol = Koi(p,style); // exact bounds

        if(koiCol.a<0.) // if within koi use its color
        {
            fragColor = vec4(koiCol.rgb,1.);
            return;
        }
        
    }
        
}
