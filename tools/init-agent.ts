import readline from "node:readline";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import YAML from "yaml";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function prompt(question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

function validateKebabCase(value: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value) && value.length >= 3 && value.length <= 64;
}

function parseListInput(input: string): string[] {
  return input
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export async function runInit(argv: string[]) {
  const get = (flag: string) => {
    const i = argv.indexOf(flag);
    return i >= 0 ? argv[i + 1] : undefined;
  };

  const specsDir = get("--specs") || "specs";
  const autoCreate = argv.includes("--create");

  console.log(`
╔═══════════════════════════════════════════════════════════════╗
║     Asistente Interactivo de Creacion de Agentes              ║
╚═══════════════════════════════════════════════════════════════╝

Responde las preguntas para crear una especificacion de agente.
Los campos marcados con * son obligatorios.
`);

  // ID del agente
  let id = "";
  while (!validateKebabCase(id)) {
    id = await prompt("* ID del agente (kebab-case, 3-64 caracteres): ");
    if (!validateKebabCase(id)) {
      console.log("❌ ID invalido. Usa solo minusculas, numeros y guiones (ej: mi-agente)");
    }
  }

  // Role
  let role = "";
  const validRoles = ["worker", "orchestrator", "router"];
  while (!validRoles.includes(role)) {
    console.log("  Opciones: worker | orchestrator | router");
    role = await prompt("* Role del agente: ");
    if (!validRoles.includes(role)) {
      console.log(`❌ Role invalido. Elige entre: ${validRoles.join(", ")}`);
    }
  }

  // Domain
  let domain = "";
  while (!domain) {
    domain = await prompt("* Dominio (ej: backend, frontend, analytics): ");
    if (!domain) {
      console.log("❌ El dominio no puede estar vacio");
    }
  }

  // Name
  let name = "";
  while (!name) {
    name = await prompt("* Nombre del agente: ");
    if (!name) {
      console.log("❌ El nombre no puede estar vacio");
    }
  }

  // Description
  const description = await prompt("  Descripcion breve (opcional): ");

  // Subdomains
  const subdomainsInput = await prompt("  Subdominios separados por coma (opcional, ej: api,database): ");
  const subdomains = parseListInput(subdomainsInput);

  // Intents
  let intentsInput = "";
  let intents: string[] = [];
  while (intents.length === 0) {
    intentsInput = await prompt("* Intents separados por coma (minimo 1): ");
    intents = parseListInput(intentsInput);
    if (intents.length === 0) {
      console.log("❌ Debes ingresar al menos un intent");
    }
  }

  // Skills
  const skillsInput = await prompt("  Skills permitidas separadas por coma (opcional): ");
  const skills = parseListInput(skillsInput);

  // Build spec
  const spec = {
    id,
    role,
    domain,
    name,
    description: description || "",
    subdomains,
    invocation: {
      entrypoint: `agent:${id}`,
      mode: "llm",
      aliases: []
    },
    match: {
      intents,
      path_globs: [],
      keywords: []
    },
    context: {
      packs: [],
      include_globs: [],
      exclude_globs: [],
      max_files: 8,
      max_chars_per_file: 4000
    },
    skills: {
      allowed: skills
    },
    output: {
      mode_default: "short+diff",
      max_bullets: 7,
      schema: ["Resumen", "Cambios"],
      must_include: [],
      never_include: [
        "full_files",
        "duplicate_code",
        "unbounded_lists",
        "verbose_explanations"
      ]
    },
    delegation: {
      role: "solo",
      strategy: "disabled",
      allowed_subagents: [],
      max_handoffs: 0
    },
    verification: {
      required: true,
      commands: []
    }
  };

  // Save spec
  if (!fs.existsSync(specsDir)) {
    fs.mkdirSync(specsDir, { recursive: true });
  }

  const specPath = path.join(specsDir, `${id}.yml`);
  if (fs.existsSync(specPath)) {
    const overwrite = await prompt(`\n⚠️  El archivo ${specPath} ya existe. ¿Sobrescribir? (s/n): `);
    if (overwrite.toLowerCase() !== "s") {
      console.log("Operacion cancelada.");
      rl.close();
      return;
    }
  }

  fs.writeFileSync(specPath, YAML.stringify(spec), "utf8");
  console.log(`\n✅ Especificacion creada: ${specPath}`);

  // Optionally create agent
  if (autoCreate) {
    console.log(`\n📝 Generando agente...`);
    const { runCreate } = await import("./create-agent.js");
    try {
      await runCreate([
        "--spec",
        specPath,
        "--out",
        "agents",
        "--template",
        path.join("agents", "_templates", "agent.template.md"),
        "--schema",
        path.join("schemas", "agent.schema.json")
      ]);
    } catch (err) {
      console.error(`❌ Error al generar agente: ${err instanceof Error ? err.message : err}`);
    }
  } else {
    console.log(`\n💡 Para generar el agente, ejecuta:`);
    console.log(`   pnpm agents:create --spec ${specPath} --out agents`);
  }

  rl.close();
}

// Entry point para CLI directo
if (import.meta.url === `file://${process.argv[1]}`) {
  runInit(process.argv.slice(2)).catch((err) => {
    console.error("❌ Error fatal:", err);
    process.exit(1);
  });
}
