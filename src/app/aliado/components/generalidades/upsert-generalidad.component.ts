import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TipoAfiliacion, TipoSolicitud, EstadoSolicitud } from '../../../../interfaces/aliado/generalidades';

export type Generalidad = TipoSolicitud | EstadoSolicitud | TipoAfiliacion;

@Component({
  selector: 'app-upsert-generalidad',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './upsert-generalidad.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UpsertGeneralidadComponent implements OnChanges {
  @Input() generalidad?: Generalidad;
  @Input() esTipo = false; // Cuando es true se muestra el campo mostrarPreguntas

  @Output() save = new EventEmitter<{ nombre: string; activo: boolean; codigo?: string | null; mostrarPreguntas?: boolean }>();
  @Output() cancel = new EventEmitter<void>();

  form = {
    nombre: '',
    activo: true,
    codigo: '',
    mostrarPreguntas: false
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['generalidad'] && this.generalidad) {
      this.form.nombre = this.generalidad.nombre ?? '';
      this.form.activo = this.generalidad.activo ?? true;
      // Solo aplican codigo y mostrarPreguntas cuando es tipo solicitud
      if (this.esTipo) {
        const tipo = this.generalidad as TipoSolicitud;
        this.form.codigo = tipo.codigo ?? '';
        this.form.mostrarPreguntas = tipo.mostrarPreguntas ?? false;
      }
    }
  }

  onSave(): void {
    if (!this.form.nombre.trim()) {
      return;
    }
    const payload: { nombre: string; activo: boolean; codigo?: string | null; mostrarPreguntas?: boolean } = {
      nombre: this.form.nombre.trim(),
      activo: this.form.activo
    };

    if (this.esTipo) {
      payload.codigo = this.form.codigo.trim() || null;
      payload.mostrarPreguntas = this.form.mostrarPreguntas;
    }

    this.save.emit(payload);
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
