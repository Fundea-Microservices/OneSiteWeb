import {
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
  DestroyRef,
  Component,
  computed,
  effect,
  EventEmitter,
  inject,
  input,
  Output,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription, merge } from 'rxjs';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import {
  IModeloScoring,
  ITipoScoring,
} from '../../../../interfaces/scoring/scoring';

/** Tramos por defecto de un modelo nuevo, sobre una escala de 0 a 10. */
const RANGOS_SUGERIDOS = [
  { semaforo: 'Rojo', puntajeMinimo: 0, puntajeMaximo: 4.9999, descripcion: 'Riesgo alto' },
  { semaforo: 'Amarillo', puntajeMinimo: 5, puntajeMaximo: 7.9999, descripcion: 'Requiere comité' },
  { semaforo: 'Verde', puntajeMinimo: 8, puntajeMaximo: 10, descripcion: 'Aprobación directa' },
];

@Component({
  selector: 'app-upsert-modelo-scoring',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './upsert-modelo-scoring.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertModeloScoringComponent {
  private fb = inject(FormBuilder);

  modelo = input<IModeloScoring | null>(null);
  tipos = input<ITipoScoring[]>([]);
  nuevo = input<boolean>(true);
  /** Cambia en cada apertura del modal para forzar el rearmado del formulario. */
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IModeloScoring>();
  @Output() cancel = new EventEmitter<void>();


  form = signal<FormGroup>(this.fb.group({}));

  /**
   * Tipo elegido en el desplegable.
   *
   * Tiene que ser una señal propia: el valor de un FormControl no lo es, así
   * que un computed que lo leyera directo nunca se recalcularía al cambiar la
   * selección. Se alimenta desde valueChanges en initForm.
   */
  private tipoSeleccionado = signal<number | null>(null);

  /** Se cancela al rearmar el formulario para no acumular suscripciones. */
  private tipoSub?: Subscription;

  /**
   * Orígenes marcados. Misma razón que `tipoSeleccionado`: el valor de un
   * FormControl no es señal, así que la plantilla no reaccionaría sola.
   */
  private origenes = signal({ bantotal: true, captura: false });
  private origenSub?: Subscription;

  origenBantotal = computed(() => this.origenes().bantotal);
  origenCaptura = computed(() => this.origenes().captura);

  /** La base lo respalda con CK_Modelo_Origen; aquí evita el viaje al servidor. */
  errorOrigen = computed(() =>
    !this.origenes().bantotal && !this.origenes().captura
      ? 'Debe activar al menos un origen de datos.'
      : '',
  );

  /**
   * El tipo de scoring decide si los procedimientos almacenados son
   * obligatorios. El backend valida lo mismo; aquí es para que el usuario no
   * llegue al Guardar sin enterarse.
   */
  ejecutaProcedimiento = computed(() => {
    const idTipo = this.tipoSeleccionado();
    if (idTipo === null) return false;
    return (
      this.tipos().find((t) => t.idTipoScoring === idTipo)
        ?.ejecutaProcedimiento ?? false
    );
  });


  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.modelo(), this.nuevo());
    });

    // El tipo manda: con procedimientos, el de punteo es obligatorio; sin
    // ellos, los dos campos se vacían porque la pantalla ya no los muestra.
    effect(() => {
      const ejecuta = this.ejecutaProcedimiento();
      const punteo = this.form().get('procesoPunteo');
      const variables = this.form().get('procesoVariables');
      if (!punteo || !variables) return;

      punteo.setValidators(
        ejecuta
          ? [Validators.required, Validators.maxLength(128)]
          : [Validators.maxLength(128)],
      );
      punteo.updateValueAndValidity({ emitEvent: false });
    });

    inject(DestroyRef).onDestroy(() => {
      this.tipoSub?.unsubscribe();
      this.origenSub?.unsubscribe();
    });
  }

  get rangos(): FormArray {
    return this.form().get('rangos') as FormArray;
  }

  private initForm(modelo: IModeloScoring | null, esNuevo: boolean): void {
    const rangos = esNuevo || !modelo?.rangos?.length
      ? RANGOS_SUGERIDOS
      : modelo.rangos;

    this.form.set(
      this.fb.group({
        codigoInterno: [
          { value: modelo?.codigoInterno ?? '', disabled: !esNuevo },
          [Validators.required, Validators.maxLength(20), Validators.pattern(/^[A-Za-z0-9_-]+$/)],
        ],
        nombreScoring: [
          modelo?.nombreScoring ?? '',
          [Validators.required, Validators.maxLength(100)],
        ],
        descripcion: [
          modelo?.descripcion ?? '',
          [Validators.required, Validators.maxLength(500)],
        ],
        idTipoScoring: [modelo?.idTipoScoring ?? null, [Validators.required]],
        procesoVariables: [modelo?.procesoVariables ?? '', [Validators.maxLength(128)]],
        procesoPunteo: [modelo?.procesoPunteo ?? '', [Validators.maxLength(128)]],
        fechaVigencia: [
          this.aFechaInput(modelo?.fechaVigencia),
          [Validators.required],
        ],
        estado: [modelo?.estado ?? 'Activo', [Validators.required]],
        // Un modelo nuevo nace como solo Bantotal, que es como se comportaba
        // el módulo antes de que el origen fuera parametrizable.
        origenBantotal: [modelo?.origenBantotal ?? true],
        origenCaptura: [modelo?.origenCaptura ?? false],
        rangos: this.fb.array(
          rangos.map((rango) =>
            this.fb.group({
              semaforo: [rango.semaforo, [Validators.required]],
              puntajeMinimo: [rango.puntajeMinimo, [Validators.required]],
              puntajeMaximo: [rango.puntajeMaximo, [Validators.required]],
              descripcion: [rango.descripcion ?? ''],
            }),
          ),
        ),
      }),
    );

    this.tipoSeleccionado.set(modelo?.idTipoScoring ?? null);
    this.sincronizarTipo();
    this.sincronizarOrigen();
  }

  /** Mantiene al día la señal de orígenes desde los dos checks. */
  private sincronizarOrigen(): void {
    this.origenSub?.unsubscribe();

    const form = this.form();
    const bantotal = form.get('origenBantotal');
    const captura = form.get('origenCaptura');
    if (!bantotal || !captura) return;

    const aplicar = (): void =>
      this.origenes.set({
        bantotal: bantotal.value === true,
        captura: captura.value === true,
      });

    aplicar();
    this.origenSub = merge(
      bantotal.valueChanges,
      captura.valueChanges,
    ).subscribe(aplicar);
  }

  /**
   * Mantiene la señal del tipo al día y ajusta el validador de procesoPunteo.
   *
   * El campo pasa de opcional a obligatorio según el tipo, así que el validador
   * se agrega y se quita en caliente; dejarlo fijo obligaría a llenarlo también
   * en los modelos de cálculo directo, donde no aplica.
   */
  private sincronizarTipo(): void {
    this.tipoSub?.unsubscribe();

    const control = this.form().get('idTipoScoring');
    if (!control) return;

    const aplicar = (valor: unknown): void => {
      const idTipo = valor === null || valor === '' ? null : Number(valor);
      this.tipoSeleccionado.set(idTipo);
    };

    aplicar(control.value);
    this.tipoSub = control.valueChanges.subscribe(aplicar);
  }

  /**
   * El input date exige AAAA-MM-DD; el backend devuelve ISO completo.
   * Sin fecha guardada arranca en hoy, en hora local, no en vacío.
   */
  private aFechaInput(fecha?: string | null): string {
    if (fecha) return String(fecha).slice(0, 10);

    const hoy = new Date();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    const dia = String(hoy.getDate()).padStart(2, '0');
    return `${hoy.getFullYear()}-${mes}-${dia}`;
  }

  /**
   * Los tramos son inclusivos en ambos extremos, así que tocar el mismo número
   * ya es traslape. El backend lo rechaza igual; avisarlo aquí evita el viaje.
   */
  errorRangos = computed(() => {
    const valores = (this.rangos?.value ?? []) as {
      semaforo: string;
      puntajeMinimo: number;
      puntajeMaximo: number;
    }[];

    for (const rango of valores) {
      if (Number(rango.puntajeMinimo) > Number(rango.puntajeMaximo)) {
        return `El rango ${rango.semaforo} tiene el mínimo por encima del máximo.`;
      }
    }

    const ordenados = [...valores].sort(
      (a, b) => Number(a.puntajeMinimo) - Number(b.puntajeMinimo),
    );

    for (let i = 1; i < ordenados.length; i++) {
      if (Number(ordenados[i].puntajeMinimo) <= Number(ordenados[i - 1].puntajeMaximo)) {
        return `Los rangos ${ordenados[i - 1].semaforo} y ${ordenados[i].semaforo} se traslapan.`;
      }
    }

    return '';
  });

  onSubmit(): void {
    const form = this.form();

    if (form.invalid) {
      form.markAllAsTouched();
      return;
    }

    if (this.errorRangos() || this.errorOrigen()) return;

    // procesoPunteo ya no se revisa aquí: sincronizarTipo le pone y le quita el
    // validador required según el tipo, así que form.invalid lo cubre.

    // getRawValue incluye codigoInterno cuando está deshabilitado en edición.
    const valores = form.getRawValue();

    this.save.emit({
      ...(this.modelo() ?? {}),
      ...valores,
      procesoVariables: valores.procesoVariables || null,
      procesoPunteo: valores.procesoPunteo || null,
      rangos: valores.rangos.map((rango: any) => ({
        ...rango,
        puntajeMinimo: Number(rango.puntajeMinimo),
        puntajeMaximo: Number(rango.puntajeMaximo),
        descripcion: rango.descripcion || null,
      })),
    } as IModeloScoring);
  }

  onCancel(): void {
    this.cancel.emit();
  }

  campoInvalido(campo: string): boolean {
    const control = this.form().get(campo);
    return !!control && control.invalid && control.touched;
  }
}
