import { createRaptorEngineMaterials, createRaptorEngineGeometry } from '../../../src/blocks/engineTextures.js';
import * as THREE from 'three';

describe('engineTextures', () => {
  test('Raptor 3 uses lathe geometry and opaque material', () => {
    const geometry = createRaptorEngineGeometry();
    const materials = createRaptorEngineMaterials();
    expect(geometry.type).toBe('LatheGeometry');
    expect(materials).toHaveLength(1);
    expect(materials[0].transparent).not.toBe(true);
    expect(materials[0].map).toBeTruthy();
  });
});
