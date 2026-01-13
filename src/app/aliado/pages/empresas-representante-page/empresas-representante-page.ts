
import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { RepresentanteService } from '../../../../services/aliado/representante.service';
import { Representante } from '../../../../interfaces/aliado/representante';
import { EmpresaRepresentanteService } from '../../../../services/aliado/empresa-representante.service';
import { IEmpresaRepresentante } from '../../../../interfaces/aliado/empresa-representante';
import { UpsertEmpresaRepresentanteComponent } from '../../../aliado/components/representante/upsert-empresa-representante/upsert-empresa-representante';
import { UpsertCuentaRepresentanteComponent } from '../../../aliado/components/representante/upsert-cuenta-representante/upsert-cuenta-representante';
import { CommonModule } from '@angular/common';
import { CatalogosBantotalService } from '../../../../services/api-bantotal/catalogos.service';
import { CatalogoSimple } from '../../../../interfaces/api-bantotal/catalogos';
import { ICuentaBancariaRepresentante, IBancoRepresentante, ITipoCuentaRepresentante } from '../../../../interfaces/aliado/banco';
import { CuentaBancariaService } from '../../../../services/aliado/cuenta-bancaria.service';
import { BancoService } from '../../../../services/aliado/banco.service';
import { ICuentaBancaria } from '../../../../interfaces/aliado/cuenta-bancaria';
import { SolicitudesService } from '../../../../services/aliado/solicitudes.service';
import { Solicitud } from '../../../../interfaces/aliado/solicitudes';
import UpsertSolicitudComponent, { SolicitudFormData } from '../../components/upsert-solicitud/upsert-solicitud.component';
import { SeguimientoSolicitudService } from '../../../../services/aliado/seguimiento-solicitud.service';
import { GeneralidadesService } from '../../../../services/aliado/generalidades.service';
import { EstadoSolicitud } from '../../../../interfaces/aliado/generalidades';
import { AgenciaRegionService } from '../../../../services/aliado/agencia-region.service';


