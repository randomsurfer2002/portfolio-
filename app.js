/**
 * 3D Concept Studio - Interactive Vehicle Surfacing Engine
 * Tech Stack: Three.js, WebGL, Vanilla ES6 JavaScript
 */

let scene, camera, renderer, controls;
let conceptCarGroup, carBodyMesh, wireframeMesh, particleSystem;
let spotLight, ambientLight, pointLight;
let rotationSpeed = 0.005;

// Color Palette Options
const paintColors = [0xff0033, 0x111111, 0xffffff, 0x00e5ff, 0xffb700];
let currentColorIndex = 0;

// Performance Tracking
let lastTime = performance.now();
let frameCount = 0;

init();
animate();

function init() {
  const container = document.getElementById('canvas-container');

  // 1. SCENE SETUP
  scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x040405, 0.035);

  // 2. CAMERA SETUP
  camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(5, 3, 7);

  // 3. RENDERER SETUP
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  // 4. ORBIT CONTROLS
  controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.maxPolarAngle = Math.PI / 2 + 0.05; // Keep above floor
  controls.minDistance = 3;
  controls.maxDistance = 15;

  // 5. LIGHTING RIG
  ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  spotLight = new THREE.SpotLight(0xff0033, 3);
  spotLight.position.set(5, 8, 5);
  spotLight.castShadow = true;
  spotLight.angle = Math.PI / 4;
  spotLight.penumbra = 0.8;
  scene.add(spotLight);

  pointLight = new THREE.PointLight(0xffffff, 1.5, 20);
  pointLight.position.set(-4, 3, -4);
  scene.add(pointLight);

  // 6. GENERATE 3D CONCEPT CAR GEOMETRY
  createConceptCar();

  // 7. ENVIRONMENT: GRID FLOOR & PARTICLES
  createEnvironment();

  // 8. EVENT LISTENERS & UI BINDINGS
  window.addEventListener('resize', onWindowResize);
  setupUIControls();
}

function createConceptCar() {
  conceptCarGroup = new THREE.Group();

  // Low-poly aerodynamic car body shape
  const bodyShape = new THREE.BoxGeometry(2.2, 0.6, 4.2, 4, 2, 8);
  
  // Deform geometry vertices for sleek automotive slope
  const pos = bodyShape.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    let y = pos.getY(i);
    let z = pos.getZ(i);

    // Front hood slope
    if (z > 0.5 && y > 0) {
      pos.setY(i, y * 0.4);
    }
    // Cabin roof taper
    if (z < 0.2 && z > -1.2 && y > 0) {
      pos.setY(i, y * 1.5);
    }
  }
  bodyShape.computeVertexNormals();

  // Glossy Car Paint Material
  const bodyMaterial = new THREE.MeshStandardMaterial({
    color: paintColors[0],
    metalness: 0.85,
    roughness: 0.15,
    wireframe: false
  });

  carBodyMesh = new THREE.Mesh(bodyShape, bodyMaterial);
  carBodyMesh.castShadow = true;
  carBodyMesh.receiveShadow = true;
  carBodyMesh.position.y = 0.5;
  conceptCarGroup.add(carBodyMesh);

  // Wireframe Overlay Mesh
  const wireframeGeo = new THREE.WireframeGeometry(bodyShape);
  const wireframeMat = new THREE.LineBasicMaterial({ color: 0xff0033, transparent: true, opacity: 0.25 });
  wireframeMesh = new THREE.LineSegments(wireframeGeo, wireframeMat);
  wireframeMesh.position.y = 0.5;
  conceptCarGroup.add(wireframeMesh);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 24);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.5 });
  
  const wheelPositions = [
    [-1.15, 0.4, 1.3],
    [1.15, 0.4, 1.3],
    [-1.15, 0.4, -1.3],
    [1.15, 0.4, -1.3]
  ];

  wheelPositions.forEach(p => {
    const wheel = new THREE.Mesh(wheelGeo, wheelMat);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(p[0], p[1], p[2]);
    wheel.castShadow = true;
    conceptCarGroup.add(wheel);
  });

  // Glowing Headlight Strips
  const lightGeo = new THREE.BoxGeometry(0.6, 0.08, 0.1);
  const lightMat = new THREE.MeshBasicMaterial({ color: 0xff0033 });
  
  const leftLight = new THREE.Mesh(lightGeo, lightMat);
  leftLight.position.set(-0.7, 0.5, 2.08);
  const rightLight = new THREE.Mesh(lightGeo, lightMat);
  rightLight.position.set(0.7, 0.5, 2.08);
  
  conceptCarGroup.add(leftLight);
  conceptCarGroup.add(rightLight);

  scene.add(conceptCarGroup);

  // Update vertex count in HUD
  document.getElementById('vertCount').innerText = pos.count;
}

function createEnvironment() {
  // Reflective Floor Grid
  const gridHelper = new THREE.GridHelper(30, 30, 0xff0033, 0x222222);
  gridHelper.position.y = 0;
  scene.add(gridHelper);

  // Ambient Dust Particle System
  const particleCount = 400;
  const particleGeo = new THREE.BufferGeometry();
  const particlePositions = new Float32Array(particleCount * 3);

  for (let i = 0; i < particleCount * 3; i += 3) {
    particlePositions[i] = (Math.random() - 0.5) * 20;
    particlePositions[i + 1] = Math.random() * 10;
    particlePositions[i + 2] = (Math.random() - 0.5) * 20;
  }

  particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
  const particleMat = new THREE.PointsMaterial({
    color: 0xff0033,
    size: 0.04,
    transparent: true,
    opacity: 0.6
  });

  particleSystem = new THREE.Points(particleGeo, particleMat);
  scene.add(particleSystem);
}

function setupUIControls() {
  // Toggle Wireframe
  document.getElementById('btnWireframe').addEventListener('click', () => {
    carBodyMesh.material.wireframe = !carBodyMesh.material.wireframe;
    wireframeMesh.visible = !carBodyMesh.material.wireframe;
  });

  // Switch Paint Color
  document.getElementById('btnColor').addEventListener('click', () => {
    currentColorIndex = (currentColorIndex + 1) % paintColors.length;
    carBodyMesh.material.color.setHex(paintColors[currentColorIndex]);
    spotLight.color.setHex(paintColors[currentColorIndex] === 0x111111 ? 0xff0033 : paintColors[currentColorIndex]);
  });

  // Turntable Speed Slider
  document.getElementById('speedSlider').addEventListener('input', (e) => {
    rotationSpeed = parseFloat(e.target.value);
  });
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);

  // Auto Turntable Rotation
  if (conceptCarGroup) {
    conceptCarGroup.rotation.y += rotationSpeed;
  }

  // Floating Particles Drift
  if (particleSystem) {
    particleSystem.rotation.y += 0.0008;
  }

  // FPS Counter Calculation
  frameCount++;
  const currentTime = performance.now();
  if (currentTime - lastTime >= 1000) {
    document.getElementById('fpsCount').innerText = frameCount;
    frameCount = 0;
    lastTime = currentTime;
  }

  controls.update();
  renderer.render(scene, camera);
}
