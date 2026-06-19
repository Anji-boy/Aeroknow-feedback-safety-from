const fs = require('fs');
const documentXml = fs.readFileSync('D:/AERO/Aeroknow/Quality/QR form/client/Document/extracted_docx/word/document.xml', 'utf8');
const stylesXml = fs.readFileSync('D:/AERO/Aeroknow/Quality/QR form/client/Document/extracted_docx/word/styles.xml', 'utf8');

// Extract page margins
const marginMatch = documentXml.match(/<w:pgMar w:top=\"(\d+)\" w:right=\"(\d+)\" w:bottom=\"(\d+)\" w:left=\"(\d+)\"/);
if(marginMatch) {
    console.log('Margins (inches):', {top: marginMatch[1]/1440, right: marginMatch[2]/1440, bottom: marginMatch[3]/1440, left: marginMatch[4]/1440});
}

// Extract default font
const defaultFonts = stylesXml.match(/<w:rFonts w:ascii=\"([^\"]+)\" w:hAnsi=\"([^\"]+)\"/);
console.log('Default Fonts:', defaultFonts ? defaultFonts.slice(1,3) : 'Not found');

// Extract default font size
const defaultSz = stylesXml.match(/<w:sz w:val=\"(\d+)\"/);
console.log('Default Font Size (pt):', defaultSz ? defaultSz[1]/2 : 'Not found');

// Extract line spacing
const defaultSpacing = stylesXml.match(/<w:spacing w:line=\"(\d+)\" w:lineRule=\"([^\"]+)\"/);
console.log('Default Spacing (line in twips, 240=single):', defaultSpacing ? defaultSpacing.slice(1,3) : 'Not found');

// Find all explicit font sizes
const szMatches = [...documentXml.matchAll(/<w:sz w:val=\"(\d+)\"/g)];
const uniqueSizes = [...new Set(szMatches.map(m => m[1]/2))].sort((a,b)=>a-b);
console.log('Explicit font sizes used in document (pt):', uniqueSizes);

// Find fonts
const fontMatches = [...documentXml.matchAll(/<w:rFonts w:ascii=\"([^\"]+)\"/g)];
const uniqueFonts = [...new Set(fontMatches.map(m => m[1]))];
console.log('Explicit fonts used in document:', uniqueFonts);

const tableMatches = [...documentXml.matchAll(/<w:tblW w:w=\"(\d+)\" w:type=\"([^\"]+)\"/g)];
console.log('Table Widths (twips/pct):', [...new Set(tableMatches.map(m => m[1] + ' ' + m[2]))]);

// Check borders
const borders = [...documentXml.matchAll(/<w:bottom w:val=\"([^\"]+)\" w:sz=\"(\d+)\" w:space=\"(\d+)\" w:color=\"([^\"]+)\"/g)];
const uniqueBorders = [...new Set(borders.map(m => m.slice(1,5).join(', ')))];
console.log('Bottom borders used:', uniqueBorders);
