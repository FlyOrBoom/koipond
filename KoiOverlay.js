class KoiOverlay {
    constructor () {
        this.overlay = document.querySelector('svg')
        this.lilypad_holder = document.querySelector('#lilypads')
        this.ripples_holder = document.querySelector('#ripples')
        this.namespace = 'http://www.w3.org/2000/svg'

        this.lilypads()
    }
    lilypads () {
        const count = 10
        let cache = []
        for(let i = -3+1/count; i<3; i+=(1+Math.random())/count){
            for(let j = -1.1+1/count; j<1.1; j+=(1+Math.random())/count){
                if(i**4+j**4<Math.random()/2) continue

                const lilypad = document.createElementNS(this.namespace,'circle')
                lilypad.setAttribute('class','lilypad')
                const coords = [i,j]
                lilypad.setAttribute('cx',coords[0])
                lilypad.setAttribute('cy',coords[1])
                lilypad.setAttribute('r',0.1+Math.random()/32)
                cache.push(lilypad)
            }
        }
        this.lilypad_holder.append(...shuffleArray(cache))

    }
    render () {
        const ripple = document.createElementNS(this.namespace,'circle')
        ripple.setAttribute('class','ripple')
        ripple.setAttribute('cx',Math.random()-.5)
        ripple.setAttribute('cy',Math.random()-.5)
        this.ripples_holder.append(ripple) 
        setTimeout(()=>{ripple.remove()},5000)
        setTimeout(()=>{this.render()},Math.random()*1024)
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array
}