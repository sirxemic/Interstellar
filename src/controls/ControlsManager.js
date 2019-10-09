import Ui from '../Ui'

export default class ControlsManager {

  constructor (keyboardControls, mobileDeviceControls) {
    this.keyboardControls = keyboardControls
    this.mobileDeviceControls = mobileDeviceControls

    this.onKeyPress = this.onKeyPress.bind(this)
    this.onDeviceOrientation = this.onDeviceOrientation.bind(this)
  }

  start () {
    window.addEventListener('deviceorientation', this.onDeviceOrientation, false)

    if (window.DeviceOrientationEvent && window.DeviceOrientationEvent.requestPermission) {
      this.setMobile()

      document.body.classList.add('no-motion-controls')
      document.querySelector('#permit-motion-controls').addEventListener(
        'click',
        () => window.DeviceOrientationEvent.requestPermission(),
        false
      )
    }
    else {
      this.setDesktop()
    }
  }

  setDesktop () {
    this.keyboardControls.enable()
    this.mobileDeviceControls.disable()

    Ui.setUiForDesktop()

    this.onChange && this.onChange('desktop')
  }

  setMobile () {
    this.controls = 'mobile'

    window.addEventListener('keypress', this.onKeyPress, false)

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

    document.body.classList.remove('no-motion-controls')
    window.removeEventListener('deviceorientation', this.onDeviceOrientation, false)
  }

}
