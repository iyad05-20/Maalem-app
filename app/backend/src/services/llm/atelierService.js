/**
 * src/services/llm/atelierService.js
 * ═══════════════════════════════════════════════════════════════════════
 * Atelier Co-Creation Orchestration Engine
 *
 * Implements:
 * - Cloudflare Llama 3.1 8B LLM intent & conversation handler
 * - Multi-modification Extraction & Specification Integrity Verification
 * - Deterministic Meilisearch Search Contract Bridge with in-memory fallback
 * - Comprehensive Complexity Prediction Model & Strategy Routing (V1/V3/V4)
 * - Cloudflare FLUX.2 Klein 4B image simulation generator
 * - Detailed diagnostic logging on each phase and data transition
 * ═══════════════════════════════════════════════════════════════════════
 */

import dotenv from 'dotenv';
dotenv.config();

import { getOrCreateSession, appendHistory } from './atelierSessionManager.js';
import { composeSystemPrompt, composeDirectPromptGenSystemPrompt, resolveProductMorphology } from './atelierPromptComposer.js';
import { buildAdaptivePrompt } from './promptBuilder.js';
import { calculateComplexityScore, selectPromptStrategy } from './complexityScorer.js';
import { productsIndex } from '../search/meilisearch.service.js';
import { recommendationService } from '../recommendation.service.js';
import { db } from '../../core/db/index.js';
import { customRequests } from '../../core/db/schema.js';
import crypto from 'crypto';

const DEFAULT_CF_ACCOUNT_ID = '03761c197ba4099b706ff62c1daa7643';
const DEFAULT_CF_API_TOKEN  = 'dYmO0hhV-mrAqOauwhP7qJeEvb0BViD9bxZ20IFv';

function getCloudflareCredentials() {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || DEFAULT_CF_ACCOUNT_ID;
  const apiToken  = process.env.CLOUDFLARE_API_TOKEN  || DEFAULT_CF_API_TOKEN;
  return { accountId, apiToken };
}

/**
 * Normalizes and accumulates modifications into a structured specification.
 * Supports multi-modification arrays (modifications[]), single-target formats,
 * preserves existing accumulated modifications, and provides deterministic
 * heuristic augmentation for Moroccan craft terms to prevent information loss.
 */
/**
 * Deterministically resolves conflicting modifications, purges obsolete specifications,
 * and harmonizes companion accessories with the primary piece's final material and color.
 */
export function reassessAndResolveConflicts(modifications = [], fallbackMessage = '', anchorProduct = null) {
  const msgLower = (fallbackMessage || '').toLowerCase();

  const wantsGrayOrSilver = msgLower.includes('gris') || msgLower.includes('silver') || msgLower.includes('argent') || msgLower.includes('anthracite') || msgLower.includes('acier');
  const wantsIron = msgLower.includes('fer') || msgLower.includes('iron') || msgLower.includes('forgé') || msgLower.includes('forge');

  const hasGrayMod = modifications.some(m => {
    const v = `${m.value || ''} ${m.visualDecomposition || ''}`.toLowerCase();
    return v.includes('gris') || v.includes('silver') || v.includes('argent') || v.includes('anthracite') || v.includes('acier');
  });
  const hasIronMod = modifications.some(m => {
    const v = `${m.value || ''} ${m.visualDecomposition || ''}`.toLowerCase();
    return v.includes('fer') || v.includes('iron');
  });

  const isGrayOrIronTheme = wantsGrayOrSilver || wantsIron || hasGrayMod || hasIronMod;

  if (isGrayOrIronTheme) {
    // 1. Purge contradictory red/copper color and material modifications
    modifications = modifications.filter(m => {
      const feat = (m.feature || '').toLowerCase();
      const val = (m.value || '').toLowerCase();
      // Purge obsolete red color entries
      if ((feat.includes('color') || feat.includes('couleur')) && (val.includes('rouge') || val.includes('cuivre'))) {
        return false;
      }
      // Purge obsolete copper material entries if user explicitly requested iron or gray
      if ((feat.includes('mat') || feat.includes('matière') || feat.includes('matiere')) && (val.includes('cuivre') || val.includes('copper')) && (wantsIron || hasIronMod || wantsGrayOrSilver || hasGrayMod)) {
        return false;
      }
      return true;
    });

    // 2. Ensure material is updated to iron or polished silver-gray metal if previous was copper
    const matMod = modifications.find(m => {
      const feat = (m.feature || '').toLowerCase();
      return feat.includes('mat') || feat.includes('matière') || feat.includes('matiere');
    });
    if (!matMod && (wantsIron || hasIronMod)) {
      modifications.push({
        feature: 'matière',
        value: 'fer forgé',
        operation: 'CHANGE',
        location: 'all',
        visualDecomposition: 'handcrafted wrought iron metal texture'
      });
    } else if (matMod && (matMod.value.toLowerCase().includes('cuivre') || matMod.value.toLowerCase().includes('copper'))) {
      if (wantsIron || hasIronMod) {
        matMod.value = 'fer forgé';
        matMod.visualDecomposition = 'handcrafted wrought iron metal texture';
      } else {
        matMod.value = 'métal gris poli';
        matMod.visualDecomposition = 'bright polished metallic gray finish';
      }
    }

    // 3. Harmonize accessories ONLY if no explicit color was specified for the accessory
    for (const m of modifications) {
      const feat = (m.feature || '').toLowerCase();
      const val = (m.value || '').toLowerCase();
      if (feat.includes('accessoire') || val.includes('berrad') || val.includes('théière') || val.includes('theiere') || val.includes('teapot')) {
        const hasExplicitAccessoryColor = val.includes('rouge') || val.includes('red') || val.includes('doré') || val.includes('dore') || val.includes('gold') || val.includes('laiton') || val.includes('noir') || val.includes('black') || val.includes('vert') || val.includes('green') || val.includes('bleu') || val.includes('blue');
        if (!hasExplicitAccessoryColor) {
          m.value = m.value.replace(/cuivre rouge/gi, 'métal gris poli').replace(/cuivre/gi, 'métal gris');
          m.visualDecomposition = 'an authentic traditional Moroccan berrad (ornate curved teapot in matching polished silver-gray metal finish) set alongside a cluster of traditional decorated Moroccan tea glasses with gold filigree';
        }
      }
    }
  }

  // Detect shape override: if rectangular is requested, purge any round/circular shape
  const wantsRect = msgLower.includes('rectang') || msgLower.includes('rectangle') || msgLower.includes('carré') || msgLower.includes('carre');
  const hasRectMod = modifications.some(m => {
    const v = `${m.value || ''} ${m.visualDecomposition || ''}`.toLowerCase();
    return v.includes('rectang') || v.includes('rectangle') || v.includes('carré') || v.includes('carre');
  });

  if (wantsRect || hasRectMod) {
    modifications = modifications.filter(m => {
      const feat = (m.feature || '').toLowerCase();
      const val = (m.value || '').toLowerCase();
      if (feat.includes('forme') || feat.includes('shape')) {
        if (val.includes('rond') || val.includes('circulaire') || val.includes('circular') || val.includes('round')) {
          return false;
        }
      }
      return true;
    });
  }

  return modifications;
}

/**
 * Ensures that visualDecomposition for every modification is 100% relevant,
 * coherent, and faithfully describes the specific feature and value requested.
 */
export function syncVisualDecomposition(modifications = [], fallbackMessage = '') {
  for (const m of modifications) {
    const feat = (m.feature || '').toLowerCase();
    const val = (m.value || '').toLowerCase();

    // 1. Accessory Visual Decomposition Sync
    if (feat.includes('accessoire') || val.includes('berrad') || val.includes('théière') || val.includes('theiere') || val.includes('teapot')) {
      if (val.includes('rouge') || val.includes('red')) {
        m.visualDecomposition = 'an authentic traditional Moroccan berrad (ornate curved teapot in a vibrant polished red finish) set alongside a cluster of traditional decorated Moroccan tea glasses with gold filigree';
      } else if (val.includes('doré') || val.includes('dore') || val.includes('gold') || val.includes('laiton') || val.includes('brass')) {
        m.visualDecomposition = 'an authentic traditional Moroccan berrad (ornate curved teapot in a gleaming golden brass finish) set alongside a cluster of traditional decorated Moroccan tea glasses with gold filigree';
      } else if (val.includes('noir') || val.includes('black')) {
        m.visualDecomposition = 'an authentic traditional Moroccan berrad (ornate curved teapot in a matte black wrought iron finish) set alongside a cluster of traditional decorated Moroccan tea glasses with gold filigree';
      } else if (val.includes('vert') || val.includes('green')) {
        m.visualDecomposition = 'an authentic traditional Moroccan berrad (ornate curved teapot in an emerald green enamel finish) set alongside a cluster of traditional decorated Moroccan tea glasses with gold filigree';
      } else if (val.includes('bleu') || val.includes('blue')) {
        m.visualDecomposition = 'an authentic traditional Moroccan berrad (ornate curved teapot in a rich cobalt blue finish) set alongside a cluster of traditional decorated Moroccan tea glasses with gold filigree';
      } else if (val.includes('cuivre') || val.includes('copper')) {
        m.visualDecomposition = 'an authentic traditional Moroccan berrad (ornate curved teapot in traditional hammered red copper finish) set alongside a cluster of traditional decorated Moroccan tea glasses with gold filigree';
      } else if (val.includes('gris') || val.includes('silver') || val.includes('argent') || val.includes('fer')) {
        m.visualDecomposition = 'an authentic traditional Moroccan berrad (ornate curved teapot in matching polished silver-gray metal finish) set alongside a cluster of traditional decorated Moroccan tea glasses with gold filigree';
      }
    }

    // 2. Decoration Visual Decomposition Sync
    else if (feat.includes('décor') || feat.includes('decor') || feat.includes('gravure') || feat.includes('engrav')) {
      if (val.includes('cuivre')) {
        m.visualDecomposition = 'delicate red copper inlays along the lateral edges';
      } else if (val.includes('jaune oré') || val.includes('doré') || val.includes('or')) {
        m.visualDecomposition = 'delicate yellow gold inlays along the lateral edges';
      } else if (val.includes('floral') || val.includes('raisin') || val.includes('fleur')) {
        m.visualDecomposition = 'gravure marocaine traditionnelle (motifs floraux finement ciselés)';
      } else if (val.includes('géométrique') || val.includes('geometrique') || val.includes('cisel')) {
        m.visualDecomposition = 'gravure marocaine traditionnelle (motifs géométriques ciselés traditionnels)';
      }
    }

    // 3. Color Visual Decomposition Sync
    else if (feat.includes('color') || feat.includes('couleur')) {
      if (val.includes('gris brillant') || val.includes('gris')) {
        m.visualDecomposition = 'bright polished metallic gray finish';
      } else if (val.includes('rouge')) {
        m.visualDecomposition = 'vibrant rich red polished finish';
      } else if (val.includes('vert')) {
        m.visualDecomposition = 'deep emerald green artisan finish';
      } else if (val.includes('bleu')) {
        m.visualDecomposition = 'vibrant Majorelle blue finish';
      }
    }

    // 4. Material Visual Decomposition Sync
    else if (feat.includes('mat') || feat.includes('matière') || feat.includes('matiere')) {
      if (val.includes('fer')) {
        m.visualDecomposition = 'handcrafted wrought iron metal texture';
      } else if (val.includes('cuivre')) {
        m.visualDecomposition = 'handcrafted hammered red copper metal texture';
      } else if (val.includes('bois')) {
        m.visualDecomposition = 'handcrafted Moroccan cedar wood texture with natural grain';
      }
    }
  }
  return modifications;
}

