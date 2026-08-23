PRAGMA foreign_keys = ON;
-- 1. Tabla de roles generales
CREATE TABLE rol (
  id_rol INTEGER PRIMARY KEY,
  rol TEXT NOT NULL UNIQUE
);
-- 2. Usuarios (debe estar antes de usuario_rol y grupo_usuario)
CREATE TABLE usuario (
  id_usuario INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL,
  apellido TEXT NOT NULL
);
-- 3. Grupos (debe estar antes de grupo_usuario)
CREATE TABLE grupo (
  id_grupo INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT NOT NULL UNIQUE
);
-- 4. Asociación usuario ↔ rol
CREATE TABLE usuario_rol (
  id_usuario INTEGER NOT NULL,
  id_rol INTEGER NOT NULL,
  PRIMARY KEY (id_usuario, id_rol),
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (id_rol) REFERENCES rol(id_rol) ON DELETE RESTRICT ON UPDATE CASCADE
);
-- 5. Membresía de usuario en grupo
CREATE TABLE grupo_usuario (
  id_grupo INTEGER NOT NULL,
  id_usuario INTEGER NOT NULL UNIQUE,
  rol_en_grupo TEXT NOT NULL CHECK(
    rol_en_grupo IN ('encargado', 'auxiliar', 'miembro')
  ),
  PRIMARY KEY (id_grupo, id_usuario),
  FOREIGN KEY (id_grupo) REFERENCES grupo(id_grupo) ON DELETE RESTRICT ON UPDATE CASCADE,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_grupo_encargado ON grupo_usuario(id_grupo)
WHERE rol_en_grupo = 'encargado';
CREATE UNIQUE INDEX idx_grupo_auxiliar ON grupo_usuario(id_grupo)
WHERE rol_en_grupo = 'auxiliar';
-- 6. Informes
CREATE TABLE informe (
  id_informe INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_registro TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  horas INTEGER NULL,
  cursos INTEGER NOT NULL,
  año INTEGER NOT NULL,
  participacion BOOLEAN NOT NULL,
  trabajo_como_auxiliar BOOLEAN NOT NULL DEFAULT FALSE,
  mes TEXT NOT NULL CHECK(
    mes IN (
      'ENE',
      'FEB',
      'MAR',
      'ABR',
      'MAY',
      'JUN',
      'JUL',
      'AGO',
      'SEP',
      'OCT',
      'NOV',
      'DIC'
    )
  ),
  id_usuario INTEGER NOT NULL,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX idx_informe_usuario_periodo ON informe(id_usuario, año, mes);
INSERT INTO rol(rol)
VALUES ('publicador'),
  ('auxiliar'),
  ('regular'),
  ('siervo'),
  ('anciano'),
  ('secretario'),
  ('coordinador');

-- ============================================================
-- Asignaciones de la reunión Vida y Ministerio (presentation)
-- genero column on usuario is added by scripts/migrate-genero.ts.
-- ============================================================
CREATE TABLE IF NOT EXISTS presentation_week (
  id_week INTEGER PRIMARY KEY AUTOINCREMENT,
  semana TEXT NOT NULL UNIQUE,
  issue TEXT NOT NULL,
  fecha_inicio TEXT NOT NULL,
  fecha_fin TEXT NOT NULL,
  estado TEXT NOT NULL DEFAULT 'no_generada'
    CHECK(estado IN ('no_generada','borrador','confirmada')),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
CREATE INDEX IF NOT EXISTS idx_week_fecha ON presentation_week(fecha_inicio);

CREATE TABLE IF NOT EXISTS presentation_part (
  id_part INTEGER PRIMARY KEY AUTOINCREMENT,
  id_week INTEGER NOT NULL,
  orden INTEGER NOT NULL,
  tipo TEXT NOT NULL CHECK(tipo IN
    ('lectura_biblia','empiece_conversaciones','haga_revisitas','haga_discipulos','discurso')),
  seccion TEXT NOT NULL CHECK(seccion IN ('TESOROS_DE_LA_BIBLIA','SEAMOS_MEJORES_MAESTROS')),
  duracion_min INTEGER NOT NULL CHECK(duracion_min > 0),
  escenario TEXT CHECK(escenario IS NULL OR escenario IN
    ('DE_CASA_EN_CASA','PREDICACION_INFORMAL','PREDICACION_PUBLICA')),
  fuente TEXT NOT NULL,
  leccion INTEGER,
  punto TEXT,
  UNIQUE(id_week, tipo, orden),
  FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_part_week ON presentation_part(id_week);

CREATE TABLE IF NOT EXISTS presentation_assignment (
  id_asignacion INTEGER PRIMARY KEY AUTOINCREMENT,
  id_part INTEGER NOT NULL,
  id_week INTEGER NOT NULL,           -- denormalized for history index
  id_usuario INTEGER NOT NULL,
  rol TEXT NOT NULL CHECK(rol IN ('presentador','companero')),
  estado TEXT NOT NULL DEFAULT 'draft' CHECK(estado IN ('draft','confirmed','manual')),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP),
  UNIQUE(id_part, rol),
  FOREIGN KEY (id_part) REFERENCES presentation_part(id_part) ON DELETE CASCADE,
  FOREIGN KEY (id_week) REFERENCES presentation_week(id_week) ON DELETE CASCADE,
  FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario) ON DELETE RESTRICT
);
CREATE INDEX IF NOT EXISTS idx_asig_usuario_week ON presentation_assignment(id_usuario, id_week);

CREATE TABLE IF NOT EXISTS presentation_sync_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  latest_loaded_issue TEXT,
  latest_known_published TEXT,
  last_checked_at TEXT
);