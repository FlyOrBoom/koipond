"use strict"

const canvas = document.querySelector("canvas")
const svg = document.querySelector("svg")
const debug = document.querySelector("#debug")
const gl = canvas.getContext("webgl")
const pond = new KoiPond()
const overlay = new KoiOverlay()

pond.background = "hsl(150deg,50%,80%)"
pond.debug = false

overlay.render()

window.addEventListener("mousedown",e=>{
    const x = e.x-innerWidth/2
    const y = e.y-innerHeight/2
    const theta = Math.atan2(y,x)/Math.PI*180
    pond.background = `hsl(${theta}deg,50%,80%)`
})
