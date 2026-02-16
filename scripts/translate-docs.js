/**
 * Script de traducción de documentación usando DeepL API
 * 
 * Uso: node scripts/translate-docs.js "file1.md file2.md" "false"
 * 
 * Requiere: DEEPL_API_KEY en variables de entorno
 */

const fs = require('fs');
const path = require('path');
const deepl = require('deepl-node');

const DEEPL_API_KEY = process.env.DEEPL_API_KEY;

if (!DEEPL_API_KEY) {
  console.error('❌ DEEPL_API_KEY no está configurada');
  process.exit(1);
}

const translator = new deepl.Translator(DEEPL_API_KEY);

// Archivos a traducir
const changedFiles = process.argv[2]?.split(' ').filter(Boolean) || [];
const forceTranslate = process.argv[3] === 'true';

// Archivos que siempre deben traducirse (contienen español)
const SPANISH_DOCS = [
  'docs/architecture-kits-teams.md',
  'docs/conventions.md',
  'docs/delegation.md',
  'docs/dynamic-context-packs.md',
  'docs/extension-commands-v2.md',
  'docs/kit-browser-webview.md',
  'docs/routing.md',
  'docs/skills-registry.md',
  'docs/testing-suite.md',
  'docs/vscode-extension-architecture.md',
  'docs/advanced-composition.md',
  'docs/architecture.md',
  'docs/guia-kits-y-teams.md',
  'docs/guia-wizard.md',
  'docs/especificacion-agentes.md',
  'docs/flujo-de-trabajo.md',
  'docs/project-structure.md',
  'docs/roadmap.md',
  'README.md',
  'CHANGELOG.md'
];

/**
 * Preservar bloques de código durante la traducción
 */
function extractCodeBlocks(content) {
  const codeBlocks = [];
  let index = 0;
  
  // Extraer bloques de código (```)
  const withoutCode = content.replace(/```[\s\S]*?```/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${index++}__`;
  });
  
  // Extraer código inline (`)
  const withoutInline = withoutCode.replace(/`[^`]+`/g, (match) => {
    codeBlocks.push(match);
    return `__CODE_BLOCK_${index++}__`;
  });
  
  return { text: withoutInline, codeBlocks };
}

/**
 * Restaurar bloques de código después de la traducción
 */
function restoreCodeBlocks(content, codeBlocks) {
  let result = content;
  codeBlocks.forEach((block, index) => {
    result = result.replace(`__CODE_BLOCK_${index}__`, block);
  });
  return result;
}

/**
 * Traducir un archivo markdown
 */
async function translateFile(filePath) {
  console.log(`📄 Traduciendo: ${filePath}`);
  
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Extraer código para preservarlo
    const { text, codeBlocks } = extractCodeBlocks(content);
    
    // Traducir con DeepL
    const result = await translator.translateText(
      text,
      'ES', // Source: Spanish
      'EN-US', // Target: English (US)
      {
        preserveFormatting: true,
        tagHandling: 'html'
      }
    );
    
    // Restaurar código
    const translatedContent = restoreCodeBlocks(result.text, codeBlocks);
    
    // Guardar archivo traducido
    const outputPath = filePath.startsWith('docs/') 
      ? filePath.replace('docs/', 'docs-en/')
      : filePath.replace('.md', '-EN.md');
    
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, translatedContent, 'utf-8');
    console.log(`✅ Traducido: ${outputPath}`);
    
    return { success: true, file: outputPath };
  } catch (error) {
    console.error(`❌ Error traduciendo ${filePath}:`, error.message);
    return { success: false, file: filePath, error: error.message };
  }
}

/**
 * Main
 */
async function main() {
  console.log('🌐 Iniciando traducción con DeepL...\n');
  
  // Determinar archivos a traducir
  let filesToTranslate = [];
  
  if (forceTranslate) {
    console.log('⚡ Modo: Traducir todos los documentos\n');
    filesToTranslate = SPANISH_DOCS.filter(f => fs.existsSync(f));
  } else if (changedFiles.length > 0) {
    console.log(`📝 Archivos cambiados: ${changedFiles.length}\n`);
    filesToTranslate = changedFiles.filter(f => 
      SPANISH_DOCS.includes(f) && fs.existsSync(f)
    );
  }
  
  if (filesToTranslate.length === 0) {
    console.log('ℹ️  No hay archivos para traducir');
    return;
  }
  
  console.log(`📚 Traduciendo ${filesToTranslate.length} archivo(s)...\n`);
  
  // Verificar uso de API
  const usage = await translator.getUsage();
  console.log(`📊 DeepL Usage: ${usage.character.count}/${usage.character.limit} caracteres\n`);
  
  // Traducir archivos
  const results = [];
  for (const file of filesToTranslate) {
    const result = await translateFile(file);
    results.push(result);
    
    // Pequeña pausa para no saturar la API
    await new Promise(resolve => setTimeout(resolve, 500));
  }
  
  // Resumen
  console.log('\n📋 Resumen:');
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  console.log(`   ✅ Exitosos: ${successful}`);
  console.log(`   ❌ Fallidos: ${failed}`);
  
  // Verificar uso final
  const finalUsage = await translator.getUsage();
  console.log(`\n📊 DeepL Usage final: ${finalUsage.character.count}/${finalUsage.character.limit} caracteres`);
  
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch(error => {
  console.error('💥 Error fatal:', error);
  process.exit(1);
});
