import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FotoPerfilService } from '../../../../../services/usuarios/foto-usuario.service';

@Component({
  selector: 'app-upsert-foto-usuario',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-foto.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertFotoUsuarioComponent {
  @Input() usuarioId!: string; // ID del usuario
  @Output() closed = new EventEmitter<void>(); // Cuando se cierra sin guardar
  @Output() saved = new EventEmitter<void>();  // Cuando se guarda exitosamente

  fotoService = inject(FotoPerfilService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private fb = inject(FormBuilder);
  private http = inject(HttpClient);

  key = input<number>(0);

  form: FormGroup = this.fb.group({
    archivo: [null, Validators.required]
  });

  mensaje = signal<string | null>(null);
  cargando = signal(false);

  ngOnInit() {
    this.mensaje.set('');
  }

  constructor() {
    effect(() => {
      const _ = this.key(); // reinicia el formulario cada vez que cambia la key
      this.form.reset();
      this.mensaje.set('');
      if (this.fileInput) this.fileInput.nativeElement.value = '';
    });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) return;

    const file = input.files[0];
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];

    if (!validTypes.includes(file.type)) {
      this.mensaje.set('Por favor, selecciona una imagen válida (PNG, JPG o JPEG).');
      this.form.patchValue({ archivo: null });
      return;
    }

    this.form.patchValue({ archivo: file });
    this.form.get('archivo')?.updateValueAndValidity();
    this.mensaje.set(null);
  }

  async guardar() {
    if (this.form.invalid || !this.usuarioId) {
      this.mensaje.set('Faltan datos obligatorios.');
      return;
    }

    const formData = new FormData();
    formData.append('usuarioId', this.usuarioId.toString());
    formData.append('foto', this.form.value.archivo);

    this.cargando.set(true);

    try {
      await this.fotoService.actualizarFotoUsuario(formData);
      this.mensaje.set('Fotografía actualizada correctamente.');
      this.form.reset();
      this.fileInput.nativeElement.value = '';
      this.saved.emit();
    } catch (error) {
      console.error(error);
      this.mensaje.set('Error al actualizar la fotografía.');
    } finally {
      this.cargando.set(false);
      setTimeout(() => this.mensaje.set(null), 3000);
    }
  }

  cerrar() {
    this.closed.emit();
  }
}