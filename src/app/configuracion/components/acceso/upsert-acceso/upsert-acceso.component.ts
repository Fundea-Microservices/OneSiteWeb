import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { FormBuilder, Validators, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { IMenu, IRol } from '../../../../../interfaces/auth';
import { CommonModule } from '@angular/common';
import { IAcceso } from '../../../../../interfaces/acceso';
import { main } from '@popperjs/core';

export interface AccesoValidationRules {
  orderMenu?: any[];
  menuId?: any[];
  rolId?: any[];
  showApp?: any[];
  showWeb?: any[];
  mainMenuId?: any[];
  active?: any[];
}

@Component({
  selector: 'app-upsert-acceso',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-acceso.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertAccesoComponent {

  fb = inject(FormBuilder);

  acceso = input<IAcceso>({
    accesoId: '',
    orderMenu: 1,
    menuId: '',
    rolId: '',
    showApp: true,
    showWeb: true,
    mainMenuId: '',
    active: true,
    menu: {
      name: '',
      description: '',
      pathApp: '',
      pathWeb: '',
      icon: '',
      label: '',
      color: 'black',
      main: true,
      active: true,
    },
    rol: {
      rolId: '',
      name: '',
      active: true,
      guest: false,
    }
  });

  validationRules: AccesoValidationRules = {
    orderMenu: [Validators.required, Validators.minLength(1)],
    menuId: [Validators.required],
    rolId: [Validators.required],
    showApp: [Validators.required],
    showWeb: [Validators.required],
    mainMenuId: [],
    active: [Validators.required],
  }; 

  nuevo = input<boolean>(true);
  key = input<number>(0);

  allMenus = input<IMenu[]>([]); 
  allSubmenus = input<IMenu[]>([]); // Para submenús si es necesario  
  accesosByRol = input<IAcceso[]>([]);


  @Output() save = new EventEmitter<IAcceso>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const acceso = this.acceso();
      const isNuevo = this.nuevo();
      const accesosByRol = this.accesosByRol();

      this.initForm(acceso, isNuevo);
    });
  }

  private initForm(acceso: IAcceso, isNuevo: boolean) {
    const newForm = this.fb.group({
      accesoId: [acceso.accesoId, []],
      orderMenu: [acceso.orderMenu, this.validationRules.orderMenu],
      menuId: [acceso.menuId, this.validationRules.menuId],
      rolId: [acceso.rolId, this.validationRules.rolId],
      showApp: [acceso.showApp, this.validationRules.showApp],
      showWeb: [acceso.showWeb, this.validationRules.showWeb],
      mainMenuId: [acceso.mainMenuId, this.validationRules.mainMenuId],
      active: [acceso.active, this.validationRules.active],
    });

    if (isNuevo) {
      newForm.reset({
        accesoId: '',
        orderMenu: 0,
        showApp: true,
        showWeb: true,
        mainMenuId: '',
        active: true,
        rolId: acceso.rol?.rolId || '',
        menuId: acceso.menu?.menuId || '',
      });
    }

    this.form.set(newForm);
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear acceso' : 'Actualizar acceso';
  }



  onSubmit() {
    if (this.form().valid) {
      const value: IAcceso = {
        ...this.acceso(),
        ...this.form().value,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }

}


