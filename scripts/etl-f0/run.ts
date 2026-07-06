import { createClient } from '@supabase/supabase-js';
import { readRange } from './sheets-client.js';

const SPREADSHEET_ID = '1JOQbJ-X5YHU__yYjFatmltT6izw9EQZrD97Ek48IIEE';
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

function idx(headers: string[], names: string[]): number {
  const H = headers.map((h) => String(h).toUpperCase().trim());
  for (const n of names) {
    const i = H.indexOf(n.toUpperCase());
    if (i !== -1) return i;
  }
  return -1;
}

async function main() {
  const clinicas = await supabase.from('erp_clinicas').select('id,nombre');
  const clinicaIdByNombre = new Map(clinicas.data!.map((c) => [c.nombre, c.id]));
  const proacId = clinicaIdByNombre.get('ProAC');

  // --- NOMINA (solo activos) ---
  const nomina = await readRange(SPREADSHEET_ID, 'NOMINA!A1:Z');
  const nH = nomina[0];
  const iNom = idx(nH, ['NOMBRE']);
  const iRol = idx(nH, ['ROL', 'PUESTO']);
  const iTarifa = idx(nH, ['TARIFA', 'SUELDO']);
  const iPct = idx(nH, ['%COMISION', 'PCT_COMISION', 'COMISION']);
  const iEsp = idx(nH, ['ESPECIALIDAD']);
  const iActivo = idx(nH, ['ACTIVO', 'ESTATUS']);
  const iClinNom = idx(nH, ['CLINICA', 'SUCURSAL']);
  let nomCount = 0;
  for (let i = 1; i < nomina.length; i++) {
    const row = nomina[i];
    const activo =
      iActivo === -1 || /^(si|sí|activo|true|1)$/i.test(String(row[iActivo] ?? ''));
    if (!activo) continue;
    const clinicaNombre = iClinNom !== -1 ? String(row[iClinNom] || 'ProAC') : 'ProAC';
    const clinica_id = clinicaIdByNombre.get(clinicaNombre) ?? proacId;
    await supabase.from('erp_nomina').upsert(
      {
        clinica_id,
        nombre: String(row[iNom] || ''),
        rol: iRol !== -1 ? String(row[iRol] || '') : '',
        tarifa_fija: iTarifa !== -1 ? Number(row[iTarifa]) || null : null,
        pct_comision: iPct !== -1 ? Number(row[iPct]) || null : null,
        especialidad: iEsp !== -1 ? String(row[iEsp] || '') : null,
        activo: true,
      },
      { onConflict: 'nombre' },
    );
    nomCount++;
  }
  console.log('NOMINA vigente migrada:', nomCount);

  // --- TRATAMIENTOS (catalogo completo) ---
  const trat = await readRange(SPREADSHEET_ID, 'TRATAMIENTOS!A1:Z');
  const tH = trat[0];
  const iTNom = idx(tH, ['NOMBRE', 'TRATAMIENTO']);
  const iTCat = idx(tH, ['CATEGORIA', 'AREA']);
  const iTPrecio = idx(tH, ['PRECIO', 'COSTO']);
  let tratCount = 0;
  for (let i = 1; i < trat.length; i++) {
    const row = trat[i];
    if (!row[iTNom]) continue;
    await supabase.from('erp_tratamientos_catalogo').upsert(
      {
        clinica_id: proacId,
        nombre: String(row[iTNom]),
        categoria: iTCat !== -1 ? String(row[iTCat] || '') : null,
        precio: iTPrecio !== -1 ? Number(row[iTPrecio]) || 0 : 0,
      },
      { onConflict: 'nombre,clinica_id' },
    );
    tratCount++;
  }
  console.log('TRATAMIENTOS migrados:', tratCount);

  // --- PACIENTES + POLIZAS + ABONOS (filtro vigente) ---
  const pac = await readRange(SPREADSHEET_ID, 'PACIENTES!A1:AB');
  const pH = pac[0];
  const iPId = idx(pH, ['ID', 'ID_PACIENTE']);
  const iPNom = idx(pH, ['NOMBRE']);
  const iPCel = idx(pH, ['CELULAR', 'TELEFONO']);

  const pol = await readRange(SPREADSHEET_ID, 'POLIZAS!A1:Z');
  const polH = pol[0];
  const iPolPac = idx(polH, ['ID_PACIENTE']);
  const iPolVenc = idx(polH, ['VENCIMIENTO']);
  const iPolCob = idx(polH, ['COBERTURA']);
  const iPolTipo = idx(polH, ['TIPO']);
  const iPolProm = idx(polH, ['PROMOTOR']);

  const abo = await readRange(SPREADSHEET_ID, 'ABONOS!A1:Z');
  const aH = abo[0];
  const iAPac = idx(aH, ['ID_PACIENTE']);
  const iATotal = idx(aH, ['TOTAL']);
  const iAMonto = idx(aH, ['MONTO']);
  const iARestante = idx(aH, ['RESTANTE']);
  const iAIdTrat = idx(aH, ['ID_TRATAMIENTO']);
  const iACostoLab = idx(aH, ['COSTO_LAB']);
  const iAEstado = idx(aH, ['ESTADO']);

  // erp_polizas/erp_abonos no tienen upsert por llave natural (son N filas por
  // paciente); para que el script sea re-ejecutable sin duplicar, se borra el
  // set completo de la clinica y se reconstruye desde Sheets en cada corrida.
  await supabase.from('erp_polizas').delete().eq('clinica_id', proacId);
  await supabase.from('erp_abonos').delete().eq('clinica_id', proacId);

  const hoy = new Date();

  const polizasPorPaciente = new Map<string, any[]>();
  for (let i = 1; i < pol.length; i++) {
    const row = pol[i];
    const pid = String(row[iPolPac] || '');
    if (!pid) continue;
    if (!polizasPorPaciente.has(pid)) polizasPorPaciente.set(pid, []);
    polizasPorPaciente.get(pid)!.push(row);
  }
  const abonosPorPaciente = new Map<string, any[]>();
  for (let i = 1; i < abo.length; i++) {
    const row = abo[i];
    const pid = String(row[iAPac] || '');
    if (!pid) continue;
    if (!abonosPorPaciente.has(pid)) abonosPorPaciente.set(pid, []);
    abonosPorPaciente.get(pid)!.push(row);
  }

  let pacCount = 0,
    polCount = 0,
    aboCount = 0;
  for (let i = 1; i < pac.length; i++) {
    const row = pac[i];
    const pid = String(row[iPId] || '');
    if (!pid) continue;

    const misPolizas = (polizasPorPaciente.get(pid) || []).filter((pr) => {
      const v = pr[iPolVenc];
      if (!v) return false;
      const d = new Date(v);
      return !isNaN(d.getTime()) && d >= hoy;
    });
    const misAbonos = (abonosPorPaciente.get(pid) || []).filter(
      (ar) => Number(ar[iARestante]) > 0,
    );
    // "actividad ultimos 12 meses" no se cruza aqui (VENTAS no se lee por volumen);
    // se aproxima con poliza vigente O abono con saldo. Ver nota en el plan F0.
    const vigente = misPolizas.length > 0 || misAbonos.length > 0;
    if (!vigente) continue;

    const { data: pacRow } = await supabase
      .from('erp_pacientes')
      .upsert(
        {
          clinica_id: proacId,
          nombre: String(row[iPNom] || ''),
          celular: iPCel !== -1 ? String(row[iPCel] || '') : null,
        },
        { onConflict: 'clinica_id,celular' },
      )
      .select('id')
      .single();
    pacCount++;

    for (const pr of misPolizas) {
      await supabase.from('erp_polizas').insert({
        clinica_id: proacId,
        paciente_id: pacRow!.id,
        cobertura: iPolCob !== -1 ? String(pr[iPolCob] || '') : null,
        tipo: iPolTipo !== -1 ? String(pr[iPolTipo] || '') : null,
        vencimiento: pr[iPolVenc],
        promotor: iPolProm !== -1 ? String(pr[iPolProm] || '') : null,
      });
      polCount++;
    }
    for (const ar of misAbonos) {
      await supabase.from('erp_abonos').insert({
        clinica_id: proacId,
        paciente_id: pacRow!.id,
        total: Number(ar[iATotal]) || 0,
        monto: Number(ar[iAMonto]) || 0,
        restante: Number(ar[iARestante]) || 0,
        id_tratamiento: iAIdTrat !== -1 ? String(ar[iAIdTrat] || '') : null,
        costo_lab: iACostoLab !== -1 ? Number(ar[iACostoLab]) || null : null,
        estado: iAEstado !== -1 ? String(ar[iAEstado] || '') : null,
      });
      aboCount++;
    }
  }
  console.log('Pacientes vigentes migrados:', pacCount);
  console.log('Polizas vigentes migradas:', polCount);
  console.log('Abonos con saldo migrados:', aboCount);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
