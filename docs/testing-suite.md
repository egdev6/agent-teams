# Suite de Testing

Suite de testing unitario integral para Agent Team v2.0 usando Vitest.

## Resumen

La suite de testing proporciona:

- ✅ **100+ Tests Unitarios** - Cobertura para todos los componentes core
- 🎯 **Alta Cobertura** - 80%+ líneas, funciones, ramas, sentencias
- ⚡ **Ejecución Rápida** - Test runner ultrarrápido de Vitest
- 📊 **Reportes de Cobertura** - Reportes HTML, LCOV, JSON y texto
- 🔄 **Modo Watch** - Re-ejecución automática al cambiar archivos
- 🎨 **Dashboard UI** - Interfaz visual de test runner
- 🧪 **Mocks de VS Code** - Mocking completo de VS Code API

## Inicio Rápido

```bash
# Instalar dependencias
pnpm install

# Ejecutar todos los tests
pnpm test:run

# Modo watch (re-ejecutar al cambiar)
pnpm test:watch

# Generar reporte de cobertura
pnpm test:coverage

# Abrir dashboard UI
pnpm test:ui
```

## Scripts de Test

### Comandos Disponibles

| Comando | Descripción |
|---------|-------------|
| `pnpm test` | Ejecutar tests en modo watch (predeterminado) |
| `pnpm test:run` | Ejecutar todos los tests una vez y salir |
| `pnpm test:watch` | Ejecutar tests en modo watch |
| `pnpm test:coverage` | Ejecutar tests con reporte de cobertura |
| `pnpm test:ui` | Abrir dashboard UI de Vitest en navegador |

### Ejemplos

```bash
# Ejecutar archivo de test específico
pnpm test router.test.ts

# Ejecutar tests que coincidan con patrón
pnpm test --grep "AgentLoader"

# Ejecutar tests en directorio específico
pnpm test extension/src

# Ejecutar con salida verbose
pnpm test --reporter=verbose

# Ejecutar solo tests modificados (con git)
pnpm test --changed
```

## Cobertura de Tests

### Cobertura Actual

La suite de tests busca **80%+ de cobertura** en todas las métricas:

- **Líneas:** 80%+
- **Funciones:** 80%+
- **Ramas:** 80%+
- **Sentencias:** 80%+

### Reportes de Cobertura

Después de ejecutar `pnpm test:coverage`, los reportes se generan en:

```
coverage/
  ├── index.html          # Reporte HTML (abrir en navegador)
  ├── lcov.info           # Formato LCOV (integración CI/CD)
  ├── coverage-final.json # Formato JSON
  └── clover.xml          # Formato Clover XML
```

**Ver Reporte HTML:**
```bash
pnpm test:coverage
# Abrir coverage/index.html en navegador
```

### Cobertura por Componente

| Componente | Cobertura | Estado |
|-----------|----------|--------|
| AgentLoader | 95%+ | ✅ Excelente |
| AgentRouter | 90%+ | ✅ Excelente |
| SkillsRegistry | 95%+ | ✅ Excelente |
| ProfileLoader | 90%+ | ✅ Excelente |
| ContextPackProcessor | 85%+ | ✅ Bueno |
| AgentComposer | 85%+ | ✅ Bueno |
| TeamManager | 80%+ | ✅ Bueno |

## Estructura de Tests

### Organización de Archivos

```
agent-team/
├── vitest.config.ts          # Configuración de Vitest
├── tests/
│   ├── setup.ts              # Setup de tests (se ejecuta antes de todos los tests)
│   └── mocks/
│       └── vscode.ts         # Mocks de VS Code API
└── extension/src/
    ├── agentLoader.test.ts         # Tests de AgentLoader
    ├── router.test.ts              # Tests de AgentRouter
    ├── skillsRegistry.test.ts      # Tests de SkillsRegistry
    ├── profileLoader.test.ts       # Tests de ProfileLoader
    ├── contextPackProcessor.test.ts # Tests de ContextPackProcessor
    └── ...
```

