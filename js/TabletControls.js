var TabletControls = function ( object, element ) {

	var scope = this;
  
  this.deviceOrientationControls = new THREE.DeviceOrientationControls(object);

	this.object = object;
  
  this.moveForward = false;
  this.movementSpeed = 1.0;
  
  var onTouchStartEvent = function(event) {
    scope.moveForward = true;
    event.preventDefault();
  };
  
  var onTouchEndEvent = function(event) {
    scope.moveForward = false;
    event.preventDefault();
  };

	this.connect = function() {
		this.deviceOrientationControls.connect();

		element.addEventListener( 'touchstart', onTouchStartEvent, false );
		element.addEventListener( 'touchend', onTouchEndEvent, false );

		scope.enabled = true;
	};

	this.disconnect = function() {
		this.deviceOrientationControls.disconnect();
    
		element.removeEventListener( 'touchstart', onTouchStartEvent, false );
		element.removeEventListener( 'touchend', onTouchEndEvent, false );
    
		scope.enabled = false;
	};

  var forward = new THREE.Vector3(0, 0, -1);
	this.update = function (delta) {
		if (scope.enabled === false) return;
    
    if (scope.moveForward)
    {
      scope.object.translateOnAxis(forward, delta * scope.movementSpeed);
    }
    
    scope.deviceOrientationControls.update();
	};

	this.connect();
};
