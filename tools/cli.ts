#!/usr/bin/env node

import process from "node:process";
import path from "node:path";
import fs from "node:fs";

async function main() {
  const [cmd, ...args] = process.argv.slice(2);

  // Check for global help/version
  if (!cmd || ["--help", "-h"].includes(cmd)) {
    showHelp();
    process.exit(0);
  }

  if (["--version", "-v"].includes(cmd)) {
    const pkg = JSON.parse(fs.readFileSync(path.join(path.dirname(__dirname), "package.json"), "utf8"));
    console.log(`agent-team v${pkg.version}`);
    process.exit(0);
  }

  // Check for command-specific help
  if (args[0] === "--help" || args[0] === "-h") {
    showCommandHelp(cmd);
    process.exit(0);
  }

  try {
    switch (cmd) {
      case "init": {
        const { runInit } = await import("./init-agent.js");
        await runInit(args);
        break;
      }
      case "create": {
        const { runCreate } = await import("./create-agent.js");
        await runCreate(args);
        break;
      }
      case "validate": {
        const { runValidate } = await import("./validate-agent.js");
        await runValidate(args);
        break;
      }
      case "sync": {
        const { runSync } = await import("./sync-agents.js");
        await runSync(args);
        break;
      }
      case "watch": {
        const { runWatch } = await import("./watch-agents.js");
        await runWatch(args);
        break;
      }
      case "profile:init": {
        const { runProfileInit } = await import("./profile-init.js");
        await runProfileInit(args);
        break;
      }
      case "team:create": {
        const { runTeamCreate } = await import("./team-create.js");
        await runTeamCreate(args);
        break;
      }
      case "team:list": {
        const { runTeamList } = await import("./team-list.js");
        await runTeamList(args);
        break;
      }
      case "team:sync": {
        const { runTeamSync } = await import("./team-sync.js");
        await runTeamSync(args);
        break;
      }
      case "skills:list": {
        const { runSkillsList } = await import("./skills-commands.js");
        await runSkillsList(args);
        break;
      }
      case "skills:show": {
        const { runSkillsShow } = await import("./skills-commands.js");
        await runSkillsShow(args);
        break;
      }
      case "skills:validate": {
        const { runSkillsValidate } = await import("./skills-commands.js");
        await runSkillsValidate(args);
        break;
      }
      case "skills:recommend": {
        const { runSkillsRecommend } = await import("./skills-commands.js");
        await runSkillsRecommend(args);
        break;
      }
      default:
        console.error(`❌ Comando desconocido: ${cmd}`);
        console.log("Escribe 'agent-team --help' para ver los comandos disponibles.");
        process.exit(1);
    }
  } catch (err) {
    console.error("❌ Error:", err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

function showHelp() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║           agent-team - Motor para Agentes de Copilot          ║
╚════════════════════════════════════════════════════════════════╝

USO:
  agent-team <comando> [opciones]

COMANDOS v1.0 (Gestión básica):
  init          Crear agente de forma interactiva (asistente)
  create        Crear un agente desde una especificacion
  validate      Validar agentes contra el esquema
  sync          Sincronizar agentes a .github/ de un proyecto
  watch         Monitorear cambios en specs y regenerar automaticamente

COMANDOS v2.0 (Kits & Teams):
  profile:init  Inicializar perfil de proyecto (.agent-team/)
  team:create   Crear un perfil de equipo
  team:list     Listar equipos disponibles
  team:sync     Sincronizar equipo a .github/agents/

COMANDOS v2.0 (Skills Registry):
  skills:list       Listar todas las skills disponibles
  skills:show       Mostrar detalles de una skill
  skills:validate   Validar skills de un agente
  skills:recommend  Obtener recomendaciones de skills

OPCIONES GLOBALES:
  -h, --help      Mostrar esta ayuda
  -v, --version   Mostrar version

USAR --help CON UN COMANDO:
  agent-team init --help
  agent-team create --help
  agent-team validate --help
  agent-team sync --help
  agent-team watch --help
  agent-team profile:init --help
  agent-team team:create --help
  agent-team team:sync --help
  agent-team skills:list --help
  agent-team skills:show --help
  agent-team skills:validate --help
  agent-team skills:recommend --help

EJEMPLOS v1.0:
  agent-team init
  agent-team init --create
  agent-team create --spec specs/mi-agente.yml --out agents
  agent-team validate --agents agents --schema schemas/agent.schema.json
  agent-team sync --project . --config .my-agents/project.config.yml
  agent-team watch --specs specs --out agents

EJEMPLOS v2.0 (Kits & Teams):
  agent-team profile:init --id my-app --name "My App" --type frontend
  agent-team team:create --id minimal --name "Minimal" --kits testing-vitest
  agent-team team:list
  agent-team team:sync --team minimal
  agent-team team:sync --team full-stack --dry-run

EJEMPLOS v2.0 (Skills Registry):
  agent-team skills:list
  agent-team skills:show run_tests
  agent-team skills:validate agents/tester-vitest.agent.md
  agent-team skills:recommend --domain=testing --role=worker --tech=vitest
`);
}

function showCommandHelp(cmd: string) {
  const helps: Record<string, string> = {
    init: `
INIT - Crear agente de forma interactiva (asistente)

USO:
  agent-team init [opciones]

OPCIONES:
  --specs <dir>   Directorio de especificaciones (default: "specs")
  --create        Generar automaticamente el agente despues de crear la spec
  -h, --help      Mostrar esta ayuda

EJEMPLOS:
  agent-team init                    # Crear interactivamente solo la spec
  agent-team init --create           # Crear spec y generar agente automaticamente
`,
    create: `
CREATE - Crear un agente desde una especificacion

USO:
  agent-team create [opciones]

OPCIONES:
  --spec <path>       (obligatorio) Ruta del archivo de especificacion (YAML/JSON)
  --out <dir>         Directorio de salida (default: "agents")
  --template <path>   Ruta de la plantilla (default: "agents/_templates/agent.template.md")
  --schema <path>     Ruta del esquema (default: "schemas/agent.schema.json")
  -h, --help          Mostrar esta ayuda

EJEMPLO:
  agent-team create --spec specs/mi-agente.yml --out agents
`,
    validate: `
VALIDATE - Validar agentes contra el esquema

USO:
  agent-team validate [opciones]

OPCIONES:
  --agents <dir>   Directorio de agentes (default: "agents")
  --schema <path>  Ruta del esquema (default: "schemas/agent.schema.json")
  -h, --help       Mostrar esta ayuda

EJEMPLO:
  agent-team validate --agents agents --schema schemas/agent.schema.json
`,
    sync: `
SYNC - Sincronizar agentes a .github/ del proyecto

USO:
  agent-team sync [opciones]

OPCIONES:
  --project <dir>   (obligatorio) Ruta del proyecto destino
  --config <path>   Ruta del proyecto.config.yml (default: "<project>/project.config.yml")
  --clean           Limpiar .github/agents antes de sincronizar
  -h, --help        Mostrar esta ayuda

EJEMPLOS:
  agent-team sync --project . --config .my-agents/project.config.yml
  agent-team sync --project . --config .my-agents/project.config.yml --clean
`,
    watch: `
WATCH - Monitorear cambios en specs y regenerar automaticamente

USO:
  agent-team watch [opciones]

OPCIONES:
  --specs <dir>      Directorio a monitorear (default: "specs")
  --out <dir>        Directorio de salida (default: "agents")
  --template <path>  Ruta de la plantilla (default: "agents/_templates/agent.template.md")
  --schema <path>    Ruta del esquema (default: "schemas/agent.schema.json")
  -h, --help         Mostrar esta ayuda

EJEMPLO:
  agent-team watch --specs specs --out agents
`,
    "profile:init": `
PROFILE:INIT - Inicializar perfil de proyecto (v2.0)

USO:
  agent-team profile:init [opciones]

OPCIONES:
  --id <string>     (obligatorio) ID del proyecto
  --name <string>   (obligatorio) Nombre del proyecto
  --type <string>   Tipo de proyecto (default: "frontend")
                    Opciones: frontend, backend, fullstack, library, monorepo
  -h, --help        Mostrar esta ayuda

EJEMPLO:
  agent-team profile:init --id my-app --name "My App" --type frontend
`,
    "team:create": `
TEAM:CREATE - Crear un perfil de equipo (v2.0)

USO:
  agent-team team:create [opciones]

OPCIONES:
  --id <string>          (obligatorio) ID del equipo
  --name <string>        (obligatorio) Nombre del equipo
  --kits <kit1,kit2,...> (obligatorio) Kits a incluir (separados por coma)
  --description <string> Descripción del equipo
  -h, --help             Mostrar esta ayuda

EJEMPLO:
  agent-team team:create \\
    --id minimal-testing \\
    --name "Minimal Testing" \\
    --kits testing-vitest \\
    --description "Essential testing setup"
`,
    "team:list": `
TEAM:LIST - Listar equipos disponibles (v2.0)

USO:
  agent-team team:list

EJEMPLO:
  agent-team team:list
`,
    "team:sync": `
TEAM:SYNC - Sincronizar equipo a .github/agents/ (v2.0)

USO:
  agent-team team:sync [opciones]

OPCIONES:
  --team <string>   (obligatorio) ID del equipo a sincronizar
  --dry-run         Mostrar lo que se haría sin escribir archivos
  --output <dir>    Directorio de salida (default: ".github/agents")
  -h, --help        Mostrar esta ayuda

EJEMPLOS:
  agent-team team:sync --team minimal-testing
  agent-team team:sync --team full-stack --dry-run
  agent-team team:sync --team minimal-testing --output ./custom-agents
`,
    "skills:list": `
SKILLS:LIST - Listar todas las skills disponibles (v2.0)

USO:
  agent-team skills:list [opciones]

OPCIONES:
  --category=<cat>    Filtrar por categoría
  --role=<role>       Filtrar por rol (worker, orchestrator, router)
  --security=<level>  Filtrar por nivel de seguridad
  -h, --help          Mostrar esta ayuda

CATEGORIAS:
  file_operations, code_analysis, execution, browser, database,
  testing, documentation, git, deployment

EJEMPLOS:
  agent-team skills:list
  agent-team skills:list --category=testing
  agent-team skills:list --role=worker --security=elevated
`,
    "skills:show": `
SKILLS:SHOW - Mostrar detalles de una skill (v2.0)

USO:
  agent-team skills:show <skill-id>

EJEMPLO:
  agent-team skills:show run_tests
  agent-team skills:show database_migrate
`,
    "skills:validate": `
SKILLS:VALIDATE - Validar skills de un agente (v2.0)

USO:
  agent-team skills:validate <agent-file>

DESCRIPCION:
  Valida que las skills de un agente sean válidas para su rol,
  detecta conflictos, y sugiere skills implícitas.

EJEMPLOS:
  agent-team skills:validate agents/tester-vitest.agent.md
  agent-team skills:validate specs/backend.yml
`,
    "skills:recommend": `
SKILLS:RECOMMEND - Obtener recomendaciones de skills (v2.0)

USO:
  agent-team skills:recommend --domain=<domain> --role=<role> [--tech=<tech1,tech2>]

OPCIONES:
  --domain=<string>  (obligatorio) Dominio del agente (testing, backend, etc.)
  --role=<string>    (obligatorio) Rol del agente (worker, orchestrator, router)
  --tech=<list>      Tecnologías (comma-separated)
  -h, --help         Mostrar esta ayuda

EJEMPLOS:
  agent-team skills:recommend --domain=testing --role=worker
  agent-team skills:recommend --domain=backend --role=worker --tech=prisma,postgresql
  agent-team skills:recommend --domain=frontend --role=worker --tech=react,vite
`
  };

  console.log(helps[cmd] || `Comando desconocido: ${cmd}`);
}

main().catch((err) => {
  console.error("❌ Error fatal:", err);
  process.exit(1);
});
