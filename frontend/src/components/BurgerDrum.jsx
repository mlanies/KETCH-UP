import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const FILES = {
  drum: "https://assets.codepen.io/557388/drums.glb",
  burger: "https://assets.codepen.io/557388/burger.glb",
  snare: "https://assets.codepen.io/557388/snare.mp3",
  bass: "https://assets.codepen.io/557388/bass.mp3",
  tom1: "https://assets.codepen.io/557388/tom-1.mp3",
  tom2: "https://assets.codepen.io/557388/tom-2.mp3",
  tom3: "https://assets.codepen.io/557388/tom-3.mp3",
  cymbal1: "https://assets.codepen.io/557388/cymbal-1.mp3",
  cymbal2: "https://assets.codepen.io/557388/cymbal-2.mp3"
};

const drumSettings = {
  "bun-bottom": {
    "sound": FILES.snare,
    "key": "q",
    "direction": "y",
    "position": { "x": -1.6, "y": 1.55, "z": 0 },
    "rotation": { "x": 0, "y": 0.67, "z": 0 },
    "scale": { "x": 0.6, "y": 0.6, "z": 0.6 }
  },
  "bun-top": {
    "sound": FILES.bass,
    "key": "w",
    "direction": "z",
    "position": { "x": 0, "y": 0.9, "z": -0.5 },
    "rotation": { "x": -1.9, "y": 1.7, "z": 0 },
    "scale": { "x": 0.8, "y": 0.8, "z": 0.8 }
  },
  "tomato-1": {
    "position": { "x": 1.6, "y": 1, "z": 0.2 },
    "rotation": { "x": -Math.PI, "y": -5, "z": 0 },
    "scale": { "x": 0.7, "y": 0.7, "z": 0.7 }
  },
  "patty-1": {
    "sound": FILES.tom1,
    "key": "e",
    "direction": "y",
    "position": { "x": -0.5, "y": 2.1, "z": -0.1 },
    "rotation": { "x": 0, "y": 3.1, "z": 0 },
    "scale": { "x": 0.5, "y": 0.5, "z": 0.5 }
  },
  "lettuce": {
    "sound": FILES.tom3,
    "key": "r",
    "direction": "y",
    "position": { "x": 1.6, "y": 1.4, "z": 0.2 },
    "rotation": { "x": 0, "y": 0, "z": 0 },
    "scale": { "x": 0.6, "y": 0.6, "z": 0.6 }
  },
  "tomato-2": {
    "position": { "x": 1.5, "y": 1.2, "z": 0.3 },
    "rotation": { "x": -Math.PI, "y": 0.396, "z": 0 },
    "scale": { "x": 0.7, "y": 0.7, "z": 0.7 }
  },
  "cheese-2": {
    "sound": FILES.cymbal1,
    "key": "t",
    "direction": "y",
    "position": { "x": -0.98, "y": 2.43, "z": -0.5 },
    "rotation": { "x": 0.01, "y": -1.65, "z": 0.01 },
    "scale": { "x": 0.7, "y": 0.7, "z": 0.7 }
  },
  "patty-2": {
    "sound": FILES.tom2,
    "key": "y",
    "direction": "y",
    "position": { "x": 0.6, "y": 2.1, "z": -0.1 },
    "rotation": { "x": 0, "y": -4.18, "z": 0 },
    "scale": { "x": 0.5, "y": 0.5, "z": 0.5 }
  },
  "cheese-1": {
    "sound": FILES.cymbal2,
    "key": "u",
    "direction": "y",
    "position": { "x": 1, "y": 2.85, "z": -0.4 },
    "rotation": { "x": -Math.PI, "y": -1.32, "z": -Math.PI },
    "scale": { "x": 0.6, "y": 0.6, "z": 0.6 }
  }
};

const drumSettingsBurger = {
  "bun-bottom": { x: 0, y: 0.5, z: 0 },
  "patty-1": { x: 0, y: 0.8, z: 0 },
  "cheese-1": { x: 0, y: 1.0, z: 0 },
  "lettuce": { x: 0, y: 1.2, z: 0 },
  "tomato-1": { x: 0, y: 1.4, z: 0 },
  "patty-2": { x: 0, y: 1.6, z: 0 },
  "cheese-2": { x: 0, y: 1.8, z: 0 },
  "tomato-2": { x: 0, y: 2.0, z: 0 },
  "bun-top": { x: 0, y: 2.2, z: 0 }
};

