class UiController {

  constructor () {
    this.initUiToggle()
    this.initTeleportButton()
    this.initRadioButtons()
  }

  initUiToggle () {
    const uiToggle = document.querySelector('.ui-toggle input')

    const onUIToggle = () => {
      if (uiToggle.checked) {
        document.body.classList.add('no-ui')
      }
      else {
        document.body.classList.remove('no-ui')
      }
      uiToggle.blur()
    }

    uiToggle.addEventListener('change', onUIToggle)

    onUIToggle()
  }

  initTeleportButton () {
    document.querySelector('#teleport')
      .addEventListener('touchstart', () => {
        this.onTeleportClick && this.onTeleportClick()
      }, false)
  }

  initRadioButtons () {
    document.querySelector('#resolution')
      .addEventListener('change', event => {
        event.target.blur()

        const pixelSize = this.getSelectedPixelSize()
        this.onPixelSizeChange && this.onPixelSizeChange(pixelSize)
      }, false)
  }

  getSelectedPixelSize () {
    return parseInt(document.querySelector('[name=resolution]:checked').value)
  }

  showWebGLError () {
    document.querySelector('#webgl-error').style.display = 'block'
    this.removeLoadingScreen()
  }

  removeLoadingScreen () {
    const el = document.getElementById('loading')
    el.parentElement.removeChild(el)
  }

  setUiForDesktop () {
    document.body.classList.remove('mobile-device')
  }

  setUiForMobile () {
    document.body.classList.add('mobile-device')
  }

}

export default new UiController()
