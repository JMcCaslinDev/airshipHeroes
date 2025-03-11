/**
 * Copy Assets Script
 * 
 * This script copies assets from the src/assets directory to the public directory
 * so they can be accessed by the client.
 */

const fs = require('fs');
const path = require('path');

// Define source and destination directories
const sourceDir = path.join(__dirname, 'src', 'assets');
const destDir = path.join(__dirname, 'public', 'assets');

/**
 * Copy a directory recursively
 * @param {string} source - Source directory
 * @param {string} destination - Destination directory
 */
async function copyDir(source, destination) {
  // Create destination directory if it doesn't exist
  await fs.promises.mkdir(destination, { recursive: true });
  
  // Get all files and directories in the source directory
  const entries = await fs.promises.readdir(source, { withFileTypes: true });
  
  // Copy each entry
  for (const entry of entries) {
    const sourcePath = path.join(source, entry.name);
    const destPath = path.join(destination, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively copy directory
      await copyDir(sourcePath, destPath);
    } else {
      // Copy file
      await fs.promises.copyFile(sourcePath, destPath);
    }
  }
}

// Copy assets
copyDir(sourceDir, destDir)
  .then(() => {
    console.log('Assets copied successfully');
  })
  .catch((error) => {
    console.error('Error copying assets:', error);
  }); 