# RUNBOOK SECURITY - ATLAS GSE

## 1) Incidente de fuga de datos tenant
1. Activar modo incidente y congelar despliegues.
2. Ejecutar `npm run security:scan` y `npm run test:redteam`.
3. Revisar `AuditLog` por `requestId`, `tenantId` y `actorUserId`.
4. Revocar sesiones de usuarios impactados.
5. Rotar secretos de auth y redis.
6. Revalidar endpoints críticos (`candidatos/bulk`, `admin/asignar`, `candidatos/[id]`).

## 2) Revocación de sesiones
- Invalidar tokens JWT rotando `NEXTAUTH_SECRET`.
- Eliminar sesiones activas en tabla `Session`.
- Obligar re-login.

## 3) Rotación de secretos
- Rotar `NEXTAUTH_SECRET`, `DATABASE_URL`, `UPSTASH_REDIS_REST_TOKEN`.
- Confirmar readiness (`/api/health/readiness`) después de cada rotación.

## 4) Verificación tenant isolation
- Validar reglas ABAC con suite red-team.
- Confirmar que rutas protegidas no importan `db` directamente.
- Confirmar rutas bulk resuelven IDs autorizados antes de mutar.

## 5) Checklist post-incidente
- [ ] RCA documentado
- [ ] Evidencia de auditoría exportada
- [ ] Tests de regresión agregados
- [ ] Alertas de rate-limit revisadas
- [ ] Cierre aprobado por Security
