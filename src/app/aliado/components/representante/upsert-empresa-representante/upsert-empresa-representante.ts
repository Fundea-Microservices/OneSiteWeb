import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  signal,
  computed,
  OnInit,
  viewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IEmpresaRepresentante } from '../../../../../interfaces/aliado/empresa-representante';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { CatalogoSimple } from '../../../../../interfaces/api-bantotal/catalogos';
import { FormRespuesta, RenderFormularioComponent } from '../../../../configuracion/components/formulario/render-formulario/render-formulario.component';
import { FormulariosService } from '../../../../../services/config/formularios.service';
import { ToastrService } from 'ngx-toastr';

@Component({
  selector: 'app-upsert-empresa-representante',
  imports: [CommonModule, FormsModule, RenderFormularioComponent],
  templateUrl: './upsert-empresa-representante.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertEmpresaRepresentanteComponent implements OnInit {
  private catalogosService = inject(CatalogosBantotalService);
  private formulariosService = inject(FormulariosService);
  private toastr = inject(ToastrService);

  readonly FORMULARIO_EMPRESA_ID = '34CECDE4-C2E1-43AE-B560-D3D9F22D17AE';

  empresa = input<IEmpresaRepresentante>({
    empresaId: '',
    representanteId: '',
    nombreEmpresa: '',
    nit: '',
    telefono: '',
    departamento: 0,
    municipio: 0,
    direccion: '',
    tipoActividad: '',
    actividad: '',
    detalleActividad: '',
    fechaInicioActividad: '',
  });

  representanteId = input.required<string>();
  nuevo = input<boolean>(true);
  key = input<number>(0);

  @Output() save = new EventEmitter<IEmpresaRepresentante>();
  @Output() cancel = new EventEmitter<void>();

  // Listas fijas de tipos y actividades (valor = texto = valor guardado en BD)
  readonly TIPOS_ACTIVIDAD = ['Comercio', 'Servicios', 'Producción'];

  readonly ACTIVIDADES_POR_TIPO: Record<string, string[]> = {
    'Comercio': [
      'Tienda', 'Abarrotería', 'Agroservicio', 'Ferretería', 'Librería',
      'Venta de Ropa', 'Miscelaneas', 'Compra / Venta de Productos Varios', 'Otros',
    ],
    'Servicios': [
      'Peluquería / Salón de belleza', 'Hotel', 'Restaurante / Cafetería / Venta de Comida',
      'Carpintería', 'Herrería', 'Academias', 'Aserradero', 'Molino', 'Talavartería', 'Otros',
    ],
    'Producción': [
      'Fabricación de ropa', 'Fabricación de zapatos', 'Otros',
    ],
  };

  // Formulario dinámico
  renderFormRef = viewChild(RenderFormularioComponent);
  datosAdicionales = signal<FormRespuesta[]>([]);
  mensajeFormDinamico = signal<string>('');
  valoresFormDinamico = signal<{ preguntaId: string; valor: string }[]>([]);
  cargandoFormulario = signal(false);
  errorFormulario = signal<string | null>(null);
  // Catálogos (solo departamento y municipio siguen usando catálogo)
  departamentos = signal<CatalogoSimple[]>([]);
  municipios = signal<CatalogoSimple[]>([]);
  // tiposActividad y actividades ya no usan catálogo
  // tiposActividad = signal<CatalogoSimple[]>([]);
  // actividades = signal<CatalogoSimple[]>([]);

  // Campos del formulario
  nombreEmpresa = signal<string>('');
  nit = signal<string>('');
  telefono = signal<string>('');
  selectedDepartamentoCode = signal<string>('');
  selectedMunicipioId = signal<string>('');
  direccion = signal<string>('');
  selectedTipoActividadId = signal<string>('');
  selectedActividadId = signal<string>('');
  detalleActividad = signal<string>('');
  fechaInicioActividad = signal<string>('');

  // Computados
  municipiosFiltrados = computed(() => {
    const deptoCode = this.selectedDepartamentoCode();
    const depto = this.departamentos().find(d => d.valorCore === deptoCode);
    if (!depto) return [];

    return this.municipios().filter(m => m.padreValorCore === depto.valorCore);
  });

  actividadesFiltradas = computed(() => {
    return this.ACTIVIDADES_POR_TIPO[this.selectedTipoActividadId()] ?? [];
  });

  constructor() {}

  ngOnInit(): void {
    this.cargarCatalogos();

    // El componente se recrea cada vez que el modal se abre (@if showModal en el padre),
    // así que ngOnInit() es suficiente para inicializar — no se necesita effect().
    const empresaData = this.empresa();
    const isNuevo = this.nuevo();

    if (isNuevo) {
      this.resetForm();
      this.valoresFormDinamico.set([]);
    } else {
      this.loadEmpresaData(empresaData);
      if (empresaData.empresaId) {
        void this.cargarValoresFormulario(empresaData.empresaId);
      } else {
        this.valoresFormDinamico.set([]);
      }
    }
  }

  private cargarCatalogos() {
    const deptos = this.catalogosService.obtenerLocal('departamento');
    if (deptos) {
      this.departamentos.set(deptos);
    }

    const munis = this.catalogosService.obtenerLocal('municipio');
    if (munis) {
      this.municipios.set(munis);
    }

    // Tipos de actividad y actividades ya no se cargan del cat\u00e1logo
    // const tiposAct = this.catalogosService.obtenerLocal('sector');
    // if (tiposAct) { this.tiposActividad.set(tiposAct); }
    // const acts = this.catalogosService.obtenerLocal('actividad_laboral');
    // if (acts) { this.actividades.set(acts); }
  }

  private resetForm() {
    this.nombreEmpresa.set('');
    this.nit.set('');
    this.telefono.set('');
    this.selectedDepartamentoCode.set('0');
    this.selectedMunicipioId.set('');
    this.direccion.set('');
    this.selectedTipoActividadId.set('');
    this.selectedActividadId.set('');
    this.detalleActividad.set('');
    this.fechaInicioActividad.set('');
  }

  private loadEmpresaData(empresa: IEmpresaRepresentante) {
    this.nombreEmpresa.set(empresa.nombreEmpresa || '');
    this.nit.set(empresa.nit || '');
    this.telefono.set(empresa.telefono || '');
    this.selectedDepartamentoCode.set(empresa.departamento?.toString() || '0');
    this.selectedMunicipioId.set(empresa.municipio?.toString() || '');
    this.direccion.set(empresa.direccion || '');

    // Normaliza valores para que el select haga match aunque vengan con variaciones de formato.
    const tipoActividad = this.matchOption(this.TIPOS_ACTIVIDAD, empresa.tipoActividad);
    const actividadesDelTipo = this.ACTIVIDADES_POR_TIPO[tipoActividad] ?? [];
    const actividad = this.matchOption(actividadesDelTipo, empresa.actividad);
    this.selectedTipoActividadId.set(tipoActividad);
    this.selectedActividadId.set(actividad);

    this.detalleActividad.set(empresa.detalleActividad || '');
    this.fechaInicioActividad.set(this.formatFechaParaMostrar(empresa.fechaInicioActividad) || '');
    if (empresa.datosAdicionales?.length) {
      this.valoresFormDinamico.set(
        empresa.datosAdicionales
          .filter(d => !!d.preguntaId)
          .map(d => ({ preguntaId: d.preguntaId!, valor: d.valor ?? '' }))
      );
    }
  }

  private normalizarTexto(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim()
      .toLowerCase();
  }

  private matchOption(opciones: string[], valor: string | null | undefined): string {
    if (!valor) return '';
    const valorNormalizado = this.normalizarTexto(valor);
    return opciones.find(op => this.normalizarTexto(op) === valorNormalizado) ?? '';
  }

  onTipoActividadChange(tipo: string) {
    if (tipo === this.selectedTipoActividadId()) {
      return;
    }
    this.selectedTipoActividadId.set(tipo);
    this.selectedActividadId.set('');
  }

  onListadoFormDinamico(listado: FormRespuesta[]) {
    this.datosAdicionales.set(listado.filter(d => d.tipo !== 'FILE'));
  }

  async cargarValoresFormulario(empresaId: string) {
    this.cargandoFormulario.set(true);
    this.errorFormulario.set(null);
    try {
      const valores = await this.formulariosService.obtenerValoresFormulario(this.FORMULARIO_EMPRESA_ID, empresaId);
      this.valoresFormDinamico.set(valores ?? []);
    } catch (error: any) {
      const apiMsg = error?.error?.message || error?.message || null;
      this.errorFormulario.set(
        apiMsg
          ? `No se pudieron cargar los datos adicionales del formulario: ${apiMsg}`
          : 'No se pudieron cargar los datos adicionales del formulario. Intente más tarde.'
      );
      this.toastr.error(apiMsg || 'No se pudieron cargar los datos adicionales del formulario', 'Error');
    } finally {
      this.cargandoFormulario.set(false);
    }
  }

  private formatFechaParaMostrar(fecha: string | Date | undefined): string {
    if (!fecha) return '';
    const date = typeof fecha === 'string' ? new Date(fecha) : fecha;
    if (isNaN(date.getTime())) return '';
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private parseFechaDDMMYYYY(fechaStr: string): Date | undefined {
    if (!fechaStr) return undefined;
    const parts = fechaStr.split('/');
    if (parts.length !== 3) return undefined;

    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const year = parseInt(parts[2], 10);

    const date = new Date(year, month, day);
    return isNaN(date.getTime()) ? undefined : date;
  }

  formatNit(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    
    if (value.length >= 8) {
      value = value.slice(0, 8) + '-' + value.slice(8, 9);
    }
    
    this.nit.set(value);
  }

  get btnText(): string {
    return this.nuevo() ? 'Crear Empresa' : 'Actualizar Empresa';
  }

  isFormValid(): boolean {
    return !!(
      this.nombreEmpresa() &&
      this.nit() &&
      this.direccion() &&
      this.selectedDepartamentoCode() &&
      this.selectedMunicipioId() &&
      this.selectedTipoActividadId() &&
      this.selectedActividadId()
    );
  }

  onSubmit() {
    if (!this.isFormValid()) {
      return;
    }

    const renderRef = this.renderFormRef();
    const formDinamicoValido = renderRef?.validarFormulario() ?? true;
    if (!formDinamicoValido) {
      const msg = this.mensajeFormDinamico();
      this.toastr.error(msg || 'Por favor completa los campos obligatorios del formulario.', 'Campos incompletos');
      return;
    }
    const datosParaGuardar = this.datosAdicionales();

    const deptoCode = this.selectedDepartamentoCode();
    const muniId = this.selectedMunicipioId();
    const depto = this.departamentos().find(d => d.valorCore === deptoCode);
    const muni = this.municipios().find(m => m.catalogoId === muniId);

    const fechaParsed = this.parseFechaDDMMYYYY(this.fechaInicioActividad());

    const empresaData: IEmpresaRepresentante = {
      ...this.empresa(),
      representanteId: this.representanteId(),
      nombreEmpresa: this.nombreEmpresa(),
      nit: this.nit(),
      telefono: this.telefono(),
      departamento: depto ? Number(depto.valorCore) : 1,
      municipio: muni ? Number(muni.valorCore) : 1,
      direccion: this.direccion(),
      tipoActividad: this.selectedTipoActividadId(),
      actividad: this.selectedActividadId(),
      detalleActividad: this.detalleActividad(),
      fechaInicioActividad: fechaParsed ? fechaParsed.toISOString() : undefined,
      datosAdicionales: datosParaGuardar,
    };

    this.save.emit(empresaData);
  }

  onCancel() {
    this.cancel.emit();
  }
}
