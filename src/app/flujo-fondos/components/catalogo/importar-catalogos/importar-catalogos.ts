import {
  ChangeDetectionStrategy,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  Output,
  ViewChild,
  computed,
  inject,
  signal
} from '@angular/core';
import { Modal } from 'bootstrap';
import * as XLSX from 'xlsx';
import { ICatalogo, ICatalogoOpcion } from '../../../../../interfaces/catalogo';
import { CatalogoService } from '../../../../../services/flujo-fondos/catalogo.service';

/** Una fila de la plantilla FLUJOF-CATALOGOS. */
interface FilaImportacion {
  fila: number;                 // número de fila en el Excel
  codigoCatalogo: string;
  nombreCatalogo: string;
  codigoOpcion: string;
  nombreOpcion: string;
  orden: number;
  porDefecto: boolean;
  catalogoPadre: string | null;
  opcionPadre: string | null;   // código o nombre de la opción padre
}

interface CatalogoImportacion {
  codigo: string;
  nombre: string;
  catalogoPadre: string | null;
  filas: FilaImportacion[];
}

interface ErrorImportacion {
  fila: number | null;
  mensaje: string;
}

interface ResultadoImportacion {
  catalogosCreados: number;
  catalogosExistentes: number;
  opcionesCreadas: number;
  opcionesOmitidas: number;
}

const SI = ['SI', 'S', '1', 'TRUE', 'X', 'VERDADERO'];

