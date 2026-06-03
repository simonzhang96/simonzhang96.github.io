// main.js

import * as THREE from "https://unpkg.com/three@0.179.1/build/three.module.js";
import { OrbitControls }
from "https://unpkg.com/three@0.179.1/examples/jsm/controls/OrbitControls.js";

const scene = new THREE.Scene();

const camera = new THREE.PerspectiveCamera(
60,
window.innerWidth / window.innerHeight,
0.1,
1000
);

camera.position.set(0, 0, 3);

const renderer = new THREE.WebGLRenderer({
antialias: true
});

renderer.setSize(
window.innerWidth,
window.innerHeight
);

document.body.appendChild(renderer.domElement);

const light = new THREE.DirectionalLight(0xffffff, 2);
light.position.set(5, 3, 5);
scene.add(light);

scene.add(new THREE.AmbientLight(0xffffff, 0.8));

const textureLoader = new THREE.TextureLoader();

const mapTexture = textureLoader.load(
"./Zeksa-Omklon-Map.png"
);

const globeGeometry = new THREE.SphereGeometry(
1,
128,
128
);

const globeMaterial = new THREE.MeshStandardMaterial({
map: mapTexture
});

const globe = new THREE.Mesh(
globeGeometry,
globeMaterial
);

scene.add(globe);

const controls = new OrbitControls(
camera,
renderer.domElement
);

controls.enableDamping = true;
controls.autoRotate = false;

window.addEventListener("resize", () => {

```
camera.aspect =
    window.innerWidth / window.innerHeight;

camera.updateProjectionMatrix();

renderer.setSize(
    window.innerWidth,
    window.innerHeight
);
```

});

function animate() {

```
requestAnimationFrame(animate);

controls.update();

renderer.render(
    scene,
    camera
);
```

}

animate();
