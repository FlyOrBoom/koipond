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
    add (babies) {
        this.population += babies
        this.population = Math.max(0,Math.min(this.population,this.MAX_POPULATION))
    }
    update (time, delta) {
        for (let i = 0; i < this.population; i++) {

            const ID = i*this.ATTRIBUTES_PER_KOI
	    
            var [x,y,theta,style] = this.kois.slice(ID,this.ATTRIBUTES_PE_KOI)
            
            const [n,dn] = noise(time/500+style*100);
            
            theta = n*Math.PI;
	    
            const ease = Math.exp(-((dn/800)**2)) // Normal distribution: Semi-inverse relationship between rotational and linear velocities
            x -= Math.cos(theta+Math.PI/2)/100*ease
            y += Math.sin(theta+Math.PI/2)/100*ease

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
function noise(x){
    let y = 0, dy = 0
    for(let i = 0; i<5; i+=0.5){
        const e = Math.exp(i)
    	y += Math.sin(x*e)
        dy += e*Math.cos(x*e)
    }
    return [y,dy]
}
