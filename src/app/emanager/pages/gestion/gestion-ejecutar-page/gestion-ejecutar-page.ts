import { ChangeDetectionStrategy, Component, inject, signal, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TramaDetalleService } from '../../../../../services/emanager/trama-detalle.service';
import { TramaService } from '../../../../../services/emanager/trama.service';
import { TramaService as GestionService } from '../../../../../services/emanager/gestion.service';
import { EncabezadoService } from '../../../../../services/emanager/encabezado.service';
import { EncabezadoDetalleService } from '../../../../../services/emanager/encabezado-detalle.service';
import { ITramaDetalle, ITrama } from '../../../../../interfaces/emanager/getion';
import { IEncabezadoDetalle } from '../../../../../interfaces/emanager/encabezado';
import { ToastrService } from 'ngx-toastr';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { CatalogoSimple } from '../../../../../interfaces/api-bantotal/catalogos';

interface DetalleAgrupado {
  cliente: ITramaDetalle[];
  parametro: ITramaDetalle[];
}

interface DetalleConOpciones extends ITramaDetalle {
  opcionesCatalogo?: CatalogoSimple[];
  opcionesFiltradas?: CatalogoSimple[];
}

@Component({
  selector: 'app-gestion-ejecutar-page',
  imports: [CommonModule, RouterLink, ReactiveFormsModule],
  templateUrl: './gestion-ejecutar-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class GestionEjecutarPage {
  private tramaDetalleService = inject(TramaDetalleService);
  private tramaService = inject(TramaService);
  private gestionService = inject(GestionService);
  private encabezadoService = inject(EncabezadoService);
  private encabezadoDetalleService = inject(EncabezadoDetalleService);
  private catalogosService = inject(CatalogosBantotalService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private toastr = inject(ToastrService);

  tramaId = signal<string>('');
  trama = signal<ITrama | null>(null);
  isLoading = signal(false);
  
  // Detalles visibles para mostrar en el formulario
  detallesAgrupados = signal<DetalleAgrupado>({
    cliente: [],
    parametro: []
  });
  
  // Todos los detalles (incluye no visibles) para generar XML
  todosLosDetallesCompletos = signal<ITramaDetalle[]>([]);

  formulario = signal<FormGroup>(this.fb.group({}));
  resultadoJSON = signal<any>(null);
  resultadoXML = signal<string>('');
  mostrarResultado = signal(false);
  enviandoFormulario = signal(false);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.tramaId.set(id);
        this.cargarTramaYDetalles();
      }
    });
  }

  /**
   * Carga la trama y luego los detalles para asegurar que procesoId esté disponible
   */
  async cargarTramaYDetalles() {
    await this.cargarTrama();
    await this.cargarDetalles();
  }

  async cargarTrama() {
    try {
      const resultado = await this.tramaService.getTramaById(this.tramaId());
      if (resultado?.data) {
        this.trama.set(resultado.data);
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Error al cargar trama:', error);
    }
  }

  async cargarDetalles() {
    this.isLoading.set(true);

    try {
      const tramaActual = this.trama();
      let detallesEncabezado: ITramaDetalle[] = [];

      // Si la trama tiene procesoId, buscar encabezados con ese proceso
      if (tramaActual && tramaActual.procesoId) {
        const encabezadosResult = await this.encabezadoService.getEncabezados({
          all: true,
          search: ''
        });

        if (encabezadosResult?.data) {
          // Filtrar encabezados que tengan el mismo proceso que la trama
          const encabezadosDelProceso = encabezadosResult.data.filter(
            enc => enc.proceso === tramaActual.procesoId && enc.activo
          );

          // Para cada encabezado, obtener sus detalles
          for (const encabezado of encabezadosDelProceso) {
            const detallesResult = await this.encabezadoDetalleService.getEncabezadoDetalles({
              encabezadoId: encabezado.encabezadoId,
              all: true
            });

            if (detallesResult?.data) {
              // Convertir detalles de encabezado a formato ITramaDetalle
              const detallesConvertidos = detallesResult.data
                .filter(d => d.activo)
                .map(detalle => this.convertirEncabezadoDetalleATramaDetalle(detalle));
              
              detallesEncabezado.push(...detallesConvertidos);
            }
          }
        }
      }

      // Obtener detalles de la trama
      const resultado = await this.tramaDetalleService.getTramaDetalles({
        tramaId: this.tramaId(),
        all: true
      });

      let detallesTrama: ITramaDetalle[] = [];
      if (resultado?.data) {
        // Filtrar solo los activos (incluye visibles y no visibles)
        const detallesActivos = resultado.data.filter(d => d.activo);
        
        // Calcular el máximo orden de los detalles de encabezado
        const maxOrdenEncabezado = detallesEncabezado.length > 0 
          ? Math.max(...detallesEncabezado.map(d => d.orden || 0))
          : 0;
        
        // Incrementar el orden de los detalles de trama para que aparezcan después
        detallesTrama = detallesActivos.map(detalle => ({
          ...detalle,
          orden: detalle.orden + maxOrdenEncabezado + 10
        }));
      }

      // Combinar detalles de encabezado con detalles de trama
      // Los detalles de encabezado van primero
      const todosLosDetalles = [...detallesEncabezado, ...detallesTrama];
      
      // Ordenar por el campo 'orden'
      todosLosDetalles.sort((a, b) => a.orden - b.orden);

      // Cargar opciones de catálogos para detalles SELECT
      const detallesConCatalogos = todosLosDetalles.map(detalle => {
        if (detalle.tipoInput === 'SELECT' && detalle.catalogo) {
          const opcionesCatalogo = this.catalogosService.obtenerLocal(detalle.catalogo);
          return { ...detalle, opcionesCatalogo: opcionesCatalogo || [] };
        }
        return detalle;
      });

      // Guardar todos los detalles (incluye no visibles)
      this.todosLosDetallesCompletos.set(detallesConCatalogos);

      // Agrupar solo los visibles por tipo para mostrar en el formulario
      const agrupados: DetalleAgrupado = {
        cliente: detallesConCatalogos.filter(d => d.tipo === 'CLIENTE' && d.visible),
        parametro: detallesConCatalogos.filter(d => d.tipo === 'PARAMETRO' && d.visible)
      };

      this.detallesAgrupados.set(agrupados);
      // Construir formulario con TODOS los detalles (visibles y no visibles)
      this.construirFormulario(detallesConCatalogos);
      
      this.cdr.markForCheck();
    } catch (error) {
      console.error('Error al cargar detalles:', error);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
  }

  /**
   * Convierte un detalle de encabezado a formato de detalle de trama
   */
  private convertirEncabezadoDetalleATramaDetalle(detalle: IEncabezadoDetalle): ITramaDetalle {
    return {
      detalleId: `enc_${detalle.detalleId}`, // Prefijo para distinguir
      tramaId: this.tramaId(),
      codigo: detalle.codigo,
      valor: undefined, // Los detalles de encabezado no tienen valor predeterminado
      tag: detalle.tag,
      nombreInput: detalle.nombreInput,
      catalogo: detalle.catalogo,
      catalogoHijo: detalle.catalogoHijo,
      procedimiento: detalle.procedimiento,
      tipo: detalle.tipo,
      codigoParametro: detalle.codigoParametro,
      tipoRespuesta: detalle.tipoRespuesta,
      tipoInput: detalle.tipoInput,
      opciones: detalle.opciones,
      valorDefecto: detalle.valorDefecto,
      obligatorio: detalle.obligatorio,
      orden: detalle.orden,
      visible: detalle.visible,
      activo: detalle.activo,
      created_at: detalle.created_at,
      updated_at: detalle.updated_at,
      deleted_at: detalle.deleted_at
    };
  }

  construirFormulario(detalles: ITramaDetalle[]) {
    const group: any = {};

    detalles.forEach(detalle => {
      let valorInicial = detalle.valorDefecto || '';
      const validators = [];

      // Procesar fechas para inputs de tipo DATE
      if (detalle.tipoInput === 'DATE') {
        valorInicial = this.procesarFechaPorDefecto(detalle.valorDefecto);
      }

      // Agregar validadores según el tipo
      if (detalle.tipoRespuesta === 'NUMBER') {
        validators.push(Validators.pattern(/^-?\d+(\.\d+)?$/));
      }
      if (detalle.tipoInput === 'EMAIL') {
        validators.push(Validators.email);
      }

      group[detalle.detalleId] = [valorInicial, validators];
    });

    const formulario = this.fb.group(group);
    
    // Configurar listeners para filtrado dinámico en cascada
    detalles.forEach(detalle => {
      if (detalle.tipoInput === 'SELECT' && detalle.catalogoHijo) {
        formulario.get(detalle.detalleId)?.valueChanges.subscribe((valorSeleccionado) => {
          this.filtrarOpcionesEnCascada(detalle, valorSeleccionado, detalles);
        });
      }
    });

    this.formulario.set(formulario);
    this.cdr.markForCheck();
  }

  procesarFechaPorDefecto(valorDefecto: string | undefined): string {
     if (!valorDefecto) {
      // Si no hay valor por defecto, retornar vacío
      return '';
    }
    // Intentar parsear la fecha en diferentes formatos
    const fecha = this.parsearFecha(valorDefecto);
    
    if (fecha && !isNaN(fecha.getTime())) {
      // Formatear a yyyy-mm-dd para inputs de tipo date
      const year = fecha.getFullYear();
      const month = String(fecha.getMonth() + 1).padStart(2, '0');
      const day = String(fecha.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } else {
      // Si no es una fecha válida (es texto como "HOY()", "Now", etc.), retornar fecha actual
      return new Date().toISOString().split('T')[0]; // Formato yyyy-mm-dd para inputs de tipo date
    }
  }

  parsearFecha(fechaStr: string): Date | null {
    // Intentar formato yyyy-mm-dd
    const regexYMD = /^(\d{4})-(\d{2})-(\d{2})$/;
    const matchYMD = fechaStr.match(regexYMD);
    if (matchYMD) {
      const [, year, month, day] = matchYMD;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    // Intentar formato dd/mm/yyyy
    const regexDMY = /^(\d{2})\/(\d{2})\/(\d{4})$/;
    const matchDMY = fechaStr.match(regexDMY);
    if (matchDMY) {
      const [, day, month, year] = matchDMY;
      return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    }

    return null;
  }

  formatearFecha(fecha: Date): string {
    const dia = String(fecha.getDate()).padStart(2, '0');
    const mes = String(fecha.getMonth() + 1).padStart(2, '0');
    const anio = fecha.getFullYear();
    return `${dia}/${mes}/${anio}`;
  }

  formatearInputFecha(event: any, detalleId: string) {
    
    
    // Actualizar el valor en el input
    // event.target.value = valor;
  }

  getOpcionesArray(detalle: ITramaDetalle): string[] {
    // Si es SELECT y tiene catálogo, usar las opciones del catálogo
    if (detalle.tipoInput === 'SELECT' && detalle.catalogo) {
      const detalleConOpciones = detalle as DetalleConOpciones;
      
      // Si hay opciones filtradas (por cascada), usarlas
      if (detalleConOpciones.opcionesFiltradas && detalleConOpciones.opcionesFiltradas.length > 0) {
        return detalleConOpciones.opcionesFiltradas.map(cat => cat.nombre);
      }
      
      // Si no hay opciones filtradas, usar todas las opciones del catálogo
      if (detalleConOpciones.opcionesCatalogo && detalleConOpciones.opcionesCatalogo.length > 0) {
        return detalleConOpciones.opcionesCatalogo.map(cat => cat.nombre);
      }
    }
    
    // Si no tiene catálogo o no es SELECT, usar las opciones normales
    if (!detalle.opciones) return [];
    return detalle.opciones.split(',').map(o => o.trim()).filter(o => o.length > 0);
  }

  onFileChange(event: any, detalleId: string) {
    const file = event.target.files?.[0];
    if (file) {
      // Convertir el archivo a Base64
      const reader = new FileReader();
      reader.onload = () => {
        const base64String = reader.result as string;
        const control = this.formulario().get(detalleId);
        if (control) {
          // Guardar información del archivo como JSON string
          const fileData = {
            nombre: file.name,
            tipo: file.type,
            tamanio: file.size,
            base64: base64String
          };
          control.setValue(JSON.stringify(fileData));
          this.cdr.markForCheck();
        }
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (this.formulario().invalid) {
      this.formulario().markAllAsTouched();
      return;
    }

    const formValues = this.formulario().value;
    // Usar TODOS los detalles (incluye no visibles)
    const todosDetalles = this.todosLosDetallesCompletos()
      .filter(detalle => detalle.tipoInput !== 'FILE');

    // Crear un mapa de valores finales para cada detalle
    const valoresPorDetalle = new Map<string, any>();

    // Primero, asignar todos los valores del formulario
    todosDetalles.forEach(detalle => {
      let valor = formValues[detalle.detalleId];
      valoresPorDetalle.set(detalle.detalleId, valor);
    });

    // Aplicar la lógica de asignación: CLIENTE con codigoParametro obtiene valor de PARAMETRO
    // Usar todos los detalles completos, no solo los visibles
    const todosClientes = this.todosLosDetallesCompletos().filter(d => d.tipo === 'CLIENTE');
    const todosParametros = this.todosLosDetallesCompletos().filter(d => d.tipo === 'PARAMETRO');
    
    todosClientes.forEach(detalleCliente => {
      if (detalleCliente.codigoParametro) {
        // Buscar el detalle PARAMETRO que tenga código igual a codigoParametro del cliente
        const detalleParametroEncontrado = todosParametros.find(
          detalleParam => detalleParam.codigo === detalleCliente.codigoParametro
        );

        if (detalleParametroEncontrado) {
          // Asignar el valor del parámetro al cliente
          const valorParametro = valoresPorDetalle.get(detalleParametroEncontrado.detalleId);
          valoresPorDetalle.set(detalleCliente.detalleId, valorParametro);
          
          console.log(`🔗 Asignación: Cliente "${detalleCliente.nombreInput}" recibe valor de Parámetro "${detalleParametroEncontrado.nombreInput}": ${valorParametro}`);
        }
      }
    });

    // Validar campos obligatorios
    const camposObligatoriosFaltantes: string[] = [];
    todosDetalles.forEach(detalle => {
      if (detalle.obligatorio) {
        const valor = valoresPorDetalle.get(detalle.detalleId);
        if (valor === null || valor === undefined || valor === '') {
          camposObligatoriosFaltantes.push(detalle.nombreInput || `Detalle ${detalle.detalleId}`);
        }
      }
    });

    // Si hay campos obligatorios sin valor, mostrar error
    if (camposObligatoriosFaltantes.length > 0) {
      const mensaje = `Los siguientes campos obligatorios no tienen valor: ${camposObligatoriosFaltantes.join(', ')}`;
      this.toastr.error(mensaje, 'Validación de campos');
      console.error('❌ Validación fallida:', camposObligatoriosFaltantes);
      return;
    }

    // Construir el JSON con los valores finales
    const resultado: any = {
      tramaId: this.tramaId(),
      trama: this.trama(),
      fecha: new Date().toISOString(),
      detalles: []
    };

    todosDetalles.forEach(detalle => {
      const valorFinal = valoresPorDetalle.get(detalle.detalleId);
      
      resultado.detalles.push({
        detalleId: detalle.detalleId,
        codigo: detalle.codigo,
        valor: detalle.valor,
        tag: detalle.tag,
        nombreInput: detalle.nombreInput,
        tipo: detalle.tipo,
        valorIngresado: valorFinal,
        tipoRespuesta: detalle.tipoRespuesta,
        obligatorio: detalle.obligatorio,
        codigoParametro: detalle.codigoParametro
      });
    });

    // Generar XML
    const xml = this.generarXML(valoresPorDetalle, todosDetalles);

    this.resultadoJSON.set(resultado);
    this.resultadoXML.set(xml);
    this.mostrarResultado.set(true);
    this.cdr.markForCheck();

    console.log('✅ XML Generado exitosamente:');
    console.log(xml);
  }

  generarXML(valoresPorDetalle: Map<string, any>, todosDetalles: ITramaDetalle[]): string {
    // Usar TODOS los detalles (incluye no visibles)
    const todosCompletos = this.todosLosDetallesCompletos();
    const detallesCliente = todosCompletos
      .filter(d => d.tipo === 'CLIENTE')
      .sort((a, b) => (a.orden || 0) - (b.orden || 0));
    const detallesParametro = todosCompletos
      .filter(d => d.tipo === 'PARAMETRO')
      .sort((a, b) => (a.codigo || 0) - (b.codigo || 0));
    const trama = this.trama();
    
    let xml = '<emanager.input>\n';
    xml += '  <tt>1</tt>\n';
    xml += '  <datos>\n';
    xml += '    <id-sistema>2</id-sistema>\n';
    
    // Sección CLIENTE
    xml += '    <cliente crear="1">\n';
    detallesCliente.forEach(detalle => {
      const valor = valoresPorDetalle.get(detalle.detalleId) || '';
      const tag = detalle.tag || detalle.nombreInput?.toLowerCase().replace(/\s+/g, '-');
      if (tag) {
        xml += `      <${tag}>${this.escaparXML(valor)}</${tag}>\n`;
      }
    });
    xml += '    </cliente>\n';
    
    // Sección PROCESO con PARAMETROS
    const procesoId = trama?.procesoId || '13';
    xml += `    <proceso id="${procesoId}">\n`;
    xml += '      <parametros>\n';
    
    // Solo incluir parámetros que tengan código
    detallesParametro
      .filter(detalle => detalle.codigo !== null && detalle.codigo !== undefined)
      .forEach(detalle => {
        const valor = valoresPorDetalle.get(detalle.detalleId) || '';
        xml += `        <parametro id="${detalle.codigo}">\n`;
        xml += `          <valor>${this.escaparXML(valor)}</valor>\n`;
        xml += '        </parametro>\n';
      });
    
    xml += '      </parametros>\n';
    xml += '    </proceso>\n';
    
    xml += '    <usuario>usuarioapp</usuario>\n';
    xml += '  </datos>\n';
    xml += '</emanager.input>';
    
    return xml;
  }

  escaparXML(valor: any): string {
    if (valor === null || valor === undefined) return '';
    const str = String(valor);
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  copiarXML() {
    const xml = this.resultadoXML();
    navigator.clipboard.writeText(xml).then(() => {
      this.toastr.success('XML copiado al portapapeles', 'Éxito');
    });
  }

  copiarJSON() {
    const json = JSON.stringify(this.resultadoJSON(), null, 2);
    navigator.clipboard.writeText(json).then(() => {
      this.toastr.success('JSON copiado al portapapeles', 'Éxito');
    });
  }

  onSelectChange(detalleOrigen: ITramaDetalle, event: any) {
    const valorSeleccionado = event.target.value;
    const todosDetalles = [
      ...this.detallesAgrupados().cliente,
      ...this.detallesAgrupados().parametro
    ];
    
    console.log(`🔍 SELECT cambió: "${detalleOrigen.nombreInput}" = "${valorSeleccionado}"`);
    console.log(`📌 catalogoHijo: ${detalleOrigen.catalogoHijo}`);
    
    this.filtrarOpcionesEnCascada(detalleOrigen, valorSeleccionado, todosDetalles);
  }

  private filtrarOpcionesEnCascada(detalleOrigen: ITramaDetalle, valorSeleccionado: string, todosDetalles: ITramaDetalle[]) {
    // Si no hay valor seleccionado, resetear los filtros
    if (!valorSeleccionado) {
      this.resetearFiltrosEnCascada(detalleOrigen, todosDetalles);
      return;
    }

    // Si no hay catalogoHijo, no hacer nada
    if (!detalleOrigen.catalogoHijo) {
      console.log('⚠️ No hay catalogoHijo definido, no se filtra nada');
      return;
    }

    console.log(`🔎 Buscando detalles con catalogo="${detalleOrigen.catalogoHijo}"`);
    console.log(`📊 Total detalles disponibles: ${todosDetalles.length}`);
    
    // Buscar todos los detalles que tengan catalogo = catalogoHijo del origen
    const detallesAfectados = todosDetalles.filter(
      d => d.tipoInput === 'SELECT' && 
           d.catalogo === detalleOrigen.catalogoHijo &&
           d.detalleId !== detalleOrigen.detalleId
    );

    console.log(`🎯 Detalles afectados encontrados: ${detallesAfectados.length}`);
    detallesAfectados.forEach(d => console.log(`   - ${d.nombreInput} (catalogo: ${d.catalogo})`));

    if (detallesAfectados.length === 0) {
      console.warn(`⚠️ No se encontraron detalles con catalogo="${detalleOrigen.catalogoHijo}"`);
      return;
    }

    detallesAfectados.forEach(detalleAfectado => {
      const detalleConOpciones = detalleAfectado as DetalleConOpciones;
      
      if (!detalleConOpciones.opcionesCatalogo || detalleConOpciones.opcionesCatalogo.length === 0) {
        console.warn(`⚠️ "${detalleAfectado.nombreInput}" no tiene opcionesCatalogo`);
        return;
      }

      console.log(`📦 Obteniendo catálogo padre: "${detalleOrigen.catalogo}"`);
      const catalogoPadre = this.catalogosService.obtenerLocal(detalleOrigen.catalogo || '');
      
      if (!catalogoPadre || catalogoPadre.length === 0) {
        console.error(`❌ No se pudo cargar el catálogo "${detalleOrigen.catalogo}" del localStorage`);
        return;
      }

      console.log(`✅ Catálogo padre cargado: ${catalogoPadre.length} elementos`);
      
      // Buscar el catálogo padre que tenga el nombre igual al valor seleccionado
      const catalogoEncontrado = catalogoPadre.find(cat => cat.nombre === valorSeleccionado);
      
      if (!catalogoEncontrado) {
        console.warn(`⚠️ No se encontró catálogo con nombre "${valorSeleccionado}" en "${detalleOrigen.catalogo}"`);
        console.log(`   Primeros 3 nombres disponibles:`, catalogoPadre.slice(0, 3).map(c => c.nombre));
        return;
      }

      const valorCoreDelPadre = catalogoEncontrado.valorCore;
      console.log(`🔑 Encontrado valorCore del padre: "${valorCoreDelPadre}"`);
      
      // Filtrar las opciones del catálogo hijo donde el padre tenga el mismo valorCore
      const opcionesFiltradas = detalleConOpciones.opcionesCatalogo.filter(
        cat => cat.padreValorCore === valorCoreDelPadre
      );
      
      detalleConOpciones.opcionesFiltradas = opcionesFiltradas;
      console.log(`✅ Filtradas opciones de "${detalleAfectado.nombreInput}": ${opcionesFiltradas.length} elementos (padreValorCore="${valorCoreDelPadre}")`);
      
      if (opcionesFiltradas.length === 0) {
        console.warn(`  📋 Muestra de padreValorCore en opciones hijo:`, 
          detalleConOpciones.opcionesCatalogo.slice(0, 3).map(c => ({ nombre: c.nombre, padreValorCore: c.padreValorCore }))
        );
      } else {
        console.log(`  🎉 Primeras 3 opciones filtradas:`, opcionesFiltradas.slice(0, 3).map(c => c.nombre));
      }
    });

    this.cdr.markForCheck();
  }

  private resetearFiltrosEnCascada(detalleOrigen: ITramaDetalle, todosDetalles: ITramaDetalle[]) {
    // Buscar todos los detalles que tengan catalogo = catalogoHijo del origen
    const detallesAfectados = todosDetalles.filter(
      d => d.tipoInput === 'SELECT' && 
           d.catalogo === detalleOrigen.catalogoHijo &&
           d.detalleId !== detalleOrigen.detalleId
    );

    detallesAfectados.forEach(detalleAfectado => {
      const detalleConOpciones = detalleAfectado as DetalleConOpciones;
      detalleConOpciones.opcionesFiltradas = undefined;
      // Resetear el valor del formulario
      this.formulario().get(detalleAfectado.detalleId)?.reset('', { emitEvent: false });
    });

    this.cdr.markForCheck();
  }

  reiniciarFormulario() {
    this.formulario().reset();
    this.mostrarResultado.set(false);
    this.resultadoJSON.set(null);
    this.resultadoXML.set('');
    this.cdr.markForCheck();
  }

  async enviarFormulario() {
    if (!this.resultadoJSON()) {
      this.toastr.error('Primero debes generar el XML', 'Error');
      return;
    }

    this.enviandoFormulario.set(true);

    try {
      // Generar operación aleatoria de 5 dígitos
      const operacion = Math.floor(10000 + Math.random() * 90000);

      // Obtener todos los detalles para buscar los campos necesarios
      const todosDetalles = [
        ...this.detallesAgrupados().cliente,
        ...this.detallesAgrupados().parametro
      ];

      // Obtener valores del formulario
      const valoresFormulario = this.formulario().value;

      // Buscar campos para nombreCliente: "primer nombre", "segundo nombre", "primer apellido"
      const nombresCompletos: string[] = [];
      
      const detallesPrimerNombre = todosDetalles.filter(d => 
        d.nombreInput?.toLowerCase().includes('primer nombre')
      );
      const detallesSegundoNombre = todosDetalles.filter(d => 
        d.nombreInput?.toLowerCase().includes('segundo nombre')
      );
      const detallesPrimerApellido = todosDetalles.filter(d => 
        d.nombreInput?.toLowerCase().includes('primer apellido')
      );

      // Recopilar valores en orden: primer nombre, segundo nombre, primer apellido
      detallesPrimerNombre.forEach(d => {
        const valor = valoresFormulario[d.detalleId];
        if (valor) nombresCompletos.push(valor);
      });
      detallesSegundoNombre.forEach(d => {
        const valor = valoresFormulario[d.detalleId];
        if (valor) nombresCompletos.push(valor);
      });
      detallesPrimerApellido.forEach(d => {
        const valor = valoresFormulario[d.detalleId];
        if (valor) nombresCompletos.push(valor);
      });

      const nombreCliente = nombresCompletos.join(' ').trim() || undefined;

      // Buscar campo para documento
      const detalleDocumento = todosDetalles.find(d => 
        d.nombreInput?.toLowerCase().includes('documento')
      );
      const documento = detalleDocumento ? valoresFormulario[detalleDocumento.detalleId] : undefined;

      // Preparar datos para enviar
      const datosGestion = {
        tramaEjecucionId: '', // Se genera en el backend
        operacion: 1401,
        trama: JSON.stringify(this.resultadoJSON()), // JSON como string
        nombreCliente,
        documento: documento?.toString(),
        created_at: new Date()
      };

      console.log('📤 Enviando gestión:', datosGestion);

      const resultado = await this.gestionService.createGestion(datosGestion);

      if (resultado) {
        this.toastr.success('Formulario enviado correctamente', 'Éxito');
        console.log('✅ Gestión creada:', resultado);
        
        // Opcionalmente, resetear el formulario después de enviar
        // this.reiniciarFormulario();
      }
    } catch (error) {
      console.error('❌ Error al enviar formulario:', error);
      this.toastr.error('Error al enviar el formulario', 'Error');
    } finally {
      this.enviandoFormulario.set(false);
      this.cdr.markForCheck();
    }
  }
}
