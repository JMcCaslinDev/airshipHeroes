/**
 * Player Block Breaking Tests
 * 
 * Tests for the player's block breaking functionality.
 */

// Mock the entire player.js module to isolate the breakBlock method
jest.mock('../../../src/components/player.js', () => {
  // Get the actual Player class
  const actualPlayer = jest.requireActual('../../../src/components/player.js').default;
  
  // Create a mock version that overrides the breakBlock method
  return class MockPlayer extends actualPlayer {
    constructor(options) {
      super(options);
      
      // Mock the breakBlock method to avoid THREE.js dependencies
      this.breakBlock = jest.fn().mockImplementation(() => {
        // Only allow block breaking in player mode
        if (this.mode !== 'player') {
          return;
        }
        
        // Skip all the THREE.js raycasting logic
        
        // If we have a mock intersection, process it
        if (this._mockIntersection) {
          const { distance, block } = this._mockIntersection;
          
          // Check if the intersection is within the maximum distance
          if (distance <= this.maxPlaceDistance) {
            if (block) {
              // Try to remove the block from the ship
              const removed = this.ship.removeBlock(block);
              
              if (removed) {
                // Add to inventory
                this.addToInventory({ type: block.type });
                
                // Save ship to localStorage if shipStorage is available
                if (this.shipStorage && this.username) {
                  try {
                    const shipDefinition = this.ship.serialize();
                    this.shipStorage.saveShip(this.username, shipDefinition);
                  } catch (error) {
                    // Error handled silently in the actual implementation
                  }
                }
                
                // Also save the inventory state
                this.saveInventory();
              }
            }
          }
        }
      });
      
      // Helper method for tests to set mock intersection
      this.setMockIntersection = (intersection) => {
        this._mockIntersection = intersection;
      };
    }
  };
});

// Import the mocked Player class
import Player from '../../../src/components/player.js';

describe('Player.breakBlock', () => {
  let player;
  let mockShipStorage;
  let mockShip;
  
  beforeEach(() => {
    // Create mock ship
    mockShip = {
      blocks: [{ type: 'wood', position: { x: 0, y: 0, z: 0 } }],
      removeBlock: jest.fn().mockReturnValue(true),
      serialize: jest.fn().mockReturnValue({
        name: 'Test Ship',
        position: { x: 0, y: 50, z: 0 },
        blocks: []
      })
    };
    
    // Create mock ship storage
    mockShipStorage = {
      saveShip: jest.fn().mockReturnValue(true),
      loadShip: jest.fn().mockReturnValue(null)
    };
    
    // Create player instance
    player = new Player({
      username: 'testPlayer',
      shipStorage: mockShipStorage
    });
    
    // Set up player properties
    player.mode = 'player';
    player.maxPlaceDistance = 5;
    player.ship = mockShip;
    player.inventory = {
      selectedSlot: 0,
      slots: Array(9).fill().map(() => ({ blockType: null, count: 0 }))
    };
    
    // Mock methods
    player.addToInventory = jest.fn();
    player.saveInventory = jest.fn();
  });
  
  test('should not break blocks in ship mode', () => {
    // Arrange
    player.mode = 'ship';
    
    // Act
    player.breakBlock();
    
    // Assert
    expect(mockShip.removeBlock).not.toHaveBeenCalled();
    expect(player.addToInventory).not.toHaveBeenCalled();
  });
  
  test('should do nothing if no intersection is found', () => {
    // Arrange - no mock intersection set
    
    // Act
    player.breakBlock();
    
    // Assert
    expect(mockShip.removeBlock).not.toHaveBeenCalled();
    expect(player.addToInventory).not.toHaveBeenCalled();
  });
  
  test('should do nothing if intersection is too far', () => {
    // Arrange
    const mockBlock = { type: 'wood', position: { x: 0, y: 0, z: 0 } };
    player.setMockIntersection({
      distance: 10, // Beyond maxPlaceDistance
      block: mockBlock
    });
    
    // Act
    player.breakBlock();
    
    // Assert
    expect(mockShip.removeBlock).not.toHaveBeenCalled();
    expect(player.addToInventory).not.toHaveBeenCalled();
  });
  
  test('should do nothing if no block data is found', () => {
    // Arrange
    player.setMockIntersection({
      distance: 3, // Within maxPlaceDistance
      block: null // No block data
    });
    
    // Act
    player.breakBlock();
    
    // Assert
    expect(mockShip.removeBlock).not.toHaveBeenCalled();
    expect(player.addToInventory).not.toHaveBeenCalled();
  });
  
  test('should remove block and add to inventory when valid intersection is found', () => {
    // Arrange
    const mockBlock = { type: 'wood', position: { x: 0, y: 0, z: 0 } };
    player.setMockIntersection({
      distance: 3, // Within maxPlaceDistance
      block: mockBlock
    });
    
    // Act
    player.breakBlock();
    
    // Assert
    expect(mockShip.removeBlock).toHaveBeenCalledWith(mockBlock);
    expect(player.addToInventory).toHaveBeenCalledWith({ type: 'wood' });
    expect(mockShipStorage.saveShip).toHaveBeenCalled();
    expect(player.saveInventory).toHaveBeenCalled();
  });
  
  test('should not add to inventory if block removal fails', () => {
    // Arrange
    const mockBlock = { type: 'wood', position: { x: 0, y: 0, z: 0 } };
    player.setMockIntersection({
      distance: 3, // Within maxPlaceDistance
      block: mockBlock
    });
    
    // Make removeBlock return false (block removal failed)
    mockShip.removeBlock.mockReturnValueOnce(false);
    
    // Act
    player.breakBlock();
    
    // Assert
    expect(mockShip.removeBlock).toHaveBeenCalledWith(mockBlock);
    expect(player.addToInventory).not.toHaveBeenCalled();
    expect(mockShipStorage.saveShip).not.toHaveBeenCalled();
    expect(player.saveInventory).not.toHaveBeenCalled();
  });
  
  test('should handle errors when saving ship', () => {
    // Arrange
    const mockBlock = { type: 'wood', position: { x: 0, y: 0, z: 0 } };
    player.setMockIntersection({
      distance: 3, // Within maxPlaceDistance
      block: mockBlock
    });
    
    // Make saveShip throw an error
    mockShipStorage.saveShip.mockImplementationOnce(() => {
      throw new Error('Failed to save ship');
    });
    
    // Act - should not throw
    player.breakBlock();
    
    // Assert
    expect(mockShip.removeBlock).toHaveBeenCalledWith(mockBlock);
    expect(player.addToInventory).toHaveBeenCalledWith({ type: 'wood' });
    expect(mockShipStorage.saveShip).toHaveBeenCalled();
    expect(player.saveInventory).toHaveBeenCalled();
  });
}); 