import { ChangeDetectionStrategy, Component, effect, inject, input, output, signal } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActualizarBanco, Banco, CrearBanco } from '../../../../interfaces/erp-bc/catalogo-bancos';

const ENTERO_MAX = 2147483647;

/** `Validators.required` acepta textos con solo espacios; el API no. */
function textoNoVacio(control: AbstractControl): ValidationErrors | null {
  return String(control.value ?? '').trim() ? null : { required: true };
}

function enteroEnRango(control: AbstractControl): ValidationErrors | null {
  const valor = control.value;
  if (valor === null || valor === '') return null; // lo reporta `required`
  return Number.isInteger(valor) && valor >= 0 && valor <= ENTERO_MAX ? null : { entero: true };
}

@Component({
  selector: 'app-upsert-banco',
  standalone: true,
  imports: [ReactiveFormsModule],
  templateUrl: './upsert-banco.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertBancoComponent {
  private fb = inject(FormBuilder);

  /** `null` = alta de un banco nuevo. */
  banco = input<Banco | null>(null);
  formKey = input<number>(0);
  guardando = input<boolean>(false);

  crear = output<CrearBanco>();
  actualizar = output<ActualizarBanco>();
  cancelar = output<void>();

  readonly enteroMax = ENTERO_MAX;

  form = signal<FormGroup>(this.fb.group({}));

  constructor() {
    effect(() => {
      this.formKey();
      const banco = this.banco();

      this.form.set(this.fb.group({
        bantotalRubro: [banco?.bantotalRubro ?? '', [textoNoVacio, Validators.maxLength(20)]],
        bantotalNombre: [banco?.bantotalNombre ?? '', [textoNoVacio, Validators.maxLength(100)]],
        bantotalAlias: [banco?.bantotalAlias ?? '', [textoNoVacio, Validators.maxLength(50)]],
        bantotalCuenta: [banco?.bantotalCuenta ?? null, [Validators.required, enteroEnRango]],
        bantotalSuboperacion: [banco?.bantotalSuboperacion ?? null, [Validators.required, enteroEnRango]],
        dynamicsCodigo: [banco?.dynamicsCodigo ?? '', [textoNoVacio, Validators.maxLength(20)]],
        dynamicsRubroContable: [banco?.dynamicsRubroContable ?? '', [textoNoVacio, Validators.maxLength(20)]],
        activo: [banco?.activo ?? true],
      }));
    });
  }

  get btnText(): string {
    return this.banco() ? 'Actualizar banco' : 'Crear banco';
  }

  hasError(field: string, error: string): boolean {
    const ctrl = this.form().get(field);
    return !!(ctrl?.touched && ctrl?.errors?.[error]);
  }

  onSubmit() {
    this.form().markAllAsTouched();
    if (this.form().invalid || this.guardando()) return;

    const valor = this.form().getRawValue();
    const datos: CrearBanco = {
      bantotalRubro: valor.bantotalRubro.trim(),
      bantotalNombre: valor.bantotalNombre.trim(),
      bantotalAlias: valor.bantotalAlias.trim(),
      bantotalCuenta: valor.bantotalCuenta,
      bantotalSuboperacion: valor.bantotalSuboperacion,
      dynamicsCodigo: valor.dynamicsCodigo.trim(),
      dynamicsRubroContable: valor.dynamicsRubroContable.trim(),
      activo: !!valor.activo,
    };

    const banco = this.banco();
    if (!banco) {
      this.crear.emit(datos);
      return;
    }

    // El PATCH solo acepta los campos que cambian
    const cambios = Object.fromEntries(
      Object.entries(datos).filter(([campo, nuevo]) => nuevo !== banco[campo as keyof CrearBanco])
    ) as ActualizarBanco;
    this.actualizar.emit(cambios);
  }
}
