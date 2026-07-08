/**
 * Shipyard UI — slot picker and build-toolbar for the ship builder flow.
 */

import { createElement, showElement, hideElement } from '../utils/domUtils.js';
import {
  computeShipPerformance,
  formatPerformanceSummary,
  formatSpeedMph
} from '../physics/shipPerformance.js';

/**
 * @param {Object} shipStorage
 * @param {Object} callbacks
 * @param {(username: string, slot: number) => void} callbacks.onEditSlot
 * @param {(username: string, slot: number) => void} callbacks.onDepart
 * @param {(username: string, slot: number, file: File) => Promise<void>} callbacks.onImportSlot
 * @param {(username: string, slot: number) => void} [callbacks.onExportSlot]
 * @param {() => Array<{type: string}>|null} [callbacks.getEditingBlocks] live blocks while building
 */
export function createShipyardUI(shipStorage, callbacks) {
  let shipyardScreen;
  let slotGrid;
  let usernameLabel;
  let departButton;
  let buildToolbar;
  let buildSlotLabel;
  let buildPerfStats;
  let buildImportInput;
  let currentUsername = '';
  let selectedSlot = 0;
  let editingSlot = 0;

  function init() {
    shipyardScreen = document.getElementById('shipyard-screen');
    slotGrid = document.getElementById('ship-slot-grid');
    usernameLabel = document.getElementById('shipyard-username');
    departButton = document.getElementById('shipyard-depart-btn');
    buildToolbar = document.getElementById('build-toolbar');
    buildSlotLabel = document.getElementById('build-slot-label');
    buildPerfStats = document.getElementById('build-perf-stats');
    buildImportInput = document.getElementById('build-import-input');

    document.getElementById('shipyard-depart-btn')?.addEventListener('click', () => {
      if (currentUsername) {
        callbacks.onDepart(currentUsername, selectedSlot);
      }
    });

    document.getElementById('build-save-btn')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('shipyardSave'));
    });

    document.getElementById('build-export-btn')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('shipyardExport', { detail: { slot: editingSlot } }));
    });

    document.getElementById('build-import-btn')?.addEventListener('click', () => {
      buildImportInput?.click();
    });

    buildImportInput?.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file && currentUsername) {
        await callbacks.onImportSlot(currentUsername, editingSlot, file);
      }
    });

    document.getElementById('build-back-btn')?.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('shipyardBack'));
    });

    document.getElementById('build-depart-btn')?.addEventListener('click', () => {
      if (currentUsername) {
        callbacks.onDepart(currentUsername, editingSlot);
      }
    });
  }

  /** Saved ships only; one empty placeholder when none saved yet. */
  function getDisplaySlots(username) {
    const filled = shipStorage.listSlots(username).filter((slot) => !slot.empty);
    if (filled.length === 0) {
      return [{ slot: 0, empty: true, name: 'New Ship', blockCount: 0, performance: null }];
    }
    return filled;
  }

  function renderSlotCard(slotInfo) {
    const card = createElement('div', {
      className: ['ship-slot-card', slotInfo.slot === selectedSlot ? 'selected' : '']
    });
    card.addEventListener('click', () => {
      selectedSlot = slotInfo.slot;
      renderSlots();
    });

    const title = createElement('h3', {
      textContent: slotInfo.empty ? 'New Ship' : slotInfo.name
    });
    const status = createElement('p', {
      className: 'ship-slot-status',
      textContent: slotInfo.empty
        ? 'No design yet — click Edit to start'
        : `${slotInfo.blockCount} blocks`
    });

    const perfLine = createElement('p', {
      className: 'ship-slot-perf',
      textContent: slotInfo.empty || !slotInfo.performance
        ? '—'
        : formatPerformanceSummary(slotInfo.performance)
    });

    const actions = createElement('div', { className: 'ship-slot-actions' });

    const editBtn = createElement('button', {
      className: 'primary-button',
      textContent: 'Edit',
      attributes: { type: 'button' }
    });
    editBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      selectedSlot = slotInfo.slot;
      callbacks.onEditSlot(currentUsername, slotInfo.slot);
    });

    const exportBtn = createElement('button', {
      className: 'secondary-button',
      textContent: 'Export',
      attributes: { type: 'button' }
    });
    exportBtn.disabled = slotInfo.empty;
    exportBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      callbacks.onExportSlot?.(currentUsername, slotInfo.slot);
    });

    const importBtn = createElement('button', {
      className: 'secondary-button',
      textContent: 'Import',
      attributes: { type: 'button' }
    });
    const fileInput = createElement('input', {
      attributes: { type: 'file', accept: '.json,application/json', hidden: true }
    });
    importBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      fileInput.click();
    });
    fileInput.addEventListener('change', async (event) => {
      const file = event.target.files?.[0];
      event.target.value = '';
      if (file) {
        await callbacks.onImportSlot(currentUsername, slotInfo.slot, file);
        renderSlots();
      }
    });

    const deleteBtn = createElement('button', {
      className: 'danger-button',
      textContent: 'Clear',
      attributes: { type: 'button' }
    });
    deleteBtn.disabled = slotInfo.empty;
    deleteBtn.addEventListener('click', (event) => {
      event.stopPropagation();
      if (window.confirm(`Clear ${slotInfo.empty ? 'this design' : slotInfo.name}?`)) {
        shipStorage.deleteShip(currentUsername, slotInfo.slot);
        const display = getDisplaySlots(currentUsername);
        selectedSlot = display[0]?.slot ?? 0;
        renderSlots();
      }
    });

    actions.append(editBtn, exportBtn, importBtn, deleteBtn);
    card.append(title, status, perfLine, actions, fileInput);
    return card;
  }

  function renderSlots() {
    if (!slotGrid || !currentUsername) {
      return;
    }

    slotGrid.innerHTML = '';
    const displaySlots = getDisplaySlots(currentUsername);

    if (!displaySlots.some((slot) => slot.slot === selectedSlot)) {
      selectedSlot = displaySlots[0].slot;
    }

    displaySlots.forEach((slotInfo) => {
      slotGrid.appendChild(renderSlotCard(slotInfo));
    });

    const nextSlot = shipStorage.findFirstEmptySlot(currentUsername);
    if (nextSlot !== null) {
      const newShipBtn = createElement('button', {
        className: ['primary-button', 'new-ship-button'],
        textContent: '+ New Ship',
        attributes: { type: 'button' }
      });
      newShipBtn.addEventListener('click', () => {
        selectedSlot = nextSlot;
        callbacks.onEditSlot(currentUsername, nextSlot);
      });
      slotGrid.appendChild(newShipBtn);
    }

    updateDepartButton();
  }

  function updateDepartButton() {
    if (!departButton || !currentUsername) {
      return;
    }

    const slotInfo = shipStorage.listSlots(currentUsername)[selectedSlot];
    departButton.disabled = !slotInfo || slotInfo.empty || slotInfo.blockCount === 0;
  }

  function updateBuildPerfStats() {
    if (!buildPerfStats) {
      return;
    }
    const blocks = callbacks.getEditingBlocks?.() ?? null;
    if (!blocks) {
      buildPerfStats.textContent = '—';
      return;
    }
    const perf = computeShipPerformance(blocks);
    buildPerfStats.textContent =
      `${perf.engines} eng · wt ${perf.weight} · max ${formatSpeedMph(perf.maxSpeed)} mph`;
  }

  function show(username) {
    currentUsername = username;
    selectedSlot = shipStorage.getActiveSlot(username);
    editingSlot = selectedSlot;

    if (usernameLabel) {
      usernameLabel.textContent = `Captain ${username} — your ships`;
    }

    renderSlots();
    showElement(shipyardScreen, 'flex');
    hideElement(document.getElementById('loading-screen'));
    hideBuildToolbar();
  }

  function hide() {
    hideElement(shipyardScreen);
  }

  function showBuildToolbar(slot) {
    editingSlot = slot;
    if (buildSlotLabel) {
      buildSlotLabel.textContent = `Editing ship ${slot + 1}`;
    }
    updateBuildPerfStats();
    showElement(buildToolbar, 'flex');
  }

  function hideBuildToolbar() {
    hideElement(buildToolbar);
  }

  init();

  return {
    show,
    hide,
    showBuildToolbar,
    hideBuildToolbar,
    refresh: renderSlots,
    updateBuildPerfStats,
    getSelectedSlot: () => selectedSlot,
    getEditingSlot: () => editingSlot
  };
}
