import {
  ChangeDetectionStrategy,
  Component,
  computed,
  CUSTOM_ELEMENTS_SCHEMA,
  effect,
  input,
  output,
  signal,
} from '@angular/core';
import { DatePipe } from '@angular/common';
import { FormsModule, NgForm } from '@angular/forms';
import { IPlantilla } from '../../../../../interfaces/plantillas/plantilla';
import {
  formatearTamanio,
  formatoExcel,
  PLANTILLA_ACCEPT,
  PLANTILLA_TAMANIO_MAX_MB,
  validarArchivoPlantilla,
} from '../plantilla-archivo';

/** Datos del formulario. `activo` solo aplica al editar: el alta no lo acepta. */
export interface PlantillaForm {
  codigo: string;
  nombre: string;
  modulo: string;
  categoria: string;
  descripcion: string;
  activo: boolean;
}

export interface PlantillaGuardar {
  datos: PlantillaForm;
  /** Obligatorio al crear; al editar, solo viene si se reemplaza el archivo. */
  archivo: File | null;
}

@Component({
  selector: 'app-upsert-plantilla',
  imports: [FormsModule, DatePipe],
  templateUrl: './upsert-plantilla.component.html',
  styleUrl: './upsert-plantilla.component.css',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertPlantillaComponent {
  /** Plantilla a editar; null para crear una nueva. */
  plantilla = input<IPlantilla | null>(null);
  /** Cambia en cada apertura del modal para reiniciar el formulario. */
  key = input<number>(0);
  guardando = input<boolean>(false);
  /** Valores ya registrados, para sugerirlos en los campos de texto libre. */
  modulos = input<string[]>([]);
  categorias = input<string[]>([]);

  save = output<PlantillaGuardar>();
  cancel = output<void>();

  readonly accept = PLANTILLA_ACCEPT;
  readonly tamanioMaxMb = PLANTILLA_TAMANIO_MAX_MB;
  readonly formatearTamanio = formatearTamanio;
  readonly formatoExcel = formatoExcel;

  nuevo = computed(() => !this.plantilla());
  form = signal<PlantillaForm>(this.formDesde(null));
  archivo = signal<File | null>(null);
  errorArchivo = signal<string | null>(null);
  arrastrando = signal(false);
  /** Los errores se muestran tras el primer intento de guardar de cada apertura. */
  enviado = signal(false);

  constructor() {
    effect(() => {
      const plantilla = this.plantilla();
      this.key();
      this.form.set(this.formDesde(plantilla));
      this.archivo.set(null);
      this.errorArchivo.set(null);
      this.arrastrando.set(false);
      this.enviado.set(false);
    });
  }

  private formDesde(plantilla: IPlantilla | null): PlantillaForm {
    return {
      codigo: plantilla?.codigo ?? '',
      nombre: plantilla?.nombre ?? '',
      modulo: plantilla?.modulo ?? '',
      categoria: plantilla?.categoria ?? '',
      descripcion: plantilla?.descripcion ?? '',
      activo: plantilla?.activo ?? true,
    };
  }

  // ─── Archivo ───────────────────────────────────────────────────

  onArchivoSeleccionado(event: Event) {
    const input = event.target as HTMLInputElement;
    this.tomarArchivo(input.files?.[0]);
    input.value = ''; // permite volver a elegir el mismo archivo
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (!this.guardando()) this.arrastrando.set(true);
  }

  onDragLeave(event: DragEvent) {
    // dragleave también se dispara al pasar sobre los hijos de la zona
    const zona = event.currentTarget as HTMLElement;
    if (!zona.contains(event.relatedTarget as Node | null)) this.arrastrando.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.arrastrando.set(false);
    if (!this.guardando()) this.tomarArchivo(event.dataTransfer?.files?.[0]);
  }

  quitarArchivo() {
    this.archivo.set(null);
    this.errorArchivo.set(null);
  }

  private tomarArchivo(archivo: File | undefined) {
    if (!archivo) return;
    const error = validarArchivoPlantilla(archivo);
    this.errorArchivo.set(error);
    this.archivo.set(error ? null : archivo);
  }

  // ─── Guardar ───────────────────────────────────────────────────

  onSave(ngForm: NgForm) {
    this.enviado.set(true);
    const faltaArchivo = this.nuevo() && !this.archivo();
    if (faltaArchivo && !this.errorArchivo()) {
      this.errorArchivo.set('Selecciona el archivo de Excel de la plantilla.');
    }
    if (ngForm.invalid || faltaArchivo) return;

    const f = this.form();
    this.save.emit({
      datos: {
        codigo: f.codigo.trim(),
        nombre: f.nombre.trim(),
        modulo: f.modulo.trim(),
        categoria: f.categoria.trim(),
        descripcion: f.descripcion.trim(),
        activo: f.activo,
      },
      archivo: this.archivo(),
    });
  }
}
