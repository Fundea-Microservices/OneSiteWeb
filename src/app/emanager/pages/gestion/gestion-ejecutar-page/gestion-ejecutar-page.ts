import { ChangeDetectionStrategy, Component, inject, signal, ChangeDetectorRef, CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { TramaDetalleService } from '../../../../../services/emanager/trama-detalle.service';
import { TramaService } from '../../../../../services/emanager/trama.service';
import { ITramaDetalle, ITrama } from '../../../../../interfaces/emanager/getion';
import { ToastrService } from 'ngx-toastr';
import { CatalogosBantotalService } from '../../../../../services/api-bantotal/catalogos.service';
import { CatalogoSimple } from '../../../../../interfaces/api-bantotal/catalogos';

interface DetalleAgrupado {
  cliente: ITramaDetalle[];
  parametro: ITramaDetalle[];
}

interface DetalleConOpciones extends ITramaDetalle {
  opcionesCatalogo?: CatalogoSimple[];
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
  private catalogosService = inject(CatalogosBantotalService);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private cdr = inject(ChangeDetectorRef);
  private toastr = inject(ToastrService);

  tramaId = signal<string>('');
  trama = signal<ITrama | null>(null);
  isLoading = signal(false);
  
  detallesAgrupados = signal<DetalleAgrupado>({
    cliente: [],
    parametro: []
  });

  formulario = signal<FormGroup>(this.fb.group({}));
  resultadoJSON = signal<any>(null);
  resultadoXML = signal<string>('');
  mostrarResultado = signal(false);

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.tramaId.set(id);
        this.cargarTrama();
        this.cargarDetalles();
      }
    });
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
      const resultado = await this.tramaDetalleService.getTramaDetalles({
        tramaId: this.tramaId(),
        all: true
      });

      if (resultado?.data) {
        // Filtrar solo los visibles y activos
        const detallesVisibles = resultado.data.filter(d => d.activo);
        
        // Ordenar por el campo 'orden'
        detallesVisibles.sort((a, b) => a.orden - b.orden);

        // Cargar opciones de catálogos para detalles SELECT
        const detallesConCatalogos = detallesVisibles.map(detalle => {
          if (detalle.tipoInput === 'SELECT' && detalle.catalogo) {
            const opcionesCatalogo = this.catalogosService.obtenerLocal(detalle.catalogo);
            return { ...detalle, opcionesCatalogo: opcionesCatalogo || [] };
          }
          return detalle;
        });

        // Agrupar por tipo
        const agrupados: DetalleAgrupado = {
          cliente: detallesConCatalogos.filter(d => d.tipo === 'CLIENTE'),
          parametro: detallesConCatalogos.filter(d => d.tipo === 'PARAMETRO')
        };

        this.detallesAgrupados.set(agrupados);
        this.construirFormulario(detallesConCatalogos);
        
        this.cdr.markForCheck();
      }
    } catch (error) {
      console.error('Error al cargar detalles:', error);
    } finally {
      this.isLoading.set(false);
      this.cdr.markForCheck();
    }
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

    this.formulario.set(this.fb.group(group));
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
      // Si es una fecha válida, formatearla a dd/mm/yyyy
      return this.formatearFecha(fecha);
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
    const todosDetalles = [
      ...this.detallesAgrupados().cliente,
      ...this.detallesAgrupados().parametro
    ];

    // Crear un mapa de valores finales para cada detalle
    const valoresPorDetalle = new Map<string, any>();

    // Primero, asignar todos los valores del formulario
    todosDetalles.forEach(detalle => {
      valoresPorDetalle.set(detalle.detalleId, formValues[detalle.detalleId]);
    });

    // Aplicar la lógica de asignación: CLIENTE con codigoParametro obtiene valor de PARAMETRO
    this.detallesAgrupados().cliente.forEach(detalleCliente => {
      if (detalleCliente.codigoParametro) {
        // Buscar el detalle PARAMETRO que tenga código igual a codigoParametro del cliente
        const detalleParametroEncontrado = this.detallesAgrupados().parametro.find(
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
    const detallesCliente = this.detallesAgrupados().cliente;
    const detallesParametro = this.detallesAgrupados().parametro;
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
    const procesoId = trama?.codigo || '13';
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

  reiniciarFormulario() {
    this.formulario().reset();
    this.mostrarResultado.set(false);
    this.resultadoJSON.set(null);
    this.resultadoXML.set('');
    this.cdr.markForCheck();
  }
}
