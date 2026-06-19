import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { StorageService } from '../../../../services/storage.service';

@Component({
  selector: 'app-upsert-plantilla',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-plantilla.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertPlantillaComponent {
  @Input() reporteId!: string; // ID del reporte
  @Output() closed = new EventEmitter<void>(); // Cuando se cierra sin guardar
  @Output() saved = new EventEmitter<string>();  // Emite la ruta de la plantilla almacenada

  storageService = inject(StorageService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  key = input<number>(0);

  form: FormGroup = this.fb.group({
    nombre: ['', Validators.required],
    archivo: [null, Validators.required]
  });

  mensaje = signal<string | null>(null);
  cargando = signal(false);

  ngOnInit() {
    this.mensaje.set('');
  }

  constructor() {
    effect(() => {
      const _ = this.key(); // provoca que el form se reinicie cada vez que cambia el key
      this.form.reset();
      this.mensaje.set('');
      if(this.fileInput) this.fileInput.nativeElement.value = '';
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const validTypes = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type)) {
      this.mensaje.set('Por favor, selecciona un archivo Excel válido (.xls o .xlsx)');
      this.form.patchValue({ archivo: null });
      return;
    }

    // Establecer el archivo en el formulario
    this.form.patchValue({
      archivo: file,
      nombre: file.name.replace(/\.(xls|xlsx)$/i, '')
    });

    this.form.get('archivo')?.updateValueAndValidity();
    this.form.get('nombre')?.updateValueAndValidity();
    this.mensaje.set(null);
  }

  async guardar() {
    if (this.form.invalid || !this.reporteId) {
      this.mensaje.set('Faltan datos obligatorios.');
      return;
    }

    this.cargando.set(true);

    try {
      // Subimos la plantilla al storage: categoría 'plantillaReporte', nombre 'plantilla'
      const resp = await this.storageService.uploadFile(
        this.form.value.archivo,
        'plantillaReporte',
        'plantilla'
      );

      if (!resp?.data?.url) {
        this.mensaje.set('Error al guardar la plantilla.');
        return;
      }

      this.mensaje.set('Plantilla cargada correctamente.');
      //Limpiamos los campos
      this.form.reset();
      this.fileInput.nativeElement.value = '';
      this.saved.emit(resp.data.url); // Avisamos al padre con la ruta almacenada
    } catch (error) {
      console.error(error);
      this.mensaje.set('Error al guardar la plantilla.');
    } finally {
      this.cargando.set(false);
      setTimeout(() => this.mensaje.set(null), 3000);
    }
  }

  cerrar() {
    this.closed.emit();
  }
}