export default function BurgerDrum() {
  const mount = useRef();
  const [view, setView] = useState('loading');
  const [manager, setManager] = useState(null);

  useEffect(() => {
    if (!mount.current) return;
    const stage = new Stage(mount.current);
    const _manager = new Manager(stage, view, setView);
    setManager(_manager);
    return () => {
      stage.destroy();
      _manager.fire();
    };
    // eslint-disable-next-line
  }, [mount]);

  useEffect(() => {
    if (manager) manager.updateView(view);
  }, [view, manager]);

  // Клик по бургеру — смена на барабаны
  useEffect(() => {
    if (!mount.current) return;
    const handleClick = () => {
      if (view === 'burger') setView('drums');
    };
    mount.current.addEventListener('click', handleClick);
    return () => mount.current.removeEventListener('click', handleClick);
  }, [view]);

  // Мобильная подсказка и кнопка назад
  return (
    <div
      className={`burger-drum ${view}`}
      style={{
        width: '100%',
        maxWidth: 320,
        margin: '0 auto',
        height: '400px',
        position: 'relative',
        background: 'transparent',
        cursor: view === 'burger' ? 'pointer' : 'default'
      }}
    >
      <div
        className="container"
        ref={mount}
        style={{
          width: '100%',
          height: '100%',
          background: 'transparent'
        }}
      />
      {/* Подсказка для мобильных и десктопа */}
      {view === 'burger' && (
        <div style={{
          position: 'absolute',
          bottom: 24,
          left: 0,
          width: '100%',
          textAlign: 'center',
          color: '#fff',
          fontSize: 20,
          textShadow: '0 2px 8px #000',
          pointerEvents: 'none',
          zIndex: 2
        }}>
          Тапните по бургеру, чтобы начать!
        </div>
      )}
      {view === 'drums' && (
        <>
          <div style={{
            position: 'absolute',
            bottom: 24,
            left: 0,
            width: '100%',
            textAlign: 'center',
            color: '#fff',
            fontSize: 20,
            textShadow: '0 2px 8px #000',
            pointerEvents: 'none',
            zIndex: 2
          }}>
            Тапайте по барабанам!
          </div>
          <button
            style={{
              position: 'absolute',
              top: 16,
              left: 16,
              zIndex: 3,
              background: 'rgba(0,0,0,0.5)',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontSize: 18,
              fontWeight: 600,
              cursor: 'pointer',
              boxShadow: '0 2px 8px #000',
              outline: 'none',
              transition: 'background 0.2s'
            }}
            onClick={e => { e.stopPropagation(); setView('burger'); }}
          >
            Назад
          </button>
        </>
      )}
    </div>
  );
}

class Stage {
  constructor(mount) {
    this.container = mount;
    this.scene = new THREE.Scene();
    this.size = { width: 1, height: 1 };
    this.setupLights();
    this.setupCamera();
    // this.setupFloor(); // Не добавляем пол!
    this.setupFog();
    this.setupRenderer();
    this.onResize();
    window.addEventListener('resize', () => this.onResize());
    this.tick();
  }
  setupLights() {
    this.directionalLight = new THREE.DirectionalLight('#ffffff', 2);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.camera.far = 10;
    this.directionalLight.shadow.mapSize.set(1024, 1024);
    this.directionalLight.shadow.normalBias = 0.05;
    this.directionalLight.position.set(2, 4, 1);
    this.add(this.directionalLight);
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x522142, 0.5);
    this.add(hemisphereLight);
  }
  setupCamera() {
    this.lookAt = new THREE.Vector3(0, 1.5, 0);
    this.camera = new THREE.PerspectiveCamera(40, this.size.width / this.size.height, 0.1, 100);
    this.camera.position.set(0, 3, 6);
    this.camera.home = {
      position: { ...this.camera.position }
    };
    this.add(this.camera);
  }
  setupFog() {
    // Можно не добавлять туман, если не нужен
    // this.scene.fog = new THREE.Fog(0x142522, 6, 20);
  }
  setupRenderer() {
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true, // Важно!
    });
    this.renderer.setClearColor(0x000000, 0); // Прозрачный фон
    this.renderer.physicallyCorrectLights = true;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ReinhardToneMapping;
    this.renderer.toneMappingExposure = 3;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.container.appendChild(this.renderer.domElement);
  }
  onResize() {
    this.size.width = this.container.clientWidth;
    this.size.height = this.container.clientHeight;
    this.camera.aspect = this.size.width / this.size.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this.size.width, this.size.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  }
  tick() {
    this.camera.lookAt(this.lookAt);
    this.renderer.render(this.scene, this.camera);
    window.requestAnimationFrame(() => this.tick());
  }
  add(element) {
    this.scene.add(element);
  }
  set light(value) {
    this.directionalLight.intensity = value;
  }
  get light() {
    return this.directionalLight.intensity;
  }
  destroy() {
    this.container.removeChild(this.renderer.domElement);
    window.removeEventListener('resize', this.onResize);
  }
}

