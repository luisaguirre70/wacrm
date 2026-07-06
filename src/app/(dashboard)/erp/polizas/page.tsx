'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Plus, MoreHorizontal, Pencil, Loader2 } from 'lucide-react';
import { PolizaDialog } from './poliza-dialog';
import type { Paciente, Poliza } from '../types';

interface PolizaRow extends Poliza {
  paciente: { nombre: string } | null;
}

const TODOS_PACIENTES = '__todos__';

export default function PolizasPage() {
  const supabase = createClient();
  const [polizas, setPolizas] = useState<PolizaRow[]>([]);
  const [pacientes, setPacientes] = useState<Paciente[]>([]);
  const [loading, setLoading] = useState(true);
  const [pacienteFilter, setPacienteFilter] = useState(TODOS_PACIENTES);
  const [showInactivas, setShowInactivas] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editPoliza, setEditPoliza] = useState<Poliza | null>(null);

  const fetchPacientes = useCallback(async () => {
    const { data } = await supabase
      .from('erp_pacientes')
      .select('*')
      .eq('activo', true)
      .order('nombre');
    if (data) setPacientes(data);
  }, [supabase]);

  const fetchPolizas = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from('erp_polizas')
      .select('*, paciente:erp_pacientes(nombre)')
      .order('vencimiento', { ascending: true });
    if (!showInactivas) query = query.eq('activo', true);
    if (pacienteFilter !== TODOS_PACIENTES) query = query.eq('paciente_id', pacienteFilter);
    const { data, error } = await query;
    setLoading(false);
    if (error) {
      toast.error('No se pudieron cargar las pólizas: ' + error.message);
      return;
    }
    setPolizas((data ?? []) as unknown as PolizaRow[]);
  }, [supabase, showInactivas, pacienteFilter]);

  useEffect(() => {
    fetchPacientes();
  }, [fetchPacientes]);

  useEffect(() => {
    fetchPolizas();
  }, [fetchPolizas]);

  function openCreate() {
    setEditPoliza(null);
    setDialogOpen(true);
  }

  function openEdit(p: Poliza) {
    setEditPoliza(p);
    setDialogOpen(true);
  }

  async function toggleActivo(p: Poliza) {
    const { error } = await supabase
      .from('erp_polizas')
      .update({ activo: !p.activo })
      .eq('id', p.id);
    if (error) {
      toast.error('No se pudo actualizar: ' + error.message);
      return;
    }
    toast.success(p.activo ? 'Póliza desactivada' : 'Póliza activada');
    fetchPolizas();
  }

  return (
    <div className="flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-foreground">Pólizas</h1>
        <Button onClick={openCreate}>
          <Plus />
          Nueva póliza
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={pacienteFilter} onValueChange={(value) => value && setPacienteFilter(value)}>
          <SelectTrigger className="w-64">
            <SelectValue placeholder="Todos los pacientes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={TODOS_PACIENTES}>Todos los pacientes</SelectItem>
            {pacientes.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.nombre}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Switch checked={showInactivas} onCheckedChange={setShowInactivas} />
          Ver inactivas
        </label>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Paciente</TableHead>
            <TableHead>Cobertura</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Vencimiento</TableHead>
            <TableHead>Promotor</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="w-10" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                <Loader2 className="mx-auto size-5 animate-spin" />
              </TableCell>
            </TableRow>
          ) : polizas.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                Sin pólizas
              </TableCell>
            </TableRow>
          ) : (
            polizas.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium text-foreground">
                  {p.paciente?.nombre ?? '—'}
                </TableCell>
                <TableCell>{p.cobertura ?? '—'}</TableCell>
                <TableCell>{p.tipo ?? '—'}</TableCell>
                <TableCell>{p.vencimiento ?? '—'}</TableCell>
                <TableCell>{p.promotor ?? '—'}</TableCell>
                <TableCell>
                  {p.activo ? (
                    <span className="text-sm text-foreground">Activa</span>
                  ) : (
                    <span className="text-sm text-muted-foreground">Inactiva</span>
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

      <PolizaDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        poliza={editPoliza}
        pacientes={pacientes}
        defaultPacienteId={pacienteFilter !== TODOS_PACIENTES ? pacienteFilter : undefined}
        onSaved={fetchPolizas}
      />
    </div>
  );
}
