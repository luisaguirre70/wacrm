export interface Clinica {
  id: string;
  nombre: string;
}

export interface Paciente {
  id: string;
  clinica_id: string;
  nombre: string;
  celular: string | null;
  notas: string | null;
  activo: boolean;
  created_at: string;
}

export interface Poliza {
  id: string;
  clinica_id: string;
  paciente_id: string;
  cobertura: string | null;
  tipo: string | null;
  vencimiento: string | null;
  promotor: string | null;
  activo: boolean;
}
