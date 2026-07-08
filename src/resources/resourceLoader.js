/**
 * Resource Loader Module
 * 
 * Handles loading and managing game resources.
 */

import * as THREE from 'three';

/**
 * Create a resource loader
 * @param {Object} options - Options for the resource loader
 * @param {Function} [options.onProgress] - Callback for loading progress
 * @param {Function} [options.onComplete] - Callback for loading completion
 * @returns {Object} The resource loader
 */
export function createResourceLoader(options = {}) {
  // Callbacks
  const onProgress = options.onProgress || null;
  const onComplete = options.onComplete || null;
  
  // Resource collections
  const textures = new Map();
  const shipDefinitions = new Map();
  
  // Texture URLs mapping
  const textureUrls = new Map();
  
  // Loading state
  let totalResources = 0;
  let loadedResources = 0;
  let hasErrors = false;
  
  // Create texture loader
  const textureLoader = new THREE.TextureLoader();
  
  // Create fallback textures
  const createFallbackTextures = () => {
    console.log('Creating fallback textures');
    
    // Create a canvas for each texture
    const createCanvasTexture = (color) => {
      const canvas = document.createElement('canvas');
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = color;
      ctx.fillRect(0, 0, 64, 64);
      return new THREE.CanvasTexture(canvas);
    };
    
    // Create fallback textures for each type
    textures.set('wood', createCanvasTexture('#BC986A'));
    textures.set('stone', createCanvasTexture('#7F7F7F'));
    textures.set('lift', createCanvasTexture('#E9ECEC'));
    textures.set('cannon', createCanvasTexture('#7F7F7F'));
    textures.set('control', createCanvasTexture('#6B4423'));
    textures.set('engine', createCanvasTexture('#444444'));
    textures.set('armor', createCanvasTexture('#985E2D'));
    textures.set('crosshair', createCanvasTexture('#FFFFFF'));
  };
  
  // Create fallback ship definition
  const createFallbackShipDefinition = () => {
    console.log('Creating fallback ship definition');
    
    const fallbackShip = {
      name: 'Airship Wars Default',
      position: { x: 0, y: 50, z: 0 },
      blocks: [
        { type: "control", position: { x: 0, y: 0, z: 0 } },
        { type: "wood", position: { x: 1, y: 0, z: 0 } },
        { type: "wood", position: { x: -1, y: 0, z: 0 } },
        { type: "wood", position: { x: 0, y: 0, z: 1 } },
        { type: "wood", position: { x: 0, y: 0, z: -1 } },
        { type: "lift", position: { x: 0, y: -1, z: 0 } },
        { type: "lift", position: { x: 1, y: -1, z: 0 } },
        { type: "lift", position: { x: -1, y: -1, z: 0 } },
        { type: "cannon", position: { x: 0, y: -1, z: 1 }, direction: { x: 0, y: 0, z: 1 } },
        { type: "cannon", position: { x: 0, y: -1, z: -1 }, direction: { x: 0, y: 0, z: -1 } }
      ]
    };
    
    shipDefinitions.set('default', fallbackShip);
  };
  
  /**
   * Load all resources
   * @returns {Promise} A promise that resolves when all resources are loaded
   */
  function loadAll() {
    return new Promise((resolve) => {
      console.log('Loading all resources...');
      
      // Reset loading state
      totalResources = 0;
      loadedResources = 0;
      hasErrors = false;
      
      // Create promises for all resource types
      const promises = [
        loadTextures(),
        loadShipDefinitions()
      ];
      
      // Set a timeout to ensure we don't get stuck loading
      const timeoutId = setTimeout(() => {
        console.warn('Resource loading timed out, using fallbacks');
        
        // Create fallback textures if needed
        if (textures.size === 0) {
          createFallbackTextures();
        }
        
        // Create fallback ship definition if needed
        if (shipDefinitions.size === 0) {
          createFallbackShipDefinition();
        }
        
        if (onComplete) {
          onComplete();
        }
        resolve();
      }, 10000); // 10 second timeout
      
      // Wait for all resources to load
      Promise.all(promises)
        .then(() => {
          console.log('All resources loaded successfully');
          
          // Clear the timeout
          clearTimeout(timeoutId);
          
          // If there were errors, create fallbacks
          if (hasErrors) {
            console.warn('Some resources failed to load, using fallbacks');
            
            // Create fallback textures if needed
            if (textures.size === 0) {
              createFallbackTextures();
            }
            
            // Create fallback ship definition if needed
            if (shipDefinitions.size === 0) {
              createFallbackShipDefinition();
            }
          }
          
          if (onComplete) {
            onComplete();
          }
          resolve();
        })
        .catch((error) => {
          console.error('Error loading resources:', error);
          
          // Clear the timeout
          clearTimeout(timeoutId);
          
          // Create fallbacks
          createFallbackTextures();
          createFallbackShipDefinition();
          
          if (onComplete) {
            onComplete();
          }
          resolve();
        });
    });
  }
  
  /**
   * Load textures
   * @returns {Promise} A promise that resolves when all textures are loaded
   */
  function loadTextures() {
    return new Promise((resolve) => {
      console.log('Loading textures...');
      
      // Define textures to load
      const textureFiles = [
        { name: 'wood', path: '/assets/textures/blocks/wood.svg' },
        { name: 'stone', path: '/assets/textures/blocks/stone.svg' },
        { name: 'lift', path: '/assets/textures/blocks/lift.svg' },
        { name: 'armor', path: '/assets/textures/blocks/armor.svg' },
        { name: 'cannon', path: '/assets/textures/blocks/cannon.svg' },
        { name: 'control', path: '/assets/textures/blocks/control.svg' },
        { name: 'crosshair', path: '/assets/textures/ui/crosshair.svg' }
      ];
      
      // Store texture URLs
      textureFiles.forEach(file => {
        textureUrls.set(file.name, file.path);
      });
      
      // Update total resources
      totalResources += textureFiles.length;
      
      // Load each texture
      const texturePromises = textureFiles.map((textureFile) => {
        return new Promise((resolveTexture) => {
          console.log(`Loading texture: ${textureFile.path}`);
          
          textureLoader.load(
            textureFile.path,
            (texture) => {
              console.log(`Texture loaded: ${textureFile.path}`);
              
              // ponytail: nearest filter keeps 16x16 MC-style pixels sharp on block faces
              texture.magFilter = THREE.NearestFilter;
              texture.minFilter = THREE.NearestFilter;
              texture.colorSpace = THREE.SRGBColorSpace;
              
              // Store texture
              textures.set(textureFile.name, texture);
              
              // Update progress
              loadedResources++;
              updateProgress();
              
              resolveTexture();
            },
            (progressEvent) => {
              // Progress callback
              console.log(`Loading texture progress: ${textureFile.path}`);
            },
            (error) => {
              console.error(`Error loading texture ${textureFile.path}:`, error);
              hasErrors = true;
              
              // Update progress even on error
              loadedResources++;
              updateProgress();
              
              resolveTexture();
            }
          );
        });
      });
      
      // Wait for all textures to load
      Promise.all(texturePromises)
        .then(() => {
          console.log('All textures loaded');
          resolve();
        })
        .catch((error) => {
          console.error('Error loading textures:', error);
          hasErrors = true;
          resolve();
        });
    });
  }
  
  /**
   * Load ship definitions
   * @returns {Promise} A promise that resolves when all ship definitions are loaded
   */
  function loadShipDefinitions() {
    return new Promise((resolve) => {
      console.log('Loading ship definitions...');
      
      // Define ship definitions to load
      const shipFiles = [
        { name: 'default', path: '/assets/ships/default.json' }
      ];
      
      // Update total resources
      totalResources += shipFiles.length;
      
      // Load each ship definition
      const shipPromises = shipFiles.map((shipFile) => {
        return new Promise((resolveShip) => {
          console.log(`Loading ship definition: ${shipFile.path}`);
          
          fetch(shipFile.path)
            .then((response) => {
              if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
              }
              return response.json();
            })
            .then((data) => {
              console.log(`Ship definition loaded: ${shipFile.path}`, data);
              
              // Store ship definition
              shipDefinitions.set(shipFile.name, data);
              
              // Update progress
              loadedResources++;
              updateProgress();
              
              resolveShip();
            })
            .catch((error) => {
              console.error(`Error loading ship definition ${shipFile.path}:`, error);
              hasErrors = true;
              
              // Update progress even on error
              loadedResources++;
              updateProgress();
              
              resolveShip();
            });
        });
      });
      
      // Wait for all ship definitions to load
      Promise.all(shipPromises)
        .then(() => {
          console.log('All ship definitions loaded');
          resolve();
        })
        .catch((error) => {
          console.error('Error loading ship definitions:', error);
          hasErrors = true;
          resolve();
        });
    });
  }
  
  /**
   * Update loading progress
   */
  function updateProgress() {
    if (totalResources === 0) {
      return;
    }
    
    const progress = loadedResources / totalResources;
    console.log(`Loading progress: ${Math.round(progress * 100)}%`);
    
    if (onProgress) {
      onProgress(progress);
    }
  }
  
  /**
   * Get a texture by name
   * @param {string} name - The name of the texture
   * @returns {THREE.Texture|null} The texture or null if not found
   */
  function getTexture(name) {
    return textures.get(name) || null;
  }
  
  /**
   * Get a ship definition by name
   * @param {string} name - The name of the ship definition
   * @returns {Object|null} The ship definition or null if not found
   */
  function getShipDefinition(name) {
    return shipDefinitions.get(name) || null;
  }
  
  /**
   * Get the URL for a texture by name
   * @param {string} name - The name of the texture
   * @returns {string|null} The URL of the texture or null if not found
   */
  function getUrl(name) {
    return textureUrls.get(name) || null;
  }
  
  return {
    loadAll,
    getTexture,
    getShipDefinition,
    getUrl,
    get textureLoader() {
      return textureLoader;
    },
    get(name) {
      return getTexture(name);
    }
  };
} 