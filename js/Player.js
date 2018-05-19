function Player()
{
  this.object = new THREE.Object3D;
  this.eyes = new THREE.OrthographicCamera(-1, 1, -1, 1, 0, 1);

  this.velocity = new THREE.Vector3(0, 0, 0);
  this.eyeAngularVelocity = new THREE.Vector3;

  this.object.add(this.eyes);

  this.galaxy = 0;

  this.controls = [];

  this.teleportTargets = [];
}

Player.prototype = {

  addTeleportTarget: function(target) {
    this.teleportTargets.push(target)
  },

  lookAt: function(position)
  {
    // this.object.lookAt makes it look in the exact opposite direction, for some reason
    var lookAtMatrix = new THREE.Matrix4();
    lookAtMatrix.lookAt(this.object.position, position, this.object.up);
    this.object.quaternion.setFromRotationMatrix(lookAtMatrix);
    this.object.quaternion.multiply(this.eyes.quaternion.clone().inverse());
  },

  handleInput: function()
  {
    for (var i = 0; i < this.controls.length; i++)
    {
      this.controls[i].update();
    }
  },

  step: (function() {

    var prevPosition   = new THREE.Vector3(),
        newVelocity    = new THREE.Vector3(),
        acceleration   = new THREE.Vector3(),
        gravityVector  = new THREE.Vector3(),
        direction      = new THREE.Vector3(),
        intersection   = new THREE.Vector3(),
        axis           = new THREE.Vector3(),
        rotation       = new THREE.Quaternion(),
        temp           = new THREE.Vector3(),
        ray            = new THREE.Ray();

    return function(delta) {
      var wormholePosition = Simulation.wormholePositionSize,
          wormholeSize = Simulation.wormholePositionSize.w,
          wormholeGravityRatio = Simulation.wormholeGravityRatio,
          wormholeSphere = new THREE.Sphere(wormholePosition, wormholeSize);

      if (this.velocity.lengthSq() > 0.00001)
      {
        prevPosition.copy(this.object.position);

        // 1. Compute wormhole curvature/gravity.
        gravityVector.subVectors(wormholePosition, prevPosition);
        var rayDistance = gravityVector.length() - wormholeSize * (1 - wormholeGravityRatio);
        var amount = wormholeGravityRatio / rayDistance;
        acceleration.copy(gravityVector.normalize()).multiplyScalar(wormholeSize * this.velocity.lengthSq() * amount * amount);

        // Apply curvature to velocity
        newVelocity.copy(this.velocity).add(acceleration.multiplyScalar(delta));

        // Adjust new velocity (keep magnitude of old velocity)
        newVelocity.normalize().multiplyScalar(this.velocity.length());

        // Update the player accordingly
        this.object.position.addVectors(prevPosition, newVelocity.multiplyScalar(delta));

        // ...and orientation
        rotation.setFromUnitVectors(this.velocity.normalize(), newVelocity.normalize());
        this.object.quaternion.multiplyQuaternions(rotation, this.object.quaternion);

        this.velocity.copy(newVelocity);

        // 2. Check if we're going through the wormhole
        direction.copy(this.velocity).normalize();

        ray.set(prevPosition, direction);

        var distanceTravelledSq = direction.subVectors(this.object.position, prevPosition).lengthSq();

        var at = ray.intersectSphere(wormholeSphere, intersection);
        if (at && at.distanceToSquared(prevPosition) <= distanceTravelledSq)
        {
          // Rotate 180 degrees around axis pointing at exit point
          axis.subVectors(intersection, wormholePosition).normalize();
          rotation.setFromAxisAngle(axis, Math.PI);
          this.object.quaternion.multiplyQuaternions(rotation, this.object.quaternion);
          this.velocity.reflect(axis).multiplyScalar(-1);

          // Set new position a tiny bit outside mirrored intersection point
          this.object.position.copy(wormholePosition).add(temp.subVectors(wormholePosition, intersection).multiplyScalar(1.0001));

          this.galaxy = 1 - this.galaxy;
        }
      }

      rotation.set( this.eyeAngularVelocity.x * delta, this.eyeAngularVelocity.y * delta, this.eyeAngularVelocity.z * delta, 1 ).normalize();
      this.eyes.quaternion.multiply( rotation );
    };
  })(),

  update: function(delta)
  {
    this.handleInput();
    this.step(delta);

    // Object isn't actually part of a rendered scene, so we need to call this manually
    this.object.updateMatrixWorld(true);
  },

  getClosestTeleportIndex: function() {
    var minDistance = Infinity;
    var result = null;
    for (var i = 0; i < this.teleportTargets.length; i++) {
      var distance;

      if (this.teleportTargets[i].galaxy != this.galaxy) {
        distance =
          this.object.position.distanceTo(Simulation.wormholePositionSize) +
          this.teleportTargets[i].position.distanceTo(Simulation.wormholePositionSize);
      } else {
        distance = this.object.position.distanceTo(this.teleportTargets[i].position);
      }

      if (distance < minDistance) {
        minDistance = distance;
        result = i;
      }
    }
    return result;
  },

  teleport: function() {
    var nextIndex = (this.getClosestTeleportIndex() + 1) % this.teleportTargets.length;
    var teleportTarget = this.teleportTargets[nextIndex];

    this.object.position.copy(teleportTarget.position);
    this.lookAt(teleportTarget.lookAt);
    this.galaxy = teleportTarget.galaxy;
  }

};
