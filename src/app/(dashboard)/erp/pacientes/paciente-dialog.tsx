'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import type { Clinica, Paciente } from '../types';

interface PacienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paciente: Paciente | null;
  clinicas: Clinica[];
  defaultClinicaId: string;
  onSaved: () => void;
}

export function PacienteDialog({
  open,
  onOpenChange,
  paciente,
  clinicas,
  defaultClinicaId,
  onSaved,
}: PacienteDialogProps) {
  const supabase = createClient();
  const [nombre, setNombre] = useState('');
  const [celular, setCelular] = useState('');
  const [notas, setNotas] = useState('');
  const [clinicaId, setClinicaId] = useState(defaultClinicaId);
  const [activo, setActivo] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setNombre(paciente?.nombre ?? '');
    setCelular(paciente?.celular ?? '');
    setNotas(paciente?.notas ?? '');
    setClinicaId(paciente?.clinica_id ?? defaultClinicaId);
    setActivo(paciente?.activo ?? true);
  }, [open, paciente, defaultClinicaId]);

  async function handleSave() {
    if (!nombre.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }
    setSaving(true);
    const payload = {
      clinica_id: clinicaId,
      nombre: nombre.trim(),
      celular: celular.trim() || null,
      notas: notas.trim() || null,
      activo,
    };
    const { error } = paciente
      ? await supabase.from('erp_pacientes').update(payload).eq('id', paciente.id)
      : await supabase.from('erp_pacientes').insert(payload);
    setSaving(false);
    if (error) {
      toast.error('No se pudo guardar el paciente: ' + error.message);
      return;
    }
    toast.success(paciente ? 'Paciente actualizado' : 'Paciente creado');
    onOpenChange(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{paciente ? 'Editar paciente' : 'Nuevo paciente'}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paciente-nombre">Nombre</Label>
            <Input
              id="paciente-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre completo"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paciente-celular">Celular</Label>
            <Input
              id="paciente-celular"
              value={celular}
              onChange={(e) => setCelular(e.target.value)}
              placeholder="6641234567"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paciente-clinica">Clínica</Label>
            <Select value={clinicaId} onValueChange={(value) => value && setClinicaId(value)}>
              <SelectTrigger id="paciente-clinica" className="w-full">
                <SelectValue placeholder="Selecciona clínica" />
              </SelectTrigger>
              <SelectContent>
                {clinicas.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paciente-notas">Notas</Label>
            <Textarea
              id="paciente-notas"
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Notas internas (opcional)"
            />
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
            <Label htmlFor="paciente-activo">Activo</Label>
            <Switch id="paciente-activo" checked={activo} onCheckedChange={setActivo} />
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
