import DeviceOrientationControls from './DeviceOrientationControls'
import TouchControls from './TouchControls'

import ControlsBase from './ControlsBase'

export default class MobileDeviceControls extends ControlsBase {

  constructor (player, element) {
    super(player, element)

    this.deviceOrientationControls = new DeviceOrientationControls(player)
    this.touchControls = new TouchControls(player, element)
  }

  enable () {
    this.deviceOrientationControls.enable()
    this.touchControls.enable()
    this.enabled = true
  }

  disable () {
    this.deviceOrientationControls.disable()
    this.touchControls.disable()

    this.enabled = false
  }

  update () {
    if (this.enabled === false) {
      return
    }

    this.deviceOrientationControls.update()
    this.touchControls.update()
  }

}
