import simpleVertexCode from '../shaders/simpleVertex.glsl'
import copyCode from '../shaders/copy.glsl'

export default {

  uniforms: {
    tDiffuse: { value: null },
    opacity: { value: 1.0 }
  },

  vertexShader: simpleVertexCode,
  fragmentShader: copyCode

}
