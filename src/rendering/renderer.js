/**
 * Renderer module for handling Three.js rendering
 */

import * as THREE from 'three';

/**
 * Create a renderer
 * @param {Object} options - Options for the renderer
 * @param {HTMLCanvasElement} [options.canvas] - The canvas element to use
 * @param {number} [options.width] - The width of the renderer
 * @param {number} [options.height] - The height of the renderer
 * @returns {Object} The renderer
 */
export function createRenderer(options = {}) {
  // Get canvas element
  const canvas = options.canvas || document.getElementById('game-canvas');
  
  // Create scene
  const scene = new THREE.Scene();
  
  // Create camera
  const camera = new THREE.PerspectiveCamera(
    75, // Field of view
    window.innerWidth / window.innerHeight, // Aspect ratio
    0.1, // Near clipping plane
    1000 // Far clipping plane
  );
  
  // Create renderer
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true
  });
  
  // Set renderer size
  renderer.setSize(
    options.width || window.innerWidth,
    options.height || window.innerHeight
  );
  
  // Set pixel ratio for better quality on high-DPI displays
  renderer.setPixelRatio(window.devicePixelRatio);
  
  // Enable shadows
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  
  /**
   * Initialize the renderer
   */
  function init() {
    // Set up camera position - position higher and further back for better view
    camera.position.set(0, 30, 50);
    camera.lookAt(0, 0, 0);
    
    // Add lights
    addLights();
    
    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Set clear color to light blue
    renderer.setClearColor(0x4CA7FF, 1);
    
    // Make sure the canvas is visible
    if (canvas) {
      canvas.style.display = 'block';
    }
    
    console.log('Renderer initialized with camera at:', camera.position);
    
    // Create skybox
    createSkybox();
    
    // Create ground
    createGround();
  }
  
  /**
   * Add lights to the scene
   */
  function addLights() {
    // Ambient light - increase intensity significantly
    const ambientLight = new THREE.AmbientLight(0x404040, 1.5);
    scene.add(ambientLight);
    
    // Directional light (sun) - increase intensity
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5);
    directionalLight.position.set(100, 100, 50);
    directionalLight.castShadow = true;
    
    // Set up shadow properties
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.camera.near = 0.5;
    directionalLight.shadow.camera.far = 500;
    directionalLight.shadow.camera.left = -100;
    directionalLight.shadow.camera.right = 100;
    directionalLight.shadow.camera.top = 100;
    directionalLight.shadow.camera.bottom = -100;
    
    scene.add(directionalLight);
    
    // Hemisphere light (sky and ground) - increase intensity
    const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x3D9140, 1.2);
    scene.add(hemisphereLight);
    
    // Add a point light to help illuminate the scene - increase intensity and range
    const pointLight = new THREE.PointLight(0xffffff, 1.2, 200);
    pointLight.position.set(0, 50, 0);
    scene.add(pointLight);
  }
  
  /**
   * Handle window resize
   */
  function handleResize() {
    // Update camera aspect ratio
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    // Update renderer size
    renderer.setSize(window.innerWidth, window.innerHeight);
  }
  
  /**
   * Create a ground plane
   * @param {Object} options - Options for the ground
   */
  function createGround(options = {}) {
    const size = options.size || 2000;
    const color = options.color || 0x3D9140;
    
    // Create ground geometry
    const groundGeometry = new THREE.PlaneGeometry(size, size);
    
    // Create ground material
    const groundMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.8,
      metalness: 0.2,
      side: THREE.DoubleSide
    });
    
    // Create ground mesh
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0;
    ground.receiveShadow = true;
    
    scene.add(ground);
    
    // Add a grid helper for better visual reference
    const gridHelper = new THREE.GridHelper(size, 50, 0x000000, 0x000000);
    gridHelper.position.y = 0.1;
    scene.add(gridHelper);
  }
  
  /**
   * Create a skybox
   * @param {Object} options - Options for the skybox
   */
  function createSkybox(options = {}) {
    const size = options.size || 2000; // Increase size
    
    // Create skybox geometry
    const skyboxGeometry = new THREE.BoxGeometry(size, size, size);
    
    // Create skybox materials with brighter colors
    const skyboxMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x4CA7FF, side: THREE.BackSide }), // Right - brighter blue
      new THREE.MeshBasicMaterial({ color: 0x4CA7FF, side: THREE.BackSide }), // Left
      new THREE.MeshBasicMaterial({ color: 0x4CA7FF, side: THREE.BackSide }), // Top
      new THREE.MeshBasicMaterial({ color: 0x3D9140, side: THREE.BackSide }), // Bottom - green for ground
      new THREE.MeshBasicMaterial({ color: 0x4CA7FF, side: THREE.BackSide }), // Front
      new THREE.MeshBasicMaterial({ color: 0x4CA7FF, side: THREE.BackSide })  // Back
    ];
    
    // Create skybox mesh
    const skybox = new THREE.Mesh(skyboxGeometry, skyboxMaterials);
    scene.add(skybox);
  }
  
  /**
   * Render the scene
   */
  function render() {
    try {
      // Make sure the scene is visible
      scene.visible = true;
      
      // Ensure all lights are active
      scene.traverse(object => {
        if (object.isLight) {
          object.visible = true;
        }
      });
      
      // Render the scene
      renderer.render(scene, camera);
    } catch (error) {
      console.error('Error rendering scene:', error);
    }
  }
  
  /**
   * Clean up resources
   */
  function dispose() {
    // Remove event listener
    window.removeEventListener('resize', handleResize);
    
    // Dispose of Three.js resources
    renderer.dispose();
    
    // Traverse the scene and dispose of geometries and materials
    scene.traverse((object) => {
      if (object.geometry) {
        object.geometry.dispose();
      }
      
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach((material) => {
            material.dispose();
          });
        } else {
          object.material.dispose();
        }
      }
    });
  }
  
  // Initialize the renderer
  init();
  
  return {
    scene,
    camera,
    renderer,
    canvas,
    render,
    dispose,
    handleResize,
    init,
    createGround,
    createSkybox
  };
} 