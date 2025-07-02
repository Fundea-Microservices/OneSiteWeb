import { ChangeDetectionStrategy, Component, computed, effect, EventEmitter, inject, input, Output, signal } from '@angular/core';
import { IConfiguracion } from '../../../../../interfaces/configuracion';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface ConfigValidationRules {
  key?: any[];
  type?: any[];
  description?: any[];
  value?: any[];
  active?: any[];
}

export interface basicObject {
  key: string;
  value: string;
}

@Component({
  selector: 'app-upsert-config',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-config.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertConfigComponent {

  fb = inject(FormBuilder);

  configuracion = input<IConfiguracion>({
    key: '',
    value: '',
    description: '',
    type: '',
    active: true,
  });

  nuevo = input<boolean>(true);
  key = input<number>(0);
  arrayValues = signal<string[]>([]);
  objectValues = signal<basicObject[]>([]);

  validationRules: ConfigValidationRules = {
    key: [Validators.required, Validators.minLength(3)],
    value: [Validators.required, Validators.minLength(1)],
    description: [Validators.required, Validators.minLength(3)],
    type: [Validators.required],
    active: [Validators.required],
  };



  @Output() save = new EventEmitter<IConfiguracion>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      const _ = this.key(); // provoca que el form se reinicie cada vez que cambia el key
      const config = this.configuracion();
      const isNuevo = this.nuevo();

      this.initForm(config, isNuevo);
    });
  }

  private initForm(config: IConfiguracion, isNuevo: boolean) {

    // Si el type es 'boolean', modificamos el valor
    if( config.type === 'boolean') {
      config.value = config.value === 'true' ? true : false;
    }

    // Si el type es 'array', pasamos los elementos a arrayValues    
    if (config.type === 'array') {
      if (typeof config.value === 'string') {
        this.arrayValues.set(JSON.parse(config.value));
      } else {
        this.arrayValues.set([]);
      }
    }

    // Si el type es 'object', pasamos los elementos a objectValues
    if (config.type === 'object') {
      if (typeof config.value === 'string') {
        try {
          const parsedObject = JSON.parse(config.value);
          this.objectValues.set(Object.entries(parsedObject).map(([key, value]) => ({ key, value: String(value) })));
        } catch (error) {
          console.error('Error parsing object value:', error);
          this.objectValues.set([]);  // Si hay un error, inicializamos como vacío  
        }
      }
    }
  

    const newForm = this.fb.group({
      key: [config.key, this.validationRules.key],
      description: [config.description, this.validationRules.description],
      type: [config.type, this.validationRules.type],
      value: [config.value, this.validationRules.value],
      active: [config.active, this.validationRules.active],
    });


    if (isNuevo) {
      newForm.reset({
        key: '',
        description: '',
        type: '',
        value: '',
        active: true,
      });

      this.arrayValues.set([]);
      this.objectValues.set([]);
    }

    this.form.set(newForm);
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear configuración' : 'Actualizar configuración';
  }

  objectAsJson = computed(() => {
  return this.objectValues().reduce((acc, { key, value }) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, string>);
});

  onSubmit() {
    if (this.form().get('type')?.value === 'string' || this.form().get('type')?.value === 'boolean' || this.form().get('type')?.value === 'number') {
      // Convertir value a string
      const value = this.form().get('value')?.value;
      this.form().get('value')?.setValue(value.toString());
    }
    if (this.form().get('type')?.value === 'array') {
      // Convertir arrayValues a un JSON
      const valueJson = JSON.stringify(this.arrayValues());
      this.form().get('value')?.setValue(valueJson);
    }
    if (this.form().get('type')?.value === 'object') {
      // Transformamos el array objectValues a un JSON de un solo objeto
      const valueJson = JSON.stringify(this.objectAsJson());
      this.form().get('value')?.setValue(valueJson);
    }

    if (this.form().valid) {
      const value: IConfiguracion = {
        ...this.configuracion(),
        ...this.form().value,
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }

  addElement(input: HTMLInputElement) {
    const value = input.value.trim();
    if (value === '') return;

    this.arrayValues.update((prev) => [...prev, value]);
    input.value = ''; // ✅ limpia el input

    // Actualizamos el value del form
    const valueJoin = this.arrayValues().join(',');
    this.form().get('value')?.setValue(valueJoin);

  }

  removeElement(index: number) {
    this.arrayValues.update((prev) => prev.filter((_, i) => i !== index));

    // Actualizamos el value del form
    const valueJoin = this.arrayValues().join(',');
    this.form().get('value')?.setValue(valueJoin);

  }

  addElementObj(nameInput: HTMLInputElement, valueInput: HTMLInputElement) {
    const name = nameInput.value.trim();
    const value = valueInput.value.trim();
    if (name === '' || value === '') return;

    this.objectValues.update((prev) => [...prev, { key: name, value }]);
    nameInput.value = ''; // ✅ limpia el input
    valueInput.value = ''; // ✅ limpia el input

    // Actualizamos el value del form
    const valueJson = JSON.stringify(this.objectValues());
    this.form().get('value')?.setValue(valueJson);
  }

  removeElementObj(index: number) {
    this.objectValues.update((prev) => prev.filter((_, i) => i !== index));

    // Actualizamos el value del form
    const valueJson = JSON.stringify(this.objectValues());
    this.form().get('value')?.setValue(valueJson);
  }
}
