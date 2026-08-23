import { createClient } from '@libsql/client';
import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join } from 'path';

function loadEnvFile(): Record<string, string> {
  const envPath = existsSync(join(process.cwd(), '.env.local'))
    ? join(process.cwd(), '.env.local')
    : join(process.cwd(), '.env');
  const envVars: Record<string, string> = {};
  if (!existsSync(envPath)) return envVars;
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const [key, ...valueParts] = trimmed.split('=');
    if (key && valueParts.length > 0) {
      envVars[key] = valueParts.join('=').replace(/['"]/g, '');
    }
  }
  return envVars;
}

interface ReportRow {
  id_informe: number;
  id_usuario: number;
  usuario_nombre: string;
  grupo_nombre: string | null;
  año: number;
  mes: string;
  horas: number | null;
  cursos: number;
  participacion: number;
  trabajo_como_auxiliar: number;
  notas: string | null;
  fecha_registro: string;
}

interface DuplicateGroup {
  usuario: string;
  grupo: string;
  id_usuario: number;
  año: number;
  mes: string;
  records: ReportRow[];
}

async function generateReport() {
  const envVars = loadEnvFile();
  const url = envVars.TURSO_URL || process.env.TURSO_URL;
  const token = envVars.TURSO_TOKEN || process.env.TURSO_TOKEN;

  if (!url) throw new Error('TURSO_URL not found');

  const client = createClient({ url, authToken: token });

  const query = `
    SELECT 
      i.id_informe,
      i.id_usuario,
      u.nombre || ' ' || u.apellido as usuario_nombre,
      g.nombre as grupo_nombre,
      i.año,
      i.mes,
      i.horas,
      i.cursos,
      i.participacion,
      i.trabajo_como_auxiliar,
      i.notas,
      i.fecha_registro
    FROM informe i
    JOIN usuario u ON i.id_usuario = u.id_usuario
    LEFT JOIN grupo_usuario gu ON u.id_usuario = gu.id_usuario
    LEFT JOIN grupo g ON gu.id_grupo = g.id_grupo
    WHERE (i.id_usuario, i.año, i.mes) IN (
      SELECT id_usuario, año, mes
      FROM informe
      GROUP BY id_usuario, año, mes
      HAVING count(*) > 1
    )
    ORDER BY u.apellido, u.nombre, i.año DESC, i.mes, i.fecha_registro
  `;

  const result = await client.execute(query);
  const rows = result.rows as unknown as ReportRow[];

  const groups = new Map<string, ReportRow[]>();
  for (const row of rows) {
    const key = `${row.id_usuario}__${row.año}__${row.mes}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(row);
  }

  const exactDups: DuplicateGroup[] = [];
  const zeroVsVal: DuplicateGroup[] = [];
  const conflicts: DuplicateGroup[] = [];

  for (const [, list] of groups.entries()) {
    const u = list[0];
    const horasSet = new Set(list.map((r) => r.horas));
    const notasSet = new Set(list.map((r) => (r.notas || '').trim()));
    const cursosSet = new Set(list.map((r) => r.cursos));
    const auxSet = new Set(list.map((r) => r.trabajo_como_auxiliar));

    const isExact =
      horasSet.size === 1 &&
      notasSet.size === 1 &&
      cursosSet.size === 1 &&
      auxSet.size === 1;
    const hasZero = list.some(
      (r) => (r.horas === 0 || r.horas === null) && !r.notas
    );
    const nonZeroCount = list.filter(
      (r) => (r.horas !== null && r.horas > 0) || Boolean(r.notas)
    ).length;

    const item: DuplicateGroup = {
      usuario: u.usuario_nombre,
      grupo: u.grupo_nombre || 'Sin Grupo',
      id_usuario: u.id_usuario,
      año: u.año,
      mes: u.mes,
      records: list,
    };

    if (isExact) {
      exactDups.push(item);
    } else if (hasZero && nonZeroCount === 1) {
      zeroVsVal.push(item);
    } else {
      conflicts.push(item);
    }
  }

  const exactDupsTotalRows = exactDups.reduce((a, c) => a + c.records.length, 0);
  const exactDupsExcess = exactDups.reduce((a, c) => a + c.records.length - 1, 0);

  const zeroVsValTotalRows = zeroVsVal.reduce((a, c) => a + c.records.length, 0);
  const zeroVsValExcess = zeroVsVal.reduce((a, c) => a + c.records.length - 1, 0);

  const conflictsTotalRows = conflicts.reduce((a, c) => a + c.records.length, 0);
  const conflictsExcess = conflicts.reduce((a, c) => a + c.records.length - 1, 0);

  let md = '# Reporte de Auditoría: 218 Grupos de Informes Duplicados\n\n';
  md += '> [!IMPORTANT]\n';
  md += `> Se identificaron **${groups.size} combinaciones** de \`(usuario, año, mes)\` que contienen un total de **${rows.length} registros de informes** (un excedente de **${rows.length - groups.size} informes redundantes**).\n\n`;

  md += '## 1. Resumen Ejecutivo por Categoría\n\n';
  md += '| Categoría | Grupos Afectados | Registros Totales | Excedente a Depurar | Criterio de Resolución |\n';
  md += '|---|:---:|:---:|:---:|---|\n';
  md += `| **1. Duplicados Exactos** | ${exactDups.length} | ${exactDupsTotalRows} | ${exactDupsExcess} | Conservar el primer registro y eliminar los clones idénticos. |\n`;
  md += `| **2. Registro Vacío (0h) vs Con Datos** | ${zeroVsVal.length} | ${zeroVsValTotalRows} | ${zeroVsValExcess} | Conservar el informe con actividad real y eliminar los registros en cero. |\n`;
  md += `| **3. Valores en Conflicto (Datos distintos)** | ${conflicts.length} | ${conflictsTotalRows} | ${conflictsExcess} | Evaluar si priorizar la carga manual con notas o la consolidada. |\n`;
  md += `| **TOTAL GENERAL** | **${groups.size}** | **${rows.length}** | **${rows.length - groups.size}** | |\n\n`;

  md += '## 2. Distribución Gráfica\n\n';
  md += '```mermaid\npie title Distribución de los 218 Grupos Duplicados\n';
  md += `    "Valores en Conflicto" : ${conflicts.length}\n`;
  md += `    "Vacío (0h) vs Con Datos" : ${zeroVsVal.length}\n`;
  md += `    "Duplicados Exactos" : ${exactDups.length}\n`;
  md += '```\n\n';

  // Categoría 1
  md += '## 3. Detalle de Casos\n\n';
  md += `### Categoría 1: Duplicados Exactos (${exactDups.length} casos)\n\n`;
  md += '| Publicador | Grupo | Periodo | Cantidad de Registros | Horas / Cursos | IDs Involucrados |\n';
  md += '|---|---|---|:---:|:---:|---|\n';
  for (const item of exactDups) {
    const ids = item.records.map((r) => r.id_informe).join(', ');
    md += `| ${item.usuario} | ${item.grupo} | ${item.mes} ${item.año} | ${item.records.length} | ${item.records[0].horas ?? 0}h / ${item.records[0].cursos}c | ${ids} |\n`;
  }
  md += '\n';

  // Categoría 2
  md += `### Categoría 2: Registro Vacío (0h) vs Con Datos Reales (${zeroVsVal.length} casos)\n\n`;
  md += '| Publicador | Grupo | Periodo | Registro Válido (Horas / Cursos / Notas) | IDs a Eliminar |\n';
  md += '|---|---|---|---|---|\n';
  for (const item of zeroVsVal) {
    const valid = item.records.find((r) => (r.horas !== null && r.horas > 0) || Boolean(r.notas))!;
    const toDelete = item.records
      .filter((r) => r.id_informe !== valid.id_informe)
      .map((r) => r.id_informe)
      .join(', ');
    const valText = `ID ${valid.id_informe}: ${valid.horas ?? 0}h, ${valid.cursos} cursos${
      valid.notas ? ' ("' + valid.notas.replace(/\n/g, ' ') + '")' : ''
    }`;
    md += `| ${item.usuario} | ${item.grupo} | ${item.mes} ${item.año} | ${valText} | ${toDelete} |\n`;
  }
  md += '\n';

  // Categoría 3
  md += `### Categoría 3: Valores en Conflicto (${conflicts.length} casos)\n\n`;
  md += '| Publicador | Grupo | Periodo | Registros Existentes (ID: Horas, Cursos, Fecha Registro, Notas) |\n';
  md += '|---|---|---|---|\n';
  for (const item of conflicts) {
    const recs = item.records
      .map(
        (r) =>
          `• **ID ${r.id_informe}**: ${r.horas ?? 0}h, ${r.cursos}c (${r.fecha_registro.split(' ')[0]})${
            r.notas ? ' — *Nota: ' + r.notas.replace(/\n/g, ' ') + '*' : ''
          }`
      )
      .join('<br>');
    md += `| ${item.usuario} | ${item.grupo} | ${item.mes} ${item.año} | ${recs} |\n`;
  }
  md += '\n';

  md += '## 4. Plan de Acción y Recomendaciones Técnicas\n\n';
  md += '1. **Fase 1 - Limpieza Automática Inmediata (86 casos / 106 registros eliminables)**:\n';
  md += '   - **Duplicados exactos (20 casos)**: Dejar un único registro por periodo y borrar los clones sobrantes.\n';
  md += '   - **Vacío vs Con Datos (66 casos)**: Preservar el registro con horas o notas cargadas y purgar los registros en 0h generados automáticamente.\n';
  md += '2. **Fase 2 - Resolución de Conflictos (132 casos / 138 registros eliminables)**:\n';
  md += '   - Regla recomendada: Si uno de los registros contiene notas explicativas ingresadas por el usuario, preservarlo.\n';
  md += '   - Si ambos registros provienen de la carga masiva o no tienen notas, definir si se prioriza el valor mayor o el registro más reciente.\n';
  md += '3. **Fase 3 - Restricción de Integridad en Base de Datos**:\n';
  md += '   - Aplicar el índice único a nivel de motor para blindar la base de datos:\n';
  md += '   ```sql\n';
  md += '   CREATE UNIQUE INDEX idx_informe_usuario_periodo ON informe(id_usuario, año, mes);\n';
  md += '   ```\n';

  const outPath =
    '/home/palominodev/.gemini/antigravity-cli/brain/e6457d22-99fc-4b2f-9c14-75bc945719a4/informes_duplicados_report.md';
  writeFileSync(outPath, md, 'utf-8');
  console.log('Artifact report generated at:', outPath);
}

generateReport().catch((err) => {
  console.error('Error generating report:', err);
  process.exit(1);
});
