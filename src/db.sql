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
INSERT INTO rol(rol)
VALUES ('publicador'),
  ('auxiliar'),
  ('regular'),
  ('siervo'),
  ('anciano'),
  ('secretario'),
  ('coordinador');