import { ChangeDetectionStrategy, Component, computed, effect, EventEmitter, inject, input, OnInit, Output, signal } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { IPregunta } from '../../../../interfaces/encuesta/encuesta';
import { CatalogoService } from '../../../../services/config/catalogo-maestro.service';
import { ICatalogo } from '../../../../interfaces/catalogo-maestro/catalogo-maestro';

export const TIPOS_DATO = [
  'TEXT', 'NUMBER', 'NUMERO', 'DECIMAL', 'ENTERO',
  'DATE', 'FECHA',
  'EMAIL', 'TELEFONO',
  'BOOLEAN', 'RADIO', 'CHECKBOX',
  'TEXTAREA',
  'SELECT', 'MULTISELECT', 'LISTA',
  'COORDENADAS', 'GEOLOCALIZACION', 'UBICACION',
  'FILE', 'MATRIZ',
];

const TIPOS_CON_ORIGEN = new Set(['SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX', 'LISTA']);

export const ORIGENES_TIPO = ['CATALOGO', 'API', 'LISTA'];

@Component({
  selector: 'app-upsert-pregunta',
  imports: [ReactiveFormsModule],
  templateUrl: './upsert-pregunta.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertPreguntaComponent {
  private fb = inject(FormBuilder);
  private catalogoService = inject(CatalogoService);

  readonly tiposDato = TIPOS_DATO;
  readonly origenesTipo = ORIGENES_TIPO;

  pregunta = input<IPregunta>({ idSeccion: 0, etiqueta: '', tipoDato: 'TEXT', orden: 1, codigo: 0 });
  nuevo = input<boolean>(true);
  formKey = input<number>(0);

  @Output() save = new EventEmitter<IPregunta>();
  @Output() cancel = new EventEmitter<void>();

  form = signal<FormGroup>(this.fb.group({}));

  // ── Autocomplete catálogo ──────────────────────────────────────────────────
  catalogos = signal<ICatalogo[]>([]);
  catalogoSearch = signal('');
  catalogoDropdownOpen = signal(false);

  catalogosFiltrados = computed(() => {
    const q = this.catalogoSearch().toLowerCase();
    if (!q) return this.catalogos();
    return this.catalogos().filter(c =>
      c.nombre.toLowerCase().includes(q) || c.codigo.toLowerCase().includes(q)
    );
  });

  async loadCatalogos() {
    if (this.catalogos().length > 0) return;
    const resp = await this.catalogoService.getCatalogos({ all: true });
    if (resp?.data) this.catalogos.set(resp.data);
  }

  selectCatalogo(cat: ICatalogo) {
    this.form().get('origenDatosCmd')?.setValue(cat.codigo);
    this.catalogoSearch.set(`${cat.codigo} – ${cat.nombre}`);
    this.catalogoDropdownOpen.set(false);
  }

  onCatalogoInput(value: string) {
    this.catalogoSearch.set(value);
    this.catalogoDropdownOpen.set(true);
    // If user clears the input, clear the form control
    if (!value.trim()) this.form().get('origenDatosCmd')?.setValue(null);
  }

  closeCatalogoDropdown() {
    // Timeout lets click on option fire before blur closes the dropdown
    setTimeout(() => this.catalogoDropdownOpen.set(false), 150);
  }

  constructor() {
    effect(() => {
      const _ = this.formKey();
      this.initForm(this.pregunta(), this.nuevo());
    });
  }

  private initForm(preg: IPregunta, isNuevo: boolean) {
    const g = this.fb.group({
      etiqueta: [preg.etiqueta, [Validators.required]],
      tipoDato: [preg.tipoDato, [Validators.required, Validators.maxLength(50)]],
      orden: [preg.orden, [Validators.required, Validators.min(1)]],
      origenDatosTipo: [preg.origenDatosTipo ?? null, [Validators.maxLength(50)]],
      origenDatosCmd: [preg.origenDatosCmd ?? null, [Validators.maxLength(255)]],
      filtro: [preg.filtro ?? null],
      esEditable: [preg.esEditable ?? true],
      esVisibleDefault: [preg.esVisibleDefault ?? true],
    });
    if (isNuevo) g.reset({ etiqueta: '', tipoDato: 'TEXT', orden: 1, origenDatosTipo: null, origenDatosCmd: null, filtro: null, esEditable: true, esVisibleDefault: true });
    // Pre-fill search display when editing with a catalog origin
    const searchText = (!isNuevo && preg.origenDatosCmd) ? preg.origenDatosCmd : '';
    this.catalogoSearch.set(searchText);
    this.catalogoDropdownOpen.set(false);
    this.form.set(g);
  }

  hasError(field: string, error: string) {
    const c = this.form().get(field);
    return !!(c?.touched && c?.errors?.[error]);
  }

  get tieneOrigen(): boolean {
    return TIPOS_CON_ORIGEN.has(this.form().get('tipoDato')?.value);
  }

  get tieneFiltro(): boolean {
    return TIPOS_CON_ORIGEN.has(this.form().get('tipoDato')?.value);
  }

  get esCatalogo(): boolean {
    return TIPOS_CON_ORIGEN.has(this.form().get('tipoDato')?.value)
      && this.form().get('origenDatosTipo')?.value === 'CATALOGO';
  }

  get btnText() { return this.nuevo() ? 'Crear pregunta' : 'Actualizar pregunta'; }

  onSubmit() {
    this.form().markAllAsTouched();
    if (!this.form().valid) return;
    this.save.emit({ ...this.pregunta(), ...this.form().value });
  }

  onCancel() { this.cancel.emit(); }
}
