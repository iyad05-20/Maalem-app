/**
 * src/services/llm/promptBuilder.js
 * ═══════════════════════════════════════════════════════════════════════
 * Adaptive Prompt Builder Engine — FINAL-STATE-FIRST Architecture
 *
 * Implements the 5 Global Rules:
 * 1. FINAL-STATE-FIRST: Describe the final scene directly. Never describe a base
 *    and then modify it with contradictory edit wording.
 * 2. REQUIRED-OBJECTS: Every requested physical object (primary & secondary) is
 *    mandatory and kept simultaneously visible in the scene.
 * 3. OBJECT INVENTORY BEFORE DETAIL: Strict construction order:
 *    (1) Primary object final morphology & geometry
 *    (2) Required secondary objects (visible presence)
 *    (3) Final material / color / finish
 *    (4) Decorations and details
 *    (5) Composition & spatial relationships (gravity, flat placement)
 *    (6) Preservation constraints
 *    (7) Photography & rendering style
 * 4. NO REDUNDANT MODIFICATION LANGUAGE: Merges all modifications into one
 *    coherent final description instead of edit commands ("add shape...", "change...").
 * 5. OBJECT COMPLETENESS CHECK: Validates internal completeness and formatting.
 * ═══════════════════════════════════════════════════════════════════════
 */

/**
 * Extracts and categorizes structured modifications into an inventory of the final visual state.
 *
 * @param {Array<Object>} modifications
 * @returns {Object} Final-state visual inventory
 */
export function extractFinalStateInventory(modifications = []) {
  let finalShape = null;
  let finalMaterial = null;
  const secondaryObjects = [];
  const colorFinishes = [];
  const decorations = [];
  const specificDetails = [];

  for (const m of modifications) {
    const feat = (m.feature || '').toLowerCase().trim();
    const val = (m.value || '').trim();
    const decomp = (m.visualDecomposition && m.visualDecomposition !== 'détails artisanaux sur mesure')
      ? m.visualDecomposition.trim()
      : val;
    
    // Avoid double prepositions if decomp or val already has it
    let loc = '';
    if (m.location && m.location !== 'all' && m.location !== 'none') {
      const combined = `${decomp} ${val}`.toLowerCase();
      if (!combined.includes(m.location.toLowerCase()) && !combined.includes('surface') && !combined.includes('rim')) {
        loc = ` on the ${m.location}`;
      }
    }

    if (feat.includes('shape') || feat.includes('forme') || feat.includes('dimension') || feat.includes('format')) {
      finalShape = decomp || val;
    } else if (feat.includes('material') || feat.includes('matière') || feat.includes('matiere')) {
      finalMaterial = decomp || val;
    } else if (feat.includes('accessoire') || feat.includes('accessory') || feat.includes('secondary_object') || feat.includes('service') || feat.includes('companion')) {
      secondaryObjects.push(`${decomp || val}${loc}`);
    } else if (feat.includes('color') || feat.includes('couleur') || feat.includes('finish') || feat.includes('patine') || feat.includes('shade') || feat.includes('teinte')) {
      colorFinishes.push(`${decomp || val}${loc}`);
    } else if (feat.includes('decor') || feat.includes('décor') || feat.includes('gravure') || feat.includes('engrav') || feat.includes('motif') || feat.includes('cisel')) {
      decorations.push(`${decomp || val}${loc}`);
    } else if (feat !== 'conception sur mesure' && feat !== 'type') {
      specificDetails.push(`${decomp || val}${loc}`);
    }
  }

  return {
    finalShape,
    finalMaterial,
    secondaryObjects: Array.from(new Set(secondaryObjects)),
    colorFinishes: Array.from(new Set(colorFinishes)),
    decorations: Array.from(new Set(decorations)),
    specificDetails: Array.from(new Set(specificDetails))
  };
}

/**
 * Legacy formatter maintained for backward-compatibility.
 */
export function formatModificationsList(modifications = []) {
  if (!modifications || modifications.length === 0) {
    return "Apply standard artisan refinement.";
  }
  const inventory = extractFinalStateInventory(modifications);
  const items = [];
  if (inventory.finalShape) items.push(inventory.finalShape);
  if (inventory.finalMaterial) items.push(inventory.finalMaterial);
  if (inventory.colorFinishes.length > 0) items.push(inventory.colorFinishes.join(', '));
  if (inventory.decorations.length > 0) items.push(inventory.decorations.join(', '));
  if (inventory.secondaryObjects.length > 0) items.push(inventory.secondaryObjects.join(', '));
  if (inventory.specificDetails.length > 0) items.push(inventory.specificDetails.join(', '));
  return items.join('; ');
}

