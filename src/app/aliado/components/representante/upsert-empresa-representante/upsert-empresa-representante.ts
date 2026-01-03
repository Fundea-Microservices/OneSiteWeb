import {
  ChangeDetectionStrategy,
  Component,
  EventEmitter,
  Output,
  inject,
  input,
  effect,
  signal,
  computed,
  OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IEmpresaRepresentante } from '../../../../../interfaces/aliado/empresa-representante';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { CatalogoSimple } from '../../../../../interfaces/api-bantotal/catalogos';

@Component({
  selector: 'app-upsert-empresa-representante',
  imports: [CommonModule, FormsModule],
  templateUrl: './upsert-empresa-representante.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpsertEmpresaRepresentanteComponent implements OnInit {
  private catalogosService = inject(CatalogosBantotalService);

  empresa = input<IEmpresaRepresentante>({
    empresaId: '',
    representanteId: '',
    nombreEmpresa: '',
    nit: '',
    telefono: '',
    departamento: 1,
    municipio: 1,
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

  // Catálogos
  departamentos = signal<CatalogoSimple[]>([]);
  municipios = signal<CatalogoSimple[]>([]);
  tiposActividad = signal<CatalogoSimple[]>([]);
  actividades = signal<CatalogoSimple[]>([]);

  // Campos del formulario
  nombreEmpresa = signal<string>('');
  nit = signal<string>('');
  telefono = signal<string>('');
  selectedDepartamentoCode = signal<string>('1');
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
    const tipoActId = this.selectedTipoActividadId();
    const tipoAct = this.tiposActividad().find(t => t.catalogoId === tipoActId);
    if (!tipoAct) return [];

    return this.actividades().filter(a => a.padreValorCore === tipoAct.valorCore);
  });

  constructor() {
    effect(() => {
      const _ = this.key(); // reinicia el form cuando cambia el key
      const empresaData = this.empresa();
      const isNuevo = this.nuevo();

      if (isNuevo) {
        this.resetForm();
      } else {
        this.loadEmpresaData(empresaData);
      }
    });
  }

  ngOnInit(): void {
    this.cargarCatalogos();
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

    const tiposAct = this.catalogosService.obtenerLocal('sector');
    if (tiposAct) {
      this.tiposActividad.set(tiposAct);
    }

    const acts = this.catalogosService.obtenerLocal('actividad_laboral');
    if (acts) {
      this.actividades.set(acts);
    }
  }

  private resetForm() {
    this.nombreEmpresa.set('');
    this.nit.set('');
    this.telefono.set('');
    this.selectedDepartamentoCode.set('1');
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
    this.selectedDepartamentoCode.set(empresa.departamento?.toString() || '1');
    this.selectedMunicipioId.set(empresa.municipio?.toString() || '');
    this.direccion.set(empresa.direccion || '');
    this.selectedTipoActividadId.set(empresa.tipoActividad || '');
    this.selectedActividadId.set(empresa.actividad || '');
    this.detalleActividad.set(empresa.detalleActividad || '');
    this.fechaInicioActividad.set(this.formatFechaParaMostrar(empresa.fechaInicioActividad) || '');
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
    };

    this.save.emit(empresaData);
  }

  onCancel() {
    this.cancel.emit();
  }
}