@Component({
  selector: 'app-empresas-representante-page',
  imports: [RouterLink, UpsertEmpresaRepresentanteComponent, UpsertCuentaRepresentanteComponent, UpsertSolicitudComponent, CommonModule],
  templateUrl: './empresas-representante-page.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class EmpresasRepresentantePage {
  private route = inject(ActivatedRoute);
  private representanteService = inject(RepresentanteService);
  private empresaService = inject(EmpresaRepresentanteService);
  private catalogosService = inject(CatalogosBantotalService);
  private cuentaBancariaService = inject(CuentaBancariaService);
  private bancoService = inject(BancoService);
  private solicitudesService = inject(SolicitudesService);
  private seguimientoService = inject(SeguimientoSolicitudService);
  private generalidadesService = inject(GeneralidadesService);
  private agenciaRegionService = inject(AgenciaRegionService);
  representanteId = signal('');
  representante = signal<Representante | null>(null);

  // Solicitudes por empresa
  solicitudesPorEmpresa = signal<Map<string, Solicitud | null>>(new Map());

  // Estado del modal
  showModal = signal(false);
  empresaSeleccionada = signal<IEmpresaRepresentante | null>(null);
  esNuevaEmpresa = signal(true);
  modalKey = signal(0);

  // Estado del modal de cuenta bancaria
  showModalCuenta = signal(false);
  cuentaSeleccionada = signal<ICuentaBancariaRepresentante | null>(null);
  empresaIdCuenta = signal<string>('');
  modalKeyCuenta = signal(0);
  esEditarCuenta = signal(false);

  // Estado del modal de solicitud
  showModalSolicitud = signal(false);
  empresaIdSolicitud = signal<string>('');
  modalKeySolicitud = signal(0);
  esEditarSolicitud = signal(false);
  solicitudFormData = signal<SolicitudFormData | undefined>(undefined);
  cuentaBancariaIdSolicitud = signal<string>(''); // ID de cuenta cuando se crea solicitud desde cuenta

  // Lista de empresas reales
  empresas = signal<(IEmpresaRepresentante & { open?: boolean })[]>([]);

  // Catálogos
  departamentos = signal<CatalogoSimple[]>([]);
  municipios = signal<CatalogoSimple[]>([]);
  bancos = signal<IBancoRepresentante[]>([]);
  tiposCuenta = signal<ITipoCuentaRepresentante[]>([]);

  // Cuentas bancarias por empresa
  cuentasPorEmpresa = signal<Map<string, ICuentaBancaria[]>>(new Map());
  cargandoCuentas = signal<Set<string>>(new Set());

  // Catálogo de estados de solicitud
  estadosSolicitud = signal<EstadoSolicitud[]>([]);

  async ngOnInit() {
    // Cargar catálogos
    this.cargarCatalogos();
    await this.cargarEstadosSolicitud();
    
    // Obtener el representanteId de la URL
    const id = this.route.snapshot.paramMap.get('representanteId') || '';
    console.log("🚀 ~ EmpresasRepresentantePage ~ ngOnInit ~ id:", id)
    this.representanteId.set(id);
    if (id) {
      const resp = await this.representanteService.byId(id);
      console.log("🚀 ~ EmpresasRepresentantePage ~ ngOnInit ~ resp:", resp)
      this.representante.set(resp?.data?.representante || null);
      
      // Cargar empresas del representante
      await this.cargarEmpresas();
    }
  }

  async cargarEmpresas() {
    const id = this.representanteId();
    if (!id) return;

    const resp = await this.empresaService.obtenerEmpresasPorRepresentante(id, 1, 100);
    console.log('🚀 ~ cargarEmpresas ~ resp:', resp);
    
    // La respuesta tiene doble anidamiento: resp.data.data
    if (resp?.data && (resp.data as any).data && Array.isArray((resp.data as any).data)) {
      const empresas = (resp.data as any).data.map((e: any) => ({ ...e, open: false }));
      this.empresas.set(empresas);
      
      // Cargar solicitudes para cada empresa
      await this.cargarSolicitudesParaEmpresas(empresas);
    }
  }

  private async cargarSolicitudesParaEmpresas(empresas: IEmpresaRepresentante[]) {
    const map = new Map<string, Solicitud | null>();
    
    // Obtener todas las solicitudes del representante una sola vez
    try {
      const representanteId = this.representanteId();
      const resp = await this.solicitudesService.findAllSolicitudes(representanteId);
      
      // Crear un mapa de solicitudes por empresaId
      if (resp?.data && Array.isArray(resp.data)) {
        const solicitudes = resp.data as Solicitud[];
        
        // Para cada empresa, buscar su solicitud
        empresas.forEach(empresa => {
          const solicitud = solicitudes.find(s => s.empresaId === empresa.empresaId) || null;
          map.set(empresa.empresaId, solicitud);
        });
      } else {
        // Si no hay solicitudes, marcar todas como null
        empresas.forEach(empresa => {
          map.set(empresa.empresaId, null);
        });
      }
    } catch (error) {
      console.error('Error al cargar solicitudes:', error);
      // En caso de error, marcar todas como null
      empresas.forEach(empresa => {
        map.set(empresa.empresaId, null);
      });
    }
    
    this.solicitudesPorEmpresa.set(map);
  }

  getSolicitudPorEmpresa(empresaId: string): Solicitud | null {
    return this.solicitudesPorEmpresa().get(empresaId) || null;
  }

  puedeEditarEmpresa(empresaId: string): boolean {
    const solicitud = this.getSolicitudPorEmpresa(empresaId);
    if (!solicitud || !solicitud.estadoSolicitud || !solicitud.estadoSolicitud.nombre) {
      return true; // Si no hay solicitud, se puede editar
    }
    const estado = solicitud.estadoSolicitud.nombre.toUpperCase();
    return estado !== 'APROBADO' && estado !== 'RECHAZADO';
  }

  getUltimoSeguimiento(empresaId: string) {
    const solicitud = this.getSolicitudPorEmpresa(empresaId);
    if (!solicitud || !solicitud.seguimientos || solicitud.seguimientos.length === 0) {
      return null;
    }
    // Encontrar el seguimiento con el ordenSeguimiento más alto
    return solicitud.seguimientos.reduce((ultimo, actual) => {
      const ordenActual = actual.ordenSeguimiento || 0;
      const ordenUltimo = ultimo.ordenSeguimiento || 0;
      return ordenActual > ordenUltimo ? actual : ultimo;
    });
  }

  abrirModalNuevaEmpresa() {
    this.esNuevaEmpresa.set(true);
    this.empresaSeleccionada.set({
      empresaId: '',
      representanteId: this.representanteId(),
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
    this.modalKey.set(this.modalKey() + 1);
    this.showModal.set(true);
  }

  abrirModalEditarEmpresa(empresa: IEmpresaRepresentante) {
    this.esNuevaEmpresa.set(false);
    this.empresaSeleccionada.set({ ...empresa });
    this.modalKey.set(this.modalKey() + 1);
    this.showModal.set(true);
  }

  cerrarModal() {
    this.showModal.set(false);
    this.empresaSeleccionada.set(null);
  }

  async onGuardarEmpresa(empresa: IEmpresaRepresentante) {
    if (this.esNuevaEmpresa()) {
      const resp = await this.empresaService.crearEmpresa(empresa);
      if (resp?.success) {
        await this.cargarEmpresas();
        this.cerrarModal();
      }
    } else {
      const resp = await this.empresaService.actualizarEmpresa(empresa.empresaId, empresa);
      if (resp?.success) {
        await this.cargarEmpresas();
        this.cerrarModal();
      }
    }
  }

  async eliminarEmpresa(empresaId: string) {
    if (confirm('¿Está seguro de eliminar esta empresa?')) {
      const resp = await this.empresaService.eliminarEmpresa(empresaId);
      if (resp?.success) {
        await this.cargarEmpresas();
      }
    }
  }

  private async cargarCatalogos() {
    const deptos = this.catalogosService.obtenerLocal('departamento');
    if (deptos) {
      this.departamentos.set(deptos);
    }

    const munis = this.catalogosService.obtenerLocal('municipio');
    if (munis) {
      this.municipios.set(munis);
    }

    // Cargar bancos y tipos de cuenta
    const [bancos, tiposCuenta] = await Promise.all([
      this.bancoService.obtenerBancos(),
      this.bancoService.obtenerTiposCuenta()
    ]);
    
    this.bancos.set(bancos || []);
    this.tiposCuenta.set(tiposCuenta || []);
  }

  private async cargarEstadosSolicitud() {
    try {
      const resp = await this.generalidadesService.getAllEstadoSolicitud({ all: true });
      if (resp?.data) {
        this.estadosSolicitud.set(resp.data as EstadoSolicitud[]);
      }
    } catch (error) {
      console.error('Error al cargar estados de solicitud:', error);
    }
  }

  obtenerNombreDepartamento(codigo: number): string {
    const depto = this.departamentos().find(d => d.valorCore === codigo.toString());
    return depto ? depto.nombre : `Código: ${codigo}`;
  }

  obtenerNombreMunicipio(codigo: number): string {
    const muni = this.municipios().find(m => m.valorCore === codigo.toString());
    return muni ? muni.nombre : `Código: ${codigo}`;
  }

  async abrirModalNuevaCuenta(empresaId: string) {
    if (!this.cuentasPorEmpresa().has(empresaId)) {
      await this.cargarCuentasEmpresa(empresaId);
    }

    const solicitud = this.getSolicitudPorEmpresa(empresaId);
    const solicitudAprobada =
      solicitud?.estadoSolicitud?.nombre?.toUpperCase() === 'APROBADO';
    const cuentas = this.obtenerCuentasEmpresa(empresaId);

    if (!solicitudAprobada && cuentas.length >= 1) {
      alert('Solo puede registrar una cuenta bancaria antes de aprobar la solicitud.');
      return;
    }

    this.empresaIdCuenta.set(empresaId);
    this.esEditarCuenta.set(false);
    this.cuentaSeleccionada.set({
      cuentaBancariaId: '',
      empresaId: empresaId,
      bancoId: '',
      tipoCuentaId: '',
      monedaId: 1,
      numeroCuenta: '',
      nombreCuenta: '',
      activo: true,
      usrIngreso: '',
    });
    this.modalKeyCuenta.set(this.modalKeyCuenta() + 1);
    this.showModalCuenta.set(true);
  }

  cerrarModalCuenta() {
    this.showModalCuenta.set(false);
    this.cuentaSeleccionada.set(null);
    this.empresaIdCuenta.set('');
  }

  async onGuardarCuenta(cuenta: ICuentaBancariaRepresentante) {
    console.log('✅ Cuenta guardada:', cuenta);
    const empresaId = this.empresaIdCuenta();
    console.log('🔍 ID de empresa para recargar:', empresaId);
    
    // Recargar las cuentas de la empresa primero
    if (empresaId) {
      console.log('♻️ Recargando cuentas de la empresa...');
      await this.cargarCuentasEmpresa(empresaId);
      console.log('✨ Cuentas recargadas completadas');

      const solicitud = this.getSolicitudPorEmpresa(empresaId);
      if (solicitud?.solicitudId && cuenta.cuentaBancariaId) {
        try {
          await this.solicitudesService.updateSolicitud(solicitud.solicitudId, {
            cuentaBancariaId: cuenta.cuentaBancariaId,
            empresaId: solicitud.empresaId || empresaId,
          });
        } catch (error) {
          console.error('❌ Error al asociar cuenta con solicitud:', error);
        }
      }
      
      // Siempre recargar las solicitudes del representante después de guardar la cuenta
      console.log('🔄 Recargando solicitudes del representante...');
      await this.cargarSolicitudesParaEmpresas(this.empresas());
      console.log('✅ Solicitudes recargadas');
    } else {
      console.warn('⚠️ No hay ID de empresa para recargar');
    }
    
    // Cerrar el modal después
    this.cerrarModalCuenta();
  }

  async cargarCuentasEmpresa(empresaId: string) {
    if (!empresaId) return;

    const cargando = new Set(this.cargandoCuentas());
    cargando.add(empresaId);
    this.cargandoCuentas.set(cargando);

    try {
      const resp = await this.cuentaBancariaService.obtenerPorEmpresa(empresaId, 1, 100);
      
      if (resp?.success && resp.data?.data) {
        const cuentasMap = new Map(this.cuentasPorEmpresa());
        cuentasMap.set(empresaId, resp.data.data);
        this.cuentasPorEmpresa.set(cuentasMap);
        console.log('💳 Cuentas cargadas para empresa', empresaId, ':', resp.data.data);
      }
    } catch (error) {
      console.error('❌ Error al cargar cuentas:', error);
    } finally {
      const cargando = new Set(this.cargandoCuentas());
      cargando.delete(empresaId);
      this.cargandoCuentas.set(cargando);
    }
  }

  obtenerCuentasEmpresa(empresaId: string): ICuentaBancaria[] {
    return this.cuentasPorEmpresa().get(empresaId) || [];
  }

  estaCargandoCuentas(empresaId: string): boolean {
    return this.cargandoCuentas().has(empresaId);
  }

  obtenerNombreBanco(bancoId: string): string {
    const banco = this.bancos().find(b => b.bancoId === bancoId);
    return banco ? banco.nombreBanco : 'N/A';
  }

  obtenerNombreTipoCuenta(tipoCuentaId: string): string {
    const tipo = this.tiposCuenta().find(t => t.tipoCuentaId === tipoCuentaId);
    return tipo ? tipo.nombre : 'N/A';
  }

  obtenerNombreMoneda(monedaId: number): string {
    return monedaId === 1 ? 'Q - Quetzales' : '$ - Dólares';
  }

  obtenerEstadoSolicitudPorCuenta(cuentaBancariaId: string): string | null {
    const solicitudes = Array.from(this.solicitudesPorEmpresa().values()).filter(s => s !== null) as Solicitud[];
    const solicitud = solicitudes.find(s => s.cuentaBancariaId === cuentaBancariaId);
    return solicitud?.estadoSolicitud?.nombre || null;
  }

  puedeEditarCuenta(cuentaBancariaId: string): boolean {
    const estado = this.obtenerEstadoSolicitudPorCuenta(cuentaBancariaId);
    if (!estado) return true; // Si no hay solicitud, se puede editar
    const estadoUpper = estado.toUpperCase();
    return estadoUpper !== 'APROBADO' && estadoUpper !== 'RECHAZADO';
  }

  async editarCuenta(empresaId: string, cuenta: ICuentaBancaria) {
    this.empresaIdCuenta.set(empresaId);
    this.esEditarCuenta.set(true);
    const cuentaRepresentante: ICuentaBancariaRepresentante = {
      cuentaBancariaId: cuenta.cuentaBancariaId || '',
      empresaId: cuenta.empresaId,
      bancoId: cuenta.bancoId,
      tipoCuentaId: cuenta.tipoCuentaId,
      monedaId: cuenta.monedaId,
      numeroCuenta: cuenta.numeroCuenta,
      nombreCuenta: cuenta.nombreCuenta,
      activo: cuenta.activo ?? true,
      usrIngreso: cuenta.usrIngreso || '',
    };
    this.cuentaSeleccionada.set(cuentaRepresentante);
    this.modalKeyCuenta.set(this.modalKeyCuenta() + 1);
    this.showModalCuenta.set(true);
  }

  async toggleEmpresa(empresa: IEmpresaRepresentante & { open?: boolean }) {
    empresa.open = !empresa.open;
    
    // Si se abre y no se han cargado las cuentas, cargarlas
    if (empresa.open && !this.cuentasPorEmpresa().has(empresa.empresaId)) {
      await this.cargarCuentasEmpresa(empresa.empresaId);
    }
  }

  async cambiarEstadoCuenta(cuenta: ICuentaBancaria, empresaId: string, nuevoEstado: boolean, switchElement: HTMLInputElement) {
    if (!cuenta.cuentaBancariaId) return;

    const estadoAnterior = cuenta.activo ?? false;

    try {
      const dto = {
        activo: nuevoEstado
      };

      const resp = await this.cuentaBancariaService.actualizar(cuenta.cuentaBancariaId, dto);
      
      if (resp?.success) {
        // Recargar las cuentas para asegurar que se actualice la vista
        await this.cargarCuentasEmpresa(empresaId);
      } else {
        // Si no fue exitoso, revertir el switch
        switchElement.checked = estadoAnterior;
        await this.cargarCuentasEmpresa(empresaId);
      }
    } catch (error) {
      console.error('❌ Error al cambiar estado de cuenta:', error);
      // Revertir el switch al estado anterior
      switchElement.checked = estadoAnterior;
      // Recargar las cuentas para asegurar consistencia
      await this.cargarCuentasEmpresa(empresaId);
    }
  }

  crearNuevaSolicitud(empresaId: string) {
    this.empresaIdSolicitud.set(empresaId);
    this.cuentaBancariaIdSolicitud.set(''); // Limpiar
    this.esEditarSolicitud.set(false);
    this.solicitudFormData.set(undefined);
    this.modalKeySolicitud.set(this.modalKeySolicitud() + 1);
    this.showModalSolicitud.set(true);
  }

  crearSolicitudDesdeCuenta(cuentaBancariaId: string) {
    this.cuentaBancariaIdSolicitud.set(cuentaBancariaId);
    this.empresaIdSolicitud.set(''); // No necesitamos empresaId
    this.esEditarSolicitud.set(false);
    this.solicitudFormData.set(undefined);
    this.modalKeySolicitud.set(this.modalKeySolicitud() + 1);
    this.showModalSolicitud.set(true);
  }

  async editarSolicitud(empresaId: string) {
    this.empresaIdSolicitud.set(empresaId);
    this.esEditarSolicitud.set(true);
    
    // Cargar los datos de la solicitud de forma async
    const formData = await this.cargarSolicitudFormData(empresaId);
    this.solicitudFormData.set(formData);
    
    this.modalKeySolicitud.set(this.modalKeySolicitud() + 1);
    this.showModalSolicitud.set(true);
  }

  puedeEditarSolicitud(empresaId: string): boolean {
    const solicitud = this.getSolicitudPorEmpresa(empresaId);
    if (!solicitud || !solicitud.estadoSolicitud || !solicitud.estadoSolicitud.nombre) {
      return false;
    }
    const estado = solicitud.estadoSolicitud.nombre.toUpperCase();
    return estado !== 'APROBADO' && estado !== 'RECHAZADO';
  }

  esEstadoCorregir(empresaId: string): boolean {
    const solicitud = this.getSolicitudPorEmpresa(empresaId);
    if (!solicitud || !solicitud.estadoSolicitud || !solicitud.estadoSolicitud.nombre) {
      return false;
    }
    return solicitud.estadoSolicitud.nombre.toUpperCase() === 'CORREGIR';
  }

  cerrarModalSolicitud() {
    this.showModalSolicitud.set(false);
    this.empresaIdSolicitud.set('');
    this.cuentaBancariaIdSolicitud.set('');
  }

  // Obtener la empresa actual para el modal
  getEmpresaActual(): IEmpresaRepresentante | null {
    const empresaId = this.empresaIdSolicitud();
    return this.empresas().find(e => e.empresaId === empresaId) || null;
  }

  // Obtener la cuenta bancaria de la empresa (si existe) o la cuenta desde la que se crea la solicitud
  getCuentaBancariaEmpresa(empresaId: string): ICuentaBancaria | null {
    // Si se está creando desde una cuenta bancaria específica
    const cuentaIdDesdeCuenta = this.cuentaBancariaIdSolicitud();
    if (cuentaIdDesdeCuenta) {
      // Buscar en todas las empresas
      for (const [, cuentas] of this.cuentasPorEmpresa()) {
        const cuenta = cuentas.find(c => c.cuentaBancariaId === cuentaIdDesdeCuenta);
        if (cuenta) return cuenta;
      }
      return null;
    }
    
    // Si no, buscar la cuenta de la empresa
    const cuentas = this.cuentasPorEmpresa().get(empresaId);
    // Retornar la primera cuenta activa si existe
    return cuentas?.find(c => c.activo) || cuentas?.[0] || null;
  }

  private async cargarSolicitudFormData(empresaId: string): Promise<SolicitudFormData | undefined> {
    const solicitud = this.getSolicitudPorEmpresa(empresaId);
    
    if (!solicitud) return undefined;

    // Convertir códigos numéricos del backend a IDs string del frontend
    let regionId = '';
    let agenciaId = '';

    if (solicitud.regionId) {
      // Convertir número de región a formato 'r-001'
      regionId = `r-${String(solicitud.regionId).padStart(3, '0')}`;
    }

    if (solicitud.agenciaId) {
      // Buscar la agencia por su código numérico
      const agencias = await this.agenciaRegionService.getAgencias();
      const agencia = agencias.find(a => a.codigo === solicitud.agenciaId);
      if (agencia) {
        agenciaId = agencia.agenciaId;
      }
    }

    return {
      tipoSolicitudId: solicitud.tipoSolicitudId || '',
      estadoSolicitudId: solicitud.estadoSolicitudId || '',
      tipoAfiliacionId: solicitud.tipoAfiliacionId || '',
      regionId,
      agenciaId,
      observaciones: solicitud.observaciones || undefined,
    };
  }

  async confirmarCorrecciones(empresaId: string) {
    const solicitud = this.getSolicitudPorEmpresa(empresaId);
    if (!solicitud?.solicitudId) {
      alert('No se encontró la solicitud');
      return;
    }

    if (!confirm('¿Confirmar que las correcciones han sido realizadas?')) {
      return;
    }

    try {
      // Buscar el estado "ESPERA"
      const estadoEspera = this.estadosSolicitud().find(
        estado => estado.nombre?.toUpperCase().includes('ESPERA')
      );

      if (!estadoEspera) {
        alert('No se encontró el estado ESPERA');
        return;
      }

      // Obtener el último seguimiento para calcular el orden
      const ultimoSeguimiento = this.getUltimoSeguimiento(empresaId);
      const nuevoOrden = (ultimoSeguimiento?.ordenSeguimiento || 0) + 1;

      // Crear el seguimiento
      await this.seguimientoService.createSeguimientoSolicitud({
        solicitudId: solicitud.solicitudId,
        ordenSeguimiento: nuevoOrden,
        estadoAprobacionId: estadoEspera.estadoSolicitudId,
        observaciones: 'Correcciones realizadas',
      });

      // Actualizar el estado de la solicitud
      await this.solicitudesService.updateSolicitud(solicitud.solicitudId, {
        estadoSolicitudId: estadoEspera.estadoSolicitudId,
      });

      // Recargar las empresas para actualizar la vista
      await this.cargarEmpresas();
    } catch (error) {
      console.error('Error al confirmar correcciones:', error);
    }
  }

  async onGuardarSolicitud(formData: SolicitudFormData) {
    try {
      const empresaId = this.empresaIdSolicitud();
      const cuentaBancariaIdDesdeCuenta = this.cuentaBancariaIdSolicitud();
      const representanteId = this.representanteId();
      
      if (this.esEditarSolicitud()) {
        // Modo edición
        const solicitud = this.getSolicitudPorEmpresa(empresaId);
        if (!solicitud?.solicitudId) {
          alert('No se encontró la solicitud a editar');
          return;
        }

        // Convertir regionId y agenciaId string a códigos numéricos
        let regionId: number | null = null;
        let agenciaId: number | null = null;

        // Buscar el código de la región
        const regionEncontrada = await this.agenciaRegionService.getRegiones().then(regiones => 
          regiones.find(r => r.regionId === formData.regionId)
        );
        
        // Para región, extraer el número del formato 'r-001' -> 1
        if (regionEncontrada) {
          const match = regionEncontrada.regionId.match(/\d+/);
          regionId = match ? parseInt(match[0], 10) : null;
        }

        // Buscar el código numérico de la agencia
        const agenciaEncontrada = await this.agenciaRegionService.getAgencias().then(agencias => 
          agencias.find(a => a.agenciaId === formData.agenciaId)
        );
        
        if (agenciaEncontrada) {
          agenciaId = agenciaEncontrada.codigo;
        }

        console.log('📝 Editando solicitud:', {
          regionId,
          agenciaId,
          formDataRegion: formData.regionId,
          formDataAgencia: formData.agenciaId,
          regionEncontrada,
          agenciaEncontrada
        });

        const solicitudData: Partial<Solicitud> = {
          tipoSolicitudId: formData.tipoSolicitudId,
          estadoSolicitudId: formData.estadoSolicitudId,
          tipoAfiliacionId: formData.tipoAfiliacionId,
          regionId,
          agenciaId,
          observaciones: formData.observaciones || null,
        };

        // Si hay archivo, convertirlo a base64
        if (formData.archivo) {
          const base64 = await this.convertirArchivoABase64(formData.archivo);
          solicitudData.documentoCargado = base64;
        }

        const resp = await this.solicitudesService.updateSolicitud(solicitud.solicitudId, solicitudData);
        
        if (resp?.success) {
          this.cerrarModalSolicitud();
          await this.cargarEmpresas();
        }
      } else {
        // Modo creación
        
        // Si se crea desde una cuenta bancaria, solo enviar representanteId y cuentaBancariaId
        if (cuentaBancariaIdDesdeCuenta) {
          console.log('✨ Creando solicitud desde cuenta bancaria:', {
            representanteId,
            cuentaBancariaId: cuentaBancariaIdDesdeCuenta
          });

          // Convertir regionId y agenciaId string a códigos numéricos
          let regionId: number | null = null;
          let agenciaId: number | null = null;

          const regionEncontrada = await this.agenciaRegionService.getRegiones().then(regiones => 
            regiones.find(r => r.regionId === formData.regionId)
          );
          
          if (regionEncontrada) {
            const match = regionEncontrada.regionId.match(/\d+/);
            regionId = match ? parseInt(match[0], 10) : null;
          }

          const agenciaEncontrada = await this.agenciaRegionService.getAgencias().then(agencias => 
            agencias.find(a => a.agenciaId === formData.agenciaId)
          );
          
          if (agenciaEncontrada) {
            agenciaId = agenciaEncontrada.codigo;
          }

          const solicitudData: Partial<Solicitud> = {
            representanteId,
            cuentaBancariaId: cuentaBancariaIdDesdeCuenta,
            tipoSolicitudId: formData.tipoSolicitudId,
            estadoSolicitudId: formData.estadoSolicitudId,
            tipoAfiliacionId: formData.tipoAfiliacionId,
            regionId,
            agenciaId,
            fechaSolicitud: new Date().toISOString(),
            observaciones: formData.observaciones || null,
          };

          // Si hay archivo, convertirlo a base64
          if (formData.archivo) {
            const base64 = await this.convertirArchivoABase64(formData.archivo);
            solicitudData.documentoCargado = base64;
          }

          const resp = await this.solicitudesService.createSolicitud(solicitudData);
          
          if (resp?.success) {
            this.cerrarModalSolicitud();
            await this.cargarEmpresas();
          }
        } else {
          // Creación normal desde empresa
          const cuentaBancaria = this.getCuentaBancariaEmpresa(empresaId);

          // Convertir regionId y agenciaId string a códigos numéricos
          let regionId: number | null = null;
          let agenciaId: number | null = null;

          // Buscar el código de la región
          const regionEncontrada = await this.agenciaRegionService.getRegiones().then(regiones => 
            regiones.find(r => r.regionId === formData.regionId)
          );
          
          // Para región, extraer el número del formato 'r-001' -> 1
          if (regionEncontrada) {
            const match = regionEncontrada.regionId.match(/\d+/);
            regionId = match ? parseInt(match[0], 10) : null;
          }

          // Buscar el código numérico de la agencia
          const agenciaEncontrada = await this.agenciaRegionService.getAgencias().then(agencias => 
            agencias.find(a => a.agenciaId === formData.agenciaId)
          );
          
          if (agenciaEncontrada) {
            agenciaId = agenciaEncontrada.codigo;
          }

          console.log('✨ Creando nueva solicitud desde empresa:', {
            regionId,
            agenciaId,
            formDataRegion: formData.regionId,
            formDataAgencia: formData.agenciaId,
            regionEncontrada,
            agenciaEncontrada
          });

          const solicitudData: Partial<Solicitud> = {
            representanteId,
            empresaId,
            cuentaBancariaId: cuentaBancaria?.cuentaBancariaId || null,
            tipoSolicitudId: formData.tipoSolicitudId,
            estadoSolicitudId: formData.estadoSolicitudId,
            tipoAfiliacionId: formData.tipoAfiliacionId,
            regionId,
            agenciaId,
            fechaSolicitud: new Date().toISOString(),
            observaciones: formData.observaciones || null,
          };

          // Si hay archivo, convertirlo a base64
          if (formData.archivo) {
            const base64 = await this.convertirArchivoABase64(formData.archivo);
            solicitudData.documentoCargado = base64;
          }

          const resp = await this.solicitudesService.createSolicitud(solicitudData);
          
          if (resp?.success) {
            this.cerrarModalSolicitud();
            await this.cargarEmpresas();
          }
        }
      }
    } catch (error) {
      console.error('Error al guardar solicitud:', error);
    }
  }

  private convertirArchivoABase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remover el prefijo "data:application/pdf;base64," si existe
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }
}
