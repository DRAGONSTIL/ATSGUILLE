# Roadmap de mejoras (funcionalidad + estética) — ATLAS ATS Ultra-Luxury

## Objetivo
Llevar ATLAS a un nivel comparable con ATS enterprise comerciales, con una experiencia premium, confiable y altamente operable para equipos de reclutamiento.

## Fase 1 (implementado en esta iteración)

### Funcionalidad
- API de tareas con filtros avanzados:
  - `estatus`, `prioridad`, `q` (búsqueda), `overdue`, `onlyMine`, `page`, `limit`.
- Respuesta paginada en `/api/tareas` (`pagination.page`, `limit`, `total`, `totalPages`).
- Orden operativo de tareas por estatus + prioridad + fecha límite.

### UX/Producto
- Base lista para incorporar vistas de productividad (lista, board, calendario) sin romper contratos de API.

## Fase 2 (siguiente sprint recomendado)

### Funcionalidad
1. Vistas en frontend para tareas:
   - Filtros visibles (chips/smart filters), guardado de vistas y presets por usuario.
   - Quick actions inline: reasignar, mover estado, posponer, marcar bloqueada.
2. Metas:
   - Historial de avances (`valorActual`) y check-ins semanales.
   - Alertas por riesgo (meta vencida o avance insuficiente por ventana temporal).
3. Seguridad:
   - Homologar todas las rutas privadas al mismo patrón de autorización central.

### Estética
1. Design tokens premium globales (oro/obsidiana/platino).
2. Motion system (microinteracciones en hover, confirmaciones y cambios de estado).
3. Empty states y skeletons con narrativa de producto premium.

## Fase 3 (escala enterprise)

### Funcionalidad
- Cola de emails durable (BullMQ/SQS/Cloud Tasks) con DLQ persistente.
- Telemetría de negocio: SLA de tareas, throughput por reclutador, alertas automáticas.
- Paginación cursor-based para volúmenes altos.

### Estética
- Cockpit ejecutivo en dashboard con KPIs de desempeño y riesgos.
- Modo presentación para dirección y reportes con diseño editorial premium.

## Criterio de éxito
- Reducción de tiempo de gestión operativa por reclutador.
- Menos tareas vencidas por sprint.
- Mayor satisfacción de UX en pruebas internas (NPS de herramienta interna).
