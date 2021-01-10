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
    update (time) {
        for (let i = 0; i < this.population; i++) {

            const ID = i*this.ATTRIBUTES_PER_KOI
	    
            var [x,y,theta,style] = this.kois.slice(ID,this.ATTRIBUTES_PE_KOI)
            
            const [n,dn] = this.noise(time*this.SPEED+style*100);
            
            theta = n*Math.PI
	    
            const bimodal = this.normal(dn/100+1)+this.normal(dn/100-1) // Move fastest when rotating slightly
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
        let y = 0, dy = 0
        for(let i = 0; i<5; i+=0.5){
            const e = Math.exp(i)
            y += Math.sin(x*e)
            dy += e*Math.cos(x*e)
        }
        return [y,dy]
    }

    set background(color){
        document.body.style.background = color
    }
}
