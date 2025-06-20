import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IMenu } from '../../../../../interfaces/auth';
import { CommonModule } from '@angular/common';

export interface MenuValidationRules {
  name?: any[];
  description?: any[];
  pathApp?: any[];
  pathWeb?: any[];
  label?: any[];
  icon?: any[];
  color?: any[];
  main?: any[];
  active?: any[];
}

@Component({
  selector: 'app-upsert-menu',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-menu.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertMenuComponent {

  fb = inject(FormBuilder);

  menu = input<IMenu>({
    name: '',
    description: '',
    pathApp: '',
    pathWeb: '',
    label: '',
    icon: '',
    color: 'black',
    main: true,
    active: true,
  });

  nuevo = input<boolean>(true);
  key = input<number>(0);

  validationRules: MenuValidationRules = {
    name: [Validators.required, Validators.minLength(5)],
    description: [Validators.required, Validators.minLength(3)],
    pathApp: [Validators.required, Validators.minLength(3)], // Validación para que comience con /
    pathWeb: [Validators.required, Validators.minLength(3)], // Validación para que comience con /
    label: [Validators.required, Validators.maxLength(30)],
    icon: [Validators.required],
    color: [],
    main: [Validators.required],
    active: [Validators.required],
  };

  @Output() save = new EventEmitter<IMenu>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const menu = this.menu();
      const isNuevo = this.nuevo();

      this.initForm(menu, isNuevo);
    });
  }

  private initForm(menu: IMenu, isNuevo: boolean) {
    const newForm = this.fb.group({
      name: [menu.name, this.validationRules.name],
      description: [menu.description, this.validationRules.description],
      pathApp: [menu.pathApp, this.validationRules.pathApp],
      pathWeb: [menu.pathWeb, this.validationRules.pathWeb],
      label: [menu.label, this.validationRules.label],
      icon: [menu.icon, this.validationRules.icon],
      color: [menu.color, this.validationRules.color],
      main: [menu.main, this.validationRules.main],
      active: [menu.active, this.validationRules.active],
    });

    if (isNuevo) {
      newForm.reset({
        name: '',
        description: '',
        pathApp: '',
        pathWeb: '',
        label: '',
        icon: '',
        color: 'black',
        main: true,
        active: true,
      });
    }

    this.form.set(newForm);
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear menú' : 'Actualizar menú';
  }



  onSubmit() {
    if (this.form().valid) {
      const value: IMenu = {
        ...this.menu(),
        ...this.form().value,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }

}