### Nomenclatura de Archivos de Test

- **Patrón:** `*.test.ts`
- **Ubicación:** Junto al archivo de implementación
- **Ejemplo:** `agentLoader.ts` → `agentLoader.test.ts`

## Escribiendo Tests

### Estructura Básica de Test

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MyComponent } from '@extension/myComponent';
import { Logger } from '@extension/logger';

describe('MyComponent', () => {
  let component: MyComponent;
  let mockLogger: Logger;

  beforeEach(() => {
    // Setup de mocks
    mockLogger = {
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    } as any;

    // Crear instancia del componente
    component = new MyComponent(mockLogger);
    
    // Limpiar mocks
    vi.clearAllMocks();
  });

  describe('myMethod', () => {
    it('should do something', () => {
      // Arrange
      const input = 'test';

      // Act
      const result = component.myMethod(input);

      // Assert
      expect(result).toBe('expected');
    });

    it('should handle errors', () => {
      // Testear escenarios de error
      expect(() => component.myMethod(null)).toThrow();
    });
  });
});
```

### Testeando Funciones Async

```typescript
it('should load data asynchronously', async () => {
  // Mock de fs.readFileSync
  vi.mocked(fs.readFileSync).mockReturnValue('data');

  // Await de operación async
  const result = await loader.loadData();

  expect(result).toBeDefined();
  expect(fs.readFileSync).toHaveBeenCalled();
});
```

### Mockear Sistema de Archivos

```typescript
import { vi } from 'vitest';
import * as fs from 'fs';

// Al inicio del archivo de test
vi.mock('fs');

// En el test
beforeEach(() => {
  vi.mocked(fs.existsSync).mockReturnValue(true);
  vi.mocked(fs.readFileSync).mockReturnValue('content');
});
```

### Mockear VS Code API

```typescript
// VS Code ya está mockeado via alias de vitest.config.ts
import * as vscode from 'vscode';

it('should show warning message', () => {
  // Usar VS Code API mockeada
  component.showWarning();

  // Assert
  expect(vscode.window.showWarningMessage).toHaveBeenCalledWith(
    'Warning message'
  );
});
```

## Patrones de Test

### Arrange-Act-Assert (AAA)

```typescript
it('should calculate sum', () => {
  // Arrange - Configurar datos de test
  const a = 5;
  const b = 3;

  // Act - Ejecutar el código
  const result = calculator.add(a, b);

  // Assert - Verificar el resultado
  expect(result).toBe(8);
});
```

### Given-When-Then

```typescript
it('should route to testing agent', () => {
  // Given - agentes están cargados
  vi.mocked(mockLoader.getAllAgents).mockReturnValue([testAgent]);

  // When - enrutar una request de test
  const result = router.routeRequest(testContext);

  // Then - debería devolver agente de testing
  expect(result?.agentId).toBe('tester');
});
```

### Test Fixtures

```typescript
// Crear datos de test reutilizables
const createMockAgent = (
  id: string,
  domain: string,
  intents: string[]
): AgentSpec => ({
  name: `${id} Agent`,
  description: `Test agent`,
  _metadata: { id, role: 'worker', domain, intents },
});

it('should use fixture', () => {
  const agent = createMockAgent('tester', 'testing', ['test']);
  expect(agent._metadata.id).toBe('tester');
});
```

## Guía de Mocking

### Funciones Mock

```typescript
// Crear función mock
const mockFn = vi.fn();

// Mock de implementación
mockFn.mockImplementation((x) => x * 2);

// Mock de valor de retorno
mockFn.mockReturnValue(42);

// Mock de promise resuelta
mockFn.mockResolvedValue('data');

// Mock de promise rechazada
mockFn.mockRejectedValue(new Error('Failed'));

