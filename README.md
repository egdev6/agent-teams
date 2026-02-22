# Equipos de Agentes

**Versión:** 2.0.0 | **Estado:** ✅ Stable Release  
**Lanzamiento:** Febrero 2026

Sistema completo de gestión de agentes IA para GitHub Copilot con extensión VS Code integrada. Crea, gestiona y orquesta agentes personalizados con arquitectura de kits reutilizables y perfiles configurables.

> 🎉 **v2.0.0 ya está estable!** Sistema de Kits & Teams con composición dinámica, estrategias avanzadas de merge y registro de habilidades.  
> 📋 Ver [Hoja de Ruta](docs/roadmap.md) para características próximas en v2.1+

---

## 🚀 Instalación y Setup

### Requisitos Previos

- **Node.js:** ≥18.0.0
- **pnpm:** ≥8.0.0 (gestor de paquetes)
- **VS Code:** ≥1.85.0 (para desarrollo de extensión)

### 1. Clonar e Instalar Dependencias

```bash
# Clonar repositorio
git clone https://github.com/egdev6/agent-teams.git
cd agent-teams

# Instalar dependencias de todo el monorepo
pnpm install
```

### 2. Desarrollo Local

Flujo recomendado (sin levantar múltiples comandos manuales):

1. Abrir la carpeta raíz del monorepo en VS Code.
2. Ir a `Run and Debug`.
3. Ejecutar **`🚀Run Extension Watch`**.
4. Esperar a que se abra la ventana de `Extension Development Host`.

Este launch hace:
- Build inicial (`core` + `webviews` + `extension`)
- Watch continuo de `extension`
- Watch continuo de `webviews`
- Sync automático de `webviews/dist` hacia `extension/dist/webviews`

### 3. Debuggear la Extensión

Si cambias código del webview, cierra el panel y vuelve a abrir.
Si cambias código del host de la extensión (`packages/extension/src`), reinicia la sesión de debug.

Si necesitas reiniciar watchers manualmente:

1. Ejecuta la tarea **`Dev: Stop Watches`**.
2. Lanza de nuevo **`🚀Run Extension Watch`**.

---

## 📋 Comandos Útiles

```bash
# Calidad y verificación
pnpm lint
pnpm typecheck
pnpm build

# Limpiar artefactos
pnpm clean

# Empaquetar extensión
pnpm -C packages/extension package
```

---

## 🎯 Primeros Pasos

📚 **Guías Detalladas:**
- [Guía de Kits y Teams](docs/guia-kits-y-teams.md) - Sistema v2.0 completo
- [Guía del Wizard](docs/guia-wizard.md) - Crear agentes paso a paso
- [Flujo de Trabajo](docs/flujo-de-trabajo.md) - Workflow completo

---

## 📚 Documentación

### Guías Principales

- **[Guía de Inicio Rápido](docs/quickstart.md)** - Comenzar en 5 minutos
- **[Guía de Kits y Teams](docs/guia-kits-y-teams.md)** - Sistema v2.0 de agentes reutilizables
- **[Guía del Wizard](docs/guia-wizard.md)** - Creación de agentes paso a paso
- **[Especificación de Agentes](docs/especificacion-agentes.md)** - Formato YAML completo
- **[Flujo de Trabajo](docs/flujo-de-trabajo.md)** - Uso y mantenimiento de agentes

### Documentación Técnica

- **[Architecture](docs/architecture.md)** - Diseño del sistema
- **[Architecture Kits & Teams](docs/architecture-kits-teams.md)** - Arquitectura v2.0
- **[Routing](docs/routing.md)** - Sistema de routing normalizado
- **[Delegation](docs/delegation.md)** - Delegación con protección anti-loops
- **[Dynamic Context Packs](docs/dynamic-context-packs.md)** - Templates dinámicos
- **[Extension Architecture](docs/vscode-extension-architecture.md)** - Diseño de la extensión
- **[Testing Suite](docs/testing-suite.md)** - Pruebas y calidad
- **[Skills Registry](docs/skills-registry.md)** - Registro de habilidades
- **[Conventions](docs/conventions.md)** - Convenciones y best practices

### Recursos Adicionales

- **[Estructura del Proyecto](docs/project-structure.md)** - Organización del código
- **[Índice Completo](docs/README.md)** - Toda la documentación
- **[Releases](docs/releases/)** - Notas de lanzamiento
- **[Ejemplos](examples/README.md)** - Ejemplos prácticos

---

## 🗺️ Roadmap

### Versión Actual: v2.0.0 (Febrero 2026)

✅ Arquitectura de tres capas (Core + Kits + Profiles)  
✅ Sistema Kits & Teams completamente funcional  
✅ Context Packs dinámicos con templates  
✅ Composer con estrategias avanzadas de merge  
✅ Registro de habilidades (Skills Registry)  
✅ Extensión VS Code con comandos v2.0  
✅ CLI Tools para automatización completa

### Próximas Versiones

**v2.1 - Skills Integration** (Q2 2026)
- Estabilización del Skills Registry
- Integración con composer y validación
- Sistema de resolución de comandos
- Mejoras en el wizard con skills

**v2.2 - Merge & Override Improvements** (Q3 2026)
- Estabilización del MergeEngine
- Resolver de conflictos interactivo
- Modo dry-run mejorado
- Características de colaboración en equipos

**v2.3 - Core Kits Library** (Q4 2026)
- 20+ kits listos para producción
- Kits para frontend, backend, database, devops, testing
- Estándares de calidad de kits
- Framework de testing de kits

**v3.0 - Kit Marketplace** (Q1 2027)
- Descubrimiento e instalación de kits
- Workflow de publicación
- Características comunitarias
- Registros privados

📋 **Hoja de ruta completa:** Ver [Roadmap](docs/roadmap.md)

---

## 🤝 Contribución

¡Las contribuciones son bienvenidas!

```bash
# Fork y clone
git clone https://github.com/tu-usuario/agent-teams.git

# Instalar dependencias
pnpm install

# Desarrollar
# Ejecuta "Run Extension (Build + Watch)" desde Run and Debug

# Tests
pnpm test

# Build completo antes de push
pnpm lint && pnpm typecheck && pnpm build
```

**Convenciones:**
- TypeScript strict mode
- Biome linting + formatting
- Commits convencionales
- Tests para nuevas features

Ver [CONTRIBUTING.md](docs/CONTRIBUTING.md) para más detalles.

---

## 📄 Licencia

Privado © 2026

---

## 🆘 Soporte

- **Issues:** [GitHub Issues](https://github.com/egdev6/agent-teams/issues)
- **Documentación:** [docs/](docs/)
- **Ejemplos:** [examples/](examples/)

---

**¿Preguntas?** Abre un issue o consulta la [documentación completa](docs/README.md).
