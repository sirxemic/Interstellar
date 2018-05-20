import Pass from './Pass'

export default class RenderPass extends Pass {

  constructor (scene, camera) {
    super()

    this.scene = scene
    this.camera = camera
  }

  render (renderer, writeBuffer, readBuffer) {
    const oldAutoClear = renderer.autoClear
    renderer.autoClear = false

    this.scene.overrideMaterial = this.overrideMaterial
    renderer.render(this.scene, this.camera, this.renderToScreen ? null : readBuffer, true)

    this.scene.overrideMaterial = null
    renderer.autoClear = oldAutoClear
  }

}