/** Mayúsculas y sin tildes, para comparar textos. */
const normalizar = (valor: unknown) =>
  String(valor ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();

const texto = (valor: unknown) => String(valor ?? '').trim();

/**
 * Importa catálogos y sus opciones desde la plantilla FLUJOF-CATALOGOS.
 * Columnas: A código catálogo | B nombre catálogo | C código opción | D nombre opción |
 * E orden | F por defecto | G catálogo padre | H opción padre.
 * Lo que ya existe (catálogo u opción con el mismo código) no se modifica.
 */
@Component({
  selector: 'app-importar-catalogos',
  imports: [],
  templateUrl: './importar-catalogos.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ImportarCatalogosComponent {
  private catalogoService = inject(CatalogoService);

  @Output() importado = new EventEmitter<void>();

  @ViewChild('importModal') modalElementRef!: ElementRef;
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  private modalInstance!: bootstrap.Modal;

  fileName = signal('');
  readError = signal('');
  catalogos = signal<CatalogoImportacion[]>([]);
  erroresArchivo = signal<ErrorImportacion[]>([]);
  advertencias = signal<string[]>([]);

  isImporting = signal(false);
  progress = signal({ current: 0, total: 0 });
  resultado = signal<ResultadoImportacion | null>(null);
  erroresImportacion = signal<ErrorImportacion[]>([]);

  totalOpciones = computed(() => this.catalogos().reduce((acc, c) => acc + c.filas.length, 0));

  abrir() {
    this.fileName.set('');
    this.readError.set('');
    this.catalogos.set([]);
    this.erroresArchivo.set([]);
    this.advertencias.set([]);
    this.progress.set({ current: 0, total: 0 });
    this.resultado.set(null);
    this.erroresImportacion.set([]);
    if (this.fileInputRef) this.fileInputRef.nativeElement.value = '';

    if (!this.modalInstance) {
      this.modalInstance = new Modal(this.modalElementRef.nativeElement);
    }
    this.modalInstance.show();
  }

  // ── Lectura y validación del archivo ──────────────────────────────────────

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.fileName.set(file.name);
    this.readError.set('');
    this.catalogos.set([]);
    this.erroresArchivo.set([]);
    this.advertencias.set([]);
    this.resultado.set(null);
    this.erroresImportacion.set([]);
    this.progress.set({ current: 0, total: 0 });

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: 'array' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        // raw: false → texto tal como se ve en Excel (conserva códigos como "0101")
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '', blankrows: true }) as unknown[][];
        this.procesarFilas(rows);
      } catch {
        this.readError.set('No se pudo leer el archivo. Verifica que sea un Excel (.xlsx, .xls) o CSV válido.');
      }
    };
    reader.onerror = () => {
      this.readError.set('No se pudo leer el archivo. Verifica que sea un Excel (.xlsx, .xls) o CSV válido.');
    };
    reader.readAsArrayBuffer(file);
  }

  private procesarFilas(rows: unknown[][]) {
    const errores: ErrorImportacion[] = [];
    const advertencias: string[] = [];
    const catalogos = new Map<string, CatalogoImportacion>();

    const tieneEncabezado = normalizar(rows[0]?.[0]).includes('CATALOGO');
    const inicio = tieneEncabezado ? 1 : 0;

    for (let i = inicio; i < rows.length; i++) {
      const row = rows[i] ?? [];
      const fila = i + 1;
      if (row.every(celda => texto(celda) === '')) continue;

      const item: FilaImportacion = {
        fila,
        codigoCatalogo: texto(row[0]).toUpperCase(),
        nombreCatalogo: texto(row[1]),
        codigoOpcion: texto(row[2]).toUpperCase(),
        nombreOpcion: texto(row[3]),
        orden: Number(texto(row[4])) || 0,
        porDefecto: SI.includes(normalizar(row[5])),
        catalogoPadre: texto(row[6]).toUpperCase() || null,
        opcionPadre: texto(row[7]) || null,
      };

      const error = this.validarFila(item);
      if (error) {
        errores.push({ fila, mensaje: error });
        continue;
      }

      let catalogo = catalogos.get(item.codigoCatalogo);
      if (!catalogo) {
        catalogo = {
          codigo: item.codigoCatalogo,
          nombre: item.nombreCatalogo,
          catalogoPadre: item.catalogoPadre,
          filas: [],
        };
        catalogos.set(item.codigoCatalogo, catalogo);
      } else {
        if (catalogo.catalogoPadre !== item.catalogoPadre) {
          errores.push({ fila, mensaje: `El catálogo ${item.codigoCatalogo} tiene otro catálogo padre en filas anteriores (${catalogo.catalogoPadre ?? 'sin padre'})` });
          continue;
        }
        if (catalogo.nombre !== item.nombreCatalogo) {
          advertencias.push(`Fila ${fila}: el catálogo ${item.codigoCatalogo} tiene otro nombre en filas anteriores; se usará "${catalogo.nombre}".`);
        }
      }

      if (catalogo.filas.some(f => f.codigoOpcion === item.codigoOpcion)) {
        errores.push({ fila, mensaje: `La opción ${item.codigoOpcion} está repetida en el catálogo ${item.codigoCatalogo}` });
        continue;
      }

      catalogo.filas.push(item);
    }

    if (catalogos.size === 0 && errores.length === 0) {
      this.readError.set('El archivo no contiene filas de datos (solo encabezado o está vacío).');
    }

    this.catalogos.set([...catalogos.values()]);
    this.erroresArchivo.set(errores);
    this.advertencias.set(advertencias);
  }

  private validarFila(item: FilaImportacion): string | null {
    if (!item.codigoCatalogo) return 'Falta el código del catálogo (columna A)';
    if (!item.nombreCatalogo) return 'Falta el nombre del catálogo (columna B)';
    if (!item.codigoOpcion) return 'Falta el código de la opción (columna C)';
    if (!item.nombreOpcion) return 'Falta el nombre de la opción (columna D)';
    if (item.codigoCatalogo.length > 50) return 'El código del catálogo supera 50 caracteres';
    if (item.nombreCatalogo.length > 200) return 'El nombre del catálogo supera 200 caracteres';
    if (item.codigoOpcion.length > 50) return 'El código de la opción supera 50 caracteres';
    if (item.nombreOpcion.length > 150) return 'El nombre de la opción supera 150 caracteres';
    if (item.orden < 0) return 'El orden no puede ser negativo';
    if (item.catalogoPadre === item.codigoCatalogo) return 'Un catálogo no puede ser su propio padre';
    if (item.catalogoPadre && !item.opcionPadre) return `Falta la opción padre (columna H) del catálogo ${item.catalogoPadre}`;
    if (!item.catalogoPadre && item.opcionPadre) return 'Hay opción padre (columna H) pero falta el catálogo padre (columna G)';
    return null;
  }

  // ── Importación ───────────────────────────────────────────────────────────

  async importar() {
    const catalogos = this.catalogos();
    if (!catalogos.length || this.isImporting()) return;

    const errores: ErrorImportacion[] = [];
    const resultado: ResultadoImportacion = { catalogosCreados: 0, catalogosExistentes: 0, opcionesCreadas: 0, opcionesOmitidas: 0 };
    const erroresFilas = (catalogo: CatalogoImportacion, mensaje: string) =>
      catalogo.filas.forEach(f => errores.push({ fila: f.fila, mensaje }));

    this.isImporting.set(true);
    this.resultado.set(null);
    this.erroresImportacion.set([]);
    this.progress.set({ current: 0, total: this.totalOpciones() });

    try {
      const resp = await this.catalogoService.getCatalogos({ all: true });
      if (!resp) {
        this.erroresImportacion.set([{ fila: null, mensaje: 'No se pudieron consultar los catálogos existentes.' }]);
        return;
      }
      const existentes = new Map(resp.data.catalogos.map(c => [(c.codigo ?? '').toUpperCase(), c]));
      // Opciones ya conocidas por catálogo (id), para omitir duplicados y resolver opciones padre
      const opcionesPorCatalogo = new Map<string, ICatalogoOpcion[]>();

      const { ordenados, ciclo } = this.ordenarPorDependencia(catalogos);
      ciclo.forEach(c => erroresFilas(c, `El catálogo ${c.codigo} forma un ciclo con su catálogo padre`));

      for (const catalogo of ordenados) {
        const destino = await this.resolverCatalogo(catalogo, existentes, resultado, erroresFilas);
        if (!destino) {
          this.avanzar(catalogo.filas.length);
          continue;
        }

        const opcionesActuales = await this.cargarOpciones(destino.id, opcionesPorCatalogo);
        const opcionesPadre = destino.catalogoPadreId
          ? await this.cargarOpciones(destino.catalogoPadreId, opcionesPorCatalogo)
          : [];

        for (const fila of catalogo.filas) {
          await this.importarOpcion(fila, destino, opcionesActuales, opcionesPadre, resultado, errores);
          this.avanzar(1);
        }
      }

      this.resultado.set(resultado);
      if (resultado.catalogosCreados || resultado.opcionesCreadas) {
        this.importado.emit();
      }
    } finally {
      this.erroresImportacion.set(errores.sort((a, b) => (a.fila ?? 0) - (b.fila ?? 0)));
      this.isImporting.set(false);
    }
  }

  /** Padres antes que hijos; los que forman ciclo se devuelven aparte. */
  private ordenarPorDependencia(catalogos: CatalogoImportacion[]) {
    const porCodigo = new Map(catalogos.map(c => [c.codigo, c]));
    const ordenados: CatalogoImportacion[] = [];
    const visitados = new Set<string>();
    const enCurso = new Set<string>();
    const ciclo = new Set<CatalogoImportacion>();

    const visitar = (catalogo: CatalogoImportacion): boolean => {
      if (visitados.has(catalogo.codigo)) return true;
      if (enCurso.has(catalogo.codigo)) return false;
      enCurso.add(catalogo.codigo);
      const padre = catalogo.catalogoPadre ? porCodigo.get(catalogo.catalogoPadre) : undefined;
      const ok = !padre || visitar(padre);
      enCurso.delete(catalogo.codigo);
      visitados.add(catalogo.codigo);
      if (ok) ordenados.push(catalogo);
      else ciclo.add(catalogo);
      return ok;
    };

    catalogos.forEach(visitar);
    return { ordenados, ciclo: [...ciclo] };
  }

  /** Devuelve el catálogo existente o lo crea. null si no se puede usar. */
  private async resolverCatalogo(
    catalogo: CatalogoImportacion,
    existentes: Map<string, ICatalogo>,
    resultado: ResultadoImportacion,
    erroresFilas: (catalogo: CatalogoImportacion, mensaje: string) => void,
  ): Promise<ICatalogo | null> {
    let catalogoPadreId: string | null = null;
    if (catalogo.catalogoPadre) {
      const padre = existentes.get(catalogo.catalogoPadre);
      if (!padre) {
        erroresFilas(catalogo, `El catálogo padre ${catalogo.catalogoPadre} no existe ni está en el archivo`);
        return null;
      }
      catalogoPadreId = padre.id;
    }

    const existente = existentes.get(catalogo.codigo);
    if (existente) {
      if ((existente.catalogoPadreId ?? null) !== catalogoPadreId) {
        erroresFilas(catalogo, `El catálogo ${catalogo.codigo} ya existe con otro catálogo padre`);
        return null;
      }
      resultado.catalogosExistentes++;
      return existente;
    }

    try {
      const creado = await this.catalogoService.crearCatalogoImportacion({
        codigo: catalogo.codigo,
        codigoExterno: catalogo.codigo,
        nombre: catalogo.nombre,
        catalogoPadreId,
        activo: true,
      });
      if (!creado?.id) throw new Error(`No se obtuvo el id del catálogo ${catalogo.codigo}`);
      existentes.set(catalogo.codigo, creado);
      resultado.catalogosCreados++;
      return creado;
    } catch (error: any) {
      erroresFilas(catalogo, error.message);
      return null;
    }
  }

  private async cargarOpciones(catalogoId: string, cache: Map<string, ICatalogoOpcion[]>) {
    if (!cache.has(catalogoId)) {
      const resp = await this.catalogoService.getOpciones({ catalogoId, all: true });
      cache.set(catalogoId, resp?.data.opciones ?? []);
    }
    return cache.get(catalogoId)!;
  }

  private async importarOpcion(
    fila: FilaImportacion,
    catalogo: ICatalogo,
    opcionesActuales: ICatalogoOpcion[],
    opcionesPadre: ICatalogoOpcion[],
    resultado: ResultadoImportacion,
    errores: ErrorImportacion[],
  ) {
    if (opcionesActuales.some(o => (o.codigo ?? '').toUpperCase() === fila.codigoOpcion)) {
      resultado.opcionesOmitidas++;
      return;
    }

    let padreId: string | null = null;
    if (catalogo.catalogoPadreId) {
      // La opción padre puede venir por código o por nombre
      const buscado = normalizar(fila.opcionPadre);
      const padre = opcionesPadre.find(o => normalizar(o.codigo) === buscado)
        ?? opcionesPadre.find(o => normalizar(o.nombre) === buscado);
      if (!padre) {
        errores.push({ fila: fila.fila, mensaje: `No existe la opción padre "${fila.opcionPadre}" en el catálogo ${fila.catalogoPadre}` });
        return;
      }
      padreId = padre.id;
    }

    try {
      const creada = await this.catalogoService.crearOpcionImportacion({
        catalogoId: catalogo.id,
        codigo: fila.codigoOpcion,
        nombre: fila.nombreOpcion,
        padreId,
        orden: fila.orden,
        porDefecto: fila.porDefecto,
        activo: true,
      });
      opcionesActuales.push(creada);
      resultado.opcionesCreadas++;
    } catch (error: any) {
      errores.push({ fila: fila.fila, mensaje: error.message });
    }
  }

  private avanzar(cantidad: number) {
    this.progress.update(p => ({ ...p, current: Math.min(p.current + cantidad, p.total) }));
  }
}
