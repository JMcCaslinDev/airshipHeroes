/**
 * DOM Utility Functions
 * 
 * Helper functions for DOM manipulation.
 */

/**
 * DOM utility functions for the game
 */

/**
 * Create an HTML element with the specified options
 * @param {string} tag - The HTML tag name
 * @param {Object} options - Options for the element
 * @param {string} [options.id] - The element ID
 * @param {string|string[]} [options.className] - The element class name(s)
 * @param {string} [options.textContent] - The element text content
 * @param {string} [options.innerHTML] - The element inner HTML
 * @param {Object} [options.style] - The element style properties
 * @param {Object} [options.attributes] - The element attributes
 * @param {Function} [options.onClick] - Click event handler
 * @param {HTMLElement[]} [options.children] - Child elements to append
 * @returns {HTMLElement} The created element
 */
export function createElement(tag, options = {}) {
  const element = document.createElement(tag);
  
  if (options.id) {
    element.id = options.id;
  }
  
  if (options.className) {
    const names = Array.isArray(options.className)
      ? options.className.filter(Boolean)
      : [options.className];
    element.classList.add(...names);
  }
  
  if (options.textContent) {
    element.textContent = options.textContent;
  }
  
  if (options.innerHTML) {
    element.innerHTML = options.innerHTML;
  }
  
  if (options.style) {
    Object.assign(element.style, options.style);
  }
  
  if (options.attributes) {
    for (const [key, value] of Object.entries(options.attributes)) {
      element.setAttribute(key, value);
    }
  }
  
  if (options.onClick) {
    element.addEventListener('click', options.onClick);
  }
  
  if (options.children) {
    options.children.forEach(child => element.appendChild(child));
  }
  
  return element;
}

/**
 * Create a button element with the specified options
 * @param {string} text - The button text
 * @param {Function} onClick - Click event handler
 * @param {Object} options - Additional options for the button
 * @returns {HTMLButtonElement} The created button
 */
export function createButton(text, onClick, options = {}) {
  return createElement('button', {
    textContent: text,
    onClick,
    ...options
  });
}

/**
 * Show an element with the specified display style
 * @param {HTMLElement} element - The element to show
 * @param {string} display - The display style to use
 */
export function showElement(element, display = 'block') {
  if (element) {
    element.style.display = display;
  }
}

/**
 * Hide an element
 * @param {HTMLElement} element - The element to hide
 */
export function hideElement(element) {
  if (element) {
    element.style.display = 'none';
  }
}

/**
 * Remove all child elements from a parent element
 * @param {HTMLElement} parent - The parent element
 */
export function removeAllChildren(parent) {
  if (parent) {
    while (parent.firstChild) {
      parent.removeChild(parent.firstChild);
    }
  }
}

/**
 * Add a class to an element if it doesn't already have it
 * @param {HTMLElement} element - The element
 * @param {string} className - The class name to add
 */
export function addClass(element, className) {
  if (element && !element.classList.contains(className)) {
    element.classList.add(className);
  }
}

/**
 * Remove a class from an element if it has it
 * @param {HTMLElement} element - The element
 * @param {string} className - The class name to remove
 */
export function removeClass(element, className) {
  if (element && element.classList.contains(className)) {
    element.classList.remove(className);
  }
}

/**
 * Toggle a class on an element
 * @param {HTMLElement} element - The element
 * @param {string} className - The class name to toggle
 * @param {boolean} [force] - Force add or remove
 */
export function toggleClass(element, className, force) {
  if (element) {
    if (force !== undefined) {
      element.classList.toggle(className, force);
    } else {
      element.classList.toggle(className);
    }
  }
} 