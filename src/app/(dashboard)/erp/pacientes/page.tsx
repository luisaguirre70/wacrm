'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Pencil, Loader2, Search } from 'lucide-react';
import { PacienteDialog } from './paciente-dialog';
import type { Clinica, Paciente } from '../types';

export default function PacientesPage() {
  const supabase = createClient();
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [clinicas, setClinicas] = useState<Clinica[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showInactivos, setShowInactivos] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPaciente, setEditPaciente] = useState<Paciente | null>(null);

  const fetchClinicas = useCallback(async () => {
    const { data } = await supabase.from('erp_clinicas').select('id,nombre').order('nombre');
    if (data) setClinicas(data);
  }, [supabase]);

  const fetchPacientes = useCallback(async () => {
    setLoading(true);
    let query = supabase.from('erp_pacientes').select('*').order('nombre');
    if (!showInactivos) query = query.eq('activo', true);
    const term = search.trim();
    if (term) query = query.or(`nombre.ilike.%${term}%,celular.ilike.%${term}%`);
    const { data, error } = await query;
    setLoading(false);
    if (error) {
      toast.error('No se pudieron cargar los pacientes: ' + error.message);
      return;
    }
    setPacientes(data ?? []);
  }, [supabase, search, showInactivos]);

  useEffect(() => {
    fetchClinicas();
  }, [fetchClinicas]);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  function openCreate() {
    setEditPaciente(null);
    setDialogOpen(true);
  }

  function openEdit(p: Paciente) {
    setEditPaciente(p);
    setDialogOpen(true);
  }

  async function toggleActivo(p: Paciente) {
    const { error } = await supabase
      .from('erp_pacientes')
      .update({ activo: !p.activo })
      .eq('id', p.id);
    if (error) {
      toast.error('No se pudo actualizar: ' + error.message);
      return;
    }
    toast.success(p.activo ? 'Paciente desactivado' : 'Paciente activado');
    fetchPacientes();
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Pacientes</h1>
        <Button onClick={openCreate}>
          <Plus />
          Nuevo paciente
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nombre o celular"
            className="pl-8"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showInactivos} onCheckedChange={setShowInactivos} />
          Ver inactivos
        </label>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nombre</TableHead>
            <TableHead>Celular</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                <Loader2 className="mx-auto size-5 animate-spin" />
              </TableCell>
            </TableRow>
          ) : pacientes.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                Sin pacientes
              </TableCell>
            </TableRow>
          ) : (
            pacientes.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-foreground">{p.nombre}</TableCell>
                <TableCell>{p.celular ?? '—'}</TableCell>
                <TableCell>
                  {p.activo ? (
                    <span className="text-sm text-foreground">Activo</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Inactivo</span>
                  )}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger render={<Button variant="ghost" size="icon-sm" />}>
                      <MoreHorizontal className="size-4" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => openEdit(p)}>
                        <Pencil className="size-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleActivo(p)}>
                        {p.activo ? 'Desactivar' : 'Activar'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <PacienteDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        paciente={editPaciente}
        clinicas={clinicas}
        defaultClinicaId={clinicas[0]?.id ?? ''}
        onSaved={fetchPacientes}
      />
    </div>
  );
}
