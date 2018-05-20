export function isWebGlSupported () {
  if (!window.WebGLRenderingContext) {
    return false
  }

  try {
    const canvas = document.createElement('canvas')
    return !!((canvas.getContext('webgl') || canvas.getContext('experimental-webgl')))
  }
  catch (e) {
    return false
  }
}
