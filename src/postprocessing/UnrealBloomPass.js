/**
 * The source code of this file is heavily based on
 * https://github.com/mrdoob/three.js/blob/dev/examples/js/postprocessing/UnrealBloomPass.js
 */

import {
  Vector2,
  Vector3,
  Color,

  ShaderMaterial,
  MeshBasicMaterial,

  LinearFilter,
  RGBAFormat,
  AdditiveBlending,

  UniformsUtils,

  WebGLRenderTarget
} from 'three'

import Pass from './Pass'
import CopyShader from './CopyShader'
import LuminosityHighPassShader from './LuminosityHighPassShader'
import simpleVertexCode from '../shaders/simpleVertex.glsl'
import seperableBlurCode from '../shaders/seperableBlur.glsl'
import bloomCompositeCode from '../shaders/bloomComposite.glsl'

export default class UnrealBloomPass extends Pass {

  constructor (resolution, strength, radius, threshold) {
    super()

    this.strength = strength
    this.radius = radius
    this.threshold = threshold
    this.resolution = new Vector2(resolution.x, resolution.y)

    // render targets
    const pars = {
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      format: RGBAFormat
    }

    this.renderTargetsHorizontal = []
    this.renderTargetsVertical = []
    this.nMips = 5

    let resx = Math.round(this.resolution.x / 2)
    let resy = Math.round(this.resolution.y / 2)

    this.renderTargetBright = new WebGLRenderTarget(resx, resy, pars)
    this.renderTargetBright.texture.name = 'UnrealBloomPass.bright'
    this.renderTargetBright.texture.generateMipmaps = false

    for (let i = 0; i < this.nMips; i++) {
      let renderTarget = new WebGLRenderTarget(resx, resy, pars)

      renderTarget.texture.name = `UnrealBloomPass.h${i}`
      renderTarget.texture.generateMipmaps = false

      this.renderTargetsHorizontal.push(renderTarget)

      renderTarget = new WebGLRenderTarget(resx, resy, pars)

      renderTarget.texture.name = `UnrealBloomPass.v${i}`
      renderTarget.texture.generateMipmaps = false

      this.renderTargetsVertical.push(renderTarget)

      resx = Math.round(resx / 2)
      resy = Math.round(resy / 2)
    }

    this.highPassUniforms = UniformsUtils.clone(LuminosityHighPassShader.uniforms)

    this.highPassUniforms.luminosityThreshold.value = threshold
    this.highPassUniforms.smoothWidth.value = 0.01

    this.materialHighPassFilter = new ShaderMaterial(
      {
        uniforms: this.highPassUniforms,
        vertexShader: LuminosityHighPassShader.vertexShader,
        fragmentShader: LuminosityHighPassShader.fragmentShader,
        defines: {}
      }
    )

    // Gaussian Blur Materials
    this.separableBlurMaterials = []

    const kernelSizeArray = [3, 5, 7, 9, 11]

    resx = Math.round(this.resolution.x / 2)
    resy = Math.round(this.resolution.y / 2)

    for (let i = 0; i < this.nMips; i++) {
      this.separableBlurMaterials.push(this.getSeperableBlurMaterial(kernelSizeArray[i]))
      this.separableBlurMaterials[i].uniforms.texSize.value = new Vector2(resx, resy)

      resx = Math.round(resx / 2)
      resy = Math.round(resy / 2)
    }

    // Composite material
    this.compositeMaterial = this.getCompositeMaterial(this.nMips)
    this.compositeMaterial.uniforms.blurTexture1.value = this.renderTargetsVertical[0].texture
    this.compositeMaterial.uniforms.blurTexture2.value = this.renderTargetsVertical[1].texture
    this.compositeMaterial.uniforms.blurTexture3.value = this.renderTargetsVertical[2].texture
    this.compositeMaterial.uniforms.blurTexture4.value = this.renderTargetsVertical[3].texture
    this.compositeMaterial.uniforms.blurTexture5.value = this.renderTargetsVertical[4].texture
    this.compositeMaterial.uniforms.bloomStrength.value = strength
    this.compositeMaterial.uniforms.bloomRadius.value = 0.1
    this.compositeMaterial.needsUpdate = true

    const bloomFactors = [1.0, 0.8, 0.6, 0.4, 0.2]
    this.compositeMaterial.uniforms.bloomFactors.value = bloomFactors
    this.bloomTintColors = [
      new Vector3(1, 1, 1),
      new Vector3(1, 1, 1),
      new Vector3(1, 1, 1),
      new Vector3(1, 1, 1),
      new Vector3(1, 1, 1)
    ]
    this.compositeMaterial.uniforms.bloomTintColors.value = this.bloomTintColors

    this.copyUniforms = UniformsUtils.clone(CopyShader.uniforms)
    this.copyUniforms.opacity.value = 1.0

    this.materialCopy = new ShaderMaterial(
      {
        uniforms: this.copyUniforms,
        vertexShader: CopyShader.vertexShader,
        fragmentShader: CopyShader.fragmentShader,
        blending: AdditiveBlending,
        depthTest: false,
        depthWrite: false,
        transparent: true
      }
    )

    this.oldClearColor = new Color()
    this.oldClearAlpha = 1

    this.basic = new MeshBasicMaterial()
  }

