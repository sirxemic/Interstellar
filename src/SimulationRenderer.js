import vertexShader from './shaders/wormholeVertex.glsl'
import fragmentShader from './shaders/wormholeFragment.glsl'

import {
  Math as MathExtra,
  Scene,
  OrthographicCamera,
  Mesh,
  PlaneBufferGeometry,
  ShaderMaterial,

  Vector3,
  Vector4,
  Quaternion,
  Matrix4,

  RepeatWrapping,
  LinearFilter,

  WebGLRenderer,
  TextureLoader
} from 'three'

import EffectComposer from './postprocessing/EffectComposer'
import RenderPass from './postprocessing/RenderPass'
import BloomPass from './postprocessing/UnrealBloomPass'

const textureLoader = new TextureLoader()

export default class SimulationRenderer {

  constructor (config, player) {
    this.loadConfig(config)

    this.player = player

    this.zoom = 1
    this.pixelSize = 4
    this.width = window.innerWidth
    this.height = window.innerHeight

    this.renderer = new WebGLRenderer()
    this.renderer.setSize(this.width, this.height)
    this.renderer.sortObjects = false
    this.renderer.autoClear = false
    this.domElement = this.renderer.domElement

    const material = new ShaderMaterial(
      {
        uniforms: this.uniforms,

        vertexShader,
        fragmentShader,

        extensions: {
          shaderTextureLOD: true
        }
      }
    )

    this.scene = new Scene()
    this.camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1)

    this.quad = new Mesh(new PlaneBufferGeometry(2, 2), material)
    this.quad.frustumCulled = false
    this.scene.add(this.quad)

    this.renderPasses = [
      new RenderPass(this.scene, this.camera),
      new BloomPass(1024, 2.7, 0.7, 0.8)
    ]

    this.renderPasses[this.renderPasses.length - 1].renderToScreen = true

    this.composer = new EffectComposer(this.renderer)

    this.renderPasses.forEach(pass => {
      this.composer.addPass(pass)
    })
  }

  loadConfig (config) {
    this.wormholePositionSize = new Vector4(
      config.wormhole.position.x,
      config.wormhole.position.y,
      config.wormhole.position.z,
      config.wormhole.radius
    )

    this.blackholePositionSize = new Vector4(
      config.blackhole.position.x,
      config.blackhole.position.y,
      config.blackhole.position.z,
      config.blackhole.radius
    )

    this.saturnPositionSize = new Vector4(
      config.saturn.position.x,
      config.saturn.position.y,
      config.saturn.position.z,
      config.saturn.radius
    )

    this.planetPositionSize = new Vector4(
      config.planet.position.x,
      config.planet.position.y,
      config.planet.position.z,
      config.planet.radius
    )

    this.blackholeDisk = config.blackhole.disk
    this.saturnRings = config.saturn.rings

    this.wormholeGravityRatio = config.wormhole.gravityRatio

    this.uniforms = {
      wormhole: { type: 'v4', value: this.wormholePositionSize },
      wormholeGravityRatio: { type: 'f', value: this.wormholeGravityRatio },
      blackhole: { type: 'v4', value: this.blackholePositionSize },

      saturn: { type: 'v4', value: this.saturnPositionSize },
      planet: { type: 'v4', value: this.planetPositionSize },

      blackholeDisk: { type: 'v4', value: this.blackholeDisk },
      saturnRings: { type: 'v4', value: this.saturnRings },

      planetDiffuse: { type: 'v3', value: config.planet.diffuse },
      planetSpecular: { type: 'v3', value: config.planet.specular },
      texSaturn: { type: 't', value: this.loadTexture(config.saturn.texture) },
      texSaturnRings: { type: 't', value: this.loadTexture(config.saturn.ringsTexture) },
      texGalaxy1: { type: 't', value: this.loadTexture(config.galaxy1.texture) },
      texGalaxy2: { type: 't', value: this.loadTexture(config.galaxy2.texture) },
      texAccretionDisk: { type: 't', value: this.loadTexture(config.blackhole.diskTexture) },

      lightDirection: { type: 'v3', value: config.saturn.lightDirection },

      cameraMatrix: { type: 'm4', value: new Matrix4() },
      cameraGalaxy: { type: 'i', value: 0 }
    }

    this.uniforms.texSaturnRings.value.wrapS = RepeatWrapping
    this.uniforms.texAccretionDisk.value.wrapS = RepeatWrapping

    this.uniforms.texSaturn.value.minFilter = LinearFilter
    this.uniforms.texGalaxy1.value.minFilter = LinearFilter
    this.uniforms.texGalaxy2.value.minFilter = LinearFilter
  }

  loadTexture (path) {
    this._textureCount = (this._textureCount || 0) + 1

    return textureLoader.load(path, () => {
      this._loadedTexturesCount = (this._loadedTexturesCount || 0) + 1

      if (this._loadedTexturesCount === this._textureCount) {
        this.onTexturesLoaded && this.onTexturesLoaded()
      }
    })
  }

  updateEffectComposer () {
    this.composer.setSize(
      Math.floor(this.width / this.pixelSize),
      Math.floor(this.height / this.pixelSize)
    )
  }

  updateCamera () {
    let vx, vy
    if (this.width > this.height) {
      vx = 1
      vy = this.height / this.width
    }
    else {
      vx = this.width / this.height
      vy = 1
    }

    this.player.eyes.aspect = vx / vy
    this.player.eyes.fov = MathExtra.RAD2DEG * 2 * Math.atan(vy / this.zoom)
  }

  setPixelSize (pixelSize) {
    this.pixelSize = pixelSize

    this.updateEffectComposer()
  }

  setZoom (zoom) {
    this.zoom = zoom

    this.updateCamera()
  }

  setSize (width, height, pixelSize = null) {
    this.width = width
    this.height = height

    if (pixelSize) {
      this.pixelSize = pixelSize
    }

    this.renderer.setSize(this.width, this.height)

    this.updateCamera()
    this.updateEffectComposer()
  }

  render () {
    const rayScale = new Vector3(
      this.player.eyes.aspect,
      1,
      1 / Math.tan(MathExtra.DEG2RAD * this.player.eyes.fov / 2)
    )

    const worldPosition = new Vector3()
    const worldQuaternion = new Quaternion()

    this.uniforms.cameraMatrix.value.compose(
      this.player.eyes.getWorldPosition(worldPosition),
      this.player.eyes.getWorldQuaternion(worldQuaternion),
      rayScale
    )

    this.uniforms.cameraGalaxy.value = this.player.galaxy

    this.renderer.clear()
    this.composer.render()
  }

}