export function normalizeCustomizationSpec(rawSpec = {}, fallbackMessage = '', anchorProduct = null, existingMods = [], existingProduct = null) {
  let modifications = [];
  // If the LLM returned a comprehensive reassessment (array of 2+ items), use it directly
  if (Array.isArray(rawSpec.modifications) && rawSpec.modifications.length >= 2) {
    modifications = [];
  } else if (Array.isArray(existingMods) && existingMods.length > 0) {
    modifications = existingMods.map(m => ({ ...m }));
  }

  // 1. Primary: Load any modifications explicitly extracted by LLM
  if (Array.isArray(rawSpec.modifications) && rawSpec.modifications.length > 0) {
    for (const m of rawSpec.modifications) {
      let val = m.value;
      let decomp = m.visualDecomposition;
      const feat = (m.feature || '').toLowerCase();
      if (!val || val === 'personnalisée' || val === 'détails artisanaux sur mesure') {
        if (feat.includes('engrav') || feat.includes('gravure')) {
          val = 'gravure florale très fine';
          decomp = 'gravure florale marocaine traditionnelle très fine';
        } else if (feat.includes('finish') || feat.includes('patine')) {
          val = 'patine dorée brillante';
          decomp = 'finition patine dorée éclatante et polie';
        } else if (feat.includes('color') || feat.includes('couleur')) {
          val = fallbackMessage.includes('vert') ? 'vert émeraude' : 'bleu majorelle';
          decomp = `finition couleur ${val}`;
        } else {
          val = fallbackMessage || 'finition artisanale';
        }
      }

      // Sanitize LLM phonetic misinterpretations (e.g. French 'vers' in tea context = 'verres à thé')
      if (val === 'vers' || (decomp && (decomp.toLowerCase().includes('forme de vers') || decomp.toLowerCase().includes('vers')) && !decomp.toLowerCase().includes('verre'))) {
        val = 'set de verres à thé traditionnels';
        decomp = 'traditional Moroccan ornate colorful tea glasses arranged on the tray';
      }

      const isAccessory = feat.includes('accessoire') || feat.includes('accessory') || feat.includes('berrad') || feat.includes('thé') || feat.includes('the') || val.includes('berrad') || val.includes('verre') || val.includes('coussin') || val.includes('bougie');
      const normalizedFeat = isAccessory ? 'accessoire' : (m.feature || 'finition');

      const newMod = {
        feature: normalizedFeat,
        value: val,
        operation: (m.operation || 'MODIFY').toUpperCase(),
        location: m.location || 'surface',
        visualDecomposition: decomp || val
      };

      const existingIdx = modifications.findIndex(
        ex => (ex.feature || '').toLowerCase() === (newMod.feature || '').toLowerCase()
      );
      if (existingIdx >= 0) {
        modifications[existingIdx] = newMod;
      } else {
        modifications.push(newMod);
      }
    }
  } else if (rawSpec.targetFeature && rawSpec.targetValue) {
    const newMod = {
      feature: rawSpec.targetFeature,
      value: rawSpec.targetValue,
      operation: (rawSpec.operation || 'MODIFY').toUpperCase(),
      location: 'surface',
      visualDecomposition: rawSpec.visualDecomposition || rawSpec.targetValue
    };
    const existingIdx = modifications.findIndex(
      ex => (ex.feature || '').toLowerCase() === (newMod.feature || '').toLowerCase()
    );
    if (existingIdx >= 0) {
      modifications[existingIdx] = newMod;
    } else {
      modifications.push(newMod);
    }
  }

  // 2. Deterministic Semantic Augmentation: Ensure ALL user-requested visual dimensions are represented
  const msgLower = (fallbackMessage || '').toLowerCase();

  // A. Check for Engraving & Decorations
  const hasEngraving = modifications.some(m => (m.feature || '').toLowerCase().includes('engrav') || (m.feature || '').toLowerCase().includes('gravure') || (m.feature || '').toLowerCase().includes('decor') || (m.feature || '').toLowerCase().includes('motif'));
  if (!hasEngraving && (msgLower.includes('gravure') || msgLower.includes('cisel') || msgLower.includes('floral') || msgLower.includes('decor') || msgLower.includes('motif') || msgLower.includes('raisin') || msgLower.includes('fleur'))) {
    const isRaisin = msgLower.includes('raisin');
    const isFloral = msgLower.includes('floral') || msgLower.includes('fleur');
    const val = isRaisin 
      ? 'décorations florales de type raisins ciselées' 
      : (isFloral ? 'gravure florale très fine' : 'motifs géométriques ciselés traditionnels');
    modifications.push({
      feature: 'décoration',
      value: val,
      operation: 'ADD',
      location: msgLower.includes('bord') || msgLower.includes('contour') ? 'rim' : 'surface',
      visualDecomposition: `gravure marocaine traditionnelle (${val})`
    });
  }

  // B. Check for Finish / Patina / Gold / Silver
  const hasFinish = modifications.some(m => (m.feature || '').toLowerCase().includes('finish') || (m.feature || '').toLowerCase().includes('patine'));
  if (!hasFinish && (msgLower.includes('patine') || msgLower.includes('doré') || msgLower.includes('dore') || msgLower.includes('argent') || msgLower.includes('brillant') || msgLower.includes('satin') || msgLower.includes('polie'))) {
    const isGold = msgLower.includes('doré') || msgLower.includes('dore') || msgLower.includes('or');
    modifications.push({
      feature: 'finish',
      value: isGold ? 'patine dorée brillante' : 'finition patinée artisanale',
      operation: 'CHANGE',
      location: 'surface',
      visualDecomposition: isGold ? 'finition patine dorée éclatante et polie' : 'patine artisanale d\'exception'
    });
  }

  // C. Check for Color (Bleu, Vert, Gris, etc.)
  const hasColor = modifications.some(m => (m.feature || '').toLowerCase().includes('color') || (m.feature || '').toLowerCase().includes('couleur'));
  if (!hasColor) {
    const colorMatch = msgLower.match(/\b(bleu majorelle|bleu|vert émeraude|vert emeraude|vert|gris brillant|gris clair|gris anthracite|gris|noir|blanc|rouge|jaune|ocre|safran|turquoise|marron|beige|argenté|argente)\b/i);
    if (colorMatch) {
      const col = colorMatch[1];
      modifications.push({
        feature: 'couleur',
        value: col,
        operation: 'CHANGE',
        location: 'surface',
        visualDecomposition: `finition couleur ${col}`
      });
    }
  }

  // D. Check for Shade (Sombre, Foncé)
  const hasShade = modifications.some(m => (m.feature || '').toLowerCase().includes('shade') || (m.feature || '').toLowerCase().includes('teinte'));
  if (!hasShade && (msgLower.includes('sombre') || msgLower.includes('foncé') || msgLower.includes('obscur'))) {
    modifications.push({
      feature: 'shade',
      value: 'teinte plus sombre',
      operation: 'CHANGE',
      location: 'surface',
      visualDecomposition: 'nuance plus foncée avec patine d\'oxydation contrôlée'
    });
  }

  // E. Check for Material (Bois, Zellige, Cuivre, Laiton, Cuir, Fer forgé, etc.)
  const hasMaterial = modifications.some(m => (m.feature || '').toLowerCase().includes('mat') || (m.feature || '').toLowerCase().includes('bois') || (m.feature || '').toLowerCase().includes('cuiv') || (m.feature || '').toLowerCase().includes('zellige') || (m.feature || '').toLowerCase().includes('laiton') || (m.feature || '').toLowerCase().includes('fer'));
  if (!hasMaterial) {
    const matMatch = msgLower.match(/\b(cuivre rouge martelé|cuivre rouge|cuivre jaune|cuivre|laiton ajouré|laiton|bois de cèdre sculpté|bois de cèdre|bois de cedre|bois de noyer|bois sculpté|bois|zellige fassi|zellige émeraude|zellige vert|zellige|fer forgé noir|fer forgé|fer forge|fer|cuir tanné|cuir|céramique fassie|céramique|ceramique|laine)\b/i);
    if (matMatch) {
      modifications.push({
        feature: 'matière',
        value: matMatch[1],
        operation: 'ADD',
        location: 'all',
        visualDecomposition: `confection artisanale en ${matMatch[1]}`
      });
    }
  }

  // F. Check for Dimensions / Forme (80 cm, 1 mètre, grand, octogonal, rond, etc.)
  const hasDim = modifications.some(m => (m.feature || '').toLowerCase().includes('dim') || (m.feature || '').toLowerCase().includes('taille') || (m.feature || '').toLowerCase().includes('forme') || (m.feature || '').toLowerCase().includes('shape'));
  if (!hasDim) {
    const dimMatch = msgLower.match(/\b(\d+[\s]*(?:cm|m|mètre|metres|centimètre|centimetres)|diamètre\s*\d+|diametre\s*\d+|grand|moyen|petit|octogonal|carré|carre|rond|circulaire|rectangulaire|rectangle)\b/i);
    if (dimMatch) {
      modifications.push({
        feature: 'format & dimensions',
        value: dimMatch[1],
        operation: 'ADD',
        location: 'all',
        visualDecomposition: `gabarit et proportions de la pièce: ${dimMatch[1]}`
      });
    }
  }

  // G. Check for Required Secondary Physical Objects & Accessories (Accessoire)
  // Ensures any explicitly requested companion object (accessory, tableware, cushions, candles, etc.)
  // is preserved as a mandatory distinct physical object (Rule 2: REQUIRED-OBJECTS)
  const hasAccessoryMod = modifications.some(m => {
    const f = (m.feature || '').toLowerCase();
    return f.includes('accessoire') || f.includes('accessory') || f.includes('secondary_object');
  });

  if (!hasAccessoryMod) {
    const companionMatches = [];
    if (msgLower.includes('berrad') || msgLower.includes('théière') || msgLower.includes('theiere') || msgLower.includes('teapot')) {
      const hasGlasses = msgLower.includes('verre') || msgLower.includes('vers') || msgLower.includes('kissan') || msgLower.includes('kess');
      companionMatches.push(hasGlasses 
        ? 'set artisanal avec théière marocaine (berrad) et verres à thé'
        : 'théière marocaine traditionnelle en métal ciselé (berrad)');
    } else if (msgLower.includes('verre') || msgLower.includes('vers') || msgLower.includes('kissan') || msgLower.includes('kess')) {
      companionMatches.push('verres à thé traditionnels marocains décorés');
    } else if (msgLower.includes('bougeoir') || msgLower.includes('bougie') || msgLower.includes('chandelier')) {
      companionMatches.push('bougeoirs artisanaux en laiton ciselé');
    } else if (msgLower.includes('coussin') || msgLower.includes('moussed')) {
      companionMatches.push('coussins artisanaux brodés');
    }

    if (companionMatches.length > 0) {
      const val = companionMatches.join(' et ');
      modifications.push({
        feature: 'accessoire',
        value: val,
        operation: 'ADD',
        location: 'surface',
        visualDecomposition: val.includes('berrad') || val.includes('théière')
          ? 'an authentic traditional Moroccan berrad (ornate curved metal teapot) set alongside a cluster of traditional decorated Moroccan tea glasses with gold filigree'
          : `distinct visible handcrafted secondary companion objects: ${val}`
      });
    }
  }

  // Fallback if still empty
  if (modifications.length === 0 && fallbackMessage.trim().length > 0) {
    modifications.push({
      feature: 'conception sur mesure',
      value: fallbackMessage,
      operation: 'ADD',
      location: 'all',
      visualDecomposition: fallbackMessage
    });
  }

  // 3. Reassess and Resolve Conflicting Specifications
  modifications = reassessAndResolveConflicts(modifications, fallbackMessage, anchorProduct);
  modifications = syncVisualDecomposition(modifications, fallbackMessage);

  // 4. Deduplicate modifications by feature + value to prevent repeated lines in summary card
  const seenModKeys = new Set();
  modifications = modifications.filter(m => {
    const featKey = (m.feature || '').toLowerCase().trim();
    const valKey = (m.value || '').toLowerCase().trim();
    const key = `${featKey}::${valKey}`;
    if (seenModKeys.has(key)) return false;
    seenModKeys.add(key);
    return true;
  });

  // 5. Preserved Properties Extraction & Normalization
  let preservedProperties = rawSpec.preservedProperties;
  if (!preservedProperties || preservedProperties.length === 0) {
    preservedProperties = [];
    if (msgLower.includes('forme')) preservedProperties.push("forme originale");
    if (msgLower.includes('martelage') || msgLower.includes('cuivre')) preservedProperties.push("martelage cuivre traditionnel");
    if (msgLower.includes('motif')) preservedProperties.push("motifs traditionnels d'origine");
    if (msgLower.includes('structure') || msgLower.includes('artisanat')) preservedProperties.push("savoir-faire artisanal");
    if (preservedProperties.length === 0) {
      preservedProperties = [
        "forme et proportions d'origine",
        "structure et base artisanale",
        "savoir-faire traditionnel marocain"
      ];
    }
  } else if (typeof preservedProperties === 'string') {
    preservedProperties = [preservedProperties];
  }

  // Purge contradictory preserved properties (e.g. martelage cuivre when user requested gray or iron)
  const isGrayOrIron = modifications.some(m => {
    const s = `${m.value} ${m.visualDecomposition}`.toLowerCase();
    return s.includes('gris') || s.includes('silver') || s.includes('fer') || s.includes('argent');
  }) || msgLower.includes('gris') || msgLower.includes('fer');
  if (isGrayOrIron) {
    preservedProperties = preservedProperties.filter(p => !p.toLowerCase().includes('cuivre'));
  }

  // Resolve product: strictly non-null with multi-tier fallback
  let product = null;
  if (rawSpec.product && typeof rawSpec.product === 'object' && rawSpec.product.name) {
    product = {
      name: rawSpec.product.name,
      category: rawSpec.product.category || 'craft',
      visualDecomposition: rawSpec.product.visualDecomposition || rawSpec.product.name
    };
  } else if (existingProduct && typeof existingProduct === 'object' && existingProduct.name) {
    product = { ...existingProduct };
  } else if (anchorProduct) {
    product = {
      name: anchorProduct.title || 'Création catalogue',
      category: anchorProduct.category_group || anchorProduct.category || 'craft',
      visualDecomposition: anchorProduct.description || anchorProduct.title || 'an authentic traditional Moroccan handcrafted craft piece'
    };
  }

  // Synthesize dynamic product if still missing, ensuring it NEVER defaults to null or generic Siniya
  if (!product) {
    const textContext = [fallbackMessage, ...modifications.map(m => `${m.feature} ${m.value}`)].join(' ').toLowerCase();
    const isTable = textContext.includes('table') || textContext.includes('mida') || textContext.includes('gueridon');
    const isSiniya = textContext.includes('siniya') || textContext.includes('plateau');
    const isMirror = textContext.includes('miroir') || textContext.includes('mirror');
    const isLantern = textContext.includes('lantern') || textContext.includes('applique') || textContext.includes('lampe');
    const isChair = textContext.includes('chaise') || textContext.includes('fauteuil');
    const isRug = textContext.includes('tapis') || textContext.includes('rug');
    const isPouf = textContext.includes('pouf');

    const shapeMod = modifications.find(m => (m.feature || '').toLowerCase().includes('forme'));
    const matMod = modifications.find(m => (m.feature || '').toLowerCase().includes('matière') || (m.feature || '').toLowerCase().includes('matiere'));
    const shapeStr = shapeMod?.value || (textContext.includes('ronde') ? 'round' : (textContext.includes('rectang') ? 'rectangular' : ''));
    const matStr = matMod?.value || (textContext.includes('bois') ? 'wood' : (textContext.includes('cuivre') ? 'copper' : (textContext.includes('fer') ? 'wrought iron' : (textContext.includes('laiton') ? 'brass' : 'handcrafted'))));

    if (isTable) {
      product = {
        name: "table",
        category: "furniture",
        visualDecomposition: `an authentic traditional Moroccan low ${shapeStr} ${matStr} table with sturdy hand-carved wooden legs`
      };
    } else if (isSiniya) {
      product = {
        name: "siniya",
        category: "tableware",
        visualDecomposition: `an authentic traditional Moroccan ${shapeStr} ${matStr} tea serving tray with a shallow raised rim`
      };
    } else if (isMirror) {
      product = {
        name: "miroir",
        category: "wall_decor",
        visualDecomposition: `an authentic Moroccan ${shapeStr} ${matStr} wall mirror with arched Moorish frame`
      };
    } else if (isLantern) {
      product = {
        name: "lanterne",
        category: "lighting",
        visualDecomposition: `an authentic traditional Moroccan ${matStr} hanging lantern with intricate geometric filigree perforations`
      };
    } else if (isChair) {
      product = {
        name: "chaise",
        category: "furniture",
        visualDecomposition: `an authentic traditional Moroccan ${matStr} chair`
      };
    } else if (isRug) {
      product = {
        name: "tapis",
        category: "textile",
        visualDecomposition: `an authentic handwoven Moroccan wool rug with traditional Berber geometric motifs`
      };
    } else if (isPouf) {
      product = {
        name: "pouf",
        category: "leather",
        visualDecomposition: `an authentic round handcrafted Moroccan leather pouf with traditional embroidered medallion stitching`
      };
    } else {
      product = {
        name: "création sur mesure",
        category: "craft",
        visualDecomposition: `an authentic handcrafted Moroccan ${shapeStr} ${matStr} artisanal bespoke creation`
      };
    }
  }

  return {
    product,
    modifications,
    preservedProperties,
    scene_complexity: rawSpec.scene_complexity || 'S2',
    neighbor_density: rawSpec.neighbor_density || 'N2',
    target_size: rawSpec.target_size || 'MEDIUM',
    ambiguity: rawSpec.ambiguity || 'A0'
  };
}

