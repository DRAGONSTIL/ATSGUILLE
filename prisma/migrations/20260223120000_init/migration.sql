-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('ADMIN', 'GERENTE', 'RECLUTADOR');

-- CreateEnum
CREATE TYPE "EstatusCandidato" AS ENUM ('REGISTRADO', 'EN_PROCESO', 'ENTREVISTA', 'CONTRATADO', 'RECHAZADO');

-- CreateEnum
CREATE TYPE "EstatusVacante" AS ENUM ('BORRADOR', 'PUBLICADA', 'PAUSADA', 'CERRADA');

-- CreateEnum
CREATE TYPE "PrioridadVacante" AS ENUM ('BAJA', 'MEDIA', 'ALTA', 'URGENTE');

-- CreateEnum
CREATE TYPE "FuenteCandidato" AS ENUM ('LINKEDIN', 'OCC', 'COMPUTRABAJA', 'REFERIDO', 'AGENCIA', 'FERIA_EMPLEO', 'UNIVERSIDAD', 'RED_SOCIAL', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoDocumento" AS ENUM ('CV', 'PORTAFOLIO', 'CERTIFICADO', 'CARTA_RECOMENDACION', 'CONTRATO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoMetrica" AS ENUM ('TIME_TO_HIRE', 'COST_PER_HIRE', 'QUALITY_OF_HIRE', 'OFFER_ACCEPTANCE_RATE', 'SOURCE_EFFECTIVENESS', 'PIPELINE_VELOCITY', 'CANDIDATES_PER_HIRE', 'INTERVIEW_TO_OFFER_RATIO', 'FIRST_YEAR_RETENTION', 'REQUISITION_FILL_RATE');

-- CreateEnum
CREATE TYPE "PeriodoMeta" AS ENUM ('SEMANAL', 'QUINCENAL', 'MENSUAL', 'TRIMESTRAL');

-- CreateEnum
CREATE TYPE "EstatusMeta" AS ENUM ('PENDIENTE', 'EN_PROGRESO', 'COMPLETADA', 'EXCEDIDA', 'VENCIDA');

-- CreateEnum
CREATE TYPE "TipoActividad" AS ENUM ('CREAR_CANDIDATO', 'ACTUALIZAR_ESTATUS', 'AGENDAR_ENTREVISTA', 'ENVIAR_OFERTA', 'CONTRATAR', 'RECHAZAR', 'SUBIR_DOCUMENTO', 'ENVIAR_EMAIL', 'NOTA_AGREGADA', 'SINCRONIZACION');

-- CreateEnum
CREATE TYPE "EstatusDemoKey" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA', 'USADA', 'EXPIRADA');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,
    "refresh_token_expires_in" INTEGER,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "imagen" TEXT,
    "telefono" TEXT,
    "puesto" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'RECLUTADOR',
    "empresaId" TEXT,
    "equipoId" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoAcceso" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "logo" TEXT,
    "direccion" TEXT,
    "telefono" TEXT,
    "sitioWeb" TEXT,
    "industria" TEXT,
    "tamano" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "configuracion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipo" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "color" TEXT,
    "empresaId" TEXT NOT NULL,
    "appsScriptUrl" TEXT,
    "ultimoSync" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Equipo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Candidato" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT,
    "telefonoAlt" TEXT,
    "direccion" TEXT,
    "ciudad" TEXT,
    "estado" TEXT,
    "pais" TEXT,
    "codigoPostal" TEXT,
    "linkedin" TEXT,
    "portfolio" TEXT,
    "fuente" "FuenteCandidato" NOT NULL DEFAULT 'OTRO',
    "estatus" "EstatusCandidato" NOT NULL DEFAULT 'REGISTRADO',
    "notas" TEXT,
    "tags" TEXT,
    "rating" INTEGER,
    "salarioEsperado" DOUBLE PRECISION,
    "disponibilidad" TEXT,
    "googleSheetRowId" TEXT,
    "vacanteId" TEXT,
    "reclutadorId" TEXT,
    "equipoId" TEXT NOT NULL,
    "fechaEntrevista" TIMESTAMP(3),
    "fechaOferta" TIMESTAMP(3),
    "fechaContratacion" TIMESTAMP(3),
    "fechaRechazo" TIMESTAMP(3),
    "motivoRechazo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Candidato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Vacante" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "codigo" TEXT,
    "descripcion" TEXT,
    "requisitos" TEXT,
    "beneficios" TEXT,
    "ubicacion" TEXT,
    "modalidad" TEXT,
    "tipoContrato" TEXT,
    "salarioMin" DOUBLE PRECISION,
    "salarioMax" DOUBLE PRECISION,
    "salarioMostrar" BOOLEAN NOT NULL DEFAULT true,
    "estatus" "EstatusVacante" NOT NULL DEFAULT 'BORRADOR',
    "prioridad" "PrioridadVacante" NOT NULL DEFAULT 'MEDIA',
    "empresaId" TEXT NOT NULL,
    "reclutadorId" TEXT,
    "equipoId" TEXT,
    "fechaPublicacion" TIMESTAMP(3),
    "fechaLimite" TIMESTAMP(3),
    "vacantes" INTEGER NOT NULL DEFAULT 1,
    "vacantesLlenas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Vacante_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nombreOriginal" TEXT,
    "tipo" "TipoDocumento" NOT NULL DEFAULT 'CV',
    "url" TEXT NOT NULL,
    "tamanho" INTEGER,
    "mimetype" TEXT,
    "candidatoId" TEXT NOT NULL,
    "subidoPorId" TEXT,
    "contenido" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitacion" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "rol" "Rol" NOT NULL DEFAULT 'RECLUTADOR',
    "empresaId" TEXT,
    "equipoId" TEXT,
    "token" TEXT NOT NULL,
    "mensaje" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usada" BOOLEAN NOT NULL DEFAULT false,
    "usadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "invitadoPorId" TEXT,

    CONSTRAINT "Invitacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SyncLog" (
    "id" TEXT NOT NULL,
    "equipoId" TEXT NOT NULL,
    "registrosProcesados" INTEGER NOT NULL DEFAULT 0,
    "registrosNuevos" INTEGER NOT NULL DEFAULT 0,
    "registrosActualizados" INTEGER NOT NULL DEFAULT 0,
    "errores" TEXT,
    "detalles" TEXT,
    "duracion" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SyncLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MetricaConfig" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT NOT NULL,
    "tipo" "TipoMetrica" NOT NULL,
    "nombre" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "peso" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "configuracion" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MetricaConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Meta" (
    "id" TEXT NOT NULL,
    "reclutadorId" TEXT NOT NULL,
    "tipo" "TipoMetrica" NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "valorActual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "periodo" "PeriodoMeta" NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "estatus" "EstatusMeta" NOT NULL DEFAULT 'PENDIENTE',
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VacanteMetrica" (
    "id" TEXT NOT NULL,
    "vacanteId" TEXT NOT NULL,
    "vistas" INTEGER NOT NULL DEFAULT 0,
    "aplicaciones" INTEGER NOT NULL DEFAULT 0,
    "entrevistas" INTEGER NOT NULL DEFAULT 0,
    "ofertas" INTEGER NOT NULL DEFAULT 0,
    "contrataciones" INTEGER NOT NULL DEFAULT 0,
    "tiempoPromedio" INTEGER,
    "costoContratacion" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "VacanteMetrica_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Actividad" (
    "id" TEXT NOT NULL,
    "tipo" "TipoActividad" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "entidad" TEXT,
    "entidadId" TEXT,
    "usuarioId" TEXT,
    "candidatoId" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Actividad_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notificacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "mensaje" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "leida" BOOLEAN NOT NULL DEFAULT false,
    "enlace" TEXT,
    "entidad" TEXT,
    "entidadId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notificacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Entrevista" (
    "id" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "vacanteId" TEXT,
    "reclutadorId" TEXT,
    "tipo" TEXT,
    "titulo" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL,
    "duracion" INTEGER,
    "ubicacion" TEXT,
    "enlace" TEXT,
    "notas" TEXT,
    "feedback" TEXT,
    "rating" INTEGER,
    "estatus" TEXT NOT NULL DEFAULT 'PROGRAMADA',
    "calendarEventId" TEXT,
    "calendarProvider" TEXT,
    "recordatorioEnviado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Entrevista_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntrevistaFeedback" (
    "id" TEXT NOT NULL,
    "entrevistaId" TEXT NOT NULL,
    "entrevistadorId" TEXT NOT NULL,
    "puntualidad" INTEGER,
    "comunicacion" INTEGER,
    "habilidadesTecnicas" INTEGER,
    "culturaFit" INTEGER,
    "experiencia" INTEGER,
    "ratingGeneral" INTEGER,
    "fortalezas" TEXT,
    "areasMejora" TEXT,
    "recomendacion" TEXT,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntrevistaFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Nota" (
    "id" TEXT NOT NULL,
    "titulo" TEXT,
    "contenido" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'GENERAL',
    "entidad" TEXT,
    "entidadId" TEXT,
    "usuarioId" TEXT NOT NULL,
    "candidatoId" TEXT,
    "vacanteId" TEXT,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Nota_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarea" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "prioridad" TEXT NOT NULL DEFAULT 'MEDIA',
    "estatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "fechaLimite" TIMESTAMP(3),
    "entidad" TEXT,
    "entidadId" TEXT,
    "asignadoAId" TEXT,
    "creadoPorId" TEXT NOT NULL,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmailTemplate" (
    "id" TEXT NOT NULL,
    "empresaId" TEXT,
    "nombre" TEXT NOT NULL,
    "asunto" TEXT NOT NULL,
    "cuerpo" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "variables" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Comunicacion" (
    "id" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "remitenteId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "asunto" TEXT,
    "mensaje" TEXT NOT NULL,
    "templateId" TEXT,
    "emailEnviado" BOOLEAN NOT NULL DEFAULT false,
    "emailLeido" BOOLEAN NOT NULL DEFAULT false,
    "leidoEn" TIMESTAMP(3),
    "respuestaRecibida" BOOLEAN NOT NULL DEFAULT false,
    "respuestaEn" TIMESTAMP(3),
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Comunicacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evaluacion" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'TECNICA',
    "duracion" INTEGER,
    "puntajeMaximo" INTEGER NOT NULL DEFAULT 100,
    "puntajeAprobacion" INTEGER,
    "instrucciones" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Evaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PreguntaEvaluacion" (
    "id" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "pregunta" TEXT NOT NULL,
    "tipo" TEXT NOT NULL DEFAULT 'OPCION_MULTIPLE',
    "opciones" TEXT,
    "respuestaCorrecta" TEXT,
    "puntaje" INTEGER NOT NULL DEFAULT 1,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "obligatoria" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PreguntaEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RespuestaEvaluacion" (
    "id" TEXT NOT NULL,
    "evaluacionId" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "vacanteId" TEXT,
    "respuestas" TEXT NOT NULL,
    "puntaje" INTEGER,
    "aprobado" BOOLEAN,
    "tiempoEmpleado" INTEGER,
    "completadoEn" TIMESTAMP(3),
    "revisadoPorId" TEXT,
    "notasRevision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RespuestaEvaluacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scorecard" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "vacanteId" TEXT,
    "criterios" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scorecard_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ScorecardRespuesta" (
    "id" TEXT NOT NULL,
    "scorecardId" TEXT NOT NULL,
    "candidatoId" TEXT NOT NULL,
    "evaluadorId" TEXT NOT NULL,
    "vacanteId" TEXT,
    "respuestas" TEXT NOT NULL,
    "puntajeTotal" INTEGER,
    "recomendacion" TEXT,
    "comentarios" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScorecardRespuesta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DemoKey" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT,
    "empresa" TEXT,
    "telefono" TEXT,
    "mensaje" TEXT,
    "estatus" "EstatusDemoKey" NOT NULL DEFAULT 'APROBADA',
    "rolSolicitado" "Rol" NOT NULL DEFAULT 'RECLUTADOR',
    "usadoPor" TEXT,
    "usadoEn" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "aprobadoPorId" TEXT,
    "aprobadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DemoKey_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_email_idx" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_empresaId_idx" ON "User"("empresaId");

-- CreateIndex
CREATE INDEX "User_equipoId_idx" ON "User"("equipoId");

-- CreateIndex
CREATE INDEX "User_rol_idx" ON "User"("rol");

-- CreateIndex
CREATE INDEX "Empresa_activa_idx" ON "Empresa"("activa");

-- CreateIndex
CREATE INDEX "Equipo_empresaId_idx" ON "Equipo"("empresaId");

-- CreateIndex
CREATE INDEX "Candidato_email_idx" ON "Candidato"("email");

-- CreateIndex
CREATE INDEX "Candidato_estatus_idx" ON "Candidato"("estatus");

-- CreateIndex
CREATE INDEX "Candidato_vacanteId_idx" ON "Candidato"("vacanteId");

-- CreateIndex
CREATE INDEX "Candidato_reclutadorId_idx" ON "Candidato"("reclutadorId");

-- CreateIndex
CREATE INDEX "Candidato_equipoId_idx" ON "Candidato"("equipoId");

-- CreateIndex
CREATE INDEX "Candidato_fuente_idx" ON "Candidato"("fuente");

-- CreateIndex
CREATE INDEX "Candidato_rating_idx" ON "Candidato"("rating");

-- CreateIndex
CREATE INDEX "Vacante_empresaId_idx" ON "Vacante"("empresaId");

-- CreateIndex
CREATE INDEX "Vacante_estatus_idx" ON "Vacante"("estatus");

-- CreateIndex
CREATE INDEX "Vacante_reclutadorId_idx" ON "Vacante"("reclutadorId");

-- CreateIndex
CREATE INDEX "Vacante_prioridad_idx" ON "Vacante"("prioridad");

-- CreateIndex
CREATE INDEX "Documento_candidatoId_idx" ON "Documento"("candidatoId");

-- CreateIndex
CREATE INDEX "Documento_tipo_idx" ON "Documento"("tipo");

-- CreateIndex
CREATE UNIQUE INDEX "Invitacion_token_key" ON "Invitacion"("token");

-- CreateIndex
CREATE INDEX "Invitacion_token_idx" ON "Invitacion"("token");

-- CreateIndex
CREATE INDEX "Invitacion_email_idx" ON "Invitacion"("email");

-- CreateIndex
CREATE INDEX "Invitacion_expiresAt_idx" ON "Invitacion"("expiresAt");

-- CreateIndex
CREATE INDEX "Invitacion_usada_idx" ON "Invitacion"("usada");

-- CreateIndex
CREATE INDEX "SyncLog_equipoId_idx" ON "SyncLog"("equipoId");

-- CreateIndex
CREATE INDEX "SyncLog_createdAt_idx" ON "SyncLog"("createdAt");

-- CreateIndex
CREATE INDEX "MetricaConfig_empresaId_idx" ON "MetricaConfig"("empresaId");

-- CreateIndex
CREATE UNIQUE INDEX "MetricaConfig_empresaId_tipo_key" ON "MetricaConfig"("empresaId", "tipo");

-- CreateIndex
CREATE INDEX "Meta_reclutadorId_idx" ON "Meta"("reclutadorId");

-- CreateIndex
CREATE INDEX "Meta_tipo_idx" ON "Meta"("tipo");

-- CreateIndex
CREATE INDEX "Meta_periodo_idx" ON "Meta"("periodo");

-- CreateIndex
CREATE INDEX "Meta_estatus_idx" ON "Meta"("estatus");

-- CreateIndex
CREATE INDEX "Meta_fechaFin_idx" ON "Meta"("fechaFin");

-- CreateIndex
CREATE INDEX "VacanteMetrica_vacanteId_idx" ON "VacanteMetrica"("vacanteId");

-- CreateIndex
CREATE INDEX "Actividad_tipo_idx" ON "Actividad"("tipo");

-- CreateIndex
CREATE INDEX "Actividad_usuarioId_idx" ON "Actividad"("usuarioId");

-- CreateIndex
CREATE INDEX "Actividad_candidatoId_idx" ON "Actividad"("candidatoId");

-- CreateIndex
CREATE INDEX "Actividad_createdAt_idx" ON "Actividad"("createdAt");

-- CreateIndex
CREATE INDEX "Notificacion_usuarioId_idx" ON "Notificacion"("usuarioId");

-- CreateIndex
CREATE INDEX "Notificacion_leida_idx" ON "Notificacion"("leida");

-- CreateIndex
CREATE INDEX "Notificacion_createdAt_idx" ON "Notificacion"("createdAt");

-- CreateIndex
CREATE INDEX "Entrevista_candidatoId_idx" ON "Entrevista"("candidatoId");

-- CreateIndex
CREATE INDEX "Entrevista_vacanteId_idx" ON "Entrevista"("vacanteId");

-- CreateIndex
CREATE INDEX "Entrevista_fecha_idx" ON "Entrevista"("fecha");

-- CreateIndex
CREATE INDEX "Entrevista_estatus_idx" ON "Entrevista"("estatus");

-- CreateIndex
CREATE INDEX "EntrevistaFeedback_entrevistaId_idx" ON "EntrevistaFeedback"("entrevistaId");

-- CreateIndex
CREATE INDEX "EntrevistaFeedback_entrevistadorId_idx" ON "EntrevistaFeedback"("entrevistadorId");

-- CreateIndex
CREATE INDEX "Nota_usuarioId_idx" ON "Nota"("usuarioId");

-- CreateIndex
CREATE INDEX "Nota_candidatoId_idx" ON "Nota"("candidatoId");

-- CreateIndex
CREATE INDEX "Nota_entidad_entidadId_idx" ON "Nota"("entidad", "entidadId");

-- CreateIndex
CREATE INDEX "Nota_archived_idx" ON "Nota"("archived");

-- CreateIndex
CREATE INDEX "Tarea_asignadoAId_idx" ON "Tarea"("asignadoAId");

-- CreateIndex
CREATE INDEX "Tarea_creadoPorId_idx" ON "Tarea"("creadoPorId");

-- CreateIndex
CREATE INDEX "Tarea_estatus_idx" ON "Tarea"("estatus");

-- CreateIndex
CREATE INDEX "Tarea_fechaLimite_idx" ON "Tarea"("fechaLimite");

-- CreateIndex
CREATE INDEX "EmailTemplate_empresaId_idx" ON "EmailTemplate"("empresaId");

-- CreateIndex
CREATE INDEX "EmailTemplate_tipo_idx" ON "EmailTemplate"("tipo");

-- CreateIndex
CREATE INDEX "Comunicacion_candidatoId_idx" ON "Comunicacion"("candidatoId");

-- CreateIndex
CREATE INDEX "Comunicacion_remitenteId_idx" ON "Comunicacion"("remitenteId");

-- CreateIndex
CREATE INDEX "Comunicacion_tipo_idx" ON "Comunicacion"("tipo");

-- CreateIndex
CREATE INDEX "Comunicacion_createdAt_idx" ON "Comunicacion"("createdAt");

-- CreateIndex
CREATE INDEX "Evaluacion_tipo_idx" ON "Evaluacion"("tipo");

-- CreateIndex
CREATE INDEX "Evaluacion_activo_idx" ON "Evaluacion"("activo");

-- CreateIndex
CREATE INDEX "PreguntaEvaluacion_evaluacionId_idx" ON "PreguntaEvaluacion"("evaluacionId");

-- CreateIndex
CREATE INDEX "RespuestaEvaluacion_evaluacionId_idx" ON "RespuestaEvaluacion"("evaluacionId");

-- CreateIndex
CREATE INDEX "RespuestaEvaluacion_candidatoId_idx" ON "RespuestaEvaluacion"("candidatoId");

-- CreateIndex
CREATE UNIQUE INDEX "RespuestaEvaluacion_evaluacionId_candidatoId_key" ON "RespuestaEvaluacion"("evaluacionId", "candidatoId");

-- CreateIndex
CREATE INDEX "Scorecard_vacanteId_idx" ON "Scorecard"("vacanteId");

-- CreateIndex
CREATE INDEX "ScorecardRespuesta_scorecardId_idx" ON "ScorecardRespuesta"("scorecardId");

-- CreateIndex
CREATE INDEX "ScorecardRespuesta_candidatoId_idx" ON "ScorecardRespuesta"("candidatoId");

-- CreateIndex
CREATE INDEX "ScorecardRespuesta_evaluadorId_idx" ON "ScorecardRespuesta"("evaluadorId");

-- CreateIndex
CREATE UNIQUE INDEX "DemoKey_key_key" ON "DemoKey"("key");

-- CreateIndex
CREATE INDEX "DemoKey_key_idx" ON "DemoKey"("key");

-- CreateIndex
CREATE INDEX "DemoKey_email_idx" ON "DemoKey"("email");

-- CreateIndex
CREATE INDEX "DemoKey_estatus_idx" ON "DemoKey"("estatus");

-- CreateIndex
CREATE INDEX "DemoKey_expiresAt_idx" ON "DemoKey"("expiresAt");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Equipo" ADD CONSTRAINT "Equipo_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidato" ADD CONSTRAINT "Candidato_vacanteId_fkey" FOREIGN KEY ("vacanteId") REFERENCES "Vacante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidato" ADD CONSTRAINT "Candidato_reclutadorId_fkey" FOREIGN KEY ("reclutadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Candidato" ADD CONSTRAINT "Candidato_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacante" ADD CONSTRAINT "Vacante_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Vacante" ADD CONSTRAINT "Vacante_reclutadorId_fkey" FOREIGN KEY ("reclutadorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitacion" ADD CONSTRAINT "Invitacion_invitadoPorId_fkey" FOREIGN KEY ("invitadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SyncLog" ADD CONSTRAINT "SyncLog_equipoId_fkey" FOREIGN KEY ("equipoId") REFERENCES "Equipo"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MetricaConfig" ADD CONSTRAINT "MetricaConfig_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_reclutadorId_fkey" FOREIGN KEY ("reclutadorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VacanteMetrica" ADD CONSTRAINT "VacanteMetrica_vacanteId_fkey" FOREIGN KEY ("vacanteId") REFERENCES "Vacante"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Actividad" ADD CONSTRAINT "Actividad_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notificacion" ADD CONSTRAINT "Notificacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrevista" ADD CONSTRAINT "Entrevista_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Entrevista" ADD CONSTRAINT "Entrevista_vacanteId_fkey" FOREIGN KEY ("vacanteId") REFERENCES "Vacante"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrevistaFeedback" ADD CONSTRAINT "EntrevistaFeedback_entrevistaId_fkey" FOREIGN KEY ("entrevistaId") REFERENCES "Entrevista"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Nota" ADD CONSTRAINT "Nota_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_asignadoAId_fkey" FOREIGN KEY ("asignadoAId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Comunicacion" ADD CONSTRAINT "Comunicacion_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PreguntaEvaluacion" ADD CONSTRAINT "PreguntaEvaluacion_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "Evaluacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespuestaEvaluacion" ADD CONSTRAINT "RespuestaEvaluacion_evaluacionId_fkey" FOREIGN KEY ("evaluacionId") REFERENCES "Evaluacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RespuestaEvaluacion" ADD CONSTRAINT "RespuestaEvaluacion_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScorecardRespuesta" ADD CONSTRAINT "ScorecardRespuesta_candidatoId_fkey" FOREIGN KEY ("candidatoId") REFERENCES "Candidato"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