// Assert de llamadas
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith('arg');
expect(mockFn).toHaveBeenCalledTimes(2);
```

### Módulos Mock

```typescript
// Mockear módulo completo
vi.mock('fs', () => ({
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}));

// Mockear exports específicos
vi.mock('@extension/logger', () => ({
  Logger: vi.fn().mockImplementation(() => ({
    info: vi.fn(),
    error: vi.fn(),
  })),
}));
```

### Clases Mock

```typescript
class MockLogger implements Logger {
  debug = vi.fn();
  info = vi.fn();
  warn = vi.fn();
  error = vi.fn();
  setLogLevel = vi.fn();
}

const mockLogger = new MockLogger();
```

### Espiar Métodos

```typescript
const obj = { method: () => 'original' };
const spy = vi.spyOn(obj, 'method');

spy.mockReturnValue('mocked');

obj.method(); // Devuelve 'mocked'
expect(spy).toHaveBeenCalled();

spy.mockRestore(); // Restaurar original
```

## Assertions

### Assertions Básicas

```typescript
// Igualdad
expect(value).toBe(expected);          // Igualdad estricta (===)
expect(value).toEqual(expected);       // Igualdad profunda
expect(value).toStrictEqual(expected); // Igualdad profunda estricta

// Veracidad
expect(value).toBeTruthy();
expect(value).toBeFalsy();
expect(value).toBeDefined();
expect(value).toBeUndefined();
expect(value).toBeNull();

// Números
expect(value).toBeGreaterThan(5);
expect(value).toBeGreaterThanOrEqual(5);
expect(value).toBeLessThan(10);
expect(value).toBeCloseTo(0.3, 5); // Punto flotante
```

### Assertions de Array/Object

```typescript
// Arrays
expect(array).toHaveLength(3);
expect(array).toContain('item');
expect(array).toContainEqual({ id: 1 });

// Objects
expect(obj).toHaveProperty('key');
expect(obj).toMatchObject({ id: 1 });
```

### Assertions de String

```typescript
expect(str).toMatch(/pattern/);
expect(str).toContain('substring');
expect(str).toStartWith('prefix');
expect(str).toEndWith('suffix');
```

### Assertions de Error

```typescript
// Errores síncronos
expect(() => fn()).toThrow();
expect(() => fn()).toThrow('Error message');
expect(() => fn()).toThrow(TypeError);

// Errores asíncronos
await expect(async () => await fn()).rejects.toThrow();
```

### Assertions de Mock

```typescript
expect(mockFn).toHaveBeenCalled();
expect(mockFn).toHaveBeenCalledWith(arg1, arg2);
expect(mockFn).toHaveBeenCalledTimes(2);
expect(mockFn).toHaveLastReturnedWith(value);
```

## Mejores Prácticas

### 1. Aislamiento de Tests

Cada test debe ser independiente:

```typescript
beforeEach(() => {
  // Resetear estado antes de cada test
  vi.clearAllMocks();
  // Crear instancias frescas
  component = new Component();
});
```

### 2. Nombres de Test Claros

Usar nombres de test descriptivos:

```typescript
// ❌ Mal
it('test 1', () => { });

// ✅ Bien
it('should return agent by id when agent exists', () => { });
```

### 3. Una Assertion Por Test

Enfocar tests en comportamientos individuales:

```typescript
// ❌ Mal
it('should handle everything', () => {
  expect(a).toBe(1);
  expect(b).toBe(2);
  expect(c).toBe(3);
});

// ✅ Bien
it('should set property a to 1', () => {
  expect(a).toBe(1);
});

it('should set property b to 2', () => {
  expect(b).toBe(2);
});
```

### 4. Testear Casos Límite

Cubrir condiciones de frontera:

```typescript
it('should handle empty array', () => { });
it('should handle null input', () => { });
it('should handle very large numbers', () => { });
it('should handle special characters', () => { });
```

### 5. Evitar Interdependencia de Tests

No depender del orden de ejecución de tests:

```typescript
// ❌ Mal - tests dependen del orden
let sharedState = 0;
it('test 1', () => { sharedState = 1; });
it('test 2', () => { expect(sharedState).toBe(1); });