/**
 * Deterministic Specification Integrity Checker.
 * Verifies that all requested visual transformations are represented in both
 * the structured specification and the final generation prompt.
 */
export function verifySpecificationIntegrity({ modifications = [], prompt = '' }) {
  if (!modifications || modifications.length === 0) {
    return {
      passed: false,
      reason: 'No modifications found in specification'
    };
  }

  const missingFromPrompt = [];
  const promptLower = prompt.toLowerCase();

  for (const m of modifications) {
    const featLower = (m.feature || '').toLowerCase();
    const valWords = (m.value || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const decompWords = (m.visualDecomposition || '').toLowerCase().split(/\s+/).filter(w => w.length > 3);
    const hasFeat = promptLower.includes(featLower);
    const hasWord = valWords.some(w => promptLower.includes(w));
    const hasDecompWord = decompWords.some(w => promptLower.includes(w));
    
    if (!hasFeat && !hasWord && !hasDecompWord && prompt.length > 0) {
      missingFromPrompt.push(`${m.feature}: ${m.value}`);
    }
  }

  if (missingFromPrompt.length > 0) {
    return {
      passed: false,
      reason: `Modifications missing from adaptive prompt: ${missingFromPrompt.join(', ')}`,
      missing: missingFromPrompt
    };
  }

  return {
    passed: true,
    modificationCount: modifications.length
  };
}

/**
 * Robust JSON extraction helper.
 */
export function safeExtractJson(rawText) {
  if (!rawText || typeof rawText !== 'string') return null;
  let text = rawText.trim();
  
  // 1. Direct parse
  try {
    return JSON.parse(text);
  } catch (_) {}

  // 2. Markdown codeblock stripping
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
  try {
    return JSON.parse(text);
  } catch (_) {}

  // 3. Outermost brace slice
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const candidate = text.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(candidate);
    } catch (_) {}
  }

  return null;
}

