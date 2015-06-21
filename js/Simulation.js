var Simulation = {
  init: function init()
  {
    this.initScene();
    this.initGL();
    this.initDom();
    this.initPlayer();
  },

  initGL: function()
  {
    var self = this;

    // Init THREE.js stuff
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

      self.updateView();

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

      self.updateView();
    };

    window.addEventListener("resize", onWindowResize, false);
    onWindowResize();

    document.querySelector("#resolution").addEventListener("change", function(event) {
      updateResolution();
      event.target.blur();
    }, false);

    window.addEventListener("wheel", onWheel, false);
  },

  initScene: function()
  {
    this.wormholePositionSize = new THREE.Vector4(10, 0.0, -32, 0.8);
    this.blackholePositionSize = new THREE.Vector4(0.0, -250.0, 250.0, 12.5);
    this.saturnPositionSize = new THREE.Vector4(-14, 5, -40, 8.0);
    this.planetPositionSize = new THREE.Vector4(7.6, 62, -50, 0.08);

    this.planetPositionSize.x += this.blackholePositionSize.x;
    this.planetPositionSize.y += this.blackholePositionSize.y;
    this.planetPositionSize.z += this.blackholePositionSize.z;

    // Ring definition - xyz is normal going through ring. Its magnitude determines inner radius.
    // w component determines outer radius
    this.blackholeDisk = new THREE.Vector4(-12, 12, 6, 150.0);
    this.saturnRings = new THREE.Vector4(0, 9.22, 0, 17.1);

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

    this.wormholeGravityRatio = 0.25;

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

      "lightDirection": { type: "v3", value: (new THREE.Vector3(-4, 2, 3)).normalize() },

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

  updateView: function()
  {
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

    this.rayMatrix.set(vx, 0, 0, 0,
                       0, vy, 0, 0,
                       0, 0, -this.zoom, 0,
                       0, 0, 0, 1);

    if (this.mobileDeviceControls)
    {
      this.mobileDeviceControls.fovy = 2 * Math.atan(vy / this.zoom);
    }

    THREE.BloomPass.blurX.set( 1 / (512 * vx), 0.0 );
    THREE.BloomPass.blurY.set( 0.0, 1 / (512 * vy) );
  },

  initPlayer: function()
  {
    var self = this;

    this.player = new Player;
    this.player.lookAt(this.wormholePositionSize);

    // Add keyboard controls to the player
    this.keyboardControls = new KeyboardControls(this.player, this.container);
    this.keyboardControls.movementSpeed = 1;
    this.keyboardControls.rollSpeed = Math.PI / 3;
    this.keyboardControls.autoForward = false;
    this.keyboardControls.dragToLook = false;

    this.player.controls.push(this.keyboardControls);

    // Add mobile device controls (touch + accelerometer) to the player
    this.mobileDeviceControls = new MobileDeviceControls(this.player, this.container);
    this.mobileDeviceControls.movementSpeed = 1.3;

    this.player.controls.push(this.mobileDeviceControls);

    // Pretty sure we don't need mobile device controls when a keyboard event is triggered.
    var keypress = function(event) {
      if (event.charCode == 32)
      {
        if (!self.keyboardControls.dragToLook)
        {
          self.keyboardControls.moveState.yawLeft = 0;
          self.keyboardControls.moveState.pitchDown = 0;
        }
        self.keyboardControls.dragToLook = !self.keyboardControls.dragToLook;
      }

      self.mobileDeviceControls.disconnect();

      document.body.classList.remove("mobile-device");
    };

    window.addEventListener("keypress", keypress, false);

    // Disable mobile device controls until we get some indication that we're on an orientable device
    this.mobileDeviceControls.disconnect();

    var deviceListener = function(event) {
      if (event.alpha === null) return;

      self.mobileDeviceControls.connect();

      window.removeEventListener("deviceorientation", deviceListener, false);

      document.body.classList.add("mobile-device");
    };

    window.addEventListener("deviceorientation", deviceListener, false);

    this.updateView();
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

  update: function()
  {
    var delta = this.clock.getDelta();

    // TODO: figure out why delta can become so small
    if (delta < 0.001)
    {
      delta = 0.001;
    }

    this.player.update(delta);
  },

  render: function()
  {
    this.uniforms.rayMatrix.value.makeRotationFromQuaternion(this.player.eyes.getWorldQuaternion());
    this.uniforms.rayMatrix.value.multiply(this.rayMatrix);

    this.uniforms.cameraPosition.value = this.player.eyes.getWorldPosition();
    this.uniforms.startGalaxy.value = this.player.galaxy;

    this.renderer.clear();
    this.composer.render();
  },
};