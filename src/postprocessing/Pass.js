import {
  OrthographicCamera,
  Scene,
  Mesh,
  PlaneBufferGeometry
} from 'three'

export default class Pass {

  constructor () {
    this.clear = false
    this.renderToScreen = false

    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)
    this.scene = new Scene()

    this.quad = new Mesh(new PlaneBufferGeometry(2, 2), null)
    this.quad.frustumCulled = false // Avoid getting clipped
    this.scene.add(this.quad)
  }

  setSize (width, height) {

  }

  render (renderer, writeBuffer, readBuffer) {

  }

}
