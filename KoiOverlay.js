class KoiOverlay {
    constructor () {
        this.overlay = document.querySelector('svg')
        this.namespace = 'http://www.w3.org/2000/svg'
    }
    render () {
        const ripple = document.createElementNS(this.namespace,'circle')
        ripple.setAttribute('class','ripple')
        ripple.setAttribute('cx',Math.random()-.5)
        ripple.setAttribute('cy',Math.random()-.5)
        this.overlay.append(ripple) 
        setTimeout(()=>{ripple.remove()},2000)
        setTimeout(()=>{this.render()},Math.random()*512)
    }
}