import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  effect,
  inject,
  input,
  signal
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  Validators,
  FormGroup
} from '@angular/forms';
import { IRol, IUser } from '../../../../../interfaces/auth';

@Component({
  selector: 'app-upsert-user',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-user.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertUserComponent {
  fb = inject(FormBuilder);

  user = input<IUser>({
    userId: '',
    fullName: '',
    userName: '',
    name1: '',
    name2: '',
    name3: '',
    lastName1: '',
    lastName2: '',
    lastName3: '',
    password: '',
    email: '',
    active: true,
    rolId: '',
    rol: {} as IRol,
    fingerprint: null,
    validateMAC: null,
    puestoId: null,
    puesto: null,
    methodId: null,
    created_at: new Date(),
  });

  nuevo = input<boolean>(true);
  roles = input<IRol[]>([]);

  @Output() save = new EventEmitter<IUser>();
  @Output() cancel = new EventEmitter<void>();

  

  form = signal<FormGroup>(this.fb.group({}));
  key = input<number>(0);

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const user = this.user();
      const _ = this.key(); // provoca que el form se reinicie cada vez que cambia el key

      const newForm: FormGroup = this.fb.group({
        fullName: [user.fullName],
        userName: [user.userName, [Validators.required]],
        name1: [user.name1, [Validators.required]],
        name2: [user.name2, []],
        name3: [user.name3, []],
        lastName1: [user.lastName1, [Validators.required]],
        lastName2: [user.lastName2, []],
        lastName3: [user.lastName3, []],
        email: [user.email, [Validators.required, Validators.email]],
        password: ['123456', [Validators.required, Validators.minLength(6)]],
        active: [user.active, []],
        rolId: [user.rolId, [Validators.required]]
      });

      if (isNuevo) {
        newForm.reset({
          fullName: '',
          userName: '',
          name1: '',
          name2: '',
          name3: '',
          lastName1: '',
          lastName2: '',
          lastName3: '',
          email: '',
          password: '',
          active: true,
          rolId: this.roles().filter(rol => rol.guest === true)[0]?.rolId || ''
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

  onSubmit() {
    if (this.form().invalid) return;
    const value: IUser = {
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

  changeUserName(username: string) {
    this.form().get('email')?.setValue(`${username.toLowerCase()}@fundea.org.gt`);
  }
}