/**
 * Generates an adaptive prompt based on the FINAL-STATE-FIRST rules and Object Inventory.
 * Produces a unified, coherent, and fluent luxury craft photograph prompt without clause stitching.
 *
 * @param {Object} params
 * @param {string} [params.baseContext] - General environment/piece context.
 * @param {string} [params.morphology] - Concrete physical/geometric visual description.
 * @param {Array<Object>} [params.modifications] - Array of modification objects.
 * @param {string} [params.targetFeature] - Legacy fallback feature.
 * @param {string} [params.targetValue] - Legacy fallback value.
 * @param {string} [params.visualDecomposition] - Legacy fallback decomposition.
 * @param {string|Array<string>} params.preservedProperties - List of properties to preserve.
 * @param {string} [params.level='V3'] - Complexity level.
 * @param {boolean} [params.isScratch=false] - Whether creating from scratch vs customizing anchor.
 * @returns {string} The constructed final-state photorealistic prompt.
 */
export function buildAdaptivePrompt({
  baseContext,
  morphology,
  modifications = [],
  targetFeature,
  targetValue,
  visualDecomposition,
  preservedProperties,
  level = 'V3',
  isScratch = false
}) {
  const activeMods = (Array.isArray(modifications) && modifications.length > 0)
    ? modifications
    : [{
        feature: targetFeature || 'finish',
        value: targetValue || 'custom handcrafted finish',
        visualDecomposition: visualDecomposition || `custom ${targetValue || 'artisan'} detailing`,
        operation: 'MODIFY',
        location: 'surface'
      }];

  // 1. Resolve Final-State Inventory (Rule 1 & Rule 3)
  const inventory = extractFinalStateInventory(activeMods);

  // 2. Resolve Final Primary Object Morphology
  let primaryDesc = morphology || baseContext || 'an authentic Moroccan handcrafted artisanal piece';

  // Strip any legacy baked-in placement/perspective from morphology to prevent duplication
  const legacyPlacements = [
    /,?\s*resting completely flat and flush horizontally on a low carved wooden tabletop, viewed from a natural slight high-angle three-quarter perspective/gi,
    /,?\s*resting completely flat and flush horizontally on a low carved wooden tabletop/gi,
    /,?\s*spread completely flat on an artisanal zellige floor/gi,
    /,?\s*placed resting on a carpeted riad floor/gi,
    /,?\s*resting naturally on a terracotta riad floor/gi,
    /,?\s*standing upright on a wooden credenza/gi,
    /,?\s*mounted flat against an authentic plaster wall/gi,
    /,?\s*resting side by side on a carved wooden surface/gi,
    /,?\s*resting naturally in a luxury riad setting/gi,
    /,?\s*placed in a luxury riad setting/gi
  ];
  for (const pat of legacyPlacements) {
    primaryDesc = primaryDesc.replace(pat, '');
  }
  primaryDesc = primaryDesc.replace(/,\s*,+/g, ',').replace(/\s+/g, ' ').replace(/,\s*$/, '').trim();

  // Resolve shape on primary object
  if (inventory.finalShape) {
    const sLower = inventory.finalShape.toLowerCase();
    if (sLower.includes('rectang') || sLower.includes('rectangle')) {
      primaryDesc = primaryDesc.replace(/\bcircular\b|\bround\b/gi, 'rectangular');
    } else if (sLower.includes('square') || sLower.includes('carré') || sLower.includes('carre')) {
      primaryDesc = primaryDesc.replace(/\bcircular\b|\bround\b/gi, 'square');
    } else if (sLower.includes('octagon') || sLower.includes('octogon')) {
      primaryDesc = primaryDesc.replace(/\bcircular\b|\bround\b/gi, 'octagonal');
    } else if (sLower.includes('round') || sLower.includes('ronde') || sLower.includes('circulaire')) {
      primaryDesc = primaryDesc.replace(/\brectangular\b|\bsquare\b/gi, 'round');
    }
  }

  // Resolve material on primary object
  if (inventory.finalMaterial) {
    const mLower = inventory.finalMaterial.toLowerCase();
    if (mLower.includes('wood') || mLower.includes('bois') || mLower.includes('cedre') || mLower.includes('cedar')) {
      primaryDesc = primaryDesc
        .replace(/\bzellige mosaic tile\b/gi, 'carved cedar wood')
        .replace(/\bzellige mosaic\b/gi, 'carved cedar wood')
        .replace(/\bzellige\b/gi, 'carved cedar wood')
        .replace(/\bwrought iron base\b/gi, 'carved wooden legs')
        .replace(/\bcopper\b|\bbrass\b|\bsilver\b|\biron\b/gi, 'carved cedar wood');
    } else if (mLower.includes('iron') || mLower.includes('fer')) {
      primaryDesc = primaryDesc
        .replace(/\bzellige mosaic tile\b/gi, 'wrought iron')
        .replace(/\bcopper\b|\bbrass\b|\bsilver\b/gi, 'wrought iron');
    } else if (mLower.includes('silver') || mLower.includes('argent')) {
      primaryDesc = primaryDesc.replace(/\bcopper\b|\bbrass\b|\biron\b/gi, 'silver');
    } else if (mLower.includes('brass') || mLower.includes('laiton')) {
      primaryDesc = primaryDesc.replace(/\bcopper\b|\bsilver\b|\biron\b/gi, 'brass');
    } else if (mLower.includes('copper') || mLower.includes('cuivre')) {
      primaryDesc = primaryDesc.replace(/\bbrass\b|\bsilver\b|\biron\b/gi, 'copper');
    }
  }

  // 3. Construct Coherent Unified Narrative Scene:
  // Sentence 1: Primary craft piece with its material, finish, and decorative details bound directly to it
  const finishStr = inventory.colorFinishes.length > 0 ? `finished in ${inventory.colorFinishes.join(', ')}` : '';
  const allDecorations = [...inventory.decorations, ...inventory.specificDetails];
  const decorStr = allDecorations.length > 0 ? `adorned with ${allDecorations.join(', ')}` : '';

  let sentence1 = `A luxury editorial craft photograph of ${primaryDesc}`;
  if (finishStr && decorStr) {
    sentence1 += `, ${finishStr}, ${decorStr}.`;
  } else if (finishStr) {
    sentence1 += `, ${finishStr}.`;
  } else if (decorStr) {
    sentence1 += `, ${decorStr}.`;
  } else {
    sentence1 += '.';
  }

  // Sentence 2: Secondary Objects & Accessories — explicitly bound to the primary piece in a coherent spatial arrangement
  let sentence2 = '';
  if (inventory.secondaryObjects.length > 0) {
    const isTrayOrTable = /siniya|plateau|tray|table|gueridon|desk/i.test(primaryDesc);
    const isFloorPiece = /tapis|rug|carpet|pouf|floor/i.test(primaryDesc);

    // Clean secondary objects strings: remove awkward repetitive prepositions and harmonize finishes
    const isTrayGrayOrIron = /wrought iron|iron|fer|gray|gris|silver|argent/i.test(primaryDesc) ||
      inventory.colorFinishes.some(c => /gray|gris|silver|argent/i.test(c)) ||
      (inventory.finalMaterial && /iron|fer|silver|argent/i.test(inventory.finalMaterial));

    const cleanedSec = inventory.secondaryObjects.map(sec => {
      let s = sec
        .replace(/\s+on the surface on the surface/gi, '')
        .replace(/\s+on the surface/gi, '')
        .replace(/\s+on the rim/gi, '')
        .replace(/\s+placed elegantly on the tray surface/gi, '')
        .trim();

      // If the accessory specifies an explicit accent color/finish (e.g. red, gold/brass, black, green, blue), RESPECT IT!
      const hasExplicitColor = /red|rouge|gold|brass|doré|dore|black|noir|green|vert|blue|bleu/i.test(s);

      if (isTrayGrayOrIron && !hasExplicitColor) {
        s = s.replace(/red copper|cuivre rouge/gi, 'matching polished silver-gray metal')
             .replace(/\bcopper\b/gi, 'matching polished silver-gray metal');
        if ((s.toLowerCase().includes('berrad') || s.toLowerCase().includes('teapot')) && 
            !s.toLowerCase().includes('silver') && !s.toLowerCase().includes('gray')) {
          s = s.replace(/(berrad(?:\s*\(.*?\))?|teapot(?:\s*\(.*?\))?)/gi, '$1 in matching polished silver-gray metal finish');
        }
      }
      return s;
    });

    if (isTrayOrTable) {
      sentence2 = `Arranged elegantly across the tray's flat surface is a complete matching artisan service, featuring ${cleanedSec.join(' and ')}, all resting stably together on the tray as a cohesive handcrafted ensemble, kept distinctly visible in the scene.`;
    } else if (isFloorPiece) {
      sentence2 = `Placed harmoniously atop the handcrafted piece are distinctly visible ${cleanedSec.join(' and ')}, styled together as a cohesive artisan interior ensemble.`;
    } else {
      sentence2 = `Accompanied by distinctly visible ${cleanedSec.join(' and ')}, harmoniously arranged together as a cohesive artisanal setting.`;
    }
  }

  // Sentence 3: Spatial Placement, Surface Contact, Gravity & Perspective (Stated exactly ONCE)
  let sentence3 = '';
  const isTray = /siniya|plateau|tray/i.test(primaryDesc);
  const isLantern = /lantern|luminaire|applique|lampe/i.test(primaryDesc);
  const isRugOrPouf = /tapis|rug|carpet|pouf/i.test(primaryDesc);
  const isMirror = /miroir|mirror/i.test(primaryDesc);
  const isTable = /table|mida|gueridon/i.test(primaryDesc);
  const isVase = /vase|ceramique|poterie/i.test(primaryDesc);

  if (isTray) {
    sentence3 = 'The tray rests completely flat and flush horizontally on a low carved wooden tabletop with natural gravity, viewed from a natural slight high-angle three-quarter perspective in an authentic luxury Moroccan riad setting.';
  } else if (isLantern) {
    sentence3 = 'Suspended gracefully with natural vertical gravity, viewed from an eye-level perspective casting warm ambient light across an authentic luxury riad interior.';
  } else if (isRugOrPouf) {
    sentence3 = 'Spread completely flat on an artisanal zellige tiled floor with natural gravity, viewed from an elevated three-quarter perspective in a sunlit Moroccan courtyard.';
  } else if (isMirror) {
    sentence3 = 'Mounted flat against an authentic hand-carved Moorish plaster wall, viewed from a frontal perspective in a luxury riad.';
  } else if (isTable) {
    sentence3 = 'Resting solidly on a terracotta riad floor with natural gravity, viewed from a natural three-quarter perspective.';
  } else if (isVase) {
    sentence3 = 'Standing upright with natural gravity on a hand-carved cedar wood credenza, viewed from a sharp focus editorial perspective.';
  } else {
    sentence3 = 'Resting naturally with authentic physical gravity, viewed from an elegant editorial perspective in a luxury Moroccan riad.';
  }

  // Sentence 4: Preservation Constraints & Editorial Photography Quality
  const rawPreserved = Array.isArray(preservedProperties)
    ? preservedProperties
    : (preservedProperties ? [preservedProperties] : []);

  let filteredPreserved = rawPreserved.filter(p => {
    if (!p) return false;
    const pLower = p.toLowerCase();
    if (inventory.finalShape && (pLower.includes('forme') || pLower.includes('shape') || pLower.includes('circular') || pLower.includes('proportions'))) {
      return false;
    }
    if (inventory.finalMaterial && (pLower.includes('matière') || pLower.includes('matiere') || pLower.includes('material') || pLower.includes('cuivre') || pLower.includes('bois'))) {
      return false;
    }
    return true;
  });

  if (filteredPreserved.length === 0) {
    filteredPreserved = ['authentic master craftsmanship and artisan structural integrity'];
  }

  const sentence4 = `Preserving ${filteredPreserved.join(', ')}. Authentic Moroccan master craftsmanship, luxury editorial craft photography, warm soft ambient lighting, authentic Moroccan interior, photorealistic, 8k, sharp focus.`;

  // Assemble the unified prompt
  const sentences = [sentence1, sentence2, sentence3, sentence4].filter(Boolean);
  let prompt = sentences.join(' ');

  // 4. Rule 5: OBJECT COMPLETENESS CHECK (Internal Verification & Cleanup)
  prompt = prompt
    .replace(/\s*,\s*,+/g, ', ')
    .replace(/\s*\.\s*\.+/g, '. ')
    .replace(/\s+on the surface on the surface/gi, ' on the tray surface')
    .replace(/\s+/g, ' ')
    .trim();

  // Verify that all requested secondary objects are physically represented in the prompt
  for (const sec of inventory.secondaryObjects) {
    const words = sec.toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const inPrompt = words.some(w => prompt.toLowerCase().includes(w));
    if (!inPrompt) {
      console.warn(`[OBJECT COMPLETENESS CHECK] Secondary object "${sec}" was missing from prompt. Injecting directly.`);
      prompt = `${sentence1} Accompanied by visibly present ${sec}. ${prompt.slice(sentence1.length)}`;
    }
  }

  return prompt;
}

