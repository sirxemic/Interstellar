/**
 * The source code of this file is heavily based on
 * https://github.com/mrdoob/three.js/blob/dev/examples/js/postprocessing/EffectComposer.js
 */

import { WebGLRenderTarget, LinearFilter, RGBAFormat } from 'three'

export default class EffectComposer {

  constructor (renderer, renderTarget) {
    this.renderer = renderer

    if (renderTarget === undefined) {
      const parameters = {
        minFilter: LinearFilter,
        magFilter: LinearFilter,
        format: RGBAFormat,
        stencilBuffer: false
      }

      const size = renderer.getDrawingBufferSize()
      renderTarget = new WebGLRenderTarget(size.width, size.height, parameters)
      renderTarget.texture.name = 'EffectComposer.rt1'
    }

    this.renderTarget1 = renderTarget
    this.renderTarget2 = renderTarget.clone()
    this.renderTarget2.texture.name = 'EffectComposer.rt2'

    this.writeBuffer = this.renderTarget1
    this.readBuffer = this.renderTarget2

    this.passes = []
  }

  swapBuffers () {
    const tmp = this.readBuffer
    this.readBuffer = this.writeBuffer
    this.writeBuffer = tmp
  }

  addPass (pass) {
    this.passes.push(pass)

    const size = this.renderer.getDrawingBufferSize()
    pass.setSize(size.width, size.height)
  }

  render () {
    for (let i = 0; i < this.passes.length; i++) {
      this.passes[i].render(this.renderer, this.writeBuffer, this.readBuffer)
    }
  }

  setSize (width, height) {
    this.renderTarget1.setSize(width, height)
    this.renderTarget2.setSize(width, height)

    for (let i = 0; i < this.passes.length; i++) {
      this.passes[i].setSize(width, height)
    }
  }

}
