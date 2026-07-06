'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import type { Paciente, Poliza } from '../types';

interface PolizaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poliza: Poliza | null;
  pacientes: Paciente[];
  defaultPacienteId?: string;
  onSaved: () => void;
}

export function PolizaDialog({
  open,
  onOpenChange,
  poliza,
  pacientes,
  defaultPacienteId,
  onSaved,
}: PolizaDialogProps) {
  const supabase = createClient();
  const [pacienteId, setPacienteId] = useState('');
  const [cobertura, setCobertura] = useState('');
  const [tipo, setTipo] = useState('');
  const [vencimiento, setVencimiento] = useState('');
  const [promotor, setPromotor] = useState('');
  const [activo, setActivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setPacienteId(poliza?.paciente_id ?? defaultPacienteId ?? '');
    setCobertura(poliza?.cobertura ?? '');
    setTipo(poliza?.tipo ?? '');
    setVencimiento(poliza?.vencimiento ?? '');
    setPromotor(poliza?.promotor ?? '');
    setActivo(poliza?.activo ?? true);
  }, [open, poliza, defaultPacienteId]);

  async function handleSave() {
    if (!pacienteId) {
      toast.error('Selecciona un paciente');
      return;
    }
    const paciente = pacientes.find((p) => p.id === pacienteId);
    if (!paciente) {
      toast.error('Paciente inválido');
      return;
    }
    setSaving(true);
    const payload = {
      clinica_id: paciente.clinica_id,
      paciente_id: pacienteId,
      cobertura: cobertura.trim() || null,
      tipo: tipo.trim() || null,
      vencimiento: vencimiento || null,
      promotor: promotor.trim() || null,
      activo,
    };
    const { error } = poliza
      ? await supabase.from('erp_polizas').update(payload).eq('id', poliza.id)
      : await supabase.from('erp_polizas').insert(payload);
    setSaving(false);
    if (error) {
      toast.error('No se pudo guardar la póliza: ' + error.message);
      return;
    }
    toast.success(poliza ? 'Póliza actualizada' : 'Póliza creada');
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{poliza ? 'Editar póliza' : 'Nueva póliza'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="poliza-paciente">Paciente</Label>
            <Select value={pacienteId} onValueChange={(value) => value && setPacienteId(value)}>
              <SelectTrigger id="poliza-paciente" className="w-full">
                <SelectValue placeholder="Selecciona paciente" />
              </SelectTrigger>
              <SelectContent>
                {pacientes.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="poliza-cobertura">Cobertura</Label>
            <Input
              id="poliza-cobertura"
              value={cobertura}
              onChange={(e) => setCobertura(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="poliza-tipo">Tipo</Label>
            <Input id="poliza-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="poliza-vencimiento">Vencimiento</Label>
            <Input
              id="poliza-vencimiento"
              type="date"
              value={vencimiento}
              onChange={(e) => setVencimiento(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="poliza-promotor">Promotor</Label>
            <Input
              id="poliza-promotor"
              value={promotor}
              onChange={(e) => setPromotor(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label htmlFor="poliza-activo">Activo</Label>
            <Switch id="poliza-activo" checked={activo} onCheckedChange={setActivo} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
