/**
 * src/services/llm/complexityScorer.js
 * ═══════════════════════════════════════════════════════════════════════
 * Comprehensive Multi-Modification Complexity Prediction & Strategy Routing
 *
 * Evaluates the full set of modifications, operational diversity,
 * spatial density, and preservation constraints to select the optimal
 * FLUX prompting strategy (V1 vs V3 vs V4).
 * ═══════════════════════════════════════════════════════════════════════
 */

const COMPLEXITY_MAPPING = {
  scene_complexity: { S0: 0, S1: 1, S2: 2, S3: 3, S4: 4 },
  neighbor_density: { N0: 0, N1: 1, N2: 2, N3: 3, N4: 4 },
  target_size: { LARGE: 0, MEDIUM: 1, SMALL: 2, TINY: 4 },
  ambiguity: { A0: 0, A1: 1, A2: 2, A3: 3 },
  structural_impact: { MODIFY: 0.5, CHANGE: 0.5, ADD: 2.0, REPLACE: 2.5, REMOVE: 1.5 }
};

const COMPLEXITY_WEIGHTS = {
  scene_complexity: 1.2,
  neighbor_density: 1.5,
  target_size: 1.2,
  ambiguity: 2.0,
  structural_impact: 1.2,
  multi_mod_bonus: 2.5 // additional complexity per extra modification
};

/**
 * Computes the empirical complexity score for an edit request taking into account
 * the entire modifications[] array.
 * 
 * @param {Object} spec - The customization specification
 * @param {Array<Object>} [spec.modifications] - Array of modifications
 * @returns {number} The calculated complexity score (e.g. 5.5, 8.5, 12.0)
 */
export function calculateComplexityScore(spec = {}) {
  const mods = Array.isArray(spec.modifications) && spec.modifications.length > 0
    ? spec.modifications
    : [{
        feature: spec.targetFeature || 'customization',
        operation: spec.operation || 'MODIFY',
        location: 'surface'
      }];

  const modCount = mods.length;

  // Base environmental metrics
  const s = COMPLEXITY_MAPPING.scene_complexity[spec.scene_complexity || 'S2'] || 2;
  const n = COMPLEXITY_MAPPING.neighbor_density[spec.neighbor_density || 'N2'] || 2;
  const sz = COMPLEXITY_MAPPING.target_size[spec.target_size || 'MEDIUM'] || 1;
  const a = COMPLEXITY_MAPPING.ambiguity[spec.ambiguity || 'A0'] || 0;

  let structuralSum = 0;
  for (const m of mods) {
    const op = (m.operation || 'MODIFY').toUpperCase();
    structuralSum += (COMPLEXITY_MAPPING.structural_impact[op] || 1.0);
    // Add weight for multi-zone or global changes
    if (m.location === 'all' || m.location === 'entire') {
      structuralSum += 1.5;
    }
  }

  // Multi-modification count multiplier
  const multiModFactor = modCount > 1 ? (modCount - 1) * COMPLEXITY_WEIGHTS.multi_mod_bonus : 0;

  const rawScore = (
    s * COMPLEXITY_WEIGHTS.scene_complexity +
    n * COMPLEXITY_WEIGHTS.neighbor_density +
    sz * COMPLEXITY_WEIGHTS.target_size +
    a * COMPLEXITY_WEIGHTS.ambiguity +
    structuralSum * COMPLEXITY_WEIGHTS.structural_impact +
    multiModFactor
  );

  return parseFloat(rawScore.toFixed(1));
}

/**
 * Selects the optimal prompting strategy based on complexity score.
 * 
 * @param {number} score
 * @returns {'V1' | 'V3' | 'V4'} Strategy identifier
 */
export function selectPromptStrategy(score) {
  if (score >= 11.0) {
    return 'V4'; // Strong constraint & negative enforcement for complex multi-edits
  } else if (score >= 7.0) {
    return 'V3'; // Semantic reinforcement & explicit scope boundary
  } else {
    return 'V1'; // Direct single-property modification
  }
}
