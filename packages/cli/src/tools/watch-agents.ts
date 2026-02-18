import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

function parseArgs(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const specsDir = get('--specs') || 'specs';
  const outDir = get('--out') || 'agents';
  const template = get('--template') || path.join('agents', '_templates', 'agent.template.md');
  const schema = get('--schema') || path.join('schemas', 'agent.schema.json');

  return { specsDir, outDir, template, schema };
}

export async function runWatch(argv: string[]) {
  const args = parseArgs(argv);

  if (!fs.existsSync(args.specsDir)) {
    throw new Error(`Specs dir not found: ${args.specsDir}`);
  }

  console.log(`👀 Monitoreando cambios en: ${args.specsDir}`);
  console.log(`📁 Salida en: ${args.outDir}`);
  console.log(`⏸️  Presiona Ctrl+C para detener\n`);

  const { runCreate } = await import('./create-agent.js');
  const debounceTimers = new Map<string, NodeJS.Timeout>();
  const debounceDelay = 1000; // 1 segundo

  function handleFileChange(filename: string) {
    if (!filename.endsWith('.yml') && !filename.endsWith('.yaml') && !filename.endsWith('.json')) {
      return;
    }

    const relPath = path.relative(args.specsDir, filename);

    // Debounce multiple change events
    const existingTimer = debounceTimers.get(filename);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(async () => {
      debounceTimers.delete(filename);
      try {
        const timestamp = new Date().toLocaleTimeString('es-ES');
        console.log(`\n📝 [${timestamp}] Cambio detectado: ${relPath}`);

        await runCreate([
          '--spec',
          filename,
          '--out',
          args.outDir,
          '--template',
          args.template,
          '--schema',
          args.schema,
        ]);

        console.log(`✅ Agente regenerado\n`);
      } catch (err) {
        const timestamp = new Date().toLocaleTimeString('es-ES');
        console.error(`\n❌ [${timestamp}] Error al generar agente:`);
        console.error(err instanceof Error ? err.message : err);
        console.log(`Monitoreando cambios...\n`);
      }
    }, debounceDelay);

    debounceTimers.set(filename, timer);
  }

  // Watch specs directory
  const watcher = fs.watch(args.specsDir, { recursive: true }, (eventType, filename) => {
    if (filename && eventType === 'change') {
      const fullPath = path.resolve(args.specsDir, filename);
      if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
        handleFileChange(fullPath);
      }
    }
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n👋 Deteniendo monitor de cambios...');
    watcher.close();
    for (const timer of debounceTimers.values()) {
      clearTimeout(timer);
    }
    process.exit(0);
  });
}

// Entry point para CLI directo
if (import.meta.url === `file://${process.argv[1]}`) {
  runWatch(process.argv.slice(2)).catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  });
}
