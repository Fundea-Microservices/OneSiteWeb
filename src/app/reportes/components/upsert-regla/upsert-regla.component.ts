import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  signal,
  effect,
  OnInit
} from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { IRol } from '../../../../interfaces/auth';
import { RolService } from '../../../../services/rol.service';
import { IRegla } from '../../../../interfaces/reportes/regla-ejecucion';

export interface ReglaValidationRules {
  rolId?: any[];
  horaInicio?: any[];
  horaFin?: any[];
  diaSemana?: any[];
  diaMes?: any[];
}

@Component({
  selector: 'app-upsert-regla',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-regla.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertReglaComponent implements OnInit {
  fb = inject(FormBuilder);
  rolService = inject(RolService);

  // ID obligatorio del reporte
  reporteId = input.required<string>();

  regla = input<IRegla>({
    reglaId: '',
    reporteId: '',
    rolId: '',
    active: true,
    horaInicio: '',
    horaFin: '',
    diaSemana: '',
    diaMes: '',
    rol: {} as IRol
  });

  nuevo = input<boolean>(true);

  validationRules: ReglaValidationRules = {
    rolId: [Validators.required],
    horaInicio: [Validators.required],
    horaFin: [Validators.required],
    diaSemana: [Validators.maxLength(50)],
    diaMes: [Validators.maxLength(50)],
  };

  @Output() save = new EventEmitter<IRegla>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));
  rolesList = signal<IRol[]>([]);

  ngOnInit() {
    this.loadRoles();
  }

  constructor() {
    effect(() => {
      const isNuevo = this.nuevo();
      const regla = this.regla();

      const newForm = this.fb.group({
        rolId: [regla.rolId, this.validationRules.rolId],
        active: [regla.active],
        horaInicio: [regla.horaInicio, this.validationRules.horaInicio],
        horaFin: [regla.horaFin, this.validationRules.horaFin],
        diaSemana: [regla.diaSemana, this.validationRules.diaSemana],
        diaMes: [regla.diaMes, this.validationRules.diaMes],
      });

      if (isNuevo) {
        newForm.reset({
          rolId: '',
          active: true,
          horaInicio: '',
          horaFin: '',
          diaSemana: '',
          diaMes: '',
        });
      }

      this.form.set(newForm);
    });
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Regla' : 'Actualizar Regla';
  }

  async loadRoles() {
    let resp = await this.rolService.getRoles({ page: 1, limit: 100, search: '' });
    if (resp) {
      this.rolesList.set(resp.data.roles);
    }
  }

  onSubmit() {
    if (this.form().valid) {
      const value: IRegla = {
        ...this.regla(),
        ...this.form().value,
        reporteId: this.reporteId(),
      };
      this.save.emit(value);
    }
  }

  onCancel() {
    this.cancel.emit();
  }
}
