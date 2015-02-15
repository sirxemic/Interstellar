if (!Detector.webgl) {
  document.body.classList.add("no-ui");
  Detector.addGetWebGLMessage({id: "webgl-error"});
}

var _tempVector = new THREE.Vector3();

var Simulation = {
  init: function init()
  {
    this.initScene();
    this.initGL();
    this.initDom();
    this.initControls();
  },

  initGL: function()
  {
    var self = this;

    // Init THREE.js stuff
    this.camera = new THREE.OrthographicCamera(-1, 1, -1, 1, 0, 1);

    this.camera.lookAt(this.wormholePositionSize);

    this.renderer = new THREE.WebGLRenderer();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.sortObjects = false;

    this.renderer.autoClear = false;

    this.quadScene = new THREE.Scene();
    this.quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

    this.quadScene.add(new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), new THREE.ShaderMaterial({
      uniforms: this.uniforms,

      vertexShader: document.getElementById("vertexShader").textContent,
      fragmentShader: document.getElementById("fragmentShader").textContent,
    })));

    this.renderPasses = [
      new THREE.RenderPass(this.quadScene, this.quadCam),
      new THREE.BloomPass(1.25),
      new THREE.ShaderPass(THREE.CopyShader)
    ];

    this.renderPasses[this.renderPasses.length - 1].renderToScreen = true;

    this.composer = new THREE.EffectComposer(this.renderer);

    this.renderPasses.forEach(function(pass) {
      self.composer.addPass(pass);
    });

    this.rayMatrix = new THREE.Matrix4();
  },

  initDom: function()
  {
    var self = this;

    // Init some DOM stuff
    this.container = document.getElementById("container");
    this.container.appendChild(this.renderer.domElement);

    this.stats = new Stats();
    this.stats.domElement.style.position = "absolute";
    this.stats.domElement.style.top = 0;
    this.stats.domElement.style.zIndex = 100;
    document.body.appendChild(this.stats.domElement);

    var uiToggle = document.querySelector(".ui-toggle input");

    var onUIToggle = function() {
      if (uiToggle.checked) {
        document.body.classList.add("no-ui");
      }
      else {
        document.body.classList.remove("no-ui");
      }
      uiToggle.blur();
    };

    uiToggle.addEventListener("change", onUIToggle);

    onUIToggle();

    var updateResolution = function()
    {
      var size = parseInt(document.querySelector("[name=resolution]:checked").value),
          width = Math.floor(window.innerWidth / size),
          height = Math.floor(window.innerHeight / size);

      self.composer.setSize(width, height);
    };

    this.zoom = 1;

    var onWindowResize = function()
    {
      self.renderer.setSize(window.innerWidth, window.innerHeight);

      var vx, vy;
      if (window.innerWidth > window.innerHeight)
      {
        vx = 1;
        vy = window.innerHeight / window.innerWidth;
      }
      else
      {
        vx = window.innerWidth / window.innerHeight;
        vy = 1;
      }
      self.rayMatrix.set(vx, 0, 0, 0,
                         0, vy, 0, 0,
                         0, 0, -self.zoom, 0,
                         0, 0, 0, 1);

      updateResolution();
    };

    var onWheel = function(e) {
      e.preventDefault();

      var delta = e.delta || (e.deltaX + e.deltaY + e.deltaZ);
      if (delta < 0)
      {
        self.zoom *= 1.06;
      }
      else
      {
        self.zoom /= 1.06;
      }
      self.rayMatrix.elements[10] = -self.zoom;
    };

    window.addEventListener("resize", onWindowResize, false);
    onWindowResize();

    document.querySelector("#resolution").addEventListener("change", function(event) {
      updateResolution();
      event.target.blur();
    }, false);

    window.addEventListener("wheel", onWheel, false);
  },

  initControls: function()
  {
    var self = this;

    // Init the controls
    this.tabletControls = new TabletControls(this.camera, this.container);
    this.tabletControls.movementSpeed = 1.3;

    this.keyboardControls = new THREE.FlyControls(this.camera, this.container);
    this.keyboardControls.movementSpeed = 1;
    this.keyboardControls.domElement = this.container;
    this.keyboardControls.rollSpeed = Math.PI / 3;
    this.keyboardControls.autoForward = false;
    this.keyboardControls.dragToLook = false;

    var keypress = function(event)
    {
      if (event.charCode == 32)
      {
        if (!self.keyboardControls.dragToLook)
        {
          self.keyboardControls.moveState.yawLeft = 0;
          self.keyboardControls.moveState.pitchDown = 0;
        }
        self.keyboardControls.dragToLook = !self.keyboardControls.dragToLook;
      }

      // Pretty sure we don't need tablet controls when a keyboard event is triggered.
      self.tabletControls.disconnect();

      document.body.classList.remove("tablet");
    };

    window.addEventListener("keypress", keypress, false);

    // Disable tablet controls until we get some indication that we're on a tablet
    this.tabletControls.disconnect();

    var deviceListener = function(event) {
      if (event.alpha === null) return;

      self.tabletControls.connect();

      window.removeEventListener("deviceorientation", deviceListener, false);

      document.body.classList.add("tablet");
    };

    window.addEventListener("deviceorientation", deviceListener, false);
  },

  initScene: function()
  {
    this.wormholePositionSize = new THREE.Vector4(5, -5.0, -30, 0.6);
    this.blackholePositionSize = new THREE.Vector4(0.0, -250.0, 250.0, 12.5);
    this.saturnPositionSize = new THREE.Vector4(-14, 5, -40, 8.0);
    this.planetPositionSize = new THREE.Vector4(7.6, 62, -50, 0.08);

    this.planetPositionSize.x += this.blackholePositionSize.x;
    this.planetPositionSize.y += this.blackholePositionSize.y;
    this.planetPositionSize.z += this.blackholePositionSize.z;

    // Ring definition - xyz is normal going through ring. Its magnitude determines inner radius.
    // w component determines outer radius
    this.blackholeDisk = new THREE.Vector4(18.0, 0.0, 0.0, 150.0);
    this.saturnRings = new THREE.Vector4(13.36, 0.0, 0.0, 18.64);

    var rotation = new THREE.Quaternion();
    rotation.setFromAxisAngle((new THREE.Vector3(0, -1, 2)).normalize(), 2.3);
    THREE.Vector3.prototype.applyQuaternion.call(this.blackholeDisk, rotation);

    rotation.setFromAxisAngle((new THREE.Vector3(2, 1, 3)).normalize(), 1.8);
    THREE.Vector3.prototype.applyQuaternion.call(this.saturnRings, rotation);

    var numTexturesLoaded = 0;
    var textureCount = 0;
    var updateProgress = function() {
      numTexturesLoaded++;
      if (numTexturesLoaded == textureCount)
      {
        var el = document.getElementById("loading");
        el.parentElement.removeChild(el);
        Simulation.inited = true;
      }
    };

    this.wormholeGravityRatio = 0.1;

    this.uniforms = {
      "wormhole": { type: "v4", value: this.wormholePositionSize },
      "wormholeGravityRatio": { type: "f", value: this.wormholeGravityRatio },
      // 1 = like a black hole but with the mouth at the event horizon (big gravitational well)
      // 0 = completely flat space (no gravity at all)
      "blackhole": { type: "v4", value: this.blackholePositionSize },

      "saturn":  { type: "v4", value: this.saturnPositionSize },
      "planet":  { type: "v4", value: this.planetPositionSize },

      "blackholeDisk": { type: "v4", value: this.blackholeDisk },
      "saturnRings": { type: "v4", value: this.saturnRings },

      "planetDiffuse": { type: "v3", value: new THREE.Vector3(0.58,0.85,0.96) },
      "planetSpecular": { type: "v3", value: new THREE.Vector3(0.1,0.1,0.1) },
      "texSaturn": { type: "t", value: THREE.ImageUtils.loadTexture("saturn.jpg", null, updateProgress) },
      "texSaturnRings": { type: "t", value: THREE.ImageUtils.loadTexture("saturnrings.png", null, updateProgress) },
      "texGalaxy1":  { type: "t", value: THREE.ImageUtils.loadTexture("galaxy1.png", null, updateProgress) },
      "texGalaxy2":  { type: "t", value: THREE.ImageUtils.loadTexture("galaxy2.png", null, updateProgress) },
      "texAccretionDisk": { type: "t", value: THREE.ImageUtils.loadTexture("accretion_disk.png", null, updateProgress) },

      "lightDirection": { type: "v3", value: new THREE.Vector3(-1, 0, 0) },

      "rayMatrix": { type: "m4", value: new THREE.Matrix4() },

      "startGalaxy": { type: "i", value: 0 },
      "cameraPosition": { type: "v3" },
    };

    for (var uniform in this.uniforms)
    {
      if (this.uniforms[uniform].type == "t") textureCount++;
    }
    
    this.uniforms.texAccretionDisk.value.wrapS = THREE.RepeatWrapping

    // Some entities to calculate with
    this.wormholeSphere = new THREE.Sphere(this.wormholePositionSize, this.wormholePositionSize.w);
  },

  step: function()
  {
    if (this.inited)
    {
      this.update();
    }
    this.render();

    this.stats.update();
  },

  start: function()
  {
    var self = this;

    this.clock = new THREE.Clock();

    function animate()
    {
      requestAnimationFrame(animate);

      self.step();
    }

    animate();
  },

  update: (function() {

    var prevPosition   = new THREE.Vector3(),
        prevQuaternion = new THREE.Quaternion(),
        velocity       = new THREE.Vector3(),
        direction      = new THREE.Vector3(),
        intersection   = new THREE.Vector3(),
        axis           = new THREE.Vector3(),
        rotation       = new THREE.Quaternion(),
        temp           = new THREE.Vector3(),
        ray            = new THREE.Ray();

    return function() {
      var delta = this.clock.getDelta(),
          wormholePosition = this.wormholePositionSize;

      prevPosition.copy(this.camera.position);
      prevQuaternion.copy(this.camera.quaternion);

      // Handle input
      this.keyboardControls.update(delta);
      this.tabletControls.update(delta);

      // Apply wormhole curvature/gravity.
      this.applyWormholeCurvature(prevPosition, delta);

      // Check if we're going through the wormhole
      velocity.subVectors(this.camera.position, prevPosition);
      direction.copy(velocity).normalize();

      ray.set(prevPosition, direction);

      var at = ray.intersectSphere(this.wormholeSphere, intersection);
      if (at && at.distanceToSquared(prevPosition) <= velocity.lengthSq())
      {
        // Rotate 180 degrees around axis pointing at exit point
        axis.subVectors(intersection, wormholePosition).normalize();
        rotation.setFromAxisAngle(axis, Math.PI);
        this.camera.quaternion.multiplyQuaternions(rotation, this.camera.quaternion);

        // Set new camera position a tiny bit outside mirrored intersection point
        this.camera.position.copy(wormholePosition).add(temp.subVectors(wormholePosition, intersection).multiplyScalar(1.0001));

        this.uniforms.startGalaxy.value = 1 - this.uniforms.startGalaxy.value;
      }
    };
  })(),

  render: function()
  {
    this.uniforms.rayMatrix.value.makeRotationFromQuaternion(this.camera.quaternion);
    this.uniforms.rayMatrix.value.multiply(this.rayMatrix);

    this.uniforms.cameraPosition.value = this.camera.position;

    this.renderer.clear();
    this.composer.render();
  },

  applyWormholeCurvature: (function() {

    var velocity = new THREE.Vector3(),
        newVelocity = new THREE.Vector3(),
        gravityVector = new THREE.Vector3(),
        acceleration = new THREE.Vector3(),
        rotation = new THREE.Quaternion();

    var record = 0;

    return function(prevPosition, delta) {
      velocity.subVectors(this.camera.position, prevPosition).multiplyScalar(1 / delta);
      var speedSq = velocity.lengthSq();
      newVelocity.copy(velocity);

      gravityVector.subVectors(this.wormholePositionSize, prevPosition);
      var rayDistance = gravityVector.length() - this.wormholePositionSize.w * (1 - this.wormholeGravityRatio);
      var amount = this.wormholeGravityRatio / rayDistance;
      acceleration.copy(gravityVector.normalize()).multiplyScalar(this.wormholePositionSize.w * speedSq * amount * amount);

      newVelocity.add(acceleration.multiplyScalar(delta));

      this.camera.position.addVectors(prevPosition, newVelocity.multiplyScalar(delta));

      rotation.setFromUnitVectors(velocity.normalize(), newVelocity.normalize());
      this.camera.quaternion.multiplyQuaternions(rotation, this.camera.quaternion);
    };
  })(),
};

Simulation.init();
Simulation.start();