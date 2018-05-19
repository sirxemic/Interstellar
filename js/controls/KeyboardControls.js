function KeyboardControls(player, element)
{
  this.player = player;
  this.teleport = this.player.teleport.bind(this.player);

  element.setAttribute('tabindex', -1);

  this.movementSpeedMultiplier = 1;
  this.movementSpeed = 1.0;
  this.rollSpeed = 0.005;

  this.dragToLook = false;
  this.autoForward = false;

  // Internals
  this.tmpQuaternion = new THREE.Quaternion();

  this.mouseStatus = 0;

  this.moveState = {
    up:        0,
    down:      0,
    left:      0,
    right:     0,
    forward:   0,
    back:      0,
    pitchUp:   0,
    pitchDown: 0,
    yawLeft:   0,
    yawRight:  0,
    rollLeft:  0,
    rollRight: 0,
  };

  this.moveVector = new THREE.Vector3( 0, 0, 0 );
  this.rotationVector = new THREE.Vector3( 0, 0, 0 );

  var self = this;

  function keydown(event)
  {
    if (event.altKey)
    {
      return;
    }

    switch (event.keyCode)
    {
      case 16: // Shift
        self.movementSpeedMultiplier = 10;
        break;

      case 87: // W
        self.moveState.forward = 1;
        break;

      case 83: // S
        self.moveState.back = 1;
        break;

      case 65: // A
        self.moveState.left = 1;
        break;

      case 68: // D
        self.moveState.right = 1;
        break;

      case 82: // R
        self.moveState.up = 1;
        break;

      case 70: // F
        self.moveState.down = 1;
        break;

      case 38: // Up
        self.moveState.pitchUp = 1;
        break;

      case 40: // Down
        self.moveState.pitchDown = 1;
        break;

      case 37: // Left
        self.moveState.yawLeft = 1;
        break;

      case 39: // Right
        self.moveState.yawRight = 1;
        break;

      case 81: // Q
        self.moveState.rollLeft = 1;
        break;

      case 69: // E
        self.moveState.rollRight = 1;
        break;

      case 84: // T
        self.teleport();
        break;
    }

    updateMovementVector();
    updateRotationVector();
  };

  function keyup(event)
  {
    switch (event.keyCode)
    {
      case 16: // Shift
        self.movementSpeedMultiplier = 1;
        break;

      case 87: // W
        self.moveState.forward = 0;
        break;

      case 83: // S
        self.moveState.back = 0;
        break;

      case 65: // A
        self.moveState.left = 0;
        break;

      case 68: // D
        self.moveState.right = 0;
        break;

      case 82: // R
        self.moveState.up = 0;
        break;

      case 70: // F
        self.moveState.down = 0;
        break;

      case 38: // Up
        self.moveState.pitchUp = 0;
        break;

      case 40: // Down
        self.moveState.pitchDown = 0;
        break;

      case 37: // Left
        self.moveState.yawLeft = 0;
        break;

      case 39: // Right
        self.moveState.yawRight = 0;
        break;

      case 81: // Q
        self.moveState.rollLeft = 0;
        break;

      case 69: // E
        self.moveState.rollRight = 0;
        break;
    }

    updateMovementVector();
    updateRotationVector();
  }

  function mousedown(event)
  {
    if ( element !== document )
    {
      element.focus();
    }

    event.preventDefault();
    event.stopPropagation();

    if (self.dragToLook)
    {
      self.mouseStatus++;
    }
    else
    {
      switch (event.button)
      {
        case 0:
          self.moveState.forward = 1;
          break;

        case 2:
          self.moveState.back = 1;
          break;
      }

      updateMovementVector();
    }
  }

  function mousemove(event)
  {
    if (self.dragToLook && self.mouseStatus == 0)
    {
      return;
    }

    var container = getContainerDimensions();
    var halfWidth  = container.size[0] / 2;
    var halfHeight = container.size[1] / 2;

    self.moveState.yawLeft   = - ((event.pageX - container.offset[0]) - halfWidth ) / halfWidth;
    self.moveState.pitchDown =   ((event.pageY - container.offset[1]) - halfHeight) / halfHeight;

    updateRotationVector();
  }

  function mouseup(event)
  {
    event.preventDefault();
    event.stopPropagation();

    if ( self.dragToLook )
    {
      self.mouseStatus --;
      self.moveState.yawLeft = self.moveState.pitchDown = 0;
    }
    else
    {
      switch (event.button)
      {
        case 0:
          self.moveState.forward = 0;
          break;

        case 2:
          self.moveState.back = 0;
          break;
      }

      updateMovementVector();
    }

    updateRotationVector();
  };

  function updateMovementVector()
  {
    var forward = (self.moveState.forward || (self.autoForward && !self.moveState.back)) ? 1 : 0;

    self.moveVector.x = ( -self.moveState.left    + self.moveState.right );
    self.moveVector.y = ( -self.moveState.down    + self.moveState.up );
    self.moveVector.z = ( -forward + self.moveState.back );
  };

  function updateRotationVector()
  {
    self.rotationVector.x = ( -self.moveState.pitchDown + self.moveState.pitchUp );
    self.rotationVector.y = ( -self.moveState.yawRight  + self.moveState.yawLeft );
    self.rotationVector.z = ( -self.moveState.rollRight + self.moveState.rollLeft );
  };

  function getContainerDimensions()
  {
    if (element != document)
    {
      return {
        size: [element.offsetWidth, element.offsetHeight],
        offset: [element.offsetLeft, element.offsetTop]
      };
    }
    else
    {
      return {
        size: [window.innerWidth, window.innerHeight],
        offset: [0, 0]
      };
    }
  }

  function contextmenu(event)
  {
    event.preventDefault();
  }

  this.connect = function() {
    updateMovementVector();
    updateRotationVector();

    element.addEventListener('contextmenu', contextmenu, false);

    element.addEventListener('mousemove', mousemove, false);
    element.addEventListener('mousedown', mousedown, false);
    element.addEventListener('mouseup',   mouseup, false);

    window.addEventListener('keydown', keydown, false);
    window.addEventListener('keyup', keyup, false);

    this.enabled = true;
  };

  this.disconnect = function() {
    element.removeEventListener('contextmenu', contextmenu, false);

    element.removeEventListener('mousemove', mousemove, false);
    element.removeEventListener('mousedown', mousedown, false);
    element.removeEventListener('mouseup',   mouseup, false);

    window.removeEventListener('keydown', keydown, false);
    window.removeEventListener('keyup', keyup, false);

    this.enabled = false;
  };

  this.update = function()
  {
    var moveMult = this.movementSpeed * this.movementSpeedMultiplier;
    var rotMult = this.rollSpeed;

    this.player.velocity.copy(this.moveVector).multiplyScalar(moveMult).applyQuaternion(this.player.eyes.getWorldQuaternion());
    this.player.eyeAngularVelocity.copy(this.rotationVector).multiplyScalar(rotMult);
  };
}
