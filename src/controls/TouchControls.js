import {
  Math as MathExtra,
  Vector3,
  Quaternion
} from 'three'

import ControlsBase from './ControlsBase'

export default class TouchControls extends ControlsBase {

  constructor (player, element) {
    super(player, element)

    this.velocity = new Vector3(0, 0, 0)

    this.onTouchEvent = this.onTouchEvent.bind(this)
  }

  onTouchEvent (event) {
    event.preventDefault()

    const touches = event.touches

    if (touches.length === 0) {
      this.velocity.set(0, 0, 0)
      return
    }

    let avgX = 0
    let avgY = 0
    for (let i = 0; i < touches.length; i++) {
      avgX += touches[i].pageX
      avgY += touches[i].pageY
    }
    avgX /= touches.length
    avgY /= touches.length

    const vy = Math.tan(0.5 * MathExtra.DEG2RAD * this.player.eyes.fov)
    const vx = this.player.eyes.aspect * vy

    this.velocity.set(
      vx * (avgX * 2.0 / window.innerWidth - 1.0),
      -vy * (avgY * 2.0 / window.innerHeight - 1.0),
      -1
    ).normalize()

    this.velocity.multiplyScalar(touches.length > 1 ? 10 : 1)
  }

  enable () {
    this.element.addEventListener('touchstart', this.onTouchEvent, false)
    this.element.addEventListener('touchmove', this.onTouchEvent, false)
    this.element.addEventListener('touchend', this.onTouchEvent, false)

    this.enabled = true
  }

  disable () {
    this.element.removeEventListener('touchstart', this.onTouchEvent, false)
    this.element.removeEventListener('touchmove', this.onTouchEvent, false)
    this.element.removeEventListener('touchend', this.onTouchEvent, false)

    this.enabled = false
  }

  update () {
    if (this.enabled === false) {
      return
    }

    const worldQuaternion = new Quaternion()

    this.player.eyes.getWorldQuaternion(worldQuaternion)

    this.player.velocity
      .copy(this.velocity)
      .applyQuaternion(worldQuaternion)
  }

}
