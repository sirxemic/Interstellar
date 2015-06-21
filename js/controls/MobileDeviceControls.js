function MobileDeviceControls(player, element)
{
  this.deviceOrientationControls = new THREE.DeviceOrientationControls(player.eyes);

  this.player = player;

  this.velocity = new THREE.Vector3(0, 0, 0);

  var self = this;

  function onTouchEvent(event)
  {
    event.preventDefault();

    var touches = event.touches;

    if (touches.length == 0)
    {
      self.velocity.set(0, 0, 0);
      return;
    }

    var avgX = 0, avgY = 0;
    for (var i = 0; i < touches.length; i++)
    {
      avgX += touches[i].pageX;
      avgY += touches[i].pageY;
    }
    avgX /= touches.length;
    avgY /= touches.length;

    var vy = Math.tan(0.5 * self.fovy);
    var vx = window.innerWidth / window.innerHeight * vy;

    self.velocity.set(
      vx * (avgX * 2.0 / window.innerWidth - 1.0),
      -vy * (avgY * 2.0 / window.innerHeight - 1.0),
      -1
    ).normalize();

    self.velocity.multiplyScalar(touches.length > 1 ? 10 : 1);
  }

  this.connect = function() {
    this.deviceOrientationControls.connect();

    element.addEventListener( 'touchstart', onTouchEvent, false );
    element.addEventListener( 'touchmove', onTouchEvent, false );
    element.addEventListener( 'touchend', onTouchEvent, false );

    this.enabled = true;
  };

  this.disconnect = function() {
    this.deviceOrientationControls.disconnect();

    element.removeEventListener( 'touchstart', onTouchEvent, false );
    element.removeEventListener( 'touchmove', onTouchEvent, false );
    element.removeEventListener( 'touchend', onTouchEvent, false );

    this.enabled = false;
  };

  this.update = function () {
    if (this.enabled === false) return;

    this.player.velocity.copy(this.velocity).applyQuaternion(this.player.eyes.getWorldQuaternion());
    this.deviceOrientationControls.update();
  };

  this.connect();
}
