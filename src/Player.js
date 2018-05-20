import {
  Object3D,
  PerspectiveCamera,
  Vector3,
  Quaternion,
  Matrix4,
  Ray,
  Sphere
} from 'three'

import Simulation from './Simulation'

// For improved performance, we initialize certain variables only once instead of in the step function
const __prevPosition = new Vector3()
const __newVelocity = new Vector3()
const __acceleration = new Vector3()
const __gravityVector = new Vector3()
const __direction = new Vector3()
const __intersection = new Vector3()
const __axis = new Vector3()
const __rotation = new Quaternion()
const __temp = new Vector3()
const __ray = new Ray()

export default class Player {

  constructor () {
    this.object = new Object3D()
    this.eyes = new PerspectiveCamera()
    this.object.add(this.eyes)

    this.velocity = new Vector3()
    this.eyeAngularVelocity = new Vector3()

    this.galaxy = 0

    this.controllers = []
  }

  lookAt (position) {
    // this.object.lookAt makes it look in the exact opposite __direction, for some reason
    const lookAtMatrix = new Matrix4()
    lookAtMatrix.lookAt(this.object.position, position, this.object.up)
    this.object.quaternion.setFromRotationMatrix(lookAtMatrix)
    this.object.quaternion.multiply(this.eyes.quaternion.clone().inverse())
  }

  addController (controller) {
    this.controllers.push(controller)
  }

  handleInput () {
    for (let i = 0; i < this.controllers.length; i++) {
      this.controllers[i].update()
    }
  }

  step (delta) {
    const wormhole = Simulation.config.wormhole
    const wormholeSphere = new Sphere(wormhole.position, wormhole.radius)

    if (this.velocity.lengthSq() > 0.00001) {
      __prevPosition.copy(this.object.position)

      // 1. Compute wormhole curvature/gravity.
      __gravityVector.subVectors(wormhole.position, __prevPosition)
      const rayDistance = __gravityVector.length() - wormhole.radius * (1 - wormhole.gravityRatio)
      const amount = wormhole.gravityRatio / rayDistance
      __acceleration.copy(__gravityVector.normalize()).multiplyScalar(wormhole.radius * this.velocity.lengthSq() * amount * amount)

      // Apply curvature to velocity
      __newVelocity.copy(this.velocity).add(__acceleration.multiplyScalar(delta))

      // Adjust new velocity (keep magnitude of old velocity)
      __newVelocity.normalize().multiplyScalar(this.velocity.length())

      // Update the player's position and orientation accordingly
      this.object.position.addVectors(__prevPosition, __newVelocity.multiplyScalar(delta))
      this.object.quaternion.multiplyQuaternions(
        __rotation.setFromUnitVectors(this.velocity.normalize(), __newVelocity.normalize()),
        this.object.quaternion
      )

      this.velocity.copy(__newVelocity)

      // 2. Check if we're going through the wormhole
      __direction.copy(this.velocity).normalize()

      __ray.set(__prevPosition, __direction)

      const distanceTravelledSq = __direction.subVectors(this.object.position, __prevPosition).lengthSq()

      const at = __ray.intersectSphere(wormholeSphere, __intersection)
      if (at && at.distanceToSquared(__prevPosition) <= distanceTravelledSq) {
        // Rotate 180 degrees around __axis pointing at exit point
        __axis.subVectors(__intersection, wormhole.position).normalize()
        __rotation.setFromAxisAngle(__axis, Math.PI)
        this.object.quaternion.multiplyQuaternions(__rotation, this.object.quaternion)
        this.velocity.reflect(__axis).multiplyScalar(-1)

        // Set new position a tiny bit outside mirrored __intersection point
        this.object.position
          .copy(wormhole.position)
          .add(
            __temp.subVectors(wormhole.position, __intersection)
              .multiplyScalar(1.0001)
          )

        this.galaxy = 1 - this.galaxy
      }
    }

    __rotation.set(
      this.eyeAngularVelocity.x * delta,
      this.eyeAngularVelocity.y * delta,
      this.eyeAngularVelocity.z * delta,
      1
    ).normalize()
    this.eyes.quaternion.multiply(__rotation)
  }

  update (delta) {
    this.handleInput()
    this.step(delta)

    // Object isn't actually part of a rendered scene, so we need to call this manually
    this.object.updateMatrixWorld(true)
  }

}