/**
 * Calls Cloudflare Llama 3.1 8B Instruct with structured JSON mode.
 */
async function callLlama(messages) {
  const { accountId, apiToken } = getCloudflareCredentials();
  if (!accountId || !apiToken) {
    console.warn('⚠️ Cloudflare AI credentials missing in environment. Using resilient fallback simulator.');
    const sysMsg = messages.find(m => m.role === 'system')?.content || '';
    const lastUserMsg = ([...messages].reverse().find(m => m.role === 'user')?.content || '').toLowerCase().trim();
    const isGate2Context = sysMsg.includes('CUSTOMIZE_CONTEXT') || sysMsg.includes('Pièce ancre') || sysMsg.includes('PERSONNALISATION');
    const isScratchContext = sysMsg.includes('SCRATCH_CONTEXT') || sysMsg.includes('SUR MESURE EX NIHILO');

    // 1. Detect Approval, Summary & Completion keywords
    const approvalKeywords = [
      'summary', 'résumé', 'resume', 'recap', 'récap', 'recapitulatif', 'récapitulatif',
      'ce que je veux', 'ce que j ai choisi', "ce que j'ai choisi", 'ce que j ai', "ce que j'ai",
      'mes choix', 'mon choix', "c'est tout", "cest tout", "c tout", "c'est fini", "cest fini",
      "fini", "termine", "terminé", "terminer", "fin", "stop", "rien d'autre", "rien dautre",
      "garder tel quel", "ça suffit", "ca suffit", "japprouve", "j'approuve", "approuve",
      "valide", "je valide", "valider", "c'est bon", "c bon", "cest bon", "non c'est ça",
      "non c ca", "non cest ca", "parfait", "d'accord", "dacord", "on peut lancer", "lancer",
      "générer", "generer", "prêt", "pret", "c'est parfait", "je confirme", "confirmer",
      "confirme", "c'est bien", "c bien", "oui c'est ça", "oui c ca"
    ];
    const isApproval = approvalKeywords.some(kw => lastUserMsg.includes(kw));

    // 2. Detect Search keywords (Gate 1 ONLY when NOT in Gate 2 anchored customization)
    const isExplicitSearchWord = (
      /\b(cherche|recherche|trouver|trouve|voir|montre|catalogue|modèle|modele|explorer)\b/i.test(lastUserMsg) ||
      /\b(siniya|plateau|tapis|zarbia|mida|table|lanterne|fanous|vase|pouf|theiere|théière|berrad|applique)\b/i.test(lastUserMsg)
    );
    const isSearch = !isGate2Context && !isScratchContext && isExplicitSearchWord;

    if (isSearch && !isApproval) {
      let q = lastUserMsg.replace(/^(je cherche|je veux|montre moi|trouver|recherche)\s*/i, '').trim();
      if (q.includes('plateau')) q = q.replace(/plateau/g, 'siniya');
      if (q.includes('table')) q = q.replace(/table/g, 'mida');
      if (q.includes('lampe') || q.includes('lanterne')) q = q.replace(/(lampe|lanterne)/g, 'fanous');
      return {
        rawResponse: JSON.stringify({
          intent: "search",
          search_query: q || lastUserMsg,
          search_filterable: {},
          reply: "Voici une sélection de créations artisanales marocaines authentiques correspondant à votre recherche. Vous pouvez en sélectionner une pour démarrer la personnalisation.",
          suggestions: ["En cuivre rouge", "Plateaux ciselés", "Plateaux martelés", "Voir d'autres styles"],
          sufficient: false,
          clarifying_q: null
        }),
        usage: { prompt_tokens: 100, completion_tokens: 50, neurons: 0 }
      };
    }

    if (isApproval) {
      return {
        rawResponse: JSON.stringify({
          intent: "customize_review",
          reply: "Parfait ! Voici le récapitulatif détaillé de votre création artisanale sur mesure. Vous pouvez modifier les éléments ou lancer la simulation visuelle.",
          suggestions: ["Modifier", "Générer la simulation"],
          sufficient: true,
          summary: `• Spécifications enregistrées\n• Préservation du savoir-faire artisanal`,
          clarifying_q: null
        }),
        usage: { prompt_tokens: 100, completion_tokens: 50, neurons: 0 }
      };
    }

    // Gate 2 Modification extraction
    const mods = [];
    if (lastUserMsg.includes('doré') || lastUserMsg.includes('dore') || lastUserMsg.includes('patine')) {
      mods.push({
        feature: "finish",
        value: lastUserMsg.includes('doré') || lastUserMsg.includes('dore') ? "patine dorée brillante" : "finition patinée",
        operation: "CHANGE",
        location: "surface",
        visualDecomposition: "finition patine dorée éclatante et polie"
      });
    }
    if (lastUserMsg.includes('gravure') || lastUserMsg.includes('floral') || lastUserMsg.includes('cisel')) {
      mods.push({
        feature: "engraving",
        value: lastUserMsg.includes('floral') ? "gravure florale très fine" : "gravure ciselée traditionnelle",
        operation: "ADD",
        location: lastUserMsg.includes('contour') || lastUserMsg.includes('bord') ? "rim" : "surface",
        visualDecomposition: "gravure florale marocaine traditionnelle très fine et ciselée"
      });
    }
    if (lastUserMsg.includes('bleu') || lastUserMsg.includes('vert') || lastUserMsg.includes('couleur')) {
      mods.push({
        feature: "color",
        value: lastUserMsg.includes('vert') ? "vert émeraude" : "bleu majorelle",
        operation: "CHANGE",
        location: "surface",
        visualDecomposition: lastUserMsg.includes('vert') ? "émail vert émeraude traditionnel profond" : "émail bleu majorelle intense"
      });
    }

    if (mods.length === 0 && lastUserMsg.length > 0) {
      mods.push({
        feature: "finition artisanale",
        value: lastUserMsg,
        operation: "MODIFY",
        location: "surface",
        visualDecomposition: lastUserMsg
      });
    }

    return {
      rawResponse: JSON.stringify({
        intent: "clarify",
        reply: "C'est bien noté pour ces préférences de personnalisation. Avez-vous d'autres finitions, gravures ou détails à préciser ?",
        suggestions: ["Modifier la couleur", "Ajouter une gravure", "Appliquer une patine dorée"],
        sufficient: false,
        clarifying_q: "Avez-vous d'autres finitions à préciser ?",
        customization_spec: {
          modifications: mods,
          preservedProperties: ["forme originale", "martelage cuivre", "structure artisanale"]
        }
      }),
      usage: { prompt_tokens: 100, completion_tokens: 50, neurons: 0 }
    };
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/meta/llama-3.1-8b-instruct-fp8`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      messages,
      max_tokens: 2048,
      temperature: 0.1
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Cloudflare Llama API error (${response.status}): ${errText}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(`Cloudflare Llama error: ${JSON.stringify(data.errors)}`);
  }

  return {
    rawResponse: data.result?.response || '',
    usage: data.result?.usage || { prompt_tokens: 0, completion_tokens: 0, neurons: 0 }
  };
}

/**
 * Calls Cloudflare FLUX.2 Klein 4B for visual generation.
 */
async function callFluxKlein(prompt, inputImageBase64 = null, retries = 2) {
  const { accountId, apiToken } = getCloudflareCredentials();
  if (!accountId || !apiToken) {
    throw new Error('Cloudflare AI credentials missing in environment variables (CLOUDFLARE_ACCOUNT_ID, CLOUDFLARE_API_TOKEN).');
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-2-klein-4b`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('guidance', '8.0');
      
      if (inputImageBase64) {
        formData.append('strength', '0.8');
        formData.append('width', '1024');
        formData.append('height', '1024');
        const imageBuffer = Buffer.from(inputImageBase64, 'base64');
        formData.append('input_image_0', new Blob([imageBuffer], { type: 'image/png' }), 'base.png');
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiToken}` },
        body: formData,
      });

      if (!response.ok) {
        const errText = await response.text();
        if (attempt < retries && (response.status >= 500 || errText.includes('timeout') || errText.includes('AiError'))) {
          console.warn(`   ⚠️ FLUX Klein timeout/error (attempt ${attempt}/${retries}). Retrying in 2s...`);
          await new Promise(r => setTimeout(r, 2000));
          continue;
        }
        throw new Error(`FLUX Klein API error: ${errText}`);
      }

      if ((response.headers.get('content-type') || '').includes('application/json')) {
        return (await response.json()).result.image;
      } else {
        return Buffer.from(await response.arrayBuffer()).toString('base64');
      }
    } catch (err) {
      if (attempt < retries && (err.message.includes('timeout') || err.message.includes('AiError'))) {
        console.warn(`   ⚠️ FLUX Klein fetch error (attempt ${attempt}/${retries}): ${err.message}. Retrying in 2s...`);
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
      throw err;
    }
  }
}

/**
 * Executes a deterministic Meilisearch query from LLM-produced contracts,
 * with graceful in-memory recommendation catalog fallback on error.
 */
async function executeMeiliSearch(search_filterable, search_query) {
  try {
    const filterParts = [];

    if (search_filterable) {
      if (search_filterable.category_group && search_filterable.category_group.length > 0) {
        const groups = search_filterable.category_group.map(g => `"${g}"`).join(', ');
        filterParts.push(`category_group IN [${groups}]`);
      }
      if (search_filterable.rec_tags) {
        if (search_filterable.rec_tags.style && search_filterable.rec_tags.style.length > 0) {
          const styles = search_filterable.rec_tags.style.map(s => `"${s}"`).join(', ');
          filterParts.push(`rec_tags.style IN [${styles}]`);
        }
        if (search_filterable.rec_tags.material && search_filterable.rec_tags.material.length > 0) {
          const mats = search_filterable.rec_tags.material.map(m => `"${m}"`).join(', ');
          filterParts.push(`rec_tags.material IN [${mats}]`);
        }
        if (search_filterable.rec_tags.color_vibe && search_filterable.rec_tags.color_vibe.length > 0) {
          const colors = search_filterable.rec_tags.color_vibe.map(c => `"${c}"`).join(', ');
          filterParts.push(`rec_tags.color_vibe IN [${colors}]`);
        }
      }
    }

    const searchOptions = {
      limit: 6,
      attributesToRetrieve: ['id', 'title', 'price', 'category', 'category_group', 'rec_tags', 'identity', 'image_url', 'image', 'artisanName', 'artisanId', 'facets']
    };

    if (filterParts.length > 0) {
      searchOptions.filter = filterParts.join(' AND ');
    }

    const query = search_query || '';
    const searchResults = await productsIndex.search(query, searchOptions);
    
    // Format for frontend
    const hits = (searchResults.hits || []).map(hit => ({
      id: hit.id,
      title: hit.title,
      price: hit.price ? (typeof hit.price === 'number' ? `${hit.price} DH` : hit.price) : 'Sur devis',
      image: hit.image_url || hit.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
      imageUrl: hit.image_url || hit.image,
      category: hit.category || hit.category_group,
      artisanName: hit.identity?.artisan_name || hit.artisanName || 'Maâlem Partenaire',
      artisanId: hit.identity?.artisan_id || hit.artisanId || hit.artisan_id || 'artisan-1',
      rec_tags: hit.rec_tags
    }));

    if (hits.length === 0) {
      const allProducts = recommendationService.getProducts() || [];
      const stopWords = new Set(['je', 'tu', 'il', 'nous', 'vous', 'cherche', 'recherche', 'trouver', 'voir', 'montre', 'moi', 'un', 'une', 'des', 'le', 'la', 'les', 'de', 'du', 'en', 'pour', 'avec', 'dans', 'sur', 'svp', 'merci', 'quelque', 'chose']);
      const rawTokens = (search_query || '')
        .toLowerCase()
        .replace(/[^\w\sàâäéèêëîïôöùûüç]/gi, ' ')
        .split(/\s+/)
        .filter(w => w.length >= 2 && !stopWords.has(w));

      const keywords = [];
      for (const t of rawTokens) {
        keywords.push(t);
        if (t === 'plateau') keywords.push('siniya');
        if (t === 'siniya') keywords.push('plateau');
        if (t === 'lampe' || t === 'lanterne') keywords.push('fanous', 'applique');
        if (t === 'tapis') keywords.push('zarbia', 'kilim', 'ouarain');
        if (t === 'table') keywords.push('mida', 'zellige');
      }

      let filtered = allProducts.filter(p => {
        if (keywords.length === 0) return true;
        const text = `${p.title || ''} ${p.description || ''} ${p.category || ''} ${p.category_group || ''} ${(p.rec_tags?.material || []).join(' ')} ${(p.rec_tags?.style || []).join(' ')}`.toLowerCase();
        return keywords.some(kw => text.includes(kw));
      }).slice(0, 6);

      if (filtered.length === 0) {
        filtered = allProducts.slice(0, 6);
      }

      const fallbackHits = filtered.map(hit => ({
        id: hit.id,
        title: hit.title,
        price: hit.price ? (typeof hit.price === 'number' ? `${hit.price} DH` : hit.price) : 'Sur devis',
        image: hit.image_url || hit.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
        imageUrl: hit.image_url || hit.image,
        category: hit.category || hit.category_group,
        artisanName: hit.identity?.artisan_name || hit.artisanName || 'Maâlem Partenaire',
        artisanId: hit.identity?.artisan_id || hit.artisanId || hit.artisan_id || 'artisan-1',
        rec_tags: hit.rec_tags
      }));

      return {
        hits: fallbackHits,
        hit_count: fallbackHits.length,
        facetDistribution: {}
      };
    }

    return {
      hits,
      hit_count: hits.length,
      facetDistribution: searchResults.facetDistribution || {}
    };
  } catch (meiliErr) {
    console.warn(`   ⚠️ Meilisearch offline or unreachable (${meiliErr.message}), falling back to in-memory recommendation catalog...`);
    const allProducts = recommendationService.getProducts() || [];
    const stopWords = new Set(['je', 'tu', 'il', 'nous', 'vous', 'cherche', 'recherche', 'trouver', 'voir', 'montre', 'moi', 'un', 'une', 'des', 'le', 'la', 'les', 'de', 'du', 'en', 'pour', 'avec', 'dans', 'sur', 'svp', 'merci', 'quelque', 'chose']);
    const rawTokens = (search_query || '')
      .toLowerCase()
      .replace(/[^\w\sàâäéèêëîïôöùûüç]/gi, ' ')
      .split(/\s+/)
      .filter(w => w.length >= 2 && !stopWords.has(w));

    // Map common craft synonyms
    const keywords = [];
    for (const t of rawTokens) {
      keywords.push(t);
      if (t === 'plateau') keywords.push('siniya');
      if (t === 'siniya') keywords.push('plateau');
      if (t === 'lampe' || t === 'lanterne') keywords.push('fanous', 'applique');
      if (t === 'tapis') keywords.push('zarbia', 'kilim', 'ouarain');
      if (t === 'table') keywords.push('mida', 'zellige');
    }

    let filtered = allProducts.filter(p => {
      if (keywords.length === 0) return true;
      const text = `${p.title || ''} ${p.description || ''} ${p.category || ''} ${p.category_group || ''} ${(p.rec_tags?.material || []).join(' ')} ${(p.rec_tags?.style || []).join(' ')}`.toLowerCase();
      return keywords.some(kw => text.includes(kw));
    }).slice(0, 6);

    if (filtered.length === 0) {
      filtered = allProducts.slice(0, 6);
    }

    const hits = filtered.map(hit => ({
      id: hit.id,
      title: hit.title,
      price: hit.price ? (typeof hit.price === 'number' ? `${hit.price} DH` : hit.price) : 'Sur devis',
      image: hit.image_url || hit.image || 'https://images.unsplash.com/photo-1544816155-12df9643f363?auto=format&fit=crop&w=600&q=80',
      imageUrl: hit.image_url || hit.image,
      category: hit.category || hit.category_group,
      artisanName: hit.identity?.artisan_name || hit.artisanName || 'Maâlem Partenaire',
      artisanId: hit.identity?.artisan_id || hit.artisanId || hit.artisan_id || 'artisan-1',
      rec_tags: hit.rec_tags
    }));

    return {
      hits,
      hit_count: hits.length,
      facetDistribution: {}
    };
  }
}

/**
 * Main conversational dispatcher for the Atelier Engine.
 */
export async function processAtelierMessage({ sessionId, message, approvedProductId = null }) {
  const session = getOrCreateSession(sessionId);
  const startTime = Date.now();

  // If approvedProductId provided and no anchor, anchor it
  if (approvedProductId && !session.anchorProduct) {
    selectAnchorProduct({ sessionId, productId: approvedProductId });
  }

  // Handle user wanting to modify when mode is awaiting_generation_approval or awaiting_submission
  const msgLower = (message || '').toLowerCase();
  const isModificationMessage = (
    msgLower.includes('modifi') || 
    msgLower.includes('chang') || 
    msgLower.includes('plutôt') || 
    msgLower.includes('plutot') || 
    msgLower.includes('ajout') || 
    msgLower.includes('retir') || 
    msgLower.includes('remplace') ||
    msgLower.includes('couleur') ||
    msgLower.includes('gravure') ||
    msgLower.includes('matière') ||
    msgLower.includes('matiere') ||
    msgLower.includes('patine')
  );

  if ((session.mode === 'awaiting_generation_approval' || session.mode === 'awaiting_submission') && isModificationMessage) {
    session.mode = session.anchorProduct ? 'clarifying_customize' : 'clarifying_scratch';
    session.clarificationSufficient = false;
    session.imageGeneratedForRequest = false;
    session.generatedImageUrl = null;
    console.log(`   🔄 User requested modification. Reopening Gate 2 mode: ${session.mode}`);
  }

  // Dynamic Mode Detection for Scratch Co-creation:
  // "le mode search est toujours fixe et demande un produit a fixé pour passer a la personalisation,
  // change ca pour detecter le mode scratch apres le search (avant le search est toujours realisé)"
  const explicitSearchTerms = [
    'cherche', 'recherche', 'trouver', 'catalogue', 'voir le catalogue',
    'voir d\'autres', 'voir d’autres', 'voir dautres', 'montre-moi', 'montre moi',
    'autre modèle', 'autre modele', 'autres modèles'
  ];
  const isExplicitNewSearch = explicitSearchTerms.some(term => msgLower.includes(term));

  if (session.anchorProduct) {
    if (session.mode === 'searching') {
      session.mode = 'clarifying_customize';
    }
  } else {
    // No anchor product
    if (session.searchPerformed && !isExplicitNewSearch) {
      // Search has ALREADY been performed in this session.
      // User is continuing to co-create without picking an existing catalogue item -> Gate 2 Scratch!
      if (session.mode === 'searching') {
        session.mode = 'clarifying_scratch';
        if (session.anchorTurnIndex == null) {
          session.anchorTurnIndex = session.history.length;
        }
        console.log(`   ✨ Switching to Gate 2 SCRATCH mode (Sur-Mesure Ex Nihilo) after initial search.`);
      }
    } else {
      // First turn OR user explicitly asked for another catalogue search:
      session.mode = 'searching';
    }
  }

  // 1. Compose Gate-Scoped System Prompt
  const { systemPrompt, injectedLayers, excludedLayers } = composeSystemPrompt({ session });

  // 2. Format Messages for Cloudflare Llama
  const messages = [
    { role: 'system', content: systemPrompt },
    ...session.history,
    { role: 'user', content: message }
  ];

  // 3. Diagnostic Logging: Gate, Context & Injected Layers
  console.log(`\n═══════════════════════════════════════════════════════════════`);
  const gateTitle = session.mode === 'searching' 
    ? 'GATE 1: RECHERCHE & DÉCOUVERTE' 
    : session.mode === 'clarifying_customize' 
      ? 'GATE 2: CLARIFICATION CO-CRÉATION' 
      : session.mode === 'clarifying_scratch'
        ? 'GATE 2: CO-CRÉATION SUR MESURE'
        : 'GATE 3: CONVERGENCE & GÉNÉRATION';

  console.log(`🌀 [ATELIER ENGINE] ${gateTitle}`);
  console.log(`   Session: ${session.sessionId} | Mode: ${session.mode} | Tour: ${Math.floor(session.history.length / 2) + 1}`);
  console.log(`   Message Client: "${message}"`);
  if (session.anchorProduct) {
    console.log(`   🎯 Création Ancre: "${session.anchorProduct.title}" (${session.anchorProduct.id || ''})`);
  }
  console.log(`   📥 Couches Injectées: [${injectedLayers.join(', ')}]`);
  console.log(`   🚫 Couches Exclues:   [${excludedLayers.join(', ')}]`);
  console.log(`   📡 Appel Cloudflare Llama 3.1 8B Instruct...`);

  // 4. Call LLM
  const { rawResponse, usage } = await callLlama(messages);
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log(`   ✨ LLM a répondu en ${elapsed}s (Prompt tokens: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Neurons: ${usage.neurons})`);

  // Parse JSON response safely with safeExtractJson helper
  let parsed = safeExtractJson(rawResponse);
  if (!parsed) {
    console.warn(`   ⚠️ Warning: Direct JSON extraction failed. Attempting fallback recovery...`);
    let extractedReply = null;
    const replyMatch = rawResponse.match(/"reply"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
    if (replyMatch && replyMatch[1]) {
      extractedReply = replyMatch[1].replace(/\\"/g, '"');
    } else if (!rawResponse.includes('{') && rawResponse.trim().length > 0) {
      extractedReply = rawResponse.trim();
    }

    parsed = {
      intent: "general",
      reply: extractedReply || "Voici ce que nous pouvons explorer ensemble.",
      suggestions: ["Modifier la couleur", "Changer la matière", "Ajuster les dimensions"],
      sufficient: false
    };
  }

  // Ensure reply is clean human text, never raw JSON
  if (parsed.reply && parsed.reply.trim().startsWith('{')) {
    const innerMatch = parsed.reply.match(/"reply"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/);
    if (innerMatch && innerMatch[1]) {
      parsed.reply = innerMatch[1].replace(/\\"/g, '"');
    }
  }

  console.log(`   📋 Parsed LLM Intent: "${parsed.intent || 'unknown'}" | Sufficient: ${Boolean(parsed.sufficient)}`);

  // 5. Deterministic Search Execution (Runs ONLY when in 'searching' mode without an anchor product)
  let previews = [];
  const isSearchGate = session.mode === 'searching' && !session.anchorProduct;

  if (isSearchGate) {
    session.clarificationSufficient = false;
    const q = parsed.search_query || message;
    console.log(`   🔍 Executing Meilisearch query: "${q}" with filters:`, JSON.stringify(parsed.search_filterable || {}));
    let searchRes = await executeMeiliSearch(parsed.search_filterable, q);
    console.log(`   📦 Search returned ${searchRes.hit_count} hits.`);

    // ZERO-HIT RETRY: Broaden search silently if 0 hits
    if (searchRes.hit_count === 0) {
      console.log(`   🔄 Zero hits detected. Executing silent broadening retry (zero_hit_retry)...`);
      searchRes = await executeMeiliSearch(null, q);
      console.log(`   📦 Broadened retry (pure keywords) returned ${searchRes.hit_count} hits.`);
    }

    previews = searchRes.hits;
    session.lastFilters = parsed.search_filterable;
    session.lastQueryText = q;
    session.searchPerformed = true; // Initial search completed!
  }

  // 6. Update Session State & Customization Specifications
  appendHistory(session, 'user', message);
  appendHistory(session, 'assistant', parsed.reply || '');

  // Detect explicit user approval / summary / closure phrasing
  const approvalKeywords = [
    'summary', 'résumé', 'resume', 'recap', 'récap', 'recapitulatif', 'récapitulatif',
    'ce que je veux', 'ce que j ai choisi', "ce que j'ai choisi", 'ce que j ai', "ce que j'ai",
    'mes choix', 'mon choix', "c'est tout", "cest tout", "c tout", "c'est fini", "cest fini",
    "fini", "termine", "terminé", "terminer", "fin", "stop", "rien d'autre", "rien dautre",
    "garder tel quel", "ça suffit", "ca suffit", "japprouve", "j'approuve", "approuve",
    "valide", "je valide", "valider", "c'est bon", "c bon", "cest bon", "non c'est ça",
    "non c ca", "non cest ca", "parfait", "d'accord", "dacord", "on peut lancer", "lancer",
    "générer", "generer", "prêt", "pret", "c'est parfait", "je confirme", "confirmer",
    "confirme", "c'est bien", "c bien", "oui c'est ça", "oui c ca"
  ];
  const msgClean = (message || '').toLowerCase().trim();
  const isExplicitApproval = approvalKeywords.some(kw => msgClean.includes(kw));

  if (isSearchGate) {
    session.mode = 'searching';
    session.clarificationSufficient = false;
    session.customizationSpec = { modifications: [], preservedProperties: [] };
  } else {
    // Gate 2: Co-creation Clarification (clarifying_customize or clarifying_scratch)
    const existingMods = session.customizationSpec?.modifications || [];
    const existingProduct = session.customizationSpec?.product || null;
    const normalizedSpec = normalizeCustomizationSpec(
      parsed.customization_spec || {},
      isExplicitApproval ? '' : message,
      session.anchorProduct,
      existingMods,
      existingProduct
    );
    session.customizationSpec = normalizedSpec;
    session.imageGeneratedForRequest = false;
    session.generatedImageUrl = null;

    // Turn counting in Gate 2 for auto-convergence (Rule 5: 2 to 3 turns max)
    const gate2UserTurns = session.history.slice(session.anchorTurnIndex || 0).filter(h => h.role === 'user').length;
    const hasModifications = (normalizedSpec.modifications && normalizedSpec.modifications.length > 0) || (existingMods && existingMods.length > 0);
    const hasSummaryGenerated = Boolean(parsed.summary && parsed.summary.trim().length > 5 && (parsed.summary.includes('Base:') || parsed.summary.includes('•')));

    const llmSuggestsSimulation = (parsed.suggestions || []).some(s => {
      const low = (s || '').toLowerCase();
      return low.includes('générer') || low.includes('generer') || low.includes('simulation') || low.includes('prêt') || low.includes('pret');
    });

    const isReviewIntent = parsed.intent === 'customize_review' || parsed.intent === 'scratch_review' || isExplicitApproval || hasSummaryGenerated || llmSuggestsSimulation;
    const isConvergenceTurn = hasModifications && (gate2UserTurns >= 1 || llmSuggestsSimulation || Boolean(session.anchorProduct));
    const isClarificationDone = Boolean(parsed.sufficient) || isReviewIntent || isConvergenceTurn || (hasModifications && gate2UserTurns >= 1);

    if (isClarificationDone || (session.mode === 'awaiting_generation_approval' || session.clarificationSufficient)) {
      session.clarificationSufficient = true;
      session.mode = 'awaiting_generation_approval';
      parsed.sufficient = true;

      const modsList = (session.customizationSpec?.modifications || [])
        .map(m => `• ${(m.feature || 'Détail').charAt(0).toUpperCase() + (m.feature || '').slice(1)}: ${m.value}${m.location && m.location !== 'surface' && m.location !== 'all' ? ` (${m.location})` : ''}`)
        .join('\n');
      
      const preservedList = (session.customizationSpec?.preservedProperties && session.customizationSpec.preservedProperties.length > 0)
        ? session.customizationSpec.preservedProperties.join(', ')
        : (session.anchorProduct ? "forme originale, savoir-faire artisanal" : "savoir-faire artisanal marocain, finitions faites main");

      parsed.summary = `• Base: ${session.anchorProduct?.title || 'Création sur mesure (Ex Nihilo)'}\n${modsList || `• Spécifications: ${message}`}\n• Préservation: ${preservedList}`;
      
      parsed.suggestions = ["Modifier", "Générer la simulation"];

      if (!parsed.reply || parsed.reply.trim().length === 0) {
        parsed.reply = session.anchorProduct
          ? "Parfait ! Voici le récapitulatif détaillé de votre personnalisation. Vous pouvez modifier les éléments ou lancer la simulation visuelle."
          : "Parfait ! Voici le récapitulatif détaillé de votre création sur mesure. Vous pouvez modifier les spécifications ou lancer la simulation visuelle dès que vous le souhaitez.";
      }

      console.log(`   ⭐ Gate 2 Déverrouillée: ${session.customizationSpec?.modifications?.length || 0} modification(s) enregistrée(s) avec succès.`);
      (session.customizationSpec?.modifications || []).forEach((m, i) => {
        console.log(`      [Mod ${i + 1}] ${m.operation} ${m.feature}: "${m.value}" (${m.location})`);
      });
    } else {
      session.clarificationSufficient = false;
      session.mode = session.anchorProduct ? 'clarifying_customize' : 'clarifying_scratch';
      parsed.summary = null;
    }
  }

  console.log(`═══════════════════════════════════════════════════════════════\n`);

  // Gate-aware fallback suggestions when LLM doesn't provide them
  const gateSuggestions = (() => {
    const m = session.mode;
    if (m === 'awaiting_generation_approval' || (session.clarificationSufficient && session.mode !== 'searching')) {
      return ["Modifier", "Générer la simulation"];
    }
    if (m === 'awaiting_submission') {
      return ["Modifier la création", "Présenter à un artisan"];
    }
    if (m === 'searching') {
      if (parsed.suggestions && parsed.suggestions.length > 0 && !parsed.suggestions.includes("Générer la simulation") && !parsed.suggestions.includes("Modifier")) {
        return parsed.suggestions;
      }
      return ["Créer sur mesure", "Voir d'autres styles", "Personnaliser"];
    }
    if (m === 'clarifying_customize') {
      if (parsed.suggestions && parsed.suggestions.length > 0 && !parsed.suggestions.includes("Générer la simulation")) {
        return parsed.suggestions;
      }
      return ["Modifier la couleur", "Ajouter une gravure", "Changer la matière", "Appliquer une patine"];
    }
    if (m === 'clarifying_scratch') {
      if (parsed.suggestions && parsed.suggestions.length > 0 && !parsed.suggestions.includes("Générer la simulation")) {
        return parsed.suggestions;
      }
      return ["Style traditionnel", "Style contemporain", "En cuivre", "En zellige", "En bois de cèdre"];
    }
    return ["Voir les inspirations", "Personnaliser"];
  })();

  const fallbackSummary = (session.mode !== 'searching' && (session.customizationSpec?.modifications?.length > 0 || session.anchorProduct))
    ? `• Base: ${session.anchorProduct?.title || 'Création sur mesure (Ex Nihilo)'}\n` +
      (session.customizationSpec?.modifications || []).map(m => `• ${(m.feature || 'Détail').charAt(0).toUpperCase() + (m.feature || '').slice(1)}: ${m.value}`).join('\n')
    : null;

  return {
    sessionId: session.sessionId,
    reply: parsed.reply || (
      session.mode === 'awaiting_generation_approval'
        ? "Parfait ! Voici le récapitulatif de votre création artisanale personnalisée. Vous pouvez la modifier ou lancer la simulation visuelle."
        : (session.anchorProduct ? `Quelles modifications aimeriez-vous apporter à "${session.anchorProduct.title}" ?` : "Voici les créations artisanales correspondant à votre recherche :")
    ),
    suggestions: gateSuggestions,
    previews: previews.length > 0 ? previews : undefined,
    sufficient: Boolean(session.clarificationSufficient && session.mode !== 'searching'),
    summary: (session.mode === 'searching') ? null : (parsed.summary || fallbackSummary),
    mode: session.mode,
    activeProduct: session.anchorProduct,
    customizationSpec: (session.mode === 'searching') ? { modifications: [], preservedProperties: [] } : (session.customizationSpec || { modifications: [], preservedProperties: [] })
  };
}

/**
 * Anchors a product into the session context.
 */
export function selectAnchorProduct({ sessionId, productId }) {
  const session = getOrCreateSession(sessionId);
  const allProducts = recommendationService.getProducts() || [];
  let product = allProducts.find(p => p.id === productId) || null;
  if (!product && (productId === 'prod_siniya_cuivre_01' || !productId)) {
    product = {
      id: "prod_siniya_cuivre_01",
      title: "Siniya en cuivre rouge martelé",
      category: "Art de la table",
      description: "Plateau traditionnel marocain en cuivre rouge martelé à la main par les maalems de Fès.",
      artisanId: "artisan-1",
      imageUrl: "https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80",
      rec_tags: { material: ["cuivre"], style: ["traditionnel", "martelé"] }
    };
  }

  if (product && !product.imageUrl && !product.image && !product.image_url) {
    const categoryGroup = product.category_group || product.identity?.category_group;
    const categoryImages = {
      bijouterie: 'https://images.unsplash.com/photo-1599643478524-fb66f70d00f0?w=500&q=80',
      ceramique: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&q=80',
      dinanderie: 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80',
      broderie: 'https://images.unsplash.com/photo-1605276374104-a628b0fae742?w=500&q=80',
      tissage: 'https://images.unsplash.com/photo-1574635882662-7e0e7a2b9d0b?w=500&q=80',
      maroquinerie: 'https://images.unsplash.com/photo-1590874103328-eac38a683ce7?w=500&q=80',
      menuiserie: 'https://images.unsplash.com/photo-1582260655353-83802ceafc0c?w=500&q=80',
      poterie: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&q=80',
      verrerie: 'https://images.unsplash.com/photo-1549490349-8643362247b5?w=500&q=80',
      vetement: 'https://images.unsplash.com/photo-1574635882662-7e0e7a2b9d0b?w=500&q=80',
      zellige: 'https://images.unsplash.com/photo-1610701596007-11502861dcfa?w=500&q=80'
    };
    product = {
      ...product,
      imageUrl: (categoryGroup && categoryImages[categoryGroup]) || 'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?auto=format&fit=crop&w=800&q=80'
    };
  }

  session.approvedProductId = product?.id || productId;
  session.anchorProduct = product;
  session.anchorTurnIndex = session.history.length;
  session.mode = 'clarifying_customize';
  session.clarificationSufficient = false;
  session.userApprovedGeneration = false;
  session.imageGeneratedForRequest = false;
  session.generatedImageUrl = null;
  session.customizationSpec = {
    modifications: [],
    preservedProperties: ["forme d'origine", "martelage cuivre", "structure artisanale"]
  };

  console.log(`🎯 [ATELIER ENGINE] Product anchored: "${product?.title || productId}" in session ${session.sessionId}`);

  return {
    success: true,
    sessionId: session.sessionId,
    anchorProduct: product,
    mode: session.mode,
    initialSuggestions: [
      "Modifier la couleur",
      "Ajouter une gravure florale",
      "Appliquer une patine dorée",
      "Garder tel quel"
    ]
  };
}

/**
 * Generates an adaptive simulation image after dual-gate approval and integrity check.
 */
export async function generateSimulation({ sessionId, force = false }) {
  const session = getOrCreateSession(sessionId);

  console.log(`\n🎨 [ATELIER ENGINE] Image Generation Requested for Session: ${sessionId}`);

  // Dual-gate validation
  if (!session.clarificationSufficient && !force) {
    throw new Error('Simulation blocked: Clarification is not yet sufficient.');
  }

  // Guard against duplicate image generation if not updated
  if (session.imageGeneratedForRequest && session.generatedImageUrl) {
    console.log(`   ℹ️ Returning cached simulation image for session.`);
    return {
      imageUrl: session.generatedImageUrl,
      cached: true,
      ...(session.lastGenerationMetadata || {
        generationMode: 'text_to_image',
        sourceImageUsed: false,
        referenceImageUrl: null,
        referenceType: null
      })
    };
  }

  session.userApprovedGeneration = true;

  const spec = session.customizationSpec || {};
  const anchor = session.anchorProduct;
  const mods = spec.modifications || [];

  // 1. Calculate Comprehensive Complexity Score over all modifications
  const complexityScore = calculateComplexityScore(spec);
  const strategy = selectPromptStrategy(complexityScore);
  console.log(`   📊 Calculated Multi-Mod Complexity Score: ${complexityScore} -> Strategy Selected: [${strategy}]`);

  // 2. Build Multi-Modification Adaptive Prompt with Concrete Morphology
  const isScratch = !anchor;
  const allContext = [
    anchor?.title || '',
    anchor?.description || '',
    session.lastQueryText || '',
    ...session.history.map(h => h.content || ''),
    ...mods.map(m => `${m.feature || ''} ${m.value || ''} ${m.visualDecomposition || ''}`)
  ].join(' ').toLowerCase();

  const morphology = resolveProductMorphology(anchor, allContext, spec);
  const baseContext = anchor 
    ? `${anchor.title}, Moroccan craft, ${anchor.category || 'artisan'}.`
    : `Authentic handcrafted Moroccan bespoke artisanal creation (${mods.map(m => m.value).slice(0, 2).join(', ') || 'custom craft'}), luxury editorial setting.`;

  const prompt = buildAdaptivePrompt({
    baseContext,
    morphology,
    modifications: mods,
    preservedProperties: spec.preservedProperties,
    level: strategy,
    isScratch
  });

  // 3. Specification Integrity Verification
  const integrity = verifySpecificationIntegrity({ modifications: mods, prompt });
  if (!integrity.passed) {
    console.warn(`   ⚠️ Specification Integrity Warning: ${integrity.reason}`);
  } else {
    console.log(`   ✅ Specification Integrity Validated: ${integrity.modificationCount} modification(s) fully mapped to prompt.`);
  }

  console.log(`   📝 Constructed Adaptive Prompt: "${prompt}"`);

  // 4. Obtain base image if customize mode
  let baseImageBase64 = null;
  let referenceImageUrl = null;
  let referenceType = null;
  const rawImgUrl = anchor?.image || anchor?.imageUrl || anchor?.image_url;
  if (anchor && rawImgUrl) {
    try {
      const imgUrl = rawImgUrl;
      console.log(`   🖼️ Fetching base anchor image from: ${imgUrl}`);
      const imgRes = await fetch(imgUrl);
      if (imgRes.ok) {
        const arrayBuf = await imgRes.arrayBuffer();
        baseImageBase64 = Buffer.from(arrayBuf).toString('base64');
        referenceImageUrl = imgUrl;
        referenceType = 'anchor_product';
      } else {
        console.warn(`   ⚠️ Base anchor image fetch failed (status ${imgRes.status}), falling back to text-to-image.`);
      }
    } catch (e) {
      console.warn(`   ⚠️ Could not fetch anchor image buffer, falling back to text-to-image:`, e.message);
      baseImageBase64 = null;
      referenceImageUrl = null;
      referenceType = null;
    }
  }

  const sourceImageUsed = Boolean(baseImageBase64);
  const generationMode = sourceImageUsed ? 'image_to_image' : 'text_to_image';

  // 5. Generate with FLUX.2 Klein 4B
  console.log(`   ⚡ Calling Cloudflare FLUX.2 Klein 4B (${generationMode})...`);
  const genStart = Date.now();
  const generatedBase64 = await callFluxKlein(prompt, baseImageBase64);
  const genElapsed = ((Date.now() - genStart) / 1000).toFixed(2);
  console.log(`   ✨ Image generated successfully in ${genElapsed}s!`);

  const fullDataUrl = `data:image/png;base64,${generatedBase64}`;
  session.imageGeneratedForRequest = true;
  session.generatedImageUrl = fullDataUrl;
  session.mode = 'awaiting_submission';
  session.lastGenerationMetadata = {
    generationMode,
    sourceImageUsed,
    referenceImageUrl: sourceImageUsed ? referenceImageUrl : null,
    referenceType: sourceImageUsed ? referenceType : null
  };

  return {
    imageUrl: fullDataUrl,
    promptUsed: prompt,
    strategyUsed: strategy,
    complexityScore,
    cached: false,
    generationMode,
    sourceImageUsed,
    referenceImageUrl: sourceImageUsed ? referenceImageUrl : null,
    referenceType: sourceImageUsed ? referenceType : null
  };
}

/**
 * Submits custom request to marketplace database.
 */
export async function submitCustomRequest({
  sessionId,
  userId = 'client-me',
  requestType = 'customize',
  targetArtisanId = null,
  budgetDh = null
}) {
  const session = getOrCreateSession(sessionId);

  console.log(`\n📮 [ATELIER ENGINE] Submitting Custom Request for User: ${userId}`);

  const now = new Date().toISOString();
  const requestId = `req_${crypto.randomBytes(4).toString('hex')}`;
  const spec = session.customizationSpec || {};
  const anchor = session.anchorProduct;

  const clientRef = userId || 'client-me';
  const artisanRef = targetArtisanId || anchor?.artisanId || anchor?.identity?.artisan_id || 'artisan-1';
  const totalPrice = budgetDh 
    ? parseFloat(budgetDh) 
    : (anchor?.price ? parseFloat(String(anchor.price).replace(/[^0-9.]/g, '')) || 0 : 0);
  const productType = requestType === 'scratch' ? 'sur_commande' : 'personnalise';

  const customizationTags = JSON.stringify({
    modifications: spec.modifications || [],
    preservedProperties: spec.preservedProperties || [],
    summary: session.history[session.history.length - 1]?.content || 'Demande de création personnalisée',
    anchorProduct: anchor ? {
      id: anchor.id,
      title: anchor.title,
      price: anchor.price,
      imageUrl: anchor.image || anchor.imageUrl
    } : null
  });

  const requestRecord = {
    id: requestId,
    clientRef,
    artisanRef,
    totalPrice,
    productType,
    transportProvider: 'vendeur',
    status: 'en_attente_artisan',
    createdAt: now,
    updatedAt: now,
    proofImage: session.generatedImageUrl || null,
    customizationTags
  };

  if (db) {
    try {
      await db.insert(customRequests).values(requestRecord);
      console.log(`   ✅ Custom request registered in SQLite with ID: ${requestId}`);
    } catch (err) {
      console.error(`   ❌ SQLite insert error for custom request:`, err.message);
      throw new Error(`Erreur d'enregistrement de la demande sur-mesure: ${err.message}`);
    }
  } else {
    console.log(`   ℹ️ [Mock DB Mode] Custom request registered in memory with ID: ${requestId}`);
  }

  session.mode = 'complete';

  return {
    success: true,
    requestId,
    status: 'en_attente_artisan',
    message: "Votre demande de création a été transmise à l'artisan avec succès."
  };
}

