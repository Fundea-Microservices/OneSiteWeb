import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  effect,
  signal
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IEmpresaAliado } from '../../../../../interfaces/aliado/empresa';

export interface EmpresaValidationRules {
  name?: any[];
  description?: any[];
  pathImg?: any[];
  address?: any[];
  latitud?: any[];
  longitud?: any[];
  phone?: any[];
  phone2?: any[];
  email?: any[];
  active?: any[];
}

@Component({
  selector: 'app-upsert-empresa',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-empresa.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertEmpresaComponent {
  fb = inject(FormBuilder);

  empresa = input<IEmpresaAliado>({
    empresaId: '',
    name: '',
    description: '',
    pathImg: null,
    address: '',
    latitud: null,
    longitud: null,
    phone: '',
    phone2: null,
    email: '',
    active: true,
  });

  nuevo = input<boolean>(true);
  key = input<number>(0);

  validationRules: EmpresaValidationRules = {
    name: [Validators.required, Validators.minLength(3)],
    description: [Validators.required, Validators.minLength(3)],
    pathImg: [],
    address: [Validators.required],
    latitud: [],
    longitud: [],
    phone: [Validators.required, Validators.pattern(/^\d{8}$/)],
    phone2: [],
    email: [Validators.required, Validators.email],
    active: [],
  };

  @Output() save = new EventEmitter<IEmpresaAliado>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.key(); // provoca que el form se reinicie cada vez que cambia el key
      const metodo = this.empresa();
      const isNuevo = this.nuevo();

      this.initForm(metodo, isNuevo);
    });
  }

  private initForm(empresa: IEmpresaAliado, isNuevo: boolean) {
    const newForm = this.fb.group({
      name: [empresa.name, this.validationRules.name],
      description: [empresa.description, this.validationRules.description],
      pathImg: [empresa.pathImg, this.validationRules.pathImg],
      address: [empresa.address, this.validationRules.address],
      latitud: [empresa.latitud, this.validationRules.latitud],
      longitud: [empresa.longitud, this.validationRules.longitud],
      phone: [empresa.phone, this.validationRules.phone],
      phone2: [empresa.phone2, this.validationRules.phone2],
      email: [empresa.email, this.validationRules.email],
      active: [empresa.active, this.validationRules.active],
    });

    if (isNuevo) {
      newForm.reset({
        name: '',
        description: '',
        pathImg: null,
        address: '',
        latitud: null,
        longitud: null,
        phone: '',
        phone2: null,
        email: '',
        active: true,
      });
    }
    this.form.set(newForm);
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear empresa' : 'Actualizar empresa';
  }



  onSubmit() {
    if (this.form().valid) {
      const value: IEmpresaAliado = {
        ...this.empresa(),
        ...this.form().value,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }

}
