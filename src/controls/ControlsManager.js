import Ui from '../Ui'

export default class ControlsManager {

  constructor (keyboardControls, mobileDeviceControls) {
    this.keyboardControls = keyboardControls
    this.mobileDeviceControls = mobileDeviceControls

    this.onKeyPress = this.onKeyPress.bind(this)
    this.onDeviceOrientation = this.onDeviceOrientation.bind(this)

    this.setDesktop()
  }

  setDesktop () {
    window.addEventListener('deviceorientation', this.onDeviceOrientation, false)

    this.keyboardControls.enable()
    this.mobileDeviceControls.disable()

    Ui.setUiForDesktop()

    this.onChange && this.onChange('desktop')
  }

  setMobile () {
    this.controls = 'mobile'

    window.addEventListener('keypress', this.onKeyPress, false)
    window.removeEventListener('deviceorientation', this.onDeviceOrientation, false)

    this.keyboardControls.disable()
    this.mobileDeviceControls.enable()

    Ui.setUiForMobile()

    this.onChange && this.onChange('mobile')
  }

  onKeyPress (event) {
    this.setDesktop()
  }

  onDeviceOrientation (event) {
    if (event.alpha === null) {
      return
    }

    this.setMobile()
  }

}