/**
 * Processes a customization message using Direct LLM Image Prompt Generation (Approach B).
 * The LLM directly constructs the FLUX prompt without invoking promptBuilder.js or complexityScorer.js.
 */
export async function processAtelierMessageDirectPrompt({ sessionId, message }) {
  const session = getOrCreateSession(sessionId);

  console.log(`\n═══════════════════════════════════════════════════════════════`);
  console.log(`🌀 [ATELIER DIRECT-LLM] MESSAGE PROCESSING`);
  console.log(`   Session: ${session.sessionId} | Product: "${session.anchorProduct?.title || 'None'}"`);
  console.log(`   Message Client: "${message}"`);

  const { systemPrompt, injectedLayers, excludedLayers } = composeDirectPromptGenSystemPrompt({
    session,
    anchorProduct: session.anchorProduct
  });

  console.log(`   📥 Couches Injectées: [${injectedLayers.join(', ')}]`);
  console.log(`   🚫 Couches Exclues:   [${excludedLayers.join(', ')}]`);

  const conversation = [
    { role: 'system', content: systemPrompt },
    ...session.history,
    { role: 'user', content: message }
  ];

  console.log(`   📡 Appel Cloudflare Llama 3.1 8B Instruct (Direct Prompt Generation Mode)...`);
  const startTime = Date.now();
  const { rawResponse: rawText, usage } = await callLlama(conversation);
  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`   ✨ LLM a répondu en ${elapsedSec}s (Prompt tokens: ${usage.prompt_tokens || '?'}, Completion: ${usage.completion_tokens || '?'}, Neurons: ${usage.total_neurons || usage.neurons || '?'})`);

  let parsed = safeExtractJson(rawText);
  if (!parsed) {
    console.warn(`   ⚠️ JSON parse fallback in Direct Prompt mode for raw response:`, rawText);
    parsed = {
      intent: 'customize_review',
      reply: "J'ai bien noté toutes vos spécifications pour votre pièce.",
      sufficient: true,
      summary: message,
      direct_image_prompt: {
        complexity_score: 8.0,
        strategy_selected: "V3",
        simulation_prompt: `Modify only the specified properties of ${session.anchorProduct?.title || 'craft'}: 1. Apply handcrafted artisan detailing (${message}). Preserve: original shape, traditional craft. Do not modify any other property.`
      }
    };
  }

  // Update history
  appendHistory(session, 'user', message);
  appendHistory(session, 'assistant', parsed.reply || '');

  session.clarificationSufficient = Boolean(parsed.sufficient);
  session.directImagePrompt = parsed.direct_image_prompt || null;
  session.customizationSpec = parsed.customization_spec || {
    modifications: [],
    preservedProperties: []
  };

  console.log(`═══════════════════════════════════════════════════════════════\n`);

  return {
    sessionId: session.sessionId,
    reply: parsed.reply || "Vos modifications sont enregistrées.",
    suggestions: parsed.suggestions || [],
    sufficient: Boolean(session.clarificationSufficient),
    summary: parsed.summary || null,
    customizationSpec: session.customizationSpec,
    directImagePrompt: session.directImagePrompt,
    metrics: {
      latencySec: parseFloat(elapsedSec),
      promptTokens: usage.prompt_tokens || 0,
      completionTokens: usage.completion_tokens || 0,
      totalNeurons: usage.total_neurons || usage.neurons || 0
    }
  };
}

