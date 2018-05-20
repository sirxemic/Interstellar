import {
  Math as MathExtra,
  Vector3,
  Euler,
  Quaternion
} from 'three'

import ControlsBase from './ControlsBase'

const zee = new Vector3(0, 0, 1)
const euler = new Euler()
const q0 = new Quaternion()
const q1 = new Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)) // - PI/2 around the x-axis

export default class DeviceOrientationControls extends ControlsBase {

  constructor (player) {
    super(player, null)

    this.object = player.eyes
    this.object.rotation.reorder('YXZ')

    // Let's always listen to orientation changes, even before it's enabled
    // For some reason the orientation lags a few frames behind once we start listening
    window.addEventListener('orientationchange', this.onScreenOrientationChangeEvent.bind(this), false)
    window.addEventListener('deviceorientation', this.onDeviceOrientationChangeEvent.bind(this), false)
  }

  enable () {
    this.onScreenOrientationChangeEvent()

    this.enabled = true
  }

  disable () {
    this.enabled = false
  }

  update () {
    if (this.enabled === false || !this.deviceOrientation || this.deviceOrientation.alpha === null) {
      return
    }

    const alpha = this.deviceOrientation.alpha ? MathExtra.degToRad(this.deviceOrientation.alpha) : 0 // Z
    const beta = this.deviceOrientation.beta ? MathExtra.degToRad(this.deviceOrientation.beta) : 0 // X'
    const gamma = this.deviceOrientation.gamma ? MathExtra.degToRad(this.deviceOrientation.gamma) : 0 // Y''
    const orient = this.screenOrientation ? MathExtra.degToRad(this.screenOrientation) : 0 // O

    euler.set(beta, alpha, -gamma, 'YXZ') // 'ZXY' for the device, but 'YXZ' for us

    this.object.quaternion.setFromEuler(euler) // orient the device
    this.object.quaternion.multiply(q1) // camera looks out the back of the device, not the top
    this.object.quaternion.multiply(q0.setFromAxisAngle(zee, -orient)) // adjust for screen orientation
  }

  onDeviceOrientationChangeEvent (event) {
    this.deviceOrientation = event
  }

  onScreenOrientationChangeEvent () {
    this.screenOrientation = window.orientation || 0
  }

}
