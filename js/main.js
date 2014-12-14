if (!Detector.webgl) Detector.addGetWebGLMessage();

var container, stats;
var camera, controls, scene, sceneCube, renderer;

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
  
  "planetDiffuse": { type: "v3", value: new THREE.Vector3(0.0,0.8,0.0) },
  "planetSpecular": { type: "v3", value: new THREE.Vector3(0.2,0.5,0.5) },
  
  "texSaturn":  { type: "t", value: THREE.ImageUtils.loadTexture("saturn.jpg") },
  "texGalaxy1":  { type: "t", value: THREE.ImageUtils.loadTexture("galaxy2.png") },
  "texGalaxy2":  { type: "t", value: THREE.ImageUtils.loadTexture("galaxy.png") },
  
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
  container = document.createElement('div');
  document.body.appendChild(container);

  var w = window.innerWidth, h = window.innerHeight, m = Math.max(w, h);
  w /= m; h /= m;
  camera = new THREE.OrthographicCamera(-w, w, -h, h, 0, 1);
  controls = new THREE.FlyControls( camera, container );

  controls.movementSpeed = 1;
  controls.domElement = container;
  controls.rollSpeed = Math.PI / 3;
  controls.autoForward = false;
  controls.dragToLook = false;
  
  window.addEventListener('keypress', function(event) {
    if (event.charCode == 32)
    {
      if (!controls.dragToLook)
      {
        controls.moveState.yawLeft = 0;
        controls.moveState.pitchDown = 0;
        controls.moveState.forward = 0;
        controls.moveState.back = 0;
      }
      controls.dragToLook = !controls.dragToLook;
    }
  }, false);

  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.sortObjects = false;

  renderer.autoClear = false;

  container.appendChild(renderer.domElement);

  stats = new Stats();
  stats.domElement.style.position = 'absolute';
  stats.domElement.style.top = '0px';
  stats.domElement.style.zIndex = 100;
  container.appendChild(stats.domElement);
  
  window.addEventListener('resize', onWindowResize, false);
  
  onWindowResize();
     
  var quad = new THREE.Mesh(new THREE.PlaneBufferGeometry(2, 2), null);
  
  quad.material = new THREE.ShaderMaterial({
    uniforms: uniforms,
    
    defines: {
      NO_EDGE: 1
    },
  
    vertexShader: document.getElementById( 'vertexShaderDepth' ).textContent,
    fragmentShader: document.getElementById( 'fragmentShaderDepth' ).textContent,
  });
  
  var quadScene = new THREE.Scene();

  var rayMatrix = new THREE.Matrix4();
  
  quadScene.add(quad);
  
  var renderModel = new THREE.RenderPass(quadScene, new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1));
  var effectBloom = new THREE.BloomPass(1.25);
  var effectFilm = new THREE.FilmPass(0.35, 0.95, 2048, false);

  effectFilm.renderToScreen = true;

  composer = new THREE.EffectComposer(renderer);

  composer.addPass(renderModel);
  composer.addPass(effectBloom);
  composer.addPass(effectFilm);
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

  controls.update( delta );

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
