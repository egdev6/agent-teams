# Equipos de Agentes

**Versión:** 2.0.0 | **Estado:** ✅ Stable Release  
**Lanzamiento:** Febrero 2026

Sistema completo de gestión de agentes IA para GitHub Copilot con extensión VS Code integrada. Crea, gestiona y orquesta agentes personalizados con arquitectura de kits reutilizables y perfiles configurables.

> 🎉 **v2.0.0 ya está estable!** Sistema de Kits & Teams con composición dinámica, estrategias avanzadas de merge y registro de habilidades.  
> 📋 Ver [Hoja de Ruta](docs/roadmap.md) para características próximas en v2.1+

---

## 🚀 Características Clave

✅ **Extensión VS Code Todo-en-Uno** - Wizard visual, validación en tiempo real, routing inteligente  
✅ **Sistema Kits & Teams (v2.0)** - Agentes reutilizables con placeholders y composición dinámica  
✅ **Contract Discipline** - Control preciso de contexto, output modes, delegación y skills  
✅ **Context Packs Dinámicos** - Templates con variables, condicionales y loops  
✅ **Domain Presets** - Configuraciones inteligentes por dominio y subdominio  
✅ **Orquestación Avanzada** - Routing automático, delegación con protección anti-loops  
✅ **Source of Truth** - Specs YAML versionables con generación automática  
✅ **CLI Tools** - Automatización para CI/CD y workflows avanzados

---

## 🚀 Instalación Rápida

### Para Usuarios de la Extensión

**Instalar desde Marketplace (Próximamente):**
```
1. VS Code → Extensions
2. Buscar "Agent Teams"
3. Instalar
```

**Instalar desde código:**
```bash
cd extension
pnpm install
pnpm package
code --install-extension agent-teams-extension-0.1.0.vsix
```

### Para Desarrolladores

```bash
# Clonar repositorio
git clone https://github.com/egdev6/agent-teams.git
cd agent-teams

# Instalar dependencias
pnpm install
pnpm -C extension install

# Compilar extensión
pnpm -C extension compile

# Desarrollar (presiona F5 en VS Code)
code .
```

---

## 🎯 Primeros Pasos

### 1. Crear Tu Primer Agente

```
1. Abrir VS Code en tu proyecto
2. Cmd/Ctrl + Shift + P
3. "Agent Team: Create New Agent"
4. Seguir el wizard interactivo
5. ✅ Agente listo para usar
```

### 2. Usar el Agente

```
# En Copilot Chat
@tu-agente tu solicitud aquí
```

### 3. Quick Start con Kits (v2.0)

```bash
# Inicializar perfil de proyecto
agent-teams profile:init --id my-app --type frontend

# Crear equipo con kits
agent-teams team:create --id dev-team --kits testing-vitest

# Sincronizar agentes
agent-teams team:sync --team dev-team

# ¡Listo! Usa los agentes en Copilot Chat
```

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
pnpm -C extension compile
# Presiona F5 para debug

# Tests
pnpm test

# Build
pnpm build
```

**Convenciones:**
- TypeScript strict mode
- ESLint + Prettier
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