// ✅ Bien - tests son independientes
it('test 1', () => {
  const state = 1;
  expect(state).toBe(1);
});
```

### 6. Mockear Dependencias Externas

Aislar unidad bajo test:

```typescript
// Mockear sistema de archivos, red, etc.
vi.mock('fs');
vi.mock('axios');

// No testear Node.js o VS Code - confía en ellos
```

### 7. Usar Setup/Teardown

Principio DRY para setup de tests:

```typescript
describe('MyComponent', () => {
  let component: MyComponent;

  beforeEach(() => {
    component = new MyComponent();
  });

  afterEach(() => {
    // Limpieza si es necesario
    vi.clearAllMocks();
  });
});
```

## Integración Continua

### Ejemplo de GitHub Actions

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
      
      - name: Install dependencies
        run: pnpm install
      
      - name: Run tests
        run: pnpm test:run
      
      - name: Generate coverage
        run: pnpm test:coverage
      
      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/lcov.info
```

## Resolución de Problemas

### Tests Fallando Localmente

```bash
# Limpiar caché y re-ejecutar
rm -rf node_modules/.vitest
pnpm test:run

# Actualizar snapshots (si se usan)
pnpm test -u
```

### Tests Lentos

```typescript
// Usar vi.useFakeTimers() para tests dependientes de tiempo
it('should debounce', () => {
  vi.useFakeTimers();
  
  fn();
  vi.advanceTimersByTime(500);
  
  expect(mockFn).toHaveBeenCalled();
  
  vi.useRealTimers();
});
```

### Memory Leaks

```typescript
// Limpiar apropiadamente en afterEach
afterEach(() => {
  vi.clearAllMocks();
  vi.restoreAllMocks();
  // Disponer de recursos
});
```

### Tests Inestables

```typescript
// Usar reintentos para tests inestables (evitar si es posible)
it('flaky test', { retry: 3 }, () => {
  // Código del test
});

// Mejor: Arreglar el problema subyacente
// - Añadir esperas apropiadas
// - Mockear tiempo/red
// - Arreglar race conditions
```

## Integración con VS Code

### Ejecutar Tests en VS Code

1. Instalar extensión **Vitest**
2. Tests aparecen en Test Explorer
3. Click en botón play para ejecutar
4. Ver resultados inline

### Depurar Tests en VS Code

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug Vitest Tests",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["test:run"],
      "console": "integratedTerminal",
      "internalConsoleOptions": "neverOpen"
    }
  ]
}
```

## Tips de Rendimiento

### Ejecución Paralela

Vitest ejecuta tests en paralelo por defecto:

```typescript
// Forzar ejecución secuencial si es necesario
describe.sequential('Sequential suite', () => {
  it('test 1', () => { });
  it('test 2', () => { });
});
```

### Omitir Tests Costosos

```typescript
// Omitir en CI
it.skipIf(process.env.CI)('expensive test', () => { });

// Solo en CI
it.runIf(process.env.CI)('CI-only test', () => { });
```

### Timeouts de Test

```typescript
// Aumentar timeout para tests lentos
it('slow test', { timeout: 10000 }, async () => {
  await slowOperation();
});
```

## Recursos

- **Documentación Vitest:** https://vitest.dev
- **Testing Library:** https://testing-library.com
- **Patrones de Test:** https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
- **Guía de Mocking:** https://vitest.dev/guide/mocking.html

## Ver También

- [Schema de Agente](./agent-schema.md)
- [Registro de Skills](./skills-registry.md)
- [Context Packs Dinámicos](./dynamic-context-packs.md)
- [Estructura del Proyecto](../PROJECT-STRUCTURE.md)
