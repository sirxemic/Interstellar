import { Color } from 'three'

import simpleVertexCode from '../shaders/simpleVertex.glsl'
import luminosityHighPassCode from '../shaders/luminosityHighPass.glsl'

export default {

  shaderID: 'luminosityHighPass',

  uniforms: {
    tDiffuse: { type: 't', value: null },
    luminosityThreshold: { type: 'f', value: 1.0 },
    smoothWidth: { type: 'f', value: 1.0 },
    defaultColor: { type: 'c', value: new Color(0x000000) },
    defaultOpacity: { type: 'f', value: 0.0 }
  },

  vertexShader: simpleVertexCode,
  fragmentShader: luminosityHighPassCode

}
