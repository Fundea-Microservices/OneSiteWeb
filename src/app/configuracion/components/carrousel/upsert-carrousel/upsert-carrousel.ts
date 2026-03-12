import {
  ChangeDetectionStrategy,
  Component,
  computed,
  EventEmitter,
  inject,
  input,
  Output,
} from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { Carousel, CreateCarouselDto, UpdateCarouselDto } from '../../../../../interfaces/carousel';

@Component({
  selector: 'app-upsert-carrousel',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-carrousel.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertCarrouselComponent {
  private fb = inject(FormBuilder);

  carousel = input<Carousel>({
    carouselId: '',
    titulo: '',
    fotoUrl: '',
    orden: 1,
    visibleApp: true,
    esExterno: false,
    activo: true,
    created_at: new Date(),
  });

  nuevo = input<boolean>(true);

  @Output() save = new EventEmitter<CreateCarouselDto | UpdateCarouselDto>();
  @Output() cancel = new EventEmitter<void>();

  form = computed<FormGroup>(() => {
    const isNuevo = this.nuevo();
    const c = this.carousel();
    return this.fb.group({
      titulo:        [isNuevo ? '' : c.titulo,        [Validators.required, Validators.maxLength(200)]],
      subtitulo:     [isNuevo ? '' : (c.subtitulo ?? '')],
      descripcion:   [isNuevo ? '' : (c.descripcion ?? '')],
      fotoUrl:       [isNuevo ? '' : c.fotoUrl,      [Validators.required]],
      redireccionUrl:[isNuevo ? '' : (c.redireccionUrl ?? '')],
      orden:         [isNuevo ? 1  : c.orden,        [Validators.required, Validators.min(1)]],
      visibleApp:    [isNuevo ? true : c.visibleApp],
      textoBoton:    [isNuevo ? '' : (c.textoBoton ?? '')],
      esExterno:     [isNuevo ? false : c.esExterno],
      fechaInicio:   [isNuevo ? '' : (c.fechaInicio ? this.toDateInput(c.fechaInicio) : '')],
      fechaFin:      [isNuevo ? '' : (c.fechaFin ? this.toDateInput(c.fechaFin) : '')],
      activo:        [isNuevo ? true : c.activo],
    });
  });

  get btnText(): string {
    return this.nuevo() ? 'Crear' : 'Actualizar';
  }

  private toDateInput(value: Date | string): string {
    const d = new Date(value);
    return d.toISOString().split('T')[0];
  }

  onSubmit(): void {
    const f = this.form();
    f.markAllAsTouched();
    if (f.invalid) return;

    const values = f.getRawValue();
    if (!this.nuevo()) {
      this.save.emit({ ...values, carouselId: this.carousel().carouselId } as UpdateCarouselDto);
    } else {
      this.save.emit(values as CreateCarouselDto);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}