  dispose () {
    for (let i = 0; i < this.renderTargetsHorizontal.length; i++) {
      this.renderTargetsHorizontal[i].dispose()
    }

    for (let i = 0; i < this.renderTargetsVertical.length; i++) {
      this.renderTargetsVertical[i].dispose()
    }

    this.renderTargetBright.dispose()
  }

  setSize (width, height) {
    let resx = Math.round(width / 2)
    let resy = Math.round(height / 2)

    this.renderTargetBright.setSize(resx, resy)

    for (let i = 0; i < this.nMips; i++) {
      this.renderTargetsHorizontal[i].setSize(resx, resy)
      this.renderTargetsVertical[i].setSize(resx, resy)

      this.separableBlurMaterials[i].uniforms.texSize.value = new Vector2(resx, resy)

      resx = Math.round(resx / 2)
      resy = Math.round(resy / 2)
    }
  }

  render (renderer, writeBuffer, readBuffer) {
    this.oldClearColor.copy(renderer.getClearColor())
    this.oldClearAlpha = renderer.getClearAlpha()
    const oldAutoClear = renderer.autoClear
    renderer.autoClear = false

    renderer.setClearColor(new Color(0, 0, 0), 0)

    // Render input to screen

    if (this.renderToScreen) {
      this.quad.material = this.basic
      this.basic.map = readBuffer.texture

      renderer.render(this.scene, this.camera, undefined, true)
    }

    // 1. Extract Bright Areas

    this.highPassUniforms.tDiffuse.value = readBuffer.texture
    this.highPassUniforms.luminosityThreshold.value = this.threshold
    this.quad.material = this.materialHighPassFilter

    renderer.render(this.scene, this.camera, this.renderTargetBright, true)

    // 2. Blur All the mips progressively

    let inputRenderTarget = this.renderTargetBright

    for (let i = 0; i < this.nMips; i++) {
      this.quad.material = this.separableBlurMaterials[i]

      this.separableBlurMaterials[i].uniforms.colorTexture.value = inputRenderTarget.texture
      this.separableBlurMaterials[i].uniforms.direction.value = UnrealBloomPass.BlurDirectionX
      renderer.render(this.scene, this.camera, this.renderTargetsHorizontal[i], true)

      this.separableBlurMaterials[i].uniforms.colorTexture.value = this.renderTargetsHorizontal[i].texture
      this.separableBlurMaterials[i].uniforms.direction.value = UnrealBloomPass.BlurDirectionY
      renderer.render(this.scene, this.camera, this.renderTargetsVertical[i], true)

      inputRenderTarget = this.renderTargetsVertical[i]
    }

    // Composite All the mips

    this.quad.material = this.compositeMaterial
    this.compositeMaterial.uniforms.bloomStrength.value = this.strength
    this.compositeMaterial.uniforms.bloomRadius.value = this.radius
    this.compositeMaterial.uniforms.bloomTintColors.value = this.bloomTintColors

    renderer.render(this.scene, this.camera, this.renderTargetsHorizontal[0], true)

    // Blend it additively over the input texture

    this.quad.material = this.materialCopy
    this.copyUniforms.tDiffuse.value = this.renderTargetsHorizontal[0].texture

    if (this.renderToScreen) {
      renderer.render(this.scene, this.camera, undefined, false)
    }
    else {
      renderer.render(this.scene, this.camera, readBuffer, false)
    }

    // Restore renderer settings

    renderer.setClearColor(this.oldClearColor, this.oldClearAlpha)
    renderer.autoClear = oldAutoClear
  }

  getSeperableBlurMaterial (kernelRadius) {
    return new ShaderMaterial(
      {
        defines: {
          KERNEL_RADIUS: kernelRadius,
          SIGMA: kernelRadius
        },

        uniforms: {
          colorTexture: { value: null },
          texSize: { value: new Vector2(0.5, 0.5) },
          direction: { value: new Vector2(0.5, 0.5) }
        },

        vertexShader: simpleVertexCode,
        fragmentShader: seperableBlurCode
      }
    )
  }

  getCompositeMaterial (nMips) {
    return new ShaderMaterial(
      {
        defines: {
          NUM_MIPS: nMips
        },

        uniforms: {
          blurTexture1: { value: null },
          blurTexture2: { value: null },
          blurTexture3: { value: null },
          blurTexture4: { value: null },
          blurTexture5: { value: null },
          dirtTexture: { value: null },
          bloomStrength: { value: 1.0 },
          bloomFactors: { value: null },
          bloomTintColors: { value: null },
          bloomRadius: { value: 0.0 }
        },

        vertexShader: simpleVertexCode,
        fragmentShader: bloomCompositeCode
      }
    )
  }

}

UnrealBloomPass.BlurDirectionX = new Vector2(1, 0)
UnrealBloomPass.BlurDirectionY = new Vector2(0, 1)
