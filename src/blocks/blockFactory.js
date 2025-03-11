/**
 * Block Factory
 * 
 * A factory for creating different types of blocks.
 * This centralizes block creation and makes it easier to add new block types.
 */

import LiftBlock from './liftBlock.js';
import ArmorBlock from './armorBlock.js';
import EngineBlock from './engineBlock.js';
import CannonBlock from './cannonBlock.js';
import SteeringWheel from './steeringWheel.js';

class BlockFactory {
  /**
   * Create a block of the specified type
   * @param {String} type - The type of block to create ('lift', 'armor', 'engine', 'cannon', 'steeringWheel')
   * @param {Object} position - The position of the block in 3D space {x, y, z}
   * @param {Object} options - Additional options for the block
   * @returns {Object} - The created block
   */
  static createBlock(type, position, options = {}) {
    switch (type.toLowerCase()) {
      case 'lift':
        return new LiftBlock(position, options);
      case 'armor':
        return new ArmorBlock(position, options);
      case 'engine':
        return new EngineBlock(position, options);
      case 'cannon':
        return new CannonBlock(position, options);
      case 'steeringwheel':
        return new SteeringWheel(position, options);
      default:
        console.error(`Unknown block type: ${type}`);
        return null;
    }
  }

  /**
   * Create blocks from a ship definition
   * @param {Object} shipDefinition - The ship definition object
   * @returns {Array} - Array of created blocks
   */
  static createBlocksFromShipDefinition(shipDefinition) {
    const blocks = [];
    
    if (!shipDefinition || !shipDefinition.blocks || !Array.isArray(shipDefinition.blocks)) {
      console.error('Invalid ship definition');
      return blocks;
    }
    
    // Create each block from the definition
    for (const blockDef of shipDefinition.blocks) {
      const { type, x, y, z, ...options } = blockDef;
      
      if (!type || x === undefined || y === undefined || z === undefined) {
        console.warn('Skipping invalid block definition', blockDef);
        continue;
      }
      
      const block = this.createBlock(type, { x, y, z }, options);
      if (block) {
        blocks.push(block);
      }
    }
    
    return blocks;
  }

  /**
   * Count the number of blocks of each type in an array of blocks
   * @param {Array} blocks - Array of blocks
   * @returns {Object} - Object with counts for each block type
   */
  static countBlockTypes(blocks) {
    const counts = {
      lift: 0,
      armor: 0,
      engine: 0,
      cannon: 0,
      steeringWheel: 0,
      total: blocks.length
    };
    
    for (const block of blocks) {
      if (counts[block.type] !== undefined) {
        counts[block.type]++;
      }
    }
    
    return counts;
  }

  /**
   * Check if a ship has enough lift blocks (at least 30% of total)
   * @param {Array} blocks - Array of blocks
   * @returns {Boolean} - Whether the ship has enough lift blocks
   */
  static hasEnoughLift(blocks) {
    const counts = this.countBlockTypes(blocks);
    const liftPercentage = counts.lift / counts.total;
    
    return liftPercentage >= 0.3; // 30% minimum
  }
}

export default BlockFactory; 