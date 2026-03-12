# Auditoría integral técnica y de seguridad (2026-03-11)

## 1) Alcance y metodología

Se revisó el proyecto en cinco ejes:

1. **Arquitectura y mantenibilidad** (estructura de módulos, acoplamiento, deuda técnica).
2. **Seguridad de aplicación** (authN/authZ, aislamiento multi-tenant, hardening de API, manejo de errores).
3. **Datos y persistencia** (modelo Prisma, índices, consistencia y riesgos de crecimiento).
4. **Calidad de ingeniería** (lint, typecheck, pruebas, build reproducible).
5. **Dependencias y operación** (vulnerabilidades NPM, readiness operativa y runbooks).

## 2) Resumen ejecutivo

Estado general: **Bueno con riesgos puntuales importantes**.

- La base multi-tenant y la capa de seguridad central existen y están en uso en rutas sensibles.
- La suite de pruebas y red-team pasa en el entorno actual.
- El build productivo compila correctamente.
- Persisten hallazgos P1/P2: un error de hooks en frontend, vulnerabilidades moderadas en dependencias y deuda de consistencia en endpoints legacy.

## 3) Hallazgos por severidad

### P1 — Alto impacto

1. **Error real de calidad en frontend (hook condicional)**
   - `eslint` falla por `react-hooks/rules-of-hooks` en `dashboard-layout.tsx`.
   - Impacto: comportamiento impredecible de render/hidratación, posibles bugs intermitentes en UI.
   - Recomendación: mover el `useEffect` de redirección antes de cualquier `return` condicional para mantener orden de hooks estable.

2. **Dependencias con vulnerabilidades moderadas en runtime**
   - `npm audit --omit=dev` reporta 5 vulnerabilidades (3 moderadas, 2 bajas), incluyendo cadena `react-syntax-highlighter -> refractor -> prismjs`.
   - Impacto: superficie XSS/DOM clobbering en renderizado de código si se usan entradas no confiables.
   - Recomendación: plan de upgrade controlado a `react-syntax-highlighter@16.x` y validación de compatibilidad visual/SSR.

### P2 — Riesgo medio

3. **Cobertura de hardening no totalmente homogénea**
   - Existe capa segura (`withApiAuth`, `requireAuthorization`), pero la base mantiene mezcla entre rutas modernas y legacy.
   - Impacto: regresiones futuras por inconsistencias de patrón (seguridad por convención, no por enforcement universal).
   - Recomendación: estandarizar un wrapper obligatorio para todas las rutas privadas y bloquear PRs que no lo usen.

4. **Modelo de datos sin restricciones únicas de negocio en candidatos por tenant**
   - Hay índices por `email` y `equipoId`, pero no una unique compuesta de deduplicación por tenant/equipo.
   - Impacto: duplicados lógicos crecientes en importaciones y operaciones masivas.
   - Recomendación: evaluar `@@unique([equipoId, email])` (o equivalente por empresa, según negocio).

5. **Cola de emails en memoria (no durable)**
   - La documentación ya reconoce el estado stub/in-memory.
   - Impacto: pérdida de trabajos en reinicios y falta de garantías operativas.
   - Recomendación: migrar a cola durable (BullMQ/Redis, SQS, Cloud Tasks) con retries observables y DLQ persistente.

### P3 — Mejora recomendada

6. **Archivo de UI muy grande y con responsabilidades mixtas**
   - `dashboard-layout.tsx` concentra mucha lógica de navegación, shortcuts, sesión, theming y render.
   - Impacto: mantenibilidad baja, mayor probabilidad de regresiones en cambios pequeños.
   - Recomendación: descomponer en subcomponentes (`TopBar`, `UserMenu`, `SidebarNav`, `GlobalShortcuts`).

7. **Warning de configuración NPM de entorno (`http-proxy`)**
   - No rompe build/tests, pero indica higiene de entorno pendiente.
   - Recomendación: limpiar configuración global/local de npm para evitar sorpresas en CI futuras.

## 4) Resultados de validación ejecutada

- `npm run lint` → **FAIL** (1 error de hooks).
- `npm run typecheck` → **PASS**.
- `npm test` → **PASS** (23/23).
- `npm run test:redteam` → **PASS** (6/6).
- `npm run security:scan` → **PASS**.
- `npm run build` → **PASS**.
- `npm audit --omit=dev` → **FAIL** por vulnerabilidades reportadas.

## 5) Evaluación por dominio

### 5.1 Seguridad de aplicación

Fortalezas:
- Capa central para sesión, roles, tenant scope y errores sanitizados.
- Buen patrón en rutas críticas con `withApiAuth` + autorización explícita.
- Pruebas red-team enfocadas en aislamiento tenant y demo mode.

Riesgos:
- Convivencia de rutas legacy puede derivar en desalineación con el patrón seguro.
- Hardening depende de disciplina de implementación endpoint por endpoint.

### 5.2 Multi-tenant y autorización

Fortalezas:
- La lógica ABAC/RBAC está explícita y testeada.
- Existen utilidades para evitar revelar existencia de recursos cross-tenant (`safe404`).

Riesgos:
- Aún requiere consolidación para enforcement uniforme en el 100% de endpoints privados.

### 5.3 Calidad de código y arquitectura

Fortalezas:
- TypeScript y tests automatizados activos.
- Build productivo funcional con Next.js standalone.

Riesgos:
- Debt de componentes grandes en frontend.
- Falla de lint actualmente bloquea estándar de calidad declarado en README.

### 5.4 Datos y rendimiento

Fortalezas:
- Esquema Prisma robusto y con índices en campos de consulta frecuentes.
- Modelado multi-tenant claro en entidades núcleo.

Riesgos:
- Falta de constraints únicas de negocio para evitar duplicados silenciosos.
- Riesgo de crecimiento de tablas operativas (p.ej. auditoría/intake/nonces) sin política de retención visible.

### 5.5 Operación y DevSecOps

Fortalezas:
- Runbook de seguridad y health endpoints disponibles.
- Dockerización y build reproducible.

Riesgos:
- Dependencias con vulnerabilidades abiertas.
- Falta de trazabilidad distribuida/telemetría avanzada para incident response de mayor escala.

## 6) Plan de remediación priorizado

### Semana 1 (rápido, alto retorno)
1. Corregir hook condicional y dejar `lint` en verde.
2. Crear issue técnico para upgrade seguro de `react-syntax-highlighter`.
3. Agregar gate de CI que falle si `lint` o `audit` superan umbral definido.

### Semana 2-3
4. Estandarizar plantilla única de rutas privadas (`withApiAuth` obligatorio).
5. Añadir test de regresión que detecte rutas privadas fuera del patrón.
6. Diseñar migración de cola email a backend durable.

### Mes 1
7. Definir constraints de dedupe por tenant para candidatos.
8. Descomponer layout principal en componentes aislados.
9. Definir retención/archivado para tablas de auditoría e intake.

## 7) Conclusión

La plataforma está **bien encaminada para producción controlada**, con bases sólidas de seguridad y multi-tenant. Sin embargo, para robustez enterprise se deben cerrar cuanto antes los puntos de calidad (lint), cadena de dependencias vulnerables y consistencia de hardening en todo endpoint privado.
