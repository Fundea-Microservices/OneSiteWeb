import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  effect,
  inject,
  input
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  AbstractControl
} from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './change-password.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChangePasswordComponent {
  private fb = inject(FormBuilder);
  
  isAdmin = input<boolean>(false);
  key = input<number>(0);

  @Output() cancel = new EventEmitter<void>();
  @Output() changePassword = new EventEmitter<{ current: string; new: string }>();

  form: FormGroup = this.fb.group({
    currentPassword: ['',],
    newPassword: ['', [Validators.required, Validators.minLength(6)]],
    confirmPassword: ['', Validators.required]
  }, {
    validators: [this.passwordsMatchValidator]
  });

  constructor() {
    effect(() => {
      const _ = this.key(); 
      const isAdmin = this.isAdmin();

      this.initForm();
    });
  }

  private initForm(): void {
    this.form.reset();
  }

  get passwordsDoNotMatch(): boolean {   
    
    if(this.form.hasError('passwordsMismatch') && this.form.get('confirmPassword')?.touched) return true
    return false 
  }

  private passwordsMatchValidator(group: AbstractControl): { [key: string]: any } | null {
    const newPassword = group.get('newPassword')?.value;
    const confirmPassword = group.get('confirmPassword')?.value;
    return newPassword === confirmPassword ? null : { passwordsMismatch: true };
  }

  onSubmit() {
    if (this.form.valid) {
      this.changePassword.emit({
        current: this.form.value.currentPassword,
        new: this.form.value.newPassword
      });
    } else {
      this.form.markAllAsTouched();
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
