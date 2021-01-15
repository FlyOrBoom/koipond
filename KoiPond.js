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

        this.attractor = {
            on: 0,
            x: 0,
            y: 0
        }

        window.addEventListener('mousedown',e=>{
            const w = Math.min(innerWidth,innerHeight)
            this.attractor.x = -(2*e.x-innerWidth)/w
            this.attractor.y = +(2*e.y-innerHeight)/w
            this.attractor.on = 1
        })
    }
    add (babies,styles=[]) {
        styles.forEach((style,index)=>{
            this.kois[(this.population+index)*this.ATTRIBUTES_PER_KOI+3] = style
        })
        this.population += babies
        this.population = Math.max(0,Math.min(this.population,this.MAX_POPULATION))
    }
    update (time, delta) {
        for (let i = 0; i < this.population; i++) {

            const ID = i*this.ATTRIBUTES_PER_KOI
	    
            var [x,y,theta,style] = this.kois.slice(ID,this.ATTRIBUTES_PE_KOI)
            
            const n = this.noise(time*this.SPEED+style*100)*delta;

            const dt = this.mod((-Math.atan2(
                    y-this.attractor.y,
                    x-this.attractor.x
            )-Math.PI/2)-theta+Math.PI,Math.PI*2)-Math.PI
            
            theta += (this.attractor.on)*dt*this.SPEED*32
            theta += (1-this.attractor.on)*n*Math.PI*this.SPEED*32

            this.attractor.on = Math.max(0,this.attractor.on-delta/128)
	    
            const bimodal = this.normal(n+1)+this.normal(n-1) // Move fastest when rotating slightly
            x -= Math.cos(theta+Math.PI/2)*this.SPEED*bimodal
            y += Math.sin(theta+Math.PI/2)*this.SPEED*bimodal

            this.kois[ID+0] = this.torus(x,1)
            this.kois[ID+1] = this.torus(y,1)
            this.kois[ID+2] = theta
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

    set debug(state){
        debug.style.display = state ? "block" : "none"
    }
}
