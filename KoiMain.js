"use strict"

const canvas = document.querySelector("canvas")
const svg = document.querySelector("svg")
const debug = document.querySelector("div")
const gl = canvas.getContext("webgl")
const pond = new KoiPond()
const overlay = new KoiOverlay()

pond.background = "hsl(200deg,50%,90%)"

overlay.render()
