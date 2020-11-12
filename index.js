import THREE from "three.js";
import dat from "dat.gui";
import { animationFrameScheduler, interval, timer } from "rxjs";
import { takeUntil, tap } from "rxjs/operators";

// scalar to simulate speed
var speed = 0.05;
var direction = new THREE.Vector3(0, -1, 0);
const EasingFunctions = {
  // no easing, no acceleration
  linear: t => t,
  // accelerating from zero velocity
  easeInQuad: t => t * t,
  // decelerating to zero velocity
  easeOutQuad: t => t * (2 - t),
  // acceleration until halfway, then deceleration
  easeInOutQuad: t => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  // accelerating from zero velocity
  easeInCubic: t => t * t * t,
  // decelerating to zero velocity
  easeOutCubic: t => --t * t * t + 1,
  // acceleration until halfway, then deceleration
  easeInOutCubic: t =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  // accelerating from zero velocity
  easeInQuart: t => t * t * t * t,
  // decelerating to zero velocity
  easeOutQuart: t => 1 - --t * t * t * t,
  // acceleration until halfway, then deceleration
  easeInOutQuart: t => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),
  // accelerating from zero velocity
  easeInQuint: t => t * t * t * t * t,
  // decelerating to zero velocity
  easeOutQuint: t => 1 + --t * t * t * t * t,
  // acceleration until halfway, then deceleration
  easeInOutQuint: t =>
    t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t
};

function initState() {
  return {
    scene: new THREE.Scene(),
    camera: new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    ),
    renderer: new THREE.WebGLRenderer(),
    plane: new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshLambertMaterial({ color: 0xcccccc })
    ),
    cube: new THREE.Mesh(
      new THREE.BoxGeometry(6, 4, 6),
      new THREE.MeshLambertMaterial({
        color: 0x086113,
        transparent: true,
        opacity: 1
      })
    ),
    ambient: new THREE.AmbientLight(0xffffff, 0.3),
    light: new THREE.DirectionalLight(0xffffff, 1, 100, 2),
    clock: new THREE.Clock(),
    control: {
      rotationSpeed: 0.5,
      opacity: 1,
      color: 0x086113
    },
    raycaster: new THREE.Raycaster(),
    selected: undefined,
    mouse: new THREE.Vector2(),
    spheres: []
  };
}

