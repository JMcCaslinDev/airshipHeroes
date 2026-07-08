/**
 * UI Manager module for handling all UI elements
 */

import * as THREE from 'three';
import { createElement, showElement, hideElement, removeAllChildren } from '../utils/domUtils.js';
import { getLiftRatio } from '../combat/shipCombat.js';
import { getLeaderboard } from '../combat/leaderboard.js';
import { formatKillChatLine } from '../combat/killFeed.js';
import { updateArenaOverheadLabels } from './shipOverheadLabel.js';
import {
  computeShipPerformanceFromShip,
  formatSpeedMph
} from '../physics/shipPerformance.js';
import { ensureShipBoost, BOOST_DURATION } from '../physics/shipBoost.js';
import { drawMinimap, updateCompass, MINIMAP_SIZE } from './minimap.js';

/**
 * Create a UI manager
 * @param {Object} gameState - The game state
 * @param {Function} loginCallback - Callback for login
 * @returns {Object} The UI manager
 */
export function createUIManager(gameState, loginCallback) {
  // UI elements
  let loadingScreen;
  let loadingProgressBar;
  let loginScreen;
  let loginForm;
  let usernameInput;
  let hud;
  let modeIndicator;
  let fpsCounter;
  let inventory;
  let deathScreen;
  let respawnButton;
  
  // Ship stats elements
  let shipStats;
  let shipPosition;
  let shipAltitude;
  let shipSpeed;
  let shipCruiseSpeed;
  let shipMaxSpeed;
  let shipEngines;
  let shipWeight;
  let shipBoostText;
  let shipBoostFill;
  let shipTotalBlocks;
  let blockTypeStats;
  let shipLiftRatio;
  let shipLiftFill;
  let hudKills;
  let deathTitle;
  let deathMessage;
  let deathCountdown;
  let deathLeaderboard;
  let battleChat;
  let arenaChat;
  let killFeedRoot;
  let minimapCanvas;
  let compassNeedle;
  let compassHeading;

  let respawnCallback = null;
  let chatMessages = [];
  const killBannerQueue = [];
  let killBannerShowing = false;
  
  /**
   * Initialize the UI manager
   */
  function init() {
    console.log('Initializing UI manager...');
    
    // Get UI elements
    loadingScreen = document.getElementById('loading-screen');
    loadingProgressBar = document.getElementById('loading-progress-bar');
    loginScreen = document.getElementById('login-screen');
    loginForm = document.getElementById('login-form');
    usernameInput = document.getElementById('username-input');
    hud = document.getElementById('hud');
    modeIndicator = document.getElementById('mode-indicator');
    fpsCounter = document.getElementById('fps-counter');
    inventory = document.getElementById('inventory');
    deathScreen = document.getElementById('death-screen');
    respawnButton = document.getElementById('respawn-button');
    
    // Get ship stats elements
    shipStats = document.getElementById('ship-stats');
    shipPosition = document.getElementById('ship-position');
    shipAltitude = document.getElementById('ship-altitude');
    shipSpeed = document.getElementById('ship-speed');
    shipCruiseSpeed = document.getElementById('ship-cruise-speed');
    shipMaxSpeed = document.getElementById('ship-max-speed');
    shipEngines = document.getElementById('ship-engines');
    shipWeight = document.getElementById('ship-weight');
    shipBoostText = document.getElementById('ship-boost-text');
    shipBoostFill = document.getElementById('ship-boost-fill');
    shipTotalBlocks = document.getElementById('ship-total-blocks');
    blockTypeStats = document.getElementById('block-type-stats');
    shipLiftRatio = document.getElementById('ship-lift-ratio');
    shipLiftFill = document.getElementById('ship-lift-fill');
    hudKills = document.getElementById('hud-kills');
    deathTitle = document.getElementById('death-title');
    deathMessage = document.getElementById('death-message');
    deathCountdown = document.getElementById('death-countdown');
    deathLeaderboard = document.getElementById('death-leaderboard');
    battleChat = document.getElementById('battle-chat');
    arenaChat = document.getElementById('arena-chat');
    killFeedRoot = document.getElementById('kill-feed');
    minimapCanvas = document.getElementById('minimap-canvas');
    compassNeedle = document.getElementById('compass-needle');
    compassHeading = document.getElementById('compass-heading');
    if (minimapCanvas) {
      minimapCanvas.width = MINIMAP_SIZE;
      minimapCanvas.height = MINIMAP_SIZE;
    }
    
    // Log UI elements for debugging
    console.log('UI elements initialized:');
    console.log('- Loading screen:', loadingScreen ? 'Found' : 'Not found');
    console.log('- Loading progress bar:', loadingProgressBar ? 'Found' : 'Not found');
    console.log('- Login screen:', loginScreen ? 'Found' : 'Not found');
    console.log('- Login form:', loginForm ? 'Found' : 'Not found');
    
    // Set up event listeners
    if (loginForm) {
      loginForm.addEventListener('submit', handleLoginSubmit);
      console.log('Login form event listener added');
    } else {
      console.error('Login form not found, cannot add event listener');
    }
    
    if (respawnButton) {
      respawnButton.addEventListener('click', handleRespawn);
      console.log('Respawn button event listener added');
    } else {
      console.error('Respawn button not found, cannot add event listener');
    }
    
    // Listen for inventory selection events
    window.addEventListener('inventorySelect', (event) => {
      // Only handle inventory selection in player mode
      if (gameState && gameState.localPlayer && gameState.localPlayer.mode === 'player') {
        const slotNumber = event.detail.slot;
        console.log('UI Manager received inventory select event for slot', slotNumber);
        
        // Update game state
        gameState.inventory.selectedSlot = slotNumber;
        
        // Update UI directly
        if (inventory) {
          const slots = inventory.querySelectorAll('.inventory-slot');
          
          // Remove selected class from all slots
          slots.forEach(slot => {
            slot.classList.remove('selected');
          });
          
          // Add selected class to the new slot
          if (slotNumber >= 0 && slotNumber < slots.length) {
            slots[slotNumber].classList.add('selected');
            console.log('UI Manager updated selected slot to', slotNumber);
          }
        }
      } else {
        console.log('Ignoring inventory select event - not in player mode');
      }
    });
    
    // Create inventory slots
    createInventorySlots();
  }
  
  /**
   * Create inventory slots
   */
  function createInventorySlots() {
    // Check if inventory element exists
    if (!inventory) {
      console.error('Cannot create inventory slots: inventory element not found');
      return;
    }
    
    console.log('Creating inventory slots...');
    
    // Clear existing slots
    removeAllChildren(inventory);
    
    // Ensure inventory is styled for horizontal layout
    inventory.style.display = 'flex';
    inventory.style.flexDirection = 'row';
    inventory.style.flexWrap = 'nowrap';
    inventory.style.justifyContent = 'center';
    
    // Create 9 inventory slots
    for (let i = 0; i < 9; i++) {
      const slot = createElement('div', {
        className: 'inventory-slot',
        attributes: {
          'data-slot': i,
          'data-slot-number': i + 1
        }
      });
      
      // Add slot number indicator
      const slotNumber = createElement('div', {
        className: 'slot-number',
        textContent: (i + 1).toString()
      });
      
      // Add icon container
      const icon = createElement('div', {
        className: 'inventory-slot-icon'
      });
      
      // Add count display
      const count = createElement('div', {
        className: 'inventory-slot-count'
      });
      
      slot.appendChild(slotNumber);
      slot.appendChild(icon);
      slot.appendChild(count);
      inventory.appendChild(slot);
      
      console.log(`Created inventory slot ${i} with slot number, icon, and count elements`);
    }
    
    console.log(`Created ${9} inventory slots`);
  }
  
  /**
   * Handle login form submission
   * @param {Event} event - The form submit event
   */
  function handleLoginSubmit(event) {
    // Prevent default form submission behavior
    event.preventDefault();
    
    // Stop propagation to prevent any key events from being triggered
    event.stopPropagation();
    
    console.log('Login form submitted');
    
    const username = usernameInput.value.trim();
    if (username) {
      console.log('Username entered:', `"${username}"`);
      hideLoginScreen();
      
      // Use setTimeout to ensure any pending key events are processed before calling the login callback
      setTimeout(() => {
        if (typeof loginCallback === 'function') {
          console.log('Calling login callback with username:', username);
          loginCallback(username);
        } else {
          console.warn('Login callback is not a function');
        }
      }, 0);
    } else {
      console.log('No username entered');
      // Show error message
      const errorMessage = document.createElement('p');
      errorMessage.textContent = 'Please enter a username';
      errorMessage.style.color = 'red';
      errorMessage.style.marginTop = '10px';
      errorMessage.className = 'error-message';
      
      // Remove any existing error messages
      const existingError = loginForm.querySelector('.error-message');
      if (existingError) {
        loginForm.removeChild(existingError);
      }
      
      // Add to form
      loginForm.appendChild(errorMessage);
    }
  }
  
  function setRespawnCallback(fn) {
    respawnCallback = fn;
  }

  function appendChatMessage(message) {
    chatMessages.unshift(message);
    chatMessages = chatMessages.slice(0, 12);
    const html = chatMessages.map((line) => `<div class="chat-line">${line}</div>`).join('');
    if (arenaChat) {
      arenaChat.style.display = 'block';
      arenaChat.innerHTML = html;
    }
    if (battleChat) {
      battleChat.innerHTML = html;
    }
  }

  function pushKillBanner(title, subtitle = '', type = 'kill') {
    killBannerQueue.push({ title, subtitle, type });
    drainKillBannerQueue();
  }

  function drainKillBannerQueue() {
    if (killBannerShowing || !killFeedRoot || killBannerQueue.length === 0) {
      return;
    }

    const banner = killBannerQueue.shift();
    killBannerShowing = true;
    killFeedRoot.className = `kill-feed kill-feed--${banner.type} kill-feed--visible`;
    killFeedRoot.innerHTML = `
      <div class="kill-feed-title">${banner.title}</div>
      ${banner.subtitle ? `<div class="kill-feed-subtitle">${banner.subtitle}</div>` : ''}
    `;

    window.setTimeout(() => {
      killFeedRoot.classList.remove('kill-feed--visible');
      killBannerShowing = false;
      window.setTimeout(drainKillBannerQueue, 180);
    }, 2800);
  }

  function showKillFeed(event) {
    if (!event) {
      return;
    }

    appendChatMessage(formatKillChatLine(event));

    if (event.isLocalKill) {
      pushKillBanner(
        `Eliminated ${event.victim}`,
        event.killerStreak >= 2 ? `${event.killerStreak} kill streak!` : 'Confirmed kill',
        'kill'
      );
      if (event.victimEndedStreak >= 3) {
        pushKillBanner(
          'Streak ended',
          `You stopped ${event.victim}'s ${event.victimEndedStreak} kill streak`,
          'streak-break'
        );
      }
      return;
    }

    if (event.isLocalDeath && event.victimEndedStreak >= 2) {
      pushKillBanner(
        'Your streak ended',
        `${event.victimEndedStreak} kills — taken down by ${event.killer}`,
        'death-streak'
      );
      return;
    }

    if (event.victimEndedStreak >= 4) {
      pushKillBanner(
        `${event.killer} ended a streak`,
        `${event.victim}'s ${event.victimEndedStreak} kill streak is over`,
        'streak-break'
      );
    }
  }

  function renderLeaderboard(container, entries) {
    if (!container) {
      return;
    }
    removeAllChildren(container);
    const title = createElement('h3', { textContent: 'Leaderboard' });
    container.appendChild(title);
    entries.forEach((row, index) => {
      container.appendChild(createElement('div', {
        className: 'leaderboard-row',
        textContent: `${index + 1}. ${row.username} — ${row.kills} kills / ${row.deaths} deaths`
      }));
    });
  }
  
  function handleRespawn() {
    hideDeathScreen();
    showHUD();
    respawnCallback?.();
  }

  /**
   * Show the loading screen
   */
  function showLoadingScreen() {
    showElement(loadingScreen, 'flex');
  }
  
  /**
   * Hide the loading screen
   */
  function hideLoadingScreen() {
    hideElement(loadingScreen);
  }
  
  /**
   * Update the loading progress bar
   * @param {number} progress - The progress value (0-1)
   */
  function updateLoadingProgress(progress) {
    loadingProgressBar.style.width = `${progress * 100}%`;
  }
  
  /**
   * Show the login screen
   */
  function showLoginScreen() {
    showElement(loginScreen, 'flex');
  }
  
  /**
   * Hide the login screen
   */
  function hideLoginScreen() {
    hideElement(loginScreen);
  }
  
  /**
   * Show the HUD
   */
  function showHUD() {
    showElement(hud, 'block');
  }
  
  /**
   * Hide the HUD
   */
  function hideHUD() {
    hideElement(hud);
  }
  
  /**
   * Show the death screen
   */
  function showDeathScreen(options = {}) {
    if (deathTitle) {
      deathTitle.textContent = 'Ship Destroyed';
    }
    if (deathMessage) {
      const killer = options.killerName;
      const victim = options.victimName ?? 'Your ship';
      deathMessage.textContent = killer
        ? `${killer} destroyed ${victim}`
        : `${victim} was destroyed.`;
    }
    if (options.leaderboard) {
      renderLeaderboard(deathLeaderboard, options.leaderboard);
    } else {
      renderLeaderboard(deathLeaderboard, getLeaderboard());
    }
    if (deathCountdown) {
      deathCountdown.textContent = `Respawning in ${options.countdown ?? 30}...`;
    }
    if (respawnButton) {
      respawnButton.style.display = 'none';
    }
    showElement(deathScreen, 'flex');
  }

  function updateDeathCountdown(seconds) {
    if (deathCountdown) {
      deathCountdown.textContent = seconds > 0
        ? `Respawning in ${seconds}...`
        : 'Respawn ready';
    }
    if (respawnButton) {
      respawnButton.style.display = seconds <= 0 ? 'inline-block' : 'none';
    }
  }
  
  /**
   * Hide the death screen
   */
  function hideDeathScreen() {
    hideElement(deathScreen);
  }
  
  /**
   * Update the mode indicator
   */
  function updateModeIndicator() {
    if (!modeIndicator || !gameState || !gameState.localPlayer) {
      return;
    }
    
    const mode = gameState.localPlayer.mode;
    
    if (mode === 'ship') {
      modeIndicator.textContent = gameState.phase === 'build' ? 'Shipyard Build' : 'Ship Mode';
      modeIndicator.style.color = gameState.phase === 'build' ? '#66ff99' : '#00ccff';
      document.body.classList.remove('player-mode');
    } else if (mode === 'player') {
      modeIndicator.textContent = gameState.phase === 'build' ? 'Shipyard Build' : 'Player Mode';
      modeIndicator.style.color = '#ffcc00';
      document.body.classList.add('player-mode');
    }
  }
  
  /**
   * Update the FPS counter
   */
  function updateFPSCounter() {
    if (fpsCounter && gameState && gameState.fps !== undefined) {
      fpsCounter.innerHTML = `FPS: ${gameState.fps}`;
    }
  }
  
  /**
   * Update the inventory display
   */
  function updateInventoryDisplay() {
    if (!gameState || !gameState.inventory || !gameState.inventory.slots) {
      console.warn('Game state inventory not initialized');
      return;
    }
    
    // Check if inventory element exists
    if (!inventory) {
      console.warn('Inventory element not found');
      return;
    }
    
    // Only show inventory in player mode, hide in ship mode
    if (gameState.localPlayer && gameState.localPlayer.mode === 'player') {
      // Show inventory in player mode
      inventory.style.display = 'flex';
      inventory.style.flexDirection = 'row';
      inventory.style.flexWrap = 'nowrap';
      inventory.style.justifyContent = 'center';
    } else {
      // Hide inventory in ship mode
      inventory.style.display = 'none';
      return; // No need to update if not visible
    }
    
    const slots = inventory.querySelectorAll('.inventory-slot');
    
    // Create inventory slots if they don't exist
    if (!slots || slots.length === 0) {
      console.log('Creating inventory slots...');
      createInventorySlots();
      return; // Return and wait for next update cycle
    }
    
    // First, remove selected class from all slots
    slots.forEach(slot => {
      slot.classList.remove('selected');
    });
    
    // Get the currently selected slot
    const selectedSlotIndex = gameState.inventory.selectedSlot;
    console.log('Current selected slot:', selectedSlotIndex);
    
    // Add selected class to the currently selected slot
    if (selectedSlotIndex >= 0 && selectedSlotIndex < slots.length) {
      slots[selectedSlotIndex].classList.add('selected');
      console.log('Applied selected class to slot', selectedSlotIndex);
    }
    
    // Update each slot content
    for (let i = 0; i < slots.length; i++) {
      const slot = slots[i];
      const inventorySlot = gameState.inventory.slots[i];
      
      // Find or create icon and count elements
      let icon = slot.querySelector('.inventory-slot-icon');
      let count = slot.querySelector('.inventory-slot-count');
      
      // Create elements if they don't exist
      if (!icon) {
        icon = createElement('div', { className: 'inventory-slot-icon' });
        slot.appendChild(icon);
      }
      
      if (!count) {
        count = createElement('div', { className: 'inventory-slot-count' });
        slot.appendChild(count);
      }
      
      // Update icon and count
      if (inventorySlot && inventorySlot.blockType) {
        icon.style.backgroundImage = `url('../assets/textures/blocks/${inventorySlot.blockType}.svg')`;
        count.textContent = inventorySlot.count;
      } else {
        icon.style.backgroundImage = 'none';
        count.textContent = '';
      }
    }
  }
  
  /**
   * Update the ship stats display
   */
  function updateShipStats() {
    // Check if ship stats elements exist
    if (!shipStats || !gameState.localPlayer || !gameState.localPlayer.ship) {
      if (shipStats) {
        shipStats.style.display = 'none';
      }
      return;
    }
    
    // Show ship stats in both ship and player modes
    shipStats.style.display = 'block';
    
    const ship = gameState.localPlayer.ship;
    
    // Update position
    if (shipPosition) {
      const pos = ship.position;
      shipPosition.textContent = `X: ${Math.round(pos.x)}, Y: ${Math.round(pos.y)}, Z: ${Math.round(pos.z)}`;
    }
    
    // Update altitude
    if (shipAltitude) {
      shipAltitude.textContent = `${Math.round(ship.position.y)} m`;
    }
    
    const perf = ship.performance ?? computeShipPerformanceFromShip(ship);

    // Update speed — color: white cruise band, orange when above cruise / boosting
    if (shipSpeed) {
      const speedVector = new THREE.Vector3(ship.velocity.x, 0, ship.velocity.z);
      const speed = speedVector.length();
      const mph = formatSpeedMph(speed);
      shipSpeed.textContent = `${mph} mph`;
      const cruise = perf?.cruiseMaxSpeed ?? (perf?.maxSpeed ?? 0) * 0.5;
      if (ship.boostActive || speed > cruise + 0.05) {
        shipSpeed.style.color = '#ffaa44';
      } else if (speed > cruise * 0.85) {
        shipSpeed.style.color = '#88ffaa';
      } else {
        shipSpeed.style.color = '#ffffff';
      }
    }

    if (shipCruiseSpeed) {
      shipCruiseSpeed.textContent = `${formatSpeedMph(perf.cruiseMaxSpeed)} mph`;
      shipCruiseSpeed.style.color = '#88ccff';
    }
    if (shipMaxSpeed) {
      shipMaxSpeed.textContent = `${formatSpeedMph(perf.maxSpeed)} mph`;
      shipMaxSpeed.style.color = ship.boostActive ? '#ffaa44' : '#aaaaaa';
    }
    if (shipEngines) {
      shipEngines.textContent = String(perf.engines);
    }
    if (shipWeight) {
      shipWeight.textContent = String(perf.weight);
    }

    const boost = ensureShipBoost(ship);
    if (shipBoostText && boost) {
      if (boost.active) {
        shipBoostText.textContent = `BOOST ${boost.remaining.toFixed(1)}s`;
        shipBoostText.style.color = '#ffaa44';
      } else if (boost.charge >= 1) {
        shipBoostText.textContent = 'Ready (Shift)';
        shipBoostText.style.color = '#88ffaa';
      } else {
        shipBoostText.textContent = `Recharge ${Math.round(boost.charge * 100)}%`;
        shipBoostText.style.color = '#cccccc';
      }
    }
    if (shipBoostFill && boost) {
      const pct = boost.active
        ? (boost.remaining / BOOST_DURATION) * 100
        : boost.charge * 100;
      shipBoostFill.style.width = `${Math.max(0, Math.min(100, pct))}%`;
      shipBoostFill.classList.toggle('boosting', !!boost.active);
    }

    const liftRatio = getLiftRatio(ship);
    ship.liftRatio = liftRatio;
    const liftPct = Math.round(liftRatio * 100);
    if (shipLiftRatio) {
      shipLiftRatio.textContent = `${liftPct}%`;
      shipLiftRatio.style.color = liftRatio >= 0.25 ? '#66ff99' : '#ff6666';
    }
    if (shipLiftFill) {
      shipLiftFill.style.width = `${liftPct}%`;
      shipLiftFill.classList.toggle('low', liftRatio < 0.25);
    }
    if (hudKills && gameState.localPlayer) {
      hudKills.textContent = String(gameState.localPlayer.kills ?? 0);
    }
    
    // Update total blocks
    if (shipTotalBlocks) {
      shipTotalBlocks.textContent = ship.blockManager.blocks.length;
    }
    
    // Update block type stats
    if (blockTypeStats) {
      // Clear previous stats
      removeAllChildren(blockTypeStats);
      
      // Count blocks by type
      let totalBlocks = ship.blockManager.blocks.length;
      let blockCounts = {};
      
      if (totalBlocks === 0) return;
      
      ship.blockManager.blocks.forEach(block => {
        if (!blockCounts[block.type]) {
          blockCounts[block.type] = 0;
        }
        blockCounts[block.type]++;
      });
      
      // Create a stat row for each block type
      Object.keys(blockCounts).forEach(blockType => {
        const count = blockCounts[blockType];
        const percentage = Math.round((count / totalBlocks) * 100);
        
        // Create block type stat container
        const blockTypeStat = createElement('div', {
          className: ['stat-row', 'block-type-stat']
        });
        
        // Create label with count
        const label = createElement('span', {
          className: 'stat-label',
          textContent: `${blockType}: ${count}`
        });
        
        // Create percentage value
        const value = createElement('span', {
          className: 'stat-value',
          textContent: `${percentage}%`
        });
        
        // Add label and value to the stat row
        blockTypeStat.appendChild(label);
        blockTypeStat.appendChild(value);
        
        // Create progress bar
        const barContainer = createElement('div', {
          className: 'block-type-bar'
        });
        
        const barFill = createElement('div', {
          className: 'block-type-fill',
          style: {
            width: `${percentage}%`,
            backgroundColor: getBlockColor(blockType)
          }
        });
        
        barContainer.appendChild(barFill);
        
        // Create a container for the bar
        const barRow = createElement('div', {
          className: 'stat-row'
        });
        
        barRow.appendChild(barContainer);
        
        // Add elements to the block type stats
        blockTypeStat.appendChild(barRow);
        blockTypeStats.appendChild(blockTypeStat);
      });
    }
  }
  
  /**
   * Get a color for a block type
   * @param {string} blockType - The block type
   * @returns {string} - The color for the block type
   */
  function getBlockColor(blockType) {
    const colors = {
      'wood': '#BC986A',
      'stone': '#7F7F7F',
      'iron': '#A19D94',
      'gold': '#FFD700',
      'lift': '#E9ECEC',
      'armor': '#985E2D',
      'engine': '#1c1c20',
      'cannon': '#7F7F7F',
      'control': '#6B4423',
      'steering': '#6B4423',
      'default': '#AAAAAA'
    };
    
    return colors[blockType] || colors.default;
  }
  
  /**
   * Compass + bird's-eye minimap with enemy dots.
   */
  function updateNavHud() {
    const local = gameState.localPlayer;
    const ship = local?.ship;
    if (!ship) {
      return;
    }

    updateCompass(compassNeedle, compassHeading, ship.rotation ?? 0);

    if (!minimapCanvas) {
      return;
    }

    const enemies = [];
    const players = gameState.players;
    if (players?.values) {
      for (const p of players.values()) {
        if (!p?.ship || p === local || p.ship.isDestroyed) {
          continue;
        }
        enemies.push({
          x: p.ship.position.x,
          z: p.ship.position.z
        });
      }
    }

    drawMinimap(minimapCanvas, {
      self: {
        x: ship.position.x,
        z: ship.position.z,
        rotation: ship.rotation ?? 0
      },
      enemies
    });
  }

  /**
   * Update the UI
   */
  function update() {
    // Update FPS counter
    updateFPSCounter();
    
    // Update mode indicator
    updateModeIndicator();
    
    // Update inventory display
    updateInventoryDisplay();
    
    // Update ship stats
    updateShipStats();

    updateNavHud();

    updateArenaOverheadLabels(gameState);
  }
  
  /**
   * Show a notification message
   * @param {string} message - The message to show
   * @param {number} [duration=3000] - How long to show the message in milliseconds
   */
  function showNotification(message, duration = 3000) {
    console.log(`Notification: ${message}`);
    
    // Check if notification container exists, create if not
    let notificationContainer = document.getElementById('notification-container');
    if (!notificationContainer) {
      notificationContainer = createElement('div', {
        id: 'notification-container',
        style: {
          position: 'absolute',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: '1000',
          pointerEvents: 'none'
        }
      });
      document.body.appendChild(notificationContainer);
    }
    
    // Create notification element
    const notification = createElement('div', {
      className: 'notification',
      textContent: message,
      style: {
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        color: '#fff',
        padding: '10px 20px',
        borderRadius: '5px',
        marginBottom: '10px',
        textAlign: 'center',
        transition: 'opacity 0.3s ease',
        opacity: '0'
      }
    });
    
    // Add to container
    notificationContainer.appendChild(notification);
    
    // Fade in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }
  
  // Initialize on creation
  init();
  
  return {
    init,
    showLoadingScreen,
    hideLoadingScreen,
    updateLoadingProgress,
    showLoginScreen,
    hideLoginScreen,
    showHUD,
    hideHUD,
    showDeathScreen,
    hideDeathScreen,
    updateDeathCountdown,
    appendChatMessage,
    showKillFeed,
    setRespawnCallback,
    renderLeaderboard,
    updateModeIndicator,
    updateFPSCounter,
    updateInventoryDisplay,
    showNotification,
    update,
    handleLoginSubmit
  };
} 