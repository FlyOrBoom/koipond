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
        for (let i = 0; i < this.MAX_POPULATION; i+= this.ATTRIBUTES_PER_KOI) {
            const ID = i*this.ATTRIBUTES_PER_KOI
            var [x,y,theta,style] = this.kois.slice(ID,this.ATTRIBUTES_PE_KOI)
	    theta = noise(time/100)
	    
            x -= Math.cos(theta+Math.PI/2)/50
            y += Math.sin(theta+Math.PI/2)/50
            
            this.kois[ID+0] = mod(x,1)
            this.kois[ID+1] = mod(y,1)
            this.kois[ID+2] = mod(theta,2*Math.PI)
            this.kois[ID+3] = style
        }
    }
}
function mod(a,b){
    return a-b*Math.floor(a/b)
}
function noise(x){
    let y = 0
    for(let i = 0; i<5; i++){
	y += Math.sin(x*Math.PI**i)
    }
    return y
}
