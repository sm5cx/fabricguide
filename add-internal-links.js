#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const ENGLISH_STAINS_DIR = './stains';
const GERMAN_STAINS_DIR = './de/flecken';
const MIN_LINKS_PER_PAGE = 5;

// Common stain types (extracted from filenames)
const STAIN_TYPES = [
  'wine', 'red-wine', 'white-wine', 'blood', 'coffee', 'tea', 'oil', 'grease',
  'grass', 'mud', 'chocolate', 'berry', 'fruit', 'tomato', 'curry', 'ink',
  'paint', 'sweat', 'makeup', 'lipstick', 'foundation', 'mascara', 'nail-polish',
  'deodorant', 'sunscreen', 'butter', 'cooking-oil', 'motor-oil', 'wax',
  'candle-wax', 'crayon', 'marker', 'pen', 'soy-sauce', 'ketchup', 'mustard',
  'bbq-sauce', 'salad-dressing', 'vinegar', 'beer', 'juice', 'soda', 'milk',
  'ice-cream', 'rust', 'mold', 'mildew', 'urine', 'vomit', 'feces', 'pet-stain',
  'mystery-stain', 'unknown-stain', 'old-stain', 'set-in-stain', 'hummus'
];

// Common fabric types
const FABRIC_TYPES = [
  'cotton', 'polyester', 'silk', 'wool', 'linen', 'denim', 'leather', 'suede',
  'velvet', 'satin', 'rayon', 'nylon', 'spandex', 'acrylic', 'cashmere',
  'carpet', 'upholstery', 'curtains', 'mattress', 'sofa', 'cushion', 'pillow',
  'tablecloth', 'bedding', 'towel', 'clothing', 'fabric', 'textile', 'garment',
  'dress', 'shirt', 'blouse', 'pants', 'jeans', 'jacket', 'coat', 'sweater',
  'activewear', 'swimsuit', 'runner', 'rug'
];

// Urgency keywords (for linking to emergency guide)
const URGENT_STAINS = ['wine', 'blood', 'oil', 'grease', 'paint', 'ink', 'curry'];

// Parse filename to extract stain and fabric type
function parseFilename(filename) {
  const basename = path.basename(filename, '.html');
  const parts = basename.split('-on-');
  
  let stainType = null;
  let fabricType = null;
  
  if (parts.length === 2) {
    stainType = parts[0];
    fabricType = parts[1];
  } else {
    // Try to find stain type in the filename
    for (const stain of STAIN_TYPES) {
      if (basename.includes(stain)) {
        stainType = stain;
        break;
      }
    }
    // Try to find fabric type
    for (const fabric of FABRIC_TYPES) {
      if (basename.includes(fabric)) {
        fabricType = fabric;
        break;
      }
    }
  }
  
  return { stainType, fabricType, basename };
}

