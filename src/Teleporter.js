import Simulation from './Simulation'

export default class Teleporter {

  constructor (player) {
    this.player = player
    this.targets = []
  }

  addTarget ({ position, lookAt, galaxy }) {
    this.targets.push({
      position,
      lookAt,
      galaxy
    })
  }

  getClosestTeleportIndex () {
    let minDistance = Infinity
    let result = null

    for (let i = 0; i < this.targets.length; i++) {
      let distance

      if (this.targets[i].galaxy !== this.player.galaxy) {
        distance =
          this.player.object.position.distanceTo(Simulation.config.wormhole.position) +
          this.targets[i].position.distanceTo(Simulation.config.wormhole.position)
      }
      else {
        distance = this.player.object.position.distanceTo(this.targets[i].position)
      }

      if (distance < minDistance) {
        minDistance = distance
        result = i
      }
    }
    return result
  }

  teleportNext () {
    const nextIndex = (this.getClosestTeleportIndex() + 1) % this.targets.length

    this.teleportTo(this.targets[nextIndex])
  }

  teleportTo (target) {
    this.player.object.position.copy(target.position)
    this.player.galaxy = target.galaxy

    this.player.lookAt(target.lookAt)
  }

}
