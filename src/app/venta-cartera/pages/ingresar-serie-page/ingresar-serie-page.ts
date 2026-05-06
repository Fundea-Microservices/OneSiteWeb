import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { CurrencyPipe, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { SerieDetalle, SerieEncabezado, ValidarDetalleDuplicadoDto } from '../../../../interfaces/venta-cartera/serie';
import { SerieService } from '../../../../services/venta-cartera/serie.service';
import { EmpresaCastigadosService } from '../../../../services/castigados/empresa.service';
import { IEmpresaAliado } from '../../../../interfaces/aliado/empresa-aliado';

type ExcelValue = string | number | boolean | Date | null | undefined;
type ExcelRow = Record<string, ExcelValue>;

const SERIE_DETALLE_ALIASES: Record<keyof SerieDetalle, string[]> = {
  id: ['id'],
  frontendId: ['frontendid'],
  serieId: ['serie id', 'serieid'],
  activo: ['activo'],
  programa: ['programa'],
  destinoCredito: ['destino credito', 'destino del credito', 'destino'],
  actividadCliente: ['actividad cliente'],
  cuenta: ['cuenta'],
  operacion: ['operacion', 'operación', 'num operacion', 'no operacion', 'numero operacion', 'nro operacion'],
  tipoOperacion: ['tipo operacion', 'tipo operación'],
  estado: ['estado', 'estado credito', 'estado del credito'],
  nombreCliente: ['nombre cliente', 'cliente', 'nombre del cliente'],
  domicilioDepto: ['domicilio depto', 'domicilio departamento', 'depto'],
  domicilioMuni: ['domicilio muni', 'domicilio municipio', 'municipio'],
  agenciaColocacion: ['agencia colocacion', 'agencia colocación', 'agencia'],
  genero: ['genero', 'género'],
  calificacionCliente: ['calificacion cliente', 'calificación cliente', 'calificacion del cliente', 'calificación del cliente'],
  tipoGarantia: ['tipo garantia', 'tipo garantía', 'garantia'],
  codigoGarantiaAsociado: ['codigo garantia asociado', 'código garantia asociado', 'codigo garantia', 'código garantía'],
  modalidadAmortizacionCapital: ['modalidad amortizacion capital', 'modalidad amortización capital'],
  modalidadPagoIntereses: ['modalidad pago intereses'],
  tipoTasa: ['tipo tasa', 'tipo de tasa'],
  creditoReestructurado: ['credito reestructurado', 'crédito reestructurado'],
  garantiaCompartidaExclusiva: ['garantia compartida exclusiva', 'garantía compartida exclusiva'],
  modulo: ['modulo', 'módulo', 'mod'],
  edad: ['edad'],
  diasMora: ['dias mora', 'días mora', 'dias de mora', 'días de mora'],
  cantidadGarantia: ['cantidad garantia', 'cantidad garantía'],
  plazoMeses: ['plazo meses', 'plazo'],
  maduracionMeses: ['maduracion meses', 'maduración meses'],
  montoOtorgado: ['monto otorgado', 'monto', 'monto del credito', 'monto credito'],
  saldoCapital: ['saldo capital', 'saldo de capital', 'saldo cap', 'saldo cap.', 'saldo capital q', 'saldo de capital q'],
  capitalMora: ['capital mora', 'capital de mora', 'mora', 'saldo mora'],
  interesesMoratorios: ['intereses moratorios', 'interes moratorio', 'intereses de mora'],
  valorGarantiaActual: ['valor garantia actual', 'valor garantía actual', 'valor garantia', 'valor de garantia'],
  ltv: ['ltv'],
  relacionGarantiaPrestamo: ['relacion garantia prestamo', 'relación garantía préstamo', 'relacion garantia/ prestamo', 'relacion garantia prestamo ltv'],
  tasaInteresOrigen: ['tasa interes origen', 'tasa interés origen'],
  tasaInteresMensual: ['tasa interes mensual', 'tasa interés mensual'],
  tasaMoraActual: ['tasa mora actual'],
  ingresosMensualesReportados: ['ingresos mensuales reportados'],
  fechaNac: ['fecha nac', 'fecha nacimiento', 'fecha de nacimiento'],
  fechaOtorgamiento: ['fecha otorgamiento', 'fecha de otorgamiento', 'otorgamiento', 'fec otorgamiento'],
  fechaVencimiento: ['fecha vencimiento', 'fecha de vencimiento', 'vencimiento', 'fec vencimiento'],
  created_at: ['created_at'],
  updated_at: ['updated_at'],
  deleted_at: ['deleted_at'],
};

@Component({
  selector: 'app-ingresar-serie-page',
  imports: [RouterLink, CurrencyPipe, DatePipe],
  templateUrl: './ingresar-serie-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class IngresarSeriePage {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private serieService = inject(SerieService);
  private empresaService = inject(EmpresaCastigadosService);
  private cdr = inject(ChangeDetectorRef);
  private toastr = inject(ToastrService);

  isLoading = signal(false);
  serieId = signal('');
  serieEncabezado = signal<SerieEncabezado | null>(null);
  detalleList = signal<SerieDetalle[]>([]);
  empresasList = signal<IEmpresaAliado[]>([]);
  encabezadoForm = signal<SerieEncabezado>({
    identificador: '',
    empresaNombre: '',
    empresaId: '',
    observaciones: '',
    estado: 'SOLICITUD',
    usuarioNombre: '',
    usuarioId: '',
  });
  selectedFileName = signal('');
  isSavingAll = signal(false);
  saveProgress = signal(0);

  isValidating = signal(false);
  isValidated = signal(false);
  validationProgress = signal(0);
  duplicateIds = signal<Set<string>>(new Set());
  validationMessage = signal<string | null>(null);
  validationHasDuplicates = computed(() => this.duplicateIds().size > 0);
  allDuplicados = computed(() => this.duplicateIds().size > 0 && this.duplicateIds().size >= this.totalDetalles());

  saveProgressLabel = computed(() => {
    const p = this.saveProgress();
    return p > 0 ? `Guardando datos ${p}%` : 'Guardando...';
  });

  validationProgressLabel = computed(() => {
    const p = this.validationProgress();
    return p > 0 ? `Validando ${p}%` : 'Validando...';
  });

  totalDetalles = computed(() => this.detalleList().length);
  totalDetallesActivos = computed(() => this.detalleList().filter(item => item.activo).length);
  totalDetallesInactivos = computed(() => this.totalDetalles() - this.totalDetallesActivos());
  saldoCapitalActivo = computed(() => this.sumByActivos('saldoCapital'));
  moraActiva = computed(() => this.sumByActivos('capitalMora'));
  allDetallesActivos = computed(() => this.detalleList().length > 0 && this.detalleList().every(item => item.activo));

  @ViewChild('excelInput') excelInputRef!: ElementRef<HTMLInputElement>;

  ngOnInit() {
    const currentSerieId = this.route.snapshot.paramMap.get('serieId') || '';
    this.serieId.set(currentSerieId);
    this.cargarEmpresas();
    if (currentSerieId) {
      this.fetchSerieEncabezado(currentSerieId);
    }
  }

  async cargarEmpresas() {
    const resp = await this.empresaService.getEmpresas({ all: true });
    if (resp?.data) {
      this.empresasList.set(resp.data.empresas);
      this.cdr.markForCheck();
    }
  }

  async fetchSerieEncabezado(serieId: string) {
    this.isLoading.set(true);
    try {
      const resp = await this.serieService.getSerieEncabezadoById(serieId);
      this.serieEncabezado.set(resp?.data || null);
      if (resp?.data) {
        this.encabezadoForm.set({
          serieId: resp.data.serieId,
          identificador: resp.data.identificador || '',
          empresaNombre: resp.data.empresaNombre || '',
          empresaId: resp.data.empresaId || '',
          observaciones: resp.data.observaciones || '',
          estado: resp.data.estado || 'SOLICITUD',
          usuarioNombre: resp.data.usuarioNombre || '',
          usuarioId: resp.data.usuarioId || '',
        });
      }
    } catch (error) {
      console.error('Error fetching serie encabezado:', error);
      this.serieEncabezado.set(null);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  openExcelPicker() {
    this.excelInputRef?.nativeElement?.click();
  }

  async onExcelSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const fileName = file.name.toLowerCase();
    const validExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    if (!validExcel) {
      this.toastr.error('Solo se permiten archivos de Excel (.xlsx, .xls)', 'Archivo inválido');
      input.value = '';
      return;
    }

    this.isLoading.set(true);
    try {
      const XLSX = await import('xlsx');
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];
      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '', raw: true }) as ExcelRow[];
      if (rows.length) {
        this.debugHeaderCoverage(rows[0]);
      }

      const detalleRows = rows
        .map((row, index) => this.mapExcelRowToDetalle(row, XLSX, index))
        .filter(row => this.hasVisibleData(row));
      console.log('Detalle rows parsed from Excel:', detalleRows[0]);
      if (!detalleRows.length) {
        this.detalleList.set([]);
        this.selectedFileName.set(file.name);
        this.toastr.warning('El archivo no contiene filas válidas para SerieDetalle', 'Sin datos');
        return;
      }

      this.detalleList.set(detalleRows);
      this.selectedFileName.set(file.name);
      this.prefillEncabezadoFromFile(file.name);
      this.isValidated.set(false);
      this.duplicateIds.set(new Set());
      this.validationMessage.set(null);
      this.validationProgress.set(0);
      this.toastr.success(`Se cargaron ${detalleRows.length} registros desde Excel`, 'Carga exitosa');
    } catch (error) {
      console.error('Error reading excel file:', error);
      this.toastr.error('No se pudo procesar el archivo de Excel', 'Error al cargar datos');
    } finally {
      input.value = '';
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  toggleAllDetalles(checked: boolean) {
    this.detalleList.update(items => items.map(item => ({ ...item, activo: checked })));
  }

  toggleDetalleActivo(index: number, checked: boolean) {
    this.detalleList.update(items => items.map((item, itemIndex) => itemIndex === index ? { ...item, activo: checked } : item));
  }

  onEncabezadoIdentificadorChange(value: string) {
    this.encabezadoForm.update(current => ({ ...current, identificador: value || '' }));
  }

  onEncabezadoEstadoChange(value: string) {
    this.encabezadoForm.update(current => ({ ...current, estado: value || '' }));
  }

  onEncabezadoEmpresaNombreChange(value: string) {
    this.encabezadoForm.update(current => ({ ...current, empresaNombre: value || '' }));
  }

  onEncabezadoEmpresaIdChange(value: string) {
    this.encabezadoForm.update(current => ({ ...current, empresaId: value || '' }));
  }

  onEncabezadoEmpresaSeleccionada(empresaId: string) {
    const empresa = this.empresasList().find(e => e.empresaId === empresaId);
    this.encabezadoForm.update(current => ({
      ...current,
      empresaId: empresaId || '',
      empresaNombre: empresa?.name || '',
    }));
  }

  onEncabezadoObservacionesChange(value: string) {
    this.encabezadoForm.update(current => ({ ...current, observaciones: value || '' }));
  }

  private sumByActivos(field: 'saldoCapital' | 'capitalMora') {
    return this.detalleList()
      .filter(item => item.activo)
      .reduce((total, item) => total + (item[field] ?? 0), 0);
  }

  private mapExcelRowToDetalle(row: ExcelRow, XLSX: any, index: number): SerieDetalle {
    return {
      frontendId: `fila-${index + 1}`,
      serieId: this.serieId(),
      activo: true,
      programa: this.readStringField(row, 'programa'),
      destinoCredito: this.readStringField(row, 'destinoCredito'),
      actividadCliente: this.readStringField(row, 'actividadCliente'),
      cuenta: this.readStringField(row, 'cuenta'),
      operacion: this.readStringField(row, 'operacion'),
      tipoOperacion: this.readStringField(row, 'tipoOperacion'),
      estado: this.readStringField(row, 'estado'),
      nombreCliente: this.readStringField(row, 'nombreCliente'),
      domicilioDepto: this.readStringField(row, 'domicilioDepto'),
      domicilioMuni: this.readStringField(row, 'domicilioMuni'),
      agenciaColocacion: this.readStringField(row, 'agenciaColocacion'),
      genero: this.readStringField(row, 'genero'),
      calificacionCliente: this.readStringField(row, 'calificacionCliente'),
      tipoGarantia: this.readStringField(row, 'tipoGarantia'),
      codigoGarantiaAsociado: this.readStringField(row, 'codigoGarantiaAsociado'),
      modalidadAmortizacionCapital: this.readStringField(row, 'modalidadAmortizacionCapital'),
      modalidadPagoIntereses: this.readStringField(row, 'modalidadPagoIntereses'),
      tipoTasa: this.readStringField(row, 'tipoTasa'),
      creditoReestructurado: this.readStringField(row, 'creditoReestructurado'),
      garantiaCompartidaExclusiva: this.readStringField(row, 'garantiaCompartidaExclusiva'),
      modulo: this.readNumberField(row, 'modulo'),
      edad: this.readNumberField(row, 'edad'),
      diasMora: this.readNumberField(row, 'diasMora'),
      cantidadGarantia: this.readNumberField(row, 'cantidadGarantia'),
      plazoMeses: this.readNumberField(row, 'plazoMeses'),
      maduracionMeses: this.readNumberField(row, 'maduracionMeses'),
      montoOtorgado: this.readNumberField(row, 'montoOtorgado'),
      saldoCapital: this.readNumberField(row, 'saldoCapital'),
      capitalMora: this.readNumberField(row, 'capitalMora'),
      interesesMoratorios: this.readNumberField(row, 'interesesMoratorios'),
      valorGarantiaActual: this.readNumberField(row, 'valorGarantiaActual'),
      ltv: this.readNumberField(row, 'ltv'),
      relacionGarantiaPrestamo: this.readNumberField(row, 'relacionGarantiaPrestamo'),
      tasaInteresOrigen: this.readNumberField(row, 'tasaInteresOrigen'),
      tasaInteresMensual: this.readNumberField(row, 'tasaInteresMensual'),
      tasaMoraActual: this.readNumberField(row, 'tasaMoraActual'),
      ingresosMensualesReportados: this.readNumberField(row, 'ingresosMensualesReportados'),
      fechaNac: this.readDateField(row, 'fechaNac', XLSX),
      fechaOtorgamiento: this.readDateField(row, 'fechaOtorgamiento', XLSX),
      fechaVencimiento: this.readDateField(row, 'fechaVencimiento', XLSX),
    };
  }

  private readStringField(row: ExcelRow, field: keyof SerieDetalle) {
    const value = this.findValueByAliases(row, field);
    if (value === null || value === undefined || value === '') return undefined;
    return String(value).trim();
  }

  private readNumberField(row: ExcelRow, field: keyof SerieDetalle) {
    const value = this.findValueByAliases(row, field);
    return this.parseNumber(value);
  }

  private readDateField(row: ExcelRow, field: keyof SerieDetalle, XLSX: any) {
    const value = this.findValueByAliases(row, field);
    return this.parseDateValue(value, XLSX);
  }

  private findValueByAliases(row: ExcelRow, field: keyof SerieDetalle) {
    const normalizedEntries = Object.entries(row).map(([key, value]) => [this.normalizeHeader(key), value] as const);
    const aliases = (SERIE_DETALLE_ALIASES[field] ?? []).map(alias => this.normalizeHeader(alias));

    // 1) Exact match against declared aliases.
    for (const alias of aliases) {
      const exact = normalizedEntries.find(([key]) => key === alias);
      if (exact) return exact[1];
    }

    // 2) Relaxed match: ignore connector words and punctuation noise.
    const normalizedEntriesRelaxed = normalizedEntries.map(([key, value]) => [this.normalizeHeaderRelaxed(key), value] as const);
    const aliasesRelaxed = aliases.map(alias => this.normalizeHeaderRelaxed(alias));

    for (const alias of aliasesRelaxed) {
      const relaxed = normalizedEntriesRelaxed.find(([key]) => key === alias);
      if (relaxed) return relaxed[1];
    }

    // 3) Partial containment to support headers like "saldo de capital (Q)".
    for (let i = 0; i < normalizedEntriesRelaxed.length; i++) {
      const [headerKey, headerValue] = normalizedEntriesRelaxed[i];
      const match = aliasesRelaxed.some(alias => headerKey.includes(alias) || alias.includes(headerKey));
      if (match) return headerValue;
    }

    return undefined;
  }

  private normalizeHeader(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase();
  }

  private normalizeHeaderRelaxed(value: string) {
    return this.normalizeHeader(value)
      .replace(/(dedel|del|de|la|las|los|el)/g, '');
  }

  private parseNumber(value: ExcelValue) {
    if (typeof value === 'number') return Number.isFinite(value) ? value : undefined;
    if (typeof value !== 'string') return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const sanitized = trimmed
      .replace(/q\.?/gi, '')
      .replace(/,/g, '')
      .replace(/\s+/g, '')
      .replace(/\((.*)\)/, '-$1');

    const parsed = Number(sanitized);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  private parseDateValue(value: ExcelValue, XLSX: any) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      return value.toISOString().split('T')[0];
    }

    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return undefined;
      const month = String(parsed.m).padStart(2, '0');
      const day = String(parsed.d).padStart(2, '0');
      return `${parsed.y}-${month}-${day}`;
    }

    if (typeof value !== 'string') return undefined;

    const trimmed = value.trim();
    if (!trimmed) return undefined;

    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) {
      const [day, month, year] = trimmed.split(/[\/\-]/);
      if (day && month && year && year.length === 4) {
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return trimmed;
    }

    return date.toISOString().split('T')[0];
  }

  private hasVisibleData(row: SerieDetalle) {
    return Boolean(
      row.cuenta ||
      row.operacion ||
      row.nombreCliente ||
      row.fechaOtorgamiento ||
      row.montoOtorgado ||
      row.saldoCapital ||
      row.capitalMora
    );
  }

  private prefillEncabezadoFromFile(fileName: string) {
    this.encabezadoForm.update(current => {
      if (current.identificador?.trim()) return current;

      const nombreLimpio = fileName.replace(/\.(xlsx|xls)$/i, '').trim();
      return {
        ...current,
        identificador: nombreLimpio || current.identificador,
      };
    });
  }

  async saveAllData() {
    if (this.isSavingAll()) return;

    if (!this.totalDetalles()) {
      this.toastr.warning('No hay detalles cargados para guardar', 'Sin datos');
      return;
    }

    const encabezado = this.encabezadoForm();
    if (!encabezado.identificador?.trim()) {
      this.toastr.error('El identificador del encabezado es obligatorio', 'Validación');
      return;
    }

    this.isSavingAll.set(true);
    this.isLoading.set(true);
    this.saveProgress.set(0);

    try {
      let targetSerieId = this.serieId();
      const payloadDetalles = this.detalleList().map(
        ({ serieId, id, frontendId, created_at, updated_at, deleted_at, ...item }) => ({
          ...item,
          activo: !!item.activo,
        })
      );

      // Strip usuario fields — they are resolved server-side from the auth token
      const { usuarioNombre: _un, usuarioId: _ui, ...encabezadoPayload } = encabezado;

      // Step 1: create or update the encabezado
      if (targetSerieId) {
        await this.serieService.updateSerieEncabezado({ ...encabezadoPayload, serieId: targetSerieId }, false);
      } else {
        const createResp = await this.serieService.createSerieEncabezado({ ...encabezadoPayload }, false);
        targetSerieId = createResp?.data?.serieId || '';

        if (!targetSerieId) {
          this.toastr.error('No se pudo crear el encabezado de la serie', 'Error');
          return;
        }

        this.serieId.set(targetSerieId);
        this.serieEncabezado.set(createResp?.data || null);
      }

      // Step 2: send detalles in chunks of 50 (SQL Server max 2100 params)
      const CHUNK_SIZE = 50;
      const totalChunks = Math.ceil(payloadDetalles.length / CHUNK_SIZE);
      let savedCount = 0;
      let failedCount = 0;

      for (let i = 0; i < totalChunks; i++) {
        const chunk = payloadDetalles.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const result = await this.serieService.createSerieDetallesBatch(targetSerieId, chunk, false);

        if (result?.success) {
          savedCount += chunk.length;
        } else {
          failedCount += chunk.length;
        }

        this.saveProgress.set(Math.round(((i + 1) / totalChunks) * 100));
        this.cdr.markForCheck();
      }

      if (savedCount > 0) {
        this.toastr.success(`Se guardaron ${savedCount} registros de detalle`, 'Proceso completado');
        this.router.navigate(['/venta-cartera/titularizacion']);
      }
      if (failedCount > 0) {
        this.toastr.warning(`${failedCount} registros no se pudieron guardar`, 'Advertencia');
      }
    } catch (error) {
      console.error('Error en saveAllData:', error);
      this.toastr.error('No se pudo completar el guardado de la serie', 'Error');
    } finally {
      this.isSavingAll.set(false);
      this.isLoading.set(false);
      this.saveProgress.set(0);
      this.cdr.markForCheck();
    }
  }

  private debugHeaderCoverage(firstRow: ExcelRow) {
    const headers = Object.keys(firstRow);
    const unresolved = Object.keys(SERIE_DETALLE_ALIASES).filter(field => {
      const value = this.findValueByAliases(firstRow, field as keyof SerieDetalle);
      return value === undefined || value === null || value === '';
    });

    console.log('Excel headers detected:', headers);
    console.log('SerieDetalle fields without match in first row:', unresolved);
  }

  async validateDetalles() {
    if (this.isValidating()) return;

    const items = this.detalleList();
    if (!items.length) {
      this.toastr.warning('No hay detalles cargados para validar', 'Sin datos');
      return;
    }

    this.isValidating.set(true);
    this.isValidated.set(false);
    this.validationProgress.set(0);
    this.duplicateIds.set(new Set());
    this.validationMessage.set(null);

    try {
      const CHUNK_SIZE = 100;
      const totalChunks = Math.ceil(items.length / CHUNK_SIZE);
      const allDuplicateIds: string[] = [];

      for (let i = 0; i < totalChunks; i++) {
        const chunk = items.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        const dtos: ValidarDetalleDuplicadoDto[] = chunk.map(item => ({
          frontendId: item.frontendId!,
          cuenta: item.cuenta,
          operacion: item.operacion,
          tipoOperacion: item.tipoOperacion,
        }));

        const result = await this.serieService.validarDuplicados(dtos);
        if (result?.data?.ids?.length) {
          allDuplicateIds.push(...result.data.ids);
        }

        this.validationProgress.set(Math.round(((i + 1) / totalChunks) * 100));
        this.cdr.markForCheck();
      }

      this.duplicateIds.set(new Set(allDuplicateIds));
      const totalDuplicates = allDuplicateIds.length;
      const totalItems = items.length;

      if (totalDuplicates > 0 && totalDuplicates >= totalItems) {
        this.validationMessage.set(
          `Todos los ${totalDuplicates} crédito${totalDuplicates === 1 ? '' : 's'} ya están titularizado${totalDuplicates === 1 ? '' : 's'}. No es posible guardar esta serie porque no quedan detalles nuevos.`
        );
      } else if (totalDuplicates > 0) {
        this.validationMessage.set(
          `Hay ${totalDuplicates} crédito${totalDuplicates === 1 ? '' : 's'} ya titularizado${totalDuplicates === 1 ? '' : 's'}, por lo cual estos no se guardarán para esta serie de datos.`
        );
      } else {
        this.validationMessage.set('Validación completada sin inconvenientes.');
      }

      this.isValidated.set(true);
    } catch (error) {
      console.error('Error en validateDetalles:', error);
      this.toastr.error('No se pudo completar la validación', 'Error');
    } finally {
      this.isValidating.set(false);
      this.cdr.markForCheck();
    }
  }
}