// Get all stain page files
function getStainFiles(dir) {
  const files = [];
  
  function traverse(currentDir) {
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('by-')) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html') && !entry.name.startsWith('by-')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Find related pages
function findRelatedPages(currentFile, currentParsed, allFiles, isGerman = false) {
  const related = {
    sameStain: [],
    sameFabric: [],
    hubPages: [],
    products: [],
    emergency: null,
    methodology: null
  };
  
  const basePath = isGerman ? '/de' : '';
  
  // Find pages with same stain type but different fabric
  if (currentParsed.stainType) {
    for (const file of allFiles) {
      if (file === currentFile) continue;
      
      const parsed = parseFilename(file);
      if (parsed.stainType === currentParsed.stainType && 
          parsed.fabricType !== currentParsed.fabricType &&
          related.sameStain.length < 4) {
        const relPath = file.replace(/\\/g, '/');
        related.sameStain.push({
          path: relPath,
          parsed
        });
      }
    }
  }
  
  // Find pages with same fabric but different stain
  if (currentParsed.fabricType) {
    for (const file of allFiles) {
      if (file === currentFile) continue;
      
      const parsed = parseFilename(file);
      if (parsed.fabricType === currentParsed.fabricType && 
          parsed.stainType !== currentParsed.stainType &&
          related.sameFabric.length < 3) {
        const relPath = file.replace(/\\/g, '/');
        related.sameFabric.push({
          path: relPath,
          parsed
        });
      }
    }
  }
  
  // Add hub pages
  if (currentParsed.stainType && ['wine', 'red-wine', 'white-wine'].includes(currentParsed.stainType)) {
    related.hubPages.push(`${basePath}/stains/by-type/wine.html`);
  }
  if (currentParsed.fabricType === 'cotton') {
    related.hubPages.push(`${basePath}/stains/by-fabric/cotton.html`);
  }
  
  // Add product recommendations
  if (!isGerman) {
    related.products = [
      '/products/sil-1-fur-alles-review.html',
      '/products/where-to-buy-stain-removers.html',
      '/products/stain-remover-comparison.html'
    ];
  } else {
    related.products = [
      '/de/produkte/sil-1-fuer-alles-test.html',
      '/de/produkte/bezugsquellen.html',
      '/de/produkte/sil-vs-vanish.html'
    ];
  }
  
  // Add methodology page
  related.methodology = isGerman ? '/de/methodik.html' : '/methodology.html';
  
  // Add emergency guide for urgent stains
  if (currentParsed.stainType && URGENT_STAINS.some(s => currentParsed.stainType.includes(s))) {
    related.emergency = isGerman ? '/de/notfall/' : '/emergency/';
  }
  
  return related;
}

// Generate contextual anchor text
function generateAnchorText(parsed, context = 'same-stain') {
  const { stainType, fabricType } = parsed;
  
  if (context === 'same-stain' && fabricType) {
    return `removing ${stainType || 'stains'} from ${fabricType}`;
  } else if (context === 'same-fabric' && stainType) {
    return `treating ${stainType} on ${fabricType || 'fabric'}`;
  } else if (context === 'hub-wine') {
    return 'all wine stain removal guides';
  } else if (context === 'hub-cotton') {
    return 'complete cotton stain guide';
  } else if (context === 'product-review') {
    return 'Sil stain remover review';
  } else if (context === 'product-buy') {
    return 'where to buy stain removers';
  } else if (context === 'methodology') {
    return 'our stain removal methodology';
  } else if (context === 'emergency') {
    return 'emergency stain treatment guide';
  }
  
  return `${stainType || 'stain'} removal guide`;
}

// Insert links into HTML
function insertLinks(html, related, isGerman = false) {
  let modified = html;
  
  // Find the related-stains section
  const relatedStainsRegex = /<div class="related-stains">\s*<h3>Related Stain Situations<\/h3>\s*\n\s*<\/div>/;
  const relatedStainsMatch = html.match(relatedStainsRegex);
  
  if (relatedStainsMatch && related.sameStain.length > 0) {
    const links = related.sameStain.slice(0, 4).map(item => {
      const anchorText = generateAnchorText(item.parsed, 'same-stain');
      return `<li><a href="/${item.path}">${anchorText}</a></li>`;
    }).join('\n      ');
    
    const replacement = `<div class="related-stains">
    <h3>${isGerman ? 'Ähnliche Fleckensituationen' : 'Related Stain Situations'}</h3>
    <ul>
      ${links}
    </ul>
  </div>`;
    
    modified = modified.replace(relatedStainsRegex, replacement);
  }
  
  // Find the fabric-alternatives section
  const fabricAltRegex = /<div class="fabric-alternatives">\s*<h3>Same Stain, Different Fabric<\/h3>\s*\n\s*<\/div>/;
  const fabricAltMatch = html.match(fabricAltRegex);
  
  if (fabricAltMatch && related.sameFabric.length > 0) {
    const links = related.sameFabric.slice(0, 3).map(item => {
      const anchorText = generateAnchorText(item.parsed, 'same-fabric');
      return `<li><a href="/${item.path}">${anchorText}</a></li>`;
    }).join('\n      ');
    
    const replacement = `<div class="fabric-alternatives">
    <h3>${isGerman ? 'Gleicher Fleck, anderes Gewebe' : 'Same Stain, Different Fabric'}</h3>
    <ul>
      ${links}
    </ul>
  </div>`;
    
    modified = modified.replace(fabricAltRegex, replacement);
  }
  
  // Add methodology link if not already present in related products
  if (related.methodology && !html.includes(related.methodology)) {
    const methodologyLink = `<li><a href="${related.methodology}">${generateAnchorText({}, 'methodology')}</a></li>`;
    
    // Try to add to related products section
    const relatedProductsRegex = /(<div class="related-products">[\s\S]*?<ul>)([\s\S]*?)(<\/ul>[\s\S]*?<\/div>)/;
    const relatedProductsMatch = html.match(relatedProductsRegex);
    
    if (relatedProductsMatch) {
      const existingLinks = relatedProductsMatch[2];
      modified = modified.replace(relatedProductsRegex, `$1${existingLinks}\n${methodologyLink}$3`);
    }
  }
  
  // Add emergency link if applicable
  if (related.emergency) {
    const emergencyMeta = `\n<p class="meta urgency-note"><strong>⚠️ Time-sensitive stain:</strong> See our <a href="${related.emergency}">${generateAnchorText({}, 'emergency')}</a> for immediate first steps.</p>\n`;
    
    // Insert after the answer card if not already present
    if (!html.includes('emergency') && html.includes('<div class="card answer"')) {
      modified = modified.replace('</div>\n\n<!-- Quick reference', `</div>${emergencyMeta}\n<!-- Quick reference`);
    }
  }
  
  return modified;
}

// Process a single file
function processFile(filePath, allFiles, isGerman = false) {
  console.log(`Processing: ${filePath}`);
  
  const html = fs.readFileSync(filePath, 'utf8');
  const parsed = parseFilename(filePath);
  
  // Skip files without identifiable stain/fabric types
  if (!parsed.stainType && !parsed.fabricType) {
    console.log(`  ⚠️  Skipped - could not identify stain or fabric type`);
    return { processed: false, reason: 'no-taxonomy' };
  }
  
  // Find related pages
  const related = findRelatedPages(filePath, parsed, allFiles, isGerman);
  
  // Count total links we'll add
  const totalLinks = related.sameStain.length + related.sameFabric.length + 
                     related.hubPages.length + related.products.length + 
                     (related.methodology ? 1 : 0) + (related.emergency ? 1 : 0);
  
  if (totalLinks < MIN_LINKS_PER_PAGE) {
    console.log(`  ⚠️  Only found ${totalLinks} links (target: ${MIN_LINKS_PER_PAGE}+)`);
  }
  
  // Insert links
  const modified = insertLinks(html, related, isGerman);
  
  // Check if anything changed
  if (modified === html) {
    console.log(`  ℹ️  No changes made`);
    return { processed: false, reason: 'no-changes' };
  }
  
  // Write back
  fs.writeFileSync(filePath, modified, 'utf8');
  console.log(`  ✅ Added ${totalLinks} links`);
  
  return { processed: true, linksAdded: totalLinks };
}

// Main execution
function main() {
  console.log('🔗 FabricCare Internal Linking Audit\n');
  console.log('═══════════════════════════════════\n');
  
  // Process English pages
  console.log('📄 Processing English stain pages...\n');
  const englishFiles = getStainFiles(ENGLISH_STAINS_DIR);
  console.log(`Found ${englishFiles.length} English stain pages\n`);
  
  let englishStats = {
    processed: 0,
    skipped: 0,
    totalLinks: 0
  };
  
  for (const file of englishFiles) {
    const result = processFile(file, englishFiles, false);
    if (result.processed) {
      englishStats.processed++;
      englishStats.totalLinks += result.linksAdded;
    } else {
      englishStats.skipped++;
    }
  }
  
  console.log(`\n✅ English pages complete: ${englishStats.processed} processed, ${englishStats.skipped} skipped`);
  console.log(`   Total links added: ${englishStats.totalLinks}\n`);
  
  // Process German pages
  console.log('\n📄 Processing German stain pages...\n');
  const germanFiles = getStainFiles(GERMAN_STAINS_DIR);
  console.log(`Found ${germanFiles.length} German stain pages\n`);
  
  let germanStats = {
    processed: 0,
    skipped: 0,
    totalLinks: 0
  };
  
  for (const file of germanFiles) {
    const result = processFile(file, germanFiles, true);
    if (result.processed) {
      germanStats.processed++;
      germanStats.totalLinks += result.linksAdded;
    } else {
      germanStats.skipped++;
    }
  }
  
  console.log(`\n✅ German pages complete: ${germanStats.processed} processed, ${germanStats.skipped} skipped`);
  console.log(`   Total links added: ${germanStats.totalLinks}\n`);
  
  // Overall summary
  console.log('\n═══════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('═══════════════════════════════════\n');
  console.log(`Total pages processed: ${englishStats.processed + germanStats.processed}`);
  console.log(`Total pages skipped: ${englishStats.skipped + germanStats.skipped}`);
  console.log(`Total internal links added: ${englishStats.totalLinks + germanStats.totalLinks}`);
  console.log(`\n✅ Internal linking audit complete!\n`);
}

// Run the script
if (require.main === module) {
  main();
}
