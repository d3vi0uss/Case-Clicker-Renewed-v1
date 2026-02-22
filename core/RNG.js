export default class RNG{constructor(config={seed:1337}){this.seed=config.seed||1337}init(){}update(){}destroy(){}next(){this.seed=(1664525*this.seed+1013904223)>>>0;return this.seed/4294967296}}