const state = initState();
const {
  scene,
  camera,
  renderer,
  plane,
  cube,
  spheres,
  ambient,
  light,
  clock,
  control,
  selected,
  raycaster,
  mouse
} = state;

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onDocumentMouseMove(event) {
  event.preventDefault();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function onDocumentMouseDown(event) {
  event.preventDefault();
  if (selected) {
    selected.currentHex = 0x00ff00 * Math.random();
    selected.material.emissive.setHex(selected.currentHex);
  }
}

/*
 We need to specify where in the website we want to draw our composition.
 For this purpose we can use "renders", which are responsible for creating
 the DOM element (WebGL, Canvas, CSS3) so that we can add it on the page.
*/
function buildRenderer() {
  renderer.setClearColor(0x000000, 1.0);
  renderer.physicallyCorrectLights = true;
  renderer.gammaInput = true;
  renderer.gammaOutput = true;
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ReinhardToneMapping;
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function buildPlane() {
  plane.receiveShadow = true;
  plane.rotation.x = -0.5 * Math.PI;
  plane.position.x = 0;
  plane.position.y = -2;
  plane.position.z = 0;
}

function buildCamera() {
  camera.position.x = 15;
  camera.position.y = 16;
  camera.position.z = 13;
}

function buildCube() {
  cube.name = "cube";
  cube.castShadow = true;
}

function buildLight() {
  light.position.set(10, 20, 20);
  light.castShadow = true;
}

function init() {
  buildRenderer();
  buildPlane();
  buildCube();
  buildLight();
  buildCamera();

  [...Array(4).keys()].forEach(x => {
    const geometry = new THREE.DodecahedronGeometry(2, 0);
    const material = new THREE.MeshLambertMaterial({ color: 0x2194ce });
    const sphere = new THREE.Mesh(geometry, material);
    sphere.position.y = 8;
    sphere.position.x = x * 5;

    spheres.push(sphere);
  });

  spheres.forEach(x => {
    console.log("SPHERE IS", x);
    scene.add(x);
  });

  scene.add(plane);
  scene.add(cube);
  camera.lookAt(scene.position);
  scene.add(ambient);
  scene.add(light);

  addControlGui(control);

  const container = document.getElementById("app");
  container.appendChild(renderer.domElement);
  const resizeHOF = ({ camera, renderer }) => event =>
    handleResize({ camera, renderer });
  window.addEventListener("resize", resizeHOF({ camera, renderer }), false);
  document.addEventListener("mousemove", onDocumentMouseMove, false);
  container.addEventListener("mousedown", onDocumentMouseDown, false);
  window.addEventListener("resize", onWindowResize, false);

  render({ scene, renderer, camera, raycaster, selected, mouse });
}

function addControlGui(controlObject) {
  var gui = new dat.GUI();
  gui.add(controlObject, "rotationSpeed", -1, 1);
  gui.add(controlObject, "opacity", 0.1, 1);
  gui.addColor(controlObject, "color");
}

function updateCamera(camera, rotSpeed, scene) {
  camera.position.x =
    camera.position.x * Math.cos(rotSpeed) +
    camera.position.z * Math.sin(rotSpeed);
  camera.position.z =
    camera.position.z * Math.cos(rotSpeed) -
    camera.position.x * Math.sin(rotSpeed);
  camera.lookAt(scene.position);
}

function render({ scene, renderer, camera, raycaster, selected, mouse }) {
  const delta = clock.getDelta();
  // alert(`${delta}, ${control.rotationSpeed}`); // e ceva aleatoriu ca si Math.random
  const rotSpeed = delta * control.rotationSpeed;
  updateCamera(camera, rotSpeed, scene);

  scene.getObjectByName("cube").material.opacity = control.opacity;
  scene.getObjectByName("cube").material.color = new THREE.Color(control.color);
  requestAnimationFrame(() =>
    render({ scene, renderer, camera, raycaster, selected, mouse })
  );

  raycaster.setFromCamera(mouse, camera);

  // raycaster "translates" the x,y coordinates of the mouse on the plane surface into 3D coordinates (x,y,z),
  // taking into account those that are the visible parts of objects on the scene.
  // It excludes the hidden portions of objects.

  const intersects = raycaster.intersectObjects(scene.children);
  const container = document.getElementById("app");
  // console.log("SELECTED IS ", selected);
  if (intersects.length > 0) {
    if (selected !== intersects[0].object) {
      if (selected) selected.material.emissive.setHex(selected.currentHex);
      selected = intersects[0].object;
      console.log("MOUSE IS", mouse);
      // if(selected.name === "cube") {
      // 	alert("CUBEEEE");
      // }

      selected.currentHex = selected.material.emissive.getHex();
      selected.material.emissive.setHex(0xff0000);
      container.style.cursor = "pointer";
    }
  } else {
    if (selected) {
      selected.material.emissive.setHex(selected.currentHex);
      selected = null;
      container.style.cursor = "auto";
    }
  }

  renderer.render(scene, camera);
}

function handleResize({ camera, renderer }) {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
function move() {
  console.log("testttttttt");
  var vector = direction.clone().multiplyScalar(speed);
  /*
	Using RXJS is not mandatory, I could just put move() inside render() before
	requestAnimationFrame().
	This is just to show how RXJS can be used to create animations.

 */
  interval(0, animationFrameScheduler)
    .pipe(
      // map(frame=>Math.sin(frame/10)*50),
      takeUntil(timer(600)),
      tap(y => {
        console.log("y is:", y);
        for (const s of spheres) {
          s.position.x = s.position.x + vector.x;
          s.position.y = s.position.y + vector.y;
          s.position.z = s.position.z + vector.z;
        }
      })
    )
    .subscribe();

  speed = EasingFunctions.linear(speed);
}
init();
move();