class Manager {
  constructor(stage, view, setView) {
    this.stage = stage;
    this.setView = setView;
    this.debug = false;
    this.sounds = {};
    this.raycaster = new THREE.Raycaster();
    this.view = view;
    this.models = {
      burger: { file: FILES.burger, items: {} },
      drumkit: { file: FILES.drum, items: {} }
    };
    this.setupSpotLights();
    this.loadModels();
  }
  setupSpotLights() {
    this.spotlights = {
      left: { light: new THREE.SpotLight('white', 0), target: new THREE.Object3D() },
      right: { light: new THREE.SpotLight('white', 0), target: new THREE.Object3D() }
    };
    const sides = ['left', 'right'];
    sides.forEach(side => {
      const spotLight = this.spotlights[side].light;
      const target = this.spotlights[side].target;
      spotLight.penumbra = 0.1;
      spotLight.angle = 0.6;
      spotLight.castShadow = true;
      spotLight.shadow.mapSize.width = 1024;
      spotLight.shadow.mapSize.height = 1024;
      spotLight.shadow.camera.near = 1;
      spotLight.shadow.camera.far = 10;
      spotLight.shadow.camera.fov = 50;
      spotLight.target = target;
      this.stage.add(spotLight);
      this.stage.add(target);
    });
    this.spotlights.left.light.position.set(-3, 5, 1);
    this.spotlights.right.light.position.set(3, 5, 1);
  }
  playSound(id) {
    const sound = this.sounds[id];
    if (this.view === 'drums' && sound) {
      sound.audio.currentTime = 0;
      sound.audio.play();
      gsap.fromTo(sound.object.position, { ...sound.from }, { ...sound.to, ease: 'elastic' });
    }
  }
  setupSounds() {
    const testObjects = [];
    for (const [name, drum] of Object.entries(drumSettings)) {
      if (drum.sound) {
        const sound = {
          audio: new Audio(drum.sound),
          object: this.models.burger.items[name],
          from: { [drum.direction]: drum.position[drum.direction] - 0.3 },
          to: { [drum.direction]: drum.position[drum.direction] }
        };
        if (sound.object instanceof THREE.Mesh) {
          testObjects.push(sound.object);
        } else if (sound.object && sound.object.children) {
          sound.object.children.forEach(obj => {
            obj.name = sound.object.name;
            testObjects.push(obj);
          });
        }
        this.sounds[drum.key] = sound;
        this.sounds[name] = sound;
      }
    }
    document.addEventListener('keydown', (event) => { this.playSound(event.key); });
    this.stage.container.addEventListener('click', (event) => {
      const mouse = {
        x: event.offsetX / this.stage.size.width * 2 - 1,
        y: - (event.offsetY / this.stage.size.height) * 2 + 1
      };
      this.raycaster.setFromCamera(mouse, this.stage.camera);
      const intersects = this.raycaster.intersectObjects(testObjects);
      if (intersects.length) {
        this.playSound(intersects[0].object.name);
      }
    });
  }
  loadModels() {
    const loadingManager = new THREE.LoadingManager(() => {
      this.setupSounds();
      this.setView('burger');
    });
    const gltfLoader = new GLTFLoader(loadingManager);
    Object.keys(this.models).forEach(id => {
      const model = this.models[id];
      gltfLoader.load(
        model.file,
        (gltf) => {
          gltf.scene.traverse(child => {
            if (child instanceof THREE.Mesh) {
              child.receiveShadow = true;
              child.castShadow = true;
            }
          });
          const children = [...gltf.scene.children];
          children.forEach(child => {
            model.items[child.name] = child;
            child.home = {
              position: { ...child.position },
              rotation: { x: child.rotation.x, y: child.rotation.y, z: child.rotation.z },
              scale: { ...child.scale }
            };
            child.position.y *= 2;
            child.visible = false;
            this.stage.add(child);
          });
        }
      );
    });
  }
  moveToDrums() {
    gsap.to(this.stage.camera.position, { x: 0, y: 6, z: 6 });
    gsap.to(this.stage.lookAt, { x: 0, y: 1, z: -1 });
    gsap.to(this.stage, { light: 0 });
    gsap.to(this.spotlights.left.target.position, { x: -1, z: -1 });
    gsap.to(this.spotlights.right.target.position, { x: 1, z: -1 });
    gsap.to(this.spotlights.left.light, { intensity: 10, delay: 0.3 });
    gsap.to(this.spotlights.right.light, { intensity: 10, delay: 0.3 });
    Object.keys(this.models.burger.items).forEach(key => {
      const item = this.models.burger.items[key];
      const pos = drumSettings[key];
      const delay = 0.6 - item.home.position.y * 0.6;
      // Анимируем к drumSettings (разбросанные позиции)
      gsap.to(item.position, { x: pos.position.x, y: pos.position.y, z: pos.position.z, delay, duration: 1, ease: 'power2.inOut' });
      gsap.to(item.rotation, { ...pos.rotation, duration: 3, delay: delay + 0.5, ease: 'elastic' });
      gsap.to(item.scale, { ...pos.scale, duration: 1, delay: delay, ease: 'power2.inOut' });
    });
    Object.keys(this.models.drumkit.items).forEach(key => {
      const item = this.models.drumkit.items[key];
      item.visible = true;
      gsap.to(item.position, { ...item.home.position, duration: 1, ease: 'power4.out' });
      gsap.to(item.rotation, { ...item.home.rotation, duration: 1, ease: 'power4.out' });
      gsap.to(item.scale, { ...item.home.scale, duration: 1, ease: 'power4.out' });
    });
  }
  moveToBurger() {
    gsap.to(this.stage.camera.position, { x: 0, y: 3, z: 6, duration: 0.6 });
    gsap.to(this.stage.lookAt, { x: 0, y: 1.5, z: 0, duration: 0.6 });
    gsap.to(this.stage, { light: 2 });
    gsap.to(this.spotlights.left.target.position, { x: -10, y: 1 });
    gsap.to(this.spotlights.right.target.position, { x: 10, y: 1 });
    gsap.to(this.spotlights.left.light, { intensity: 0 });
    gsap.to(this.spotlights.right.light, { intensity: 0 });
    Object.keys(this.models.burger.items).forEach(key => {
      const item = this.models.burger.items[key];
      const delay = 0.2 + item.home.position.y * 0.4;
      item.visible = true;
      // Анимируем к drumSettingsBurger (центр)
      const pos = drumSettingsBurger[key];
      gsap.to(item.position, { x: pos.x, y: pos.y, z: pos.z, delay, duration: 1.5, ease: 'bounce' });
      gsap.to(item.rotation, { ...item.home.rotation, duration: 1, delay, ease: 'power4.inOut' });
      gsap.to(item.scale, { ...item.home.scale, duration: 1, delay, ease: 'power4.inOut' });
    });
    Object.keys(this.models.drumkit.items).forEach(key => {
      const item = this.models.drumkit.items[key];
      gsap.to(item.position, { y: -3, duration: 0.5 });
      gsap.to(item.rotation, { z: (Math.random() * 0.5) - 0.25, duration: 0.5 });
    });
  }
  updateView(newState) {
    this.view = newState;
    gsap.globalTimeline.clear();
    if (newState === 'burger') this.moveToBurger();
    if (newState === 'drums') this.moveToDrums();
  }
  fire() {
    // no-op for now
  }
} 