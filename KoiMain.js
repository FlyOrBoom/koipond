"use strict"

const canvas = document.querySelector("canvas")
const svg = document.querySelector("svg")
const debug = document.querySelector("div")
const gl = canvas.getContext("webgl")
const pond = new KoiPond()
const overlay = new KoiOverlay()

pond.background = "hsl(150deg,50%,80%)"

overlay.render()
