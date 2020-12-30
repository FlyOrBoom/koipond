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
    add ( babies ) {
        this.population += babies
        this.population = Math.max(0,Math.min(this.population,this.MAX_POPULATION))
    }
    update ( delta ) {
        for (let i = 0; i < this.MAX_POPULATION; i+= this.ATTRIBUTES_PER_KOI) {
            const ID = i*this.ATTRIBUTES_PER_KOI
            var x = kois[ID+0]
            var y = kois[ID+1]
            var theta = kois[ID+3]
            // fishes[ID+4] is for something. Dunno what yet
        }
    }
}

