if (!Detector.webgl) Detector.addGetWebGLMessage();

var container, stats;
var camera, tabletControls, keyboardControls, renderer, composer;

var clock = new THREE.Clock();

var objects = {
  wormhole: new THREE.Vector4(2, -5.0, -28, 0.3),
  blackhole: new THREE.Vector4(0.0, -200.0, 200.0, 3),
  saturn: new THREE.Vector4(-14, 5, -40, 8.0),
  planet: new THREE.Vector4(5.84, -200.3, 211.96, 0.08)
};

var uniforms = {
  "wormhole": { type: "v4", value: objects.wormhole },
  "blackhole": { type: "v4", value: objects.blackhole },
  "gravityWormhole": { type: "f", value: 0.01 },
  "gravityBlackhole": { type: "f", value: 0.1 },
  
  "saturn":  { type: "v4", value: objects.saturn },
  "planet":  { type: "v4", value: objects.planet },
  
  // Ring definition - xyz is normal going through ring. Its magnitude determines inner radius.
  // w component determines outer radius
  "blackholeDisk": { type: "v4", value: new THREE.Vector4(
    -0.7459422414661738, 0.7046642634176441, 0.29361010975735174, 8.0
  ) },
  "saturnRings": { type: "v4", value: new THREE.Vector4(
    -0.1687, 1.518, 0.6748, 2.33
  ) },
  
  "planetDiffuse": { type: "v3", value: new THREE.Vector3(0.0,0.8,0.0) },
  "planetSpecular": { type: "v3", value: new THREE.Vector3(0.2,0.5,0.5) },
  
  "texSaturn": { type: "t", value: THREE.ImageUtils.loadTexture("saturn.jpg") },
  "texSaturnRings": { type: "t", value: THREE.ImageUtils.loadTexture("saturnrings.png") },
  "texGalaxy1":  { type: "t", value: THREE.ImageUtils.loadTexture("galaxy1.png") },
  "texGalaxy2":  { type: "t", value: THREE.ImageUtils.loadTexture("galaxy2.png") },
  "texAccretionDisk": { type: "t", value: THREE.ImageUtils.loadTexture("accretiondisk.jpg") },
  
  "lightDirection": { type: "v3", value: new THREE.Vector3(-1, 0, 0) },
  
  "rayMatrix": { type: "m4", value: new THREE.Matrix4() },
  "c": { type: "f", value: 0.2 },
  "stepSize": { type: "f", value: 1.0 },
  "worldSize": { type: "f", value: 12.0 },
  
  "startGalaxy": { type: "i", value: 0 },
  "cameraPosition": { type: "v3" },
};
var rayMatrix = new THREE.Matrix4();

init();
animate();

function init() 
{
  // Init THREE.js stuff
  camera = new THREE.OrthographicCamera(-1, 1, -1, 1, 0, 1);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.sortObjects = false;

  renderer.autoClear = false;
  
  var quadScene = new THREE.Scene();
  var quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  var quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
  quad.material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    
    defines: {
      NO_EDGE: 1
    },
  
    vertexShader: document.getElementById("vertexShaderDepth").textContent,
    fragmentShader: document.getElementById("fragmentShaderDepth").textContent,
  });
  
  quadScene.add(quad);
  
  var renderModel = new THREE.RenderPass(quadScene, quadCam);
  var effectBloom = new THREE.BloomPass(1.25);
  var effectFilm = new THREE.FilmPass(0.35, 0.95, 2048, false);

  effectFilm.renderToScreen = true;

  composer = new THREE.EffectComposer(renderer);
  
  composer.addPass(renderModel);
  composer.addPass(effectBloom);
  composer.addPass(effectFilm);

  // Init some DOM stuff
  container = document.getElementById("container");
  container.appendChild(renderer.domElement);
  
  stats = new Stats();
  stats.domElement.style.position = "absolute";
  stats.domElement.style.top = 0;
  stats.domElement.style.zIndex = 100;
  document.body.appendChild(stats.domElement);
  
  window.addEventListener("resize", onWindowResize, false);
  onWindowResize();
  
  document.querySelector("#resolution").addEventListener("change", function(event) {
    updateResolution();
    event.target.blur();
  }, false);
  
  // Init the controls
  tabletControls = new TabletControls(camera, container);
  tabletControls.movementSpeed = 1.3;
  
  keyboardControls = new THREE.FlyControls(camera, container);
  keyboardControls.movementSpeed = 1;
  keyboardControls.domElement = container;
  keyboardControls.rollSpeed = Math.PI / 3;
  keyboardControls.autoForward = false;
  keyboardControls.dragToLook = false;
  
  window.addEventListener("keypress", function(event) {
    if (event.charCode == 32)
    {
      if (!keyboardControls.dragToLook)
      {
        keyboardControls.moveState.yawLeft = 0;
        keyboardControls.moveState.pitchDown = 0;
      }
      keyboardControls.dragToLook = !keyboardControls.dragToLook;
    }
    
    // Pretty sure we don't need tablet controls when a keyboard event is triggered.
    tabletControls.disconnect();
    
    document.body.classList.remove("tablet");
  }, false);
  
  // Disable tablet controls until we get some indication that we're on a tablet
  tabletControls.disconnect();
  
  var deviceListener = function(event) {
    tabletControls.connect();
    
    window.removeEventListener("deviceorientation", deviceListener, false);
    
    document.body.classList.add("tablet");
  };
  
  window.addEventListener("deviceorientation", deviceListener, false);
}

function onWindowResize() 
{
  renderer.setSize(window.innerWidth, window.innerHeight);
  
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
  rayMatrix.set(1.2 * vx, 0, 0, 0,
                0, 1.2 * vy, 0, 0,
                0, 0, -1, 0,
                0, 0, 0, 1);
                
  updateResolution();
}

function updateResolution()
{
  var size = parseInt(document.querySelector("[name=resolution]:checked").value),
      width = Math.floor(window.innerWidth / size),
      height = Math.floor(window.innerHeight / size);
      
  composer.setSize(width, height);
}

function animate() 
{
  requestAnimationFrame(animate);

  render();
  stats.update();
}

function render()
{
  var delta = clock.getDelta(),
      t = clock.getElapsedTime();
  
  var prevPosition = new THREE.Vector3();
  prevPosition.copy(camera.position);

  keyboardControls.update(delta);
  tabletControls.update(delta);

  var rotationMatrix = new THREE.Matrix4();
  
  uniforms.cameraPosition.value = camera.position;
  rotationMatrix.makeRotationFromQuaternion(camera.quaternion);
  uniforms.rayMatrix.value.copy(rotationMatrix);
  uniforms.rayMatrix.value.multiply(rayMatrix);
  
  if (camera.position.distanceTo(objects.wormhole) < objects.wormhole.w)
  {
    camera.position.copy(objects.wormhole).multiplyScalar(2).sub(prevPosition);
    uniforms.startGalaxy.value = 1 - uniforms.startGalaxy.value;
  }
  
  renderer.clear();
  composer.render( 0.01 );
}
