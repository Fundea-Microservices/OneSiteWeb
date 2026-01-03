import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IUsuarioAliado } from '../../../../../interfaces/aliado/usuario-aliado';
import { IEmpresaAliado } from '../../../../../interfaces/aliado/empresa-aliado';
import { active } from 'sortablejs';

@Component({
  selector: 'app-upsert-usuario-aliado',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-usuario.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertUsuarioAliadoComponent { 

  fb = inject(FormBuilder);

  user = input<IUsuarioAliado>({
    userId: '',
    fullName: 'Sin autenticar',
    userName: '',
    email: '',
    active: false,
    created_at: new Date(),
    empresaId: ''
  });

  nuevo = input<boolean>(true);
  empresas = input<IEmpresaAliado[]>([]);

  @Output() save = new EventEmitter<IUsuarioAliado>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));
  key = input<number>(0);

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const user = this.user();
      const _ = this.key(); // provoca que el form se reinicie cada vez que cambia el key

      const newForm: FormGroup = this.fb.group({
        fullName: [user.fullName, [Validators.required]],
        userName: [user.userName, [Validators.required]],
        email: [user.email, [Validators.required, Validators.email]],
        password: ['Fundea@2025', [Validators.required, Validators.minLength(6)]],
        active: [user.active, [Validators.required]],
        empresaId: [user.empresaId, [Validators.required]]
      });

      if (isNuevo) {
        newForm.reset({
          fullName: '',
          userName: '',
          email: '',
          password: '',
          active: true,
          empresaId: ''
        });
      }
      this.form.set(newForm);
    })
    if(this.nuevo()) {
      this.form().reset();
    }
  }
  
  get btnText(): string {
    return this.nuevo() ? 'Crear Usuario' : 'Actualizar Usuario';
  }

  saveUser() {     
    if (this.form().invalid) return;
    const value: IUsuarioAliado = {
      ...this.user(),
      ...this.form().value,
    };
    this.save.emit(value);
  }

  onCancel() {
    this.cancel.emit();
  }

  showError(controlName: string, error: string) {
    const control = this.form().get(controlName);
    return control?.touched && control?.hasError(error);
  }

 }
