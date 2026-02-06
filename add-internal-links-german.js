#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
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
  'mystery-stain', 'unknown-stain', 'old-stain', 'set-in-stain', 'hummus',
  'turmeric', 'sunlight', 'appearance', 'visibility'
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

// Urgency keywords
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
    if (!fs.existsSync(currentDir)) {
      return;
    }
    
    const entries = fs.readdirSync(currentDir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry.name);
      
      if (entry.isDirectory() && !entry.name.startsWith('by-')) {
        traverse(fullPath);
      } else if (entry.isFile() && entry.name.endsWith('.html')) {
        files.push(fullPath);
      }
    }
  }
  
  traverse(dir);
  return files;
}

// Find related pages
function findRelatedPages(currentFile, currentParsed, allFiles) {
  const related = {
    sameStain: [],
    sameFabric: [],
    products: [],
    emergency: null,
    methodology: null
  };
  
  // Find pages with same stain type but different fabric
  if (currentParsed.stainType) {
    for (const file of allFiles) {
      if (file === currentFile) continue;
      
      const parsed = parseFilename(file);
      if (parsed.stainType === currentParsed.stainType && 
          parsed.fabricType !== currentParsed.fabricType &&
          related.sameStain.length < 4) {
        related.sameStain.push({
          path: file.replace(/\\/g, '/'),
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
        related.sameFabric.push({
          path: file.replace(/\\/g, '/'),
          parsed
        });
      }
    }
  }
  
  // Add product recommendations (German)
  related.products = [
    '/de/produkte/sil-1-fuer-alles-test.html',
    '/de/produkte/bezugsquellen.html',
    '/de/produkte/sil-vs-vanish.html'
  ];
  
  // Add methodology page
  related.methodology = '/de/methodik.html';
  
  // Add emergency guide for urgent stains
  if (currentParsed.stainType && URGENT_STAINS.some(s => currentParsed.stainType.includes(s))) {
    related.emergency = '/de/notfall/';
  }
  
  return related;
}

// Generate contextual anchor text (German)
function generateAnchorText(parsed, context = 'same-stain') {
  const { stainType, fabricType } = parsed;
  
  if (context === 'same-stain' && fabricType) {
    return `${stainType || 'Flecken'} auf ${fabricType} entfernen`;
  } else if (context === 'same-fabric' && stainType) {
    return `${stainType}-Fleck auf ${fabricType || 'Stoff'} behandeln`;
  } else if (context === 'product-review') {
    return 'Sil Fleckenentferner Test';
  } else if (context === 'product-buy') {
    return 'Wo man Fleckenentferner kauft';
  } else if (context === 'methodology') {
    return 'unsere Fleckenentfernungsmethodik';
  } else if (context === 'emergency') {
    return 'Notfall-Fleckenbehandlungsleitfaden';
  }
  
  return `${stainType || 'Fleck'} entfernen`;
}

// Insert links into HTML (German pages have different structure)
function insertLinks(html, related) {
  let modified = html;
  
  // German pages don't have the full div structure, just comments
  // We need to insert the full related content section before the urgency badge
  
  // Check if related content already exists
  if (html.includes('<div class="related-content">')) {
    console.log('  ℹ️  Already has related content section');
    return html;
  }
  
  // Build the related content HTML
  let relatedContentHTML = '\n<!-- Cross-Links Section -->\n<div class="related-content">\n';
  
  // Related stains section
  if (related.sameStain.length > 0) {
    relatedContentHTML += '  <div class="related-stains">\n';
    relatedContentHTML += '    <h3>Ähnliche Fleckensituationen</h3>\n';
    relatedContentHTML += '    <ul>\n';
    for (const item of related.sameStain.slice(0, 4)) {
      const anchorText = generateAnchorText(item.parsed, 'same-stain');
      relatedContentHTML += `      <li><a href="/${item.path}">${anchorText}</a></li>\n`;
    }
    relatedContentHTML += '    </ul>\n';
    relatedContentHTML += '  </div>\n';
  }
  
  // Related products section
  relatedContentHTML += '  <div class="related-products">\n';
  relatedContentHTML += '    <h3>Empfohlene Produkte</h3>\n';
  relatedContentHTML += '    <ul>\n';
  relatedContentHTML += `      <li><a href="${related.products[0]}">Sil 1 für Alles vollständiger Test</a></li>\n`;
  relatedContentHTML += `      <li><a href="${related.products[1]}">Wo man Fleckenentferner kauft</a></li>\n`;
  relatedContentHTML += `      <li><a href="${related.products[2]}">Sil vs. Vanish Vergleich</a></li>\n`;
  relatedContentHTML += `      <li><a href="${related.methodology}">${generateAnchorText({}, 'methodology')}</a></li>\n`;
  relatedContentHTML += '    </ul>\n';
  relatedContentHTML += '  </div>\n';
  
  // Fabric alternatives section
  if (related.sameFabric.length > 0) {
    relatedContentHTML += '  <div class="fabric-alternatives">\n';
    relatedContentHTML += '    <h3>Gleicher Fleck, anderes Gewebe</h3>\n';
    relatedContentHTML += '    <ul>\n';
    for (const item of related.sameFabric.slice(0, 3)) {
      const anchorText = generateAnchorText(item.parsed, 'same-fabric');
      relatedContentHTML += `      <li><a href="/${item.path}">${anchorText}</a></li>\n`;
    }
    relatedContentHTML += '    </ul>\n';
    relatedContentHTML += '  </div>\n';
  }
  
  relatedContentHTML += '</div>\n\n';
  
  // Add emergency note if applicable
  if (related.emergency) {
    const emergencyNote = `<p class="meta urgency-note"><strong>⚠️ Zeitkritischer Fleck:</strong> Siehe unseren <a href="${related.emergency}">${generateAnchorText({}, 'emergency')}</a> für sofortige erste Schritte.</p>\n\n`;
    
    // Insert after answer card
    if (html.includes('<div class="card answer"')) {
      const answerCardEnd = html.indexOf('</div>', html.indexOf('<div class="card answer"')) + 6;
      modified = html.slice(0, answerCardEnd) + '\n' + emergencyNote + html.slice(answerCardEnd);
    }
  }
  
  // Insert before the urgency badge or before the closing </main> tag
  if (modified.includes('<!-- Urgency Badge -->')) {
    modified = modified.replace('<!-- Urgency Badge -->', relatedContentHTML + '<!-- Urgency Badge -->');
  } else if (modified.includes('<div class="urgency-badge')) {
    modified = modified.replace('<div class="urgency-badge', relatedContentHTML + '<div class="urgency-badge');
  } else if (modified.includes('</main>')) {
    modified = modified.replace('</main>', relatedContentHTML + '</main>');
  }
  
  return modified;
}

// Process a single file
function processFile(filePath, allFiles) {
  console.log(`Processing: ${filePath}`);
  
  const html = fs.readFileSync(filePath, 'utf8');
  const parsed = parseFilename(filePath);
  
  // Skip files without identifiable stain/fabric types
  if (!parsed.stainType && !parsed.fabricType) {
    console.log(`  ⚠️  Skipped - could not identify stain or fabric type`);
    return { processed: false, reason: 'no-taxonomy' };
  }
  
  // Find related pages
  const related = findRelatedPages(filePath, parsed, allFiles);
  
  // Count total links we'll add
  const totalLinks = related.sameStain.length + related.sameFabric.length + 
                     related.products.length + 1 + (related.emergency ? 1 : 0);
  
  if (totalLinks < MIN_LINKS_PER_PAGE) {
    console.log(`  ⚠️  Only found ${totalLinks} links (target: ${MIN_LINKS_PER_PAGE}+)`);
  }
  
  // Insert links
  const modified = insertLinks(html, related);
  
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
  console.log('🔗 FabricCare Internal Linking Audit (German Pages)\n');
  console.log('════════════════════════════════════════════════════\n');
  
  // Process German pages
  console.log('📄 Processing German stain pages...\n');
  const germanFiles = getStainFiles(GERMAN_STAINS_DIR);
  console.log(`Found ${germanFiles.length} German stain pages\n`);
  
  let stats = {
    processed: 0,
    skipped: 0,
    totalLinks: 0
  };
  
  for (const file of germanFiles) {
    const result = processFile(file, germanFiles);
    if (result.processed) {
      stats.processed++;
      stats.totalLinks += result.linksAdded;
    } else {
      stats.skipped++;
    }
  }
  
  console.log(`\n✅ German pages complete: ${stats.processed} processed, ${stats.skipped} skipped`);
  console.log(`   Total links added: ${stats.totalLinks}\n`);
  
  // Overall summary
  console.log('\n════════════════════════════════════════════════════');
  console.log('📊 SUMMARY');
  console.log('════════════════════════════════════════════════════\n');
  console.log(`Total pages processed: ${stats.processed}`);
  console.log(`Total pages skipped: ${stats.skipped}`);
  console.log(`Total internal links added: ${stats.totalLinks}`);
  console.log(`\n✅ German pages internal linking complete!\n`);
}

// Run the script
if (require.main === module) {
  main();
}
