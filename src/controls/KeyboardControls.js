import {
  Vector3,
  Quaternion
} from 'three'

import ControlsBase from './ControlsBase'

export default class KeyboardControls extends ControlsBase {

  constructor (player, element) {
    super(player, element)

    this.element.setAttribute('tabindex', -1)

    this.movementSpeedMultiplier = 1
    this.movementSpeed = 1.0
    this.rollSpeed = 0.005

    this.mouseStatus = 0
    this.dragToLook = false
    this.autoForward = false

    this.moveState = {
      up: 0,
      down: 0,
      left: 0,
      right: 0,
      forward: 0,
      back: 0,
      pitchUp: 0,
      pitchDown: 0,
      yawLeft: 0,
      yawRight: 0,
      rollLeft: 0,
      rollRight: 0
    }

    this.moveVector = new Vector3(0, 0, 0)
    this.rotationVector = new Vector3(0, 0, 0)

    this.contextMenu = this.contextMenu.bind(this)
    this.mouseMove = this.mouseMove.bind(this)
    this.mouseDown = this.mouseDown.bind(this)
    this.mouseUp = this.mouseUp.bind(this)
    this.keyDown = this.keyDown.bind(this)
    this.keyUp = this.keyUp.bind(this)
  }

  keyDown (event) {
    if (event.altKey) {
      return
    }

    switch (event.keyCode) {
      case 16: // Shift
        this.movementSpeedMultiplier = 10
        break

      case 87: // W
        this.moveState.forward = 1
        break

      case 83: // S
        this.moveState.back = 1
        break

      case 65: // A
        this.moveState.left = 1
        break

      case 68: // D
        this.moveState.right = 1
        break

      case 82: // R
        this.moveState.up = 1
        break

      case 70: // F
        this.moveState.down = 1
        break

      case 38: // Up
        this.moveState.pitchUp = 1
        break

      case 40: // Down
        this.moveState.pitchDown = 1
        break

      case 37: // Left
        this.moveState.yawLeft = 1
        break

      case 39: // Right
        this.moveState.yawRight = 1
        break

      case 81: // Q
        this.moveState.rollLeft = 1
        break

      case 69: // E
        this.moveState.rollRight = 1
        break

      // Control-scheme modifiers:
      case 32:
        this.dragToLook = !this.dragToLook
        this.resetDragToLook()
        break
      case 27:
        this.dragToLook = true
        this.resetDragToLook()
        break
    }

    this.updateMovementVector()
    this.updateRotationVector()
  }

  keyUp (event) {
    switch (event.keyCode) {
      case 16: // Shift
        this.movementSpeedMultiplier = 1
        break

      case 87: // W
        this.moveState.forward = 0
        break

      case 83: // S
        this.moveState.back = 0
        break

      case 65: // A
        this.moveState.left = 0
        break

      case 68: // D
        this.moveState.right = 0
        break

      case 82: // R
        this.moveState.up = 0
        break

      case 70: // F
        this.moveState.down = 0
        break

      case 38: // Up
        this.moveState.pitchUp = 0
        break

      case 40: // Down
        this.moveState.pitchDown = 0
        break

      case 37: // Left
        this.moveState.yawLeft = 0
        break

      case 39: // Right
        this.moveState.yawRight = 0
        break

      case 81: // Q
        this.moveState.rollLeft = 0
        break

      case 69: // E
        this.moveState.rollRight = 0
        break
    }

    this.updateMovementVector()
    this.updateRotationVector()
  }

  resetDragToLook () {
    if (this.dragToLook) {
      this.moveState.yawLeft = 0
      this.moveState.pitchDown = 0
    }
  }

  mouseDown (event) {
    if (this.element !== document) {
      this.element.focus()
    }

    event.preventDefault()
    event.stopPropagation()

    if (this.dragToLook) {
      this.mouseStatus += 1
    }
    else {
      switch (event.button) {
        case 0:
          this.moveState.forward = 1
          break

        case 2:
          this.moveState.back = 1
          break
      }

      this.updateMovementVector()
    }
  }

  mouseMove (event) {
    if (this.dragToLook && this.mouseStatus === 0) {
      return
    }

    const container = this.getContainerDimensions()
    const halfWidth = container.size[0] / 2
    const halfHeight = container.size[1] / 2

    this.moveState.yawLeft = -((event.pageX - container.offset[0]) - halfWidth) / halfWidth
    this.moveState.pitchDown = ((event.pageY - container.offset[1]) - halfHeight) / halfHeight

    this.updateRotationVector()
  }

  mouseUp (event) {
    event.preventDefault()
    event.stopPropagation()

    if (this.dragToLook) {
      this.mouseStatus -= 1
      this.moveState.yawLeft = this.moveState.pitchDown = 0
    }
    else {
      switch (event.button) {
        case 0:
          this.moveState.forward = 0
          break

        case 2:
          this.moveState.back = 0
          break
      }

      this.updateMovementVector()
    }

    this.updateRotationVector()
  }

  updateMovementVector () {
    const forward = (this.moveState.forward || (this.autoForward && !this.moveState.back)) ? 1 : 0

    this.moveVector.x = (-this.moveState.left + this.moveState.right)
    this.moveVector.y = (-this.moveState.down + this.moveState.up)
    this.moveVector.z = (-forward + this.moveState.back)
  }

  updateRotationVector () {
    this.rotationVector.x = (-this.moveState.pitchDown + this.moveState.pitchUp)
    this.rotationVector.y = (-this.moveState.yawRight + this.moveState.yawLeft)
    this.rotationVector.z = (-this.moveState.rollRight + this.moveState.rollLeft)
  }

  getContainerDimensions () {
    if (this.element !== document) {
      return {
        size: [this.element.offsetWidth, this.element.offsetHeight],
        offset: [this.element.offsetLeft, this.element.offsetTop]
      }
    }
    else {
      return {
        size: [window.innerWidth, window.innerHeight],
        offset: [0, 0]
      }
    }
  }

  contextMenu (event) {
    event.preventDefault()
  }

  enable () {
    this.updateMovementVector()
    this.updateRotationVector()

    this.element.addEventListener('contextmenu', this.contextMenu, false)

    this.element.addEventListener('mousemove', this.mouseMove, false)
    this.element.addEventListener('mousedown', this.mouseDown, false)
    this.element.addEventListener('mouseup', this.mouseUp, false)

    window.addEventListener('keydown', this.keyDown, false)
    window.addEventListener('keyup', this.keyUp, false)

    this.enabled = true
  }

  disable () {
    this.element.removeEventListener('contextmenu', this.contextMenu, false)

    this.element.removeEventListener('mousemove', this.mouseMove, false)
    this.element.removeEventListener('mousedown', this.mouseDown, false)
    this.element.removeEventListener('mouseup', this.mouseUp, false)

    window.removeEventListener('keydown', this.keyDown, false)
    window.removeEventListener('keyup', this.keyUp, false)

    this.enabled = false
  }

  update () {
    const moveMult = this.movementSpeed * this.movementSpeedMultiplier
    const rotMult = this.rollSpeed
    const worldQuaternion = new Quaternion()

    this.player.eyes.getWorldQuaternion(worldQuaternion)

    this.player.velocity
      .copy(this.moveVector)
      .multiplyScalar(moveMult)
      .applyQuaternion(worldQuaternion)

    this.player.eyeAngularVelocity
      .copy(this.rotationVector)
      .multiplyScalar(rotMult)
  }

}
