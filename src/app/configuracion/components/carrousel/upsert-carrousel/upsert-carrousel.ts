import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
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

  readonly codigoOpciones: { value: string; label: string }[] = [
    { value: '', label: 'Todos' },
    { value: 'ONE-EX', label: 'OneSiteEx' },
    { value: 'ALIADOS', label: 'Aliados Fundea' },
  ];

  @Output() save = new EventEmitter<CreateCarouselDto | UpdateCarouselDto>();
  @Output() cancel = new EventEmitter<void>();
  @Output() liveChange = new EventEmitter<Partial<Carousel>>();
  @Output() photoFile = new EventEmitter<File | null>();

  fotoMode = signal<'url' | 'file'>('url');
  selectedFile = signal<File | null>(null);
  previewDataUrl = signal<string | null>(null);
  fileError = signal(false);

  form = computed<FormGroup>(() => {
    const isNuevo = this.nuevo();
    const c = this.carousel();
    return this.fb.group({
      titulo:        [isNuevo ? '' : c.titulo,        [Validators.required, Validators.maxLength(200)]],
      subtitulo:     [isNuevo ? '' : (c.subtitulo ?? '')],
      codigo:        [isNuevo ? '' : (c.codigo ?? '')],
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

  constructor() {
    effect((onCleanup) => {
      const f = this.form();
      queueMicrotask(() => this.liveChange.emit(this.buildLivePayload(f.getRawValue())));
      const sub = f.valueChanges.subscribe(() =>
        this.liveChange.emit(this.buildLivePayload(f.getRawValue()))
      );
      onCleanup(() => sub.unsubscribe());
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear' : 'Actualizar';
  }

  private toDateInput(value: Date | string): string {
    const d = new Date(value);
    return d.toISOString().split('T')[0];
  }

  private buildLivePayload(formValues: any): Partial<Carousel> {
    const fotoUrl =
      this.fotoMode() === 'file'
        ? (this.previewDataUrl() ?? this.carousel().fotoUrl ?? '')
        : formValues.fotoUrl;
    return { ...formValues, fotoUrl, codigo: this.normalizarCodigo(formValues.codigo) };
  }

  /** 'Todos' se envía como null para limpiar el código en la base de datos */
  private normalizarCodigo(codigo: string | null | undefined): string | null {
    return codigo ? codigo : null;
  }

  setFotoMode(mode: 'url' | 'file'): void {
    this.fotoMode.set(mode);
    this.selectedFile.set(null);
    this.previewDataUrl.set(null);
    this.fileError.set(false);
    this.photoFile.emit(null);
    const ctrl = this.form().get('fotoUrl');
    if (mode === 'url') {
      ctrl?.setValidators([Validators.required]);
    } else {
      ctrl?.clearValidators();
    }
    ctrl?.updateValueAndValidity();
    const fotoUrl = mode === 'url' ? this.form().get('fotoUrl')?.value ?? '' : (this.carousel().fotoUrl ?? '');
    this.liveChange.emit({ ...this.form().getRawValue(), fotoUrl });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile.set(file);
    this.fileError.set(false);
    this.photoFile.emit(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        this.previewDataUrl.set(dataUrl);
        this.liveChange.emit({ ...this.form().getRawValue(), fotoUrl: dataUrl });
      };
      reader.readAsDataURL(file);
    } else {
      this.previewDataUrl.set(null);
      this.liveChange.emit(this.buildLivePayload(this.form().getRawValue()));
    }
  }

  onSubmit(): void {
    const f = this.form();
    f.markAllAsTouched();

    if (this.fotoMode() === 'file' && this.nuevo() && !this.selectedFile()) {
      this.fileError.set(true);
      return;
    }
    this.fileError.set(false);

    if (f.invalid) return;

    const values = f.getRawValue();
    const fotoUrl =
      this.fotoMode() === 'url' ? values.fotoUrl : (this.carousel().fotoUrl || 'archivo seleccionado');
    const codigo = this.normalizarCodigo(values.codigo);

    if (!this.nuevo()) {
      this.save.emit({ ...values, fotoUrl, codigo, carouselId: this.carousel().carouselId } as UpdateCarouselDto);
    } else {
      this.save.emit({ ...values, fotoUrl, codigo } as CreateCarouselDto);
    }
  }

  onCancel(): void {
    this.cancel.emit();
  }
}

