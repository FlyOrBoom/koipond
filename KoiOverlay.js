class KoiOverlay {
    constructor () {
        this.overlay = document.querySelector('svg')
        this.namespace = 'http://www.w3.org/2000/svg'
    }
    render () {
        const ripple = document.createElementNS(this.namespace,'circle')
        ripple.setAttribute('cx',Math.random())
        ripple.setAttribute('cy',Math.random())
        this.overlay.append(ripple) 
        setTimeout(()=>{this.render()},Math.random()*1024)
    }
}