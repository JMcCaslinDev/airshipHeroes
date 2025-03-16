/**
 * ShipSerialization Class
 * 
 * Handles loading and saving ship data, including serialization and deserialization.
 */

import BlockFactory from '../../blocks/blockFactory.js';

class ShipSerialization {
  /**
   * Constructor for the ShipSerialization class
   * @param {Ship} ship - The ship this serialization system belongs to
   */
  constructor(ship) {
    this.ship = ship;
  }

  /**
   * Load ship from a definition object
   * @param {Object} definition - The ship definition
   * @param {Object} options - Additional options
   * @returns {boolean} - Whether the load was successful
   */
  loadFromDefinition(definition, options = {}) {
    console.log("Loading ship from definition:", definition);
    
    if (!definition || !definition.blocks || !Array.isArray(definition.blocks)) {
      console.error("Invalid ship definition");
      return false;
    }
    
    // Clear existing blocks
    this.ship.blockManager.clearBlocks();
    
    // Set ship properties
    if (definition.name) this.ship.name = definition.name;
    if (definition.owner) this.ship.owner = definition.owner;
    
    // Set position if provided
    if (definition.position) {
      this.ship.position.x = definition.position.x || 0;
      this.ship.position.y = definition.position.y || 0;
      this.ship.position.z = definition.position.z || 0;
      
      // Update the group position
      this.ship.group.position.set(this.ship.position.x, this.ship.position.y, this.ship.position.z);
    }
    
    // Set rotation if provided
    if (definition.rotation !== undefined) {
      this.ship.rotation = definition.rotation;
      this.ship.group.rotation.y = this.ship.rotation;
    }
    
    // Create blocks - use static method instead of instantiating
    for (const blockDef of definition.blocks) {
      try {
        const block = BlockFactory.createBlock(
          blockDef.type,
          blockDef.position,
          {
            rotation: blockDef.rotation || 0,
            health: blockDef.health
          }
        );
        
        if (block) {
          this.ship.blockManager.addBlock(block, window.resourceLoader);
          
          // If it's a steering wheel or control block, store a reference
          if (blockDef.type === 'steeringWheel' || blockDef.type === 'control') {
            this.ship.steeringWheel = block;
          }
          
          console.log(`Added ${blockDef.type} block to ship`);
        } else {
          console.warn(`Failed to create block of type ${blockDef.type}`);
        }
      } catch (error) {
        console.error(`Error creating block: ${error.message}`);
      }
    }
    
    console.log(`Loaded ${this.ship.blockManager.blocks.length} blocks`);
    
    // Update block meshes to ensure they're positioned correctly
    this.ship.renderer.updateBlockMeshes();
    
    // Fix any texture issues that might have occurred during loading
    this.ship.renderer.fixBlockTextureIssues();
    
    // Save to local storage if needed
    if (options.saveToLocalStorage && this.ship.owner) {
      this.saveToLocalStorage();
    }
    
    return true;
  }

  /**
   * Serialize the ship to a JSON-compatible format
   * @returns {Object} The serialized ship
   */
  serialize() {
    return {
      name: this.ship.name,
      position: { ...this.ship.position },
      rotation: this.ship.rotation,
      blocks: this.ship.blockManager.blocks.map(block => ({
        type: block.type,
        position: { ...block.position },
        rotation: block.rotation || 0
      }))
    };
  }

  /**
   * Save the ship to local storage
   * @param {String} key - The key to save under (defaults to 'ship_[owner.id]')
   * @returns {Boolean} - Whether the save was successful
   */
  saveToLocalStorage(key) {
    if (!this.ship.owner) {
      console.warn("Cannot save ship to local storage: no owner");
      return false;
    }
    
    // Generate a key if not provided
    if (!key) {
      key = `ship_${this.ship.owner.id || 'default'}`;
    }
    
    try {
      // Serialize the ship
      const serialized = this.serialize();
      
      // Save to local storage
      localStorage.setItem(key, JSON.stringify(serialized));
      
      console.log(`Saved ship "${this.ship.name}" to local storage with key "${key}"`);
      return true;
    } catch (error) {
      console.error(`Failed to save ship to local storage: ${error.message}`);
      return false;
    }
  }

  /**
   * Load the ship from local storage
   * @param {String} key - The key to load from (defaults to 'ship_[owner.id]')
   * @returns {Boolean} - Whether the load was successful
   */
  loadFromLocalStorage(key) {
    if (!this.ship.owner) {
      console.warn("Cannot load ship from local storage: no owner");
      return false;
    }
    
    // Generate a key if not provided
    if (!key) {
      key = `ship_${this.ship.owner.id || 'default'}`;
    }
    
    try {
      // Load from local storage
      const serialized = localStorage.getItem(key);
      
      if (!serialized) {
        console.warn(`No ship found in local storage with key "${key}"`);
        return false;
      }
      
      // Parse the serialized ship
      const definition = JSON.parse(serialized);
      
      // Load the ship from the definition
      const success = this.loadFromDefinition(definition);
      
      if (success) {
        console.log(`Loaded ship "${this.ship.name}" from local storage with key "${key}"`);
      }
      
      return success;
    } catch (error) {
      console.error(`Failed to load ship from local storage: ${error.message}`);
      return false;
    }
  }

  /**
   * Export the ship to a file
   * @param {String} filename - The filename to save as (defaults to 'ship_[name].json')
   * @returns {Boolean} - Whether the export was successful
   */
  exportToFile(filename) {
    try {
      // Generate a filename if not provided
      if (!filename) {
        const safeName = this.ship.name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        filename = `ship_${safeName}.json`;
      }
      
      // Serialize the ship
      const serialized = this.serialize();
      
      // Create a blob with the serialized ship
      const blob = new Blob([JSON.stringify(serialized, null, 2)], { type: 'application/json' });
      
      // Create a download link
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      
      // Trigger the download
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      console.log(`Exported ship "${this.ship.name}" to file "${filename}"`);
      return true;
    } catch (error) {
      console.error(`Failed to export ship to file: ${error.message}`);
      return false;
    }
  }

  /**
   * Import the ship from a file
   * @param {File} file - The file to import from
   * @returns {Promise<Boolean>} - Whether the import was successful
   */
  importFromFile(file) {
    return new Promise((resolve, reject) => {
      try {
        // Create a file reader
        const reader = new FileReader();
        
        // Set up the onload handler
        reader.onload = (event) => {
          try {
            // Parse the file contents
            const definition = JSON.parse(event.target.result);
            
            // Load the ship from the definition
            const success = this.loadFromDefinition(definition);
            
            if (success) {
              console.log(`Imported ship "${this.ship.name}" from file "${file.name}"`);
              resolve(true);
            } else {
              console.error(`Failed to import ship from file: invalid definition`);
              resolve(false);
            }
          } catch (error) {
            console.error(`Failed to parse ship file: ${error.message}`);
            resolve(false);
          }
        };
        
        // Set up the onerror handler
        reader.onerror = (error) => {
          console.error(`Failed to read ship file: ${error.message}`);
          resolve(false);
        };
        
        // Read the file
        reader.readAsText(file);
      } catch (error) {
        console.error(`Failed to import ship from file: ${error.message}`);
        resolve(false);
      }
    });
  }
}

export default ShipSerialization; 