/**
 * Generates simulation image using the LLM's directly generated prompt (Approach B).
 * No backend promptBuilder or complexityScorer is used.
 */
export async function generateSimulationDirectLLM({ sessionId }) {
  const session = getOrCreateSession(sessionId);

  console.log(`\n🎨 [ATELIER DIRECT-LLM] Generating Simulation directly from LLM Prompt`);
  
  if (!session.directImagePrompt || !session.directImagePrompt.simulation_prompt) {
    throw new Error("No direct LLM simulation prompt found in session.");
  }

  const prompt = session.directImagePrompt.simulation_prompt;
  const strategy = session.directImagePrompt.strategy_selected || 'V3';
  const score = session.directImagePrompt.complexity_score || 8.0;

  console.log(`   📝 Direct LLM Prompt [${strategy}] (Score: ${score}): "${prompt}"`);

  // Base anchor image buffer if available
  let baseImageBase64 = null;
  let referenceImageUrl = null;
  let referenceType = null;
  const anchor = session.anchorProduct;
  if (anchor && (anchor.image || anchor.imageUrl)) {
    try {
      const imgUrl = anchor.image || anchor.imageUrl;
      const imgRes = await fetch(imgUrl);
      if (imgRes.ok) {
        const arrayBuf = await imgRes.arrayBuffer();
        baseImageBase64 = Buffer.from(arrayBuf).toString('base64');
        referenceImageUrl = imgUrl;
        referenceType = 'anchor_product';
      }
    } catch (e) {
      console.warn(`   ⚠️ Could not fetch anchor image buffer:`, e.message);
      baseImageBase64 = null;
      referenceImageUrl = null;
      referenceType = null;
    }
  }

  const sourceImageUsed = Boolean(baseImageBase64);
  const generationMode = sourceImageUsed ? 'image_to_image' : 'text_to_image';

  // Generate with FLUX
  console.log(`   ⚡ Calling Cloudflare FLUX.2 Klein 4B with Direct LLM Prompt (${generationMode})...`);
  const genStart = Date.now();
  const generatedBase64 = await callFluxKlein(prompt, baseImageBase64);
  const genElapsed = ((Date.now() - genStart) / 1000).toFixed(2);
  console.log(`   ✨ Image generated successfully in ${genElapsed}s!`);

  const fullDataUrl = `data:image/png;base64,${generatedBase64}`;
  session.generatedImageUrl = fullDataUrl;

  return {
    imageUrl: fullDataUrl,
    promptUsed: prompt,
    strategyUsed: strategy,
    complexityScore: score,
    genElapsedSec: parseFloat(genElapsed),
    llmGenerated: true,
    generationMode,
    sourceImageUsed,
    referenceImageUrl: sourceImageUsed ? referenceImageUrl : null,
    referenceType: sourceImageUsed ? referenceType : null
  };
}

