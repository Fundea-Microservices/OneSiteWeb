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
import { AuthService } from '../../../../services/auth.service';
import { ToastrService } from 'ngx-toastr';

interface CartaDatos {
  municipio: string;
  departamento: string;
  fechaDia: string;
  fechaMes: string;
  fechaAnio: string;
  fundeaNombreRep: string;
  fundeaDpi: string;
  fundeaCalidad: string;
  empresaNombre: string;
  afiliadoNombreRep: string;
  afiliadoDpi: string;
  afiliadoCalidad: string;
  nombreAgencia: string;
}

interface CartaDatos {
  municipio: string;
  departamento: string;
  fechaDia: string;
  fechaMes: string;
  fechaAnio: string;
  fundeaNombreRep: string;
  fundeaDpi: string;
  fundeaCalidad: string;
  empresaNombre: string;
  afiliadoNombreRep: string;
  afiliadoDpi: string;
  afiliadoCalidad: string;
  nombreAgencia: string;
}

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
  private authService = inject(AuthService);
  private toastr = inject(ToastrService);
  representanteId = signal('');
  representante = signal<Representante | null>(null);
  
  // Solicitudes por empresa
  solicitudesPorEmpresa = signal<Map<string, Solicitud | null>>(new Map());
  solicitudEmpresaId = signal('');
  solicitudCuentaId = signal('');
  afiliacionReferidoId = signal('');
  esEmpresa = signal(true);
  tiposSolicitud = signal<any[]>([]);
  tiposAfiliacion = signal<any[]>([]);
  listadoSolicitudes = signal<Solicitud[]>([]);
  

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

  // Carta de entendimiento generada (por empresaId) — sesión en memoria
  cartaGeneradaPorEmpresa = signal<Set<string>>(new Set());

  // Catálogo de estados de solicitud
  estadosSolicitud = signal<EstadoSolicitud[]>([]);

  // Estado de carga global de la página
  cargandoPagina = signal(true);

  async ngOnInit() {
    this.cargandoPagina.set(true);
    try {
    // Cargar catálogos
    this.cargarCatalogos();
    await this.cargarEstadosSolicitud();

    // Cargar tipos de solicitud y afiliación
    const [tiposSolicitudResp, tiposAfiliacionResp] = await Promise.all([
      this.generalidadesService.getAllTipoSolicitud({ all: true }),
      this.generalidadesService.getAllTipoAfiliacion({ all: true })
    ]);
    this.tiposSolicitud.set((tiposSolicitudResp?.data as any[]) ?? []);
    this.tiposAfiliacion.set((tiposAfiliacionResp?.data as any[]) ?? []);

    // Asignar signals según nombre
    const tipoEmpresa = this.tiposSolicitud().find(t => t.nombre?.toLowerCase().includes('empresa'));
    if (tipoEmpresa) this.solicitudEmpresaId.set(tipoEmpresa.tipoSolicitudId);
   

    const tipoCuenta = this.tiposSolicitud().find(t => t.nombre?.toLowerCase().includes('cuenta bancaria'));
    if (tipoCuenta) this.solicitudCuentaId.set(tipoCuenta.tipoSolicitudId);

    const afiliacionReferido = this.tiposAfiliacion().find(a => a.nombre?.toLowerCase().includes('red de referidos'));
    if (afiliacionReferido) this.afiliacionReferidoId.set(afiliacionReferido.tipoAfiliacionId);

    // Obtener el representanteId de la URL
    const id = this.route.snapshot.paramMap.get('representanteId') || '';
    this.representanteId.set(id);
    if (id) {
      const resp = await this.representanteService.byId(id);
      this.representante.set(resp?.data?.representante || null);
      // Cargar empresas del representante
      await this.cargarEmpresas();
    }
    } finally {
      this.cargandoPagina.set(false);
    }
  }

  async cargarEmpresas() {
    const id = this.representanteId();
    if (!id) return;

    const resp = await this.empresaService.obtenerEmpresasPorRepresentante(id, 1, 100);
    
    // La respuesta tiene doble anidamiento: resp.data.data
    if (resp?.data && Array.isArray((resp.data as any))) {
      const empresas = (resp.data as any).map((e: any) => ({ ...e, open: false }));
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
        this.listadoSolicitudes.set(solicitudes);
        
        // Para cada empresa, buscar su solicitud
        empresas.forEach(empresa => {
          const solicitud = solicitudes.find(s => s.empresaId === empresa.empresaId) || null;
          map.set(empresa.empresaId, solicitud);
        });

        // Para las solicitudes que empresaId == null, buscamos si la cuentaBancariaId pertenece a la empresa
        const solicitudesSinEmpresa = solicitudes.filter(s => !s.empresaId && s.cuentaBancariaId);
        empresas.forEach(empresa => {
          const cuentasEmpresa = this.obtenerCuentasEmpresa(empresa.empresaId).map(c => c.cuentaBancariaId);
          const solicitudCuenta = solicitudesSinEmpresa.find(s => cuentasEmpresa.includes(s.cuentaBancariaId!));
          console.log("🚀 ~ EmpresasRepresentantePage ~ cargarSolicitudesParaEmpresas ~ solicitudCuenta:", solicitudCuenta)
          // Solo asignar si no hay ya una solicitud asignada a la empresa
          if (solicitudCuenta ) {
            map.set(empresa.empresaId, solicitudCuenta);
          }
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
    console.log("🚀 ~ EmpresasRepresentantePage ~ cargarSolicitudesParaEmpresas ~ this.solicitudesPorEmpresa:", this.solicitudesPorEmpresa())
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
    console.log("🚀 ~ EmpresasRepresentantePage ~ onGuardarEmpresa ~ empresa:", empresa)
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
      
      if (resp?.success && resp?.data) {
        const cuentasMap = new Map(this.cuentasPorEmpresa());
        cuentasMap.set(empresaId, resp?.data);
        this.cuentasPorEmpresa.set(cuentasMap);
        // Cargar solicitudes para cada empresa
        await this.cargarSolicitudesParaEmpresas(this.empresas());
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
    // const solicitudes = Array.from(this.solicitudesPorEmpresa().values()).filter(s => s !== null) as Solicitud[];
    const solicitud = this.listadoSolicitudes().find(s => s.cuentaBancariaId === cuentaBancariaId);
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

  esPropietarioRepresentante(): boolean {
    return this.representante()?.usuarioId === this.authService.getUserStorage().userId;
  }

  crearNuevaSolicitud(empresaId: string, esEmpresa: boolean = true) {
    if (!this.esPropietarioRepresentante()) {
      this.toastr.warning('Solo el usuario que creó este representante puede realizar esta acción.', 'Sin permiso');
      return;
    }
    this.empresaIdSolicitud.set(empresaId);
    this.cuentaBancariaIdSolicitud.set(''); // Limpiar
    this.esEditarSolicitud.set(false);
    this.solicitudFormData.set(undefined);
    this.modalKeySolicitud.set(this.modalKeySolicitud() + 1);
    this.esEmpresa.set(esEmpresa);
    this.showModalSolicitud.set(true);
  }

  crearSolicitudDesdeCuenta(cuentaBancariaId: string) {
    if (!this.esPropietarioRepresentante()) {
      this.toastr.warning('Solo el usuario que creó este representante puede realizar esta acción.', 'Sin permiso');
      return;
    }
    this.cuentaBancariaIdSolicitud.set(cuentaBancariaId);
    this.empresaIdSolicitud.set(''); // No necesitamos empresaId
    this.esEditarSolicitud.set(false);
    this.esEmpresa.set(false);
    this.solicitudFormData.set(undefined);
    this.modalKeySolicitud.set(this.modalKeySolicitud() + 1);
    this.showModalSolicitud.set(true);
  }

  async editarSolicitud(empresaId: string) {
    if (!this.esPropietarioRepresentante()) {
      this.toastr.warning('Solo el usuario que creó este representante puede realizar esta acción.', 'Sin permiso');
      return;
    }
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

    // Convertir códigos numéricos del backend a strings (valorCore)
    const regionId = solicitud.regionId ? String(solicitud.regionId) : '';
    const agenciaId = solicitud.agenciaId ? String(solicitud.agenciaId) : '';

    return {
      tipoSolicitudId: solicitud.tipoSolicitudId || '',
      estadoSolicitudId: solicitud.estadoSolicitudId || '',
      tipoAfiliacionId: solicitud.tipoAfiliacionId || '',
      regionId,
      agenciaId,
      observaciones: solicitud.observaciones || undefined,
      documentoCargado: solicitud.documentoCargado || undefined,
    };
  }

  async confirmarCorrecciones(empresaId: string) {
    if (!this.esPropietarioRepresentante()) {
      this.toastr.warning('Solo el usuario que creó este representante puede realizar esta acción.', 'Sin permiso');
      return;
    }
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

        // valorCore ya es el código numérico directamente
        const regionId: number | null = formData.regionId ? parseInt(formData.regionId, 10) : null;
        const agenciaId: number | null = formData.agenciaId ? parseInt(formData.agenciaId, 10) : null;

        console.log('📝 Editando solicitud:', {
          regionId,
          agenciaId,
          formDataRegion: formData.regionId,
          formDataAgencia: formData.agenciaId,
        });

        const solicitudData: Partial<Solicitud> = {
          tipoSolicitudId: formData.tipoSolicitudId,
          estadoSolicitudId: formData.estadoSolicitudId,
          tipoAfiliacionId: formData.tipoAfiliacionId,
          regionId,
          agenciaId,
          observaciones: formData.observaciones || null,
        };

          // Si hay documento cargado, asignarlo directamente
          if (formData.documentoCargado) {
            solicitudData.documentoCargado = formData.documentoCargado;
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

          // valorCore ya es el código numérico directamente
          const regionId: number | null = formData.regionId ? parseInt(formData.regionId, 10) : null;
          const agenciaId: number | null = formData.agenciaId ? parseInt(formData.agenciaId, 10) : null;

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

          // Si hay documento cargado, asignarlo directamente
          if (formData.documentoCargado) {
            solicitudData.documentoCargado = formData.documentoCargado;
          }

          const resp = await this.solicitudesService.createSolicitud(solicitudData);
          
          if (resp?.success) {
            this.cerrarModalSolicitud();
            await this.cargarEmpresas();
          }
        } else {
          // Creación normal desde empresa
          const cuentaBancaria = this.getCuentaBancariaEmpresa(empresaId);

          // valorCore ya es el código numérico directamente
          const regionId: number | null = formData.regionId ? parseInt(formData.regionId, 10) : null;
          const agenciaId: number | null = formData.agenciaId ? parseInt(formData.agenciaId, 10) : null;

          console.log('✨ Creando nueva solicitud desde empresa:', {
            regionId,
            agenciaId,
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

          // Si hay documento cargado, asignarlo directamente
          if (formData.documentoCargado) {
            solicitudData.documentoCargado = formData.documentoCargado;
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
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  }

  // ── Carta de Entendimiento ─────────────────────────────────────────────────

  cartaGeneradaParaEmpresa(empresaId: string): boolean {
    return this.cartaGeneradaPorEmpresa().has(empresaId);
  }

  generarCartaEmpresa(empresaId: string): void {
    const rep = this.representante();
    const empresa = this.empresas().find(e => e.empresaId === empresaId);
    if (!rep || !empresa) return;

    const nombres = [rep.primerNombre, rep.segundoNombre, rep.tercerNombre].filter(Boolean).join(' ');
    const apellidos = [rep.primerApellido, rep.segundoApellido].filter(Boolean).join(' ');
    const nombreCompleto = `${nombres} ${apellidos}`.trim();

    const datos: CartaDatos = {
      municipio: '',
      departamento: '',
      fechaDia: new Date().getDate().toString(),
      fechaMes: new Date().toLocaleDateString('es-ES', { month: 'long' }),
      fechaAnio: new Date().getFullYear().toString(),
      fundeaNombreRep: nombreCompleto,
      fundeaDpi: rep.documento || '',
      fundeaCalidad: 'Representante Legal',
      empresaNombre: empresa.nombreEmpresa || '',
      afiliadoNombreRep: nombreCompleto,
      afiliadoDpi: rep.documento || '',
      afiliadoCalidad: 'Propietario',
      nombreAgencia: 'Central',
    };

    this.imprimirCarta(datos, empresaId);
  }

  private imprimirCarta(datos: CartaDatos, empresaId: string): void {
    const htmlContent = this.crearHTMLDocumento(datos);
    const iframe = document.createElement('iframe');
    iframe.style.display = 'none';
    document.body.appendChild(iframe);
    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (iframeDoc) {
      iframeDoc.write(htmlContent);
      iframeDoc.close();
      setTimeout(() => {
        iframe.contentWindow?.print();
        const updated = new Set(this.cartaGeneradaPorEmpresa());
        updated.add(empresaId);
        this.cartaGeneradaPorEmpresa.set(updated);
      }, 500);
    }
  }

  private crearHTMLDocumento(d: CartaDatos): string {
    const val = (texto: string) => texto ? `<b>${texto}</b>` : '_________________________';
    return `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Carta de Entendimiento FUNDEA</title>
<style>
@page{size:letter;margin:1.5cm 2cm}
body{font-family:Arial,Helvetica,sans-serif;font-size:10pt;line-height:1.4;color:#000;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.header{background-color:#005eb8;color:white;padding:15px 40px;margin:-1.5cm -2cm 30px -2cm;display:flex;justify-content:space-between;align-items:center}
.logo-text{font-family:Arial,sans-serif;font-weight:900;font-size:28pt;letter-spacing:-1px}
.doc-title{text-align:center;font-weight:bold;font-size:12pt;margin-bottom:20px;text-transform:uppercase}
p{margin-bottom:12px;text-align:justify}
.clausula-title{font-weight:bold;text-transform:uppercase;margin-top:15px;margin-bottom:5px;display:block}
ul,ol{margin-top:5px;margin-bottom:10px;padding-left:30px}
li{margin-bottom:5px;text-align:justify}
.tabla-comisiones{margin-left:20px;margin-bottom:10px;font-weight:bold}
.firmas-container{margin-top:50px;display:flex;justify-content:space-between;page-break-inside:avoid}
.firma-box{width:45%;text-align:left}
.linea-firma{border-top:1px solid black;margin-top:40px;margin-bottom:5px;width:100%;display:block}
.info-firma{font-size:9pt;line-height:1.3}
.footer{position:fixed;bottom:0;left:0;right:0;text-align:center;font-size:8pt;color:#666;border-top:1px solid #ccc;padding-top:5px;background:white}
</style></head><body>
<div class="header"><div><div class="logo-text">FUNDEA</div></div></div>
<div class="doc-title">CARTA DE ENTENDIMIENTO<br>RED DE REFERIDOS FUNDEA</div>
<p>En el municipio de ${val(d.municipio)}, departamento de ${val(d.departamento)}, el día ${val(d.fechaDia)} de ${val(d.fechaMes)} de ${val(d.fechaAnio)}, comparecen:</p>
<p><strong>I. FUNDACIÓN PARA EL DESARROLLO EMPRESARIAL Y AGRÍCOLA -FUNDEA-</strong>, entidad no lucrativa debidamente constituida conforme las leyes de la República de Guatemala, representada en este acto por ${val(d.fundeaNombreRep)}, quien se identifica con DPI No. ${val(d.fundeaDpi)}, en su calidad de ${val(d.fundeaCalidad)} (acreditar representación legal).</p>
<p><strong>II. ${val(d.empresaNombre)}</strong>, en adelante "LA EMPRESA AFILIADA", representada por ${val(d.afiliadoNombreRep)}, quien se identifica con DPI No. ${val(d.afiliadoDpi)}, en su calidad de ${val(d.afiliadoCalidad)} (acreditar representación legal).</p>
<div class="clausula-title">CLÁUSULA PRIMERA - OBJETO</div>
<p>El presente documento tiene por finalidad establecer los términos de cooperación mediante los cuales LA EMPRESA AFILIADA referirá a FUNDEA clientes potenciales interesados en la obtención de crédito, conforme políticas internas y normativa aplicable.</p>
<div class="clausula-title">CLÁUSULA SEGUNDA - RESPONSABILIDADES DE LA EMPRESA AFILIADA</div>
<ol><li>Enviar información de clientes potenciales mediante la aplicación autorizada.</li><li>Completar toda la información requerida, bajo principio de veracidad.</li><li>Obtener consentimiento informado del cliente para compartir datos.</li><li>Capacitar a sus colaboradores según lineamientos de FUNDEA.</li><li>Abstenerse de prometer aprobaciones o condiciones crediticias.</li><li>Cumplir legislación de protección de datos.</li></ol>
<div class="clausula-title">CLÁUSULA TERCERA - RESPONSABILIDADES DE FUNDEA</div>
<ol><li>Recibir y evaluar solicitudes.</li><li>Procesar información conforme normativa vigente.</li><li>Pagar comisiones en los plazos establecidos.</li><li>Proporcionar capacitación necesaria.</li></ol>
<p><strong>De la observación especial:</strong> Con los clientes referidos, FUNDEA realizará el estudio crediticio para determinar la aprobación o no de la solicitud de crédito. FUNDEA en ningún caso garantizará la aprobación del crédito.</p>
<div class="clausula-title">CLÁUSULA CUARTA - TABLA DE COMISIONES</div>
<p>Cuando LA EMPRESA AFILIADA proporcione las cantidades de clientes que se detallan a continuación, FUNDEA realizará el pago de las siguientes comisiones de conformidad con el número de desembolsos que se realicen:</p>
<div class="tabla-comisiones"><div>• 1-4 desembolsos/mes: Q100 c/u</div><div>• 5-9 desembolsos/mes: Q150 c/u</div><div>• 10 desembolsos/mes o más: Q200 c/u</div></div>
<p><strong>Condiciones para devengar comisión:</strong></p>
<p style="margin-left:20px">a) Cliente nuevo.<br>b) Formulario completo.<br>c) Crédito aprobado y desembolsado posterior a la fecha de referencia.</p>
<div class="clausula-title">CLÁUSULA QUINTA - CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS</div>
<p>Ambas partes deberán mantener estricta confidencialidad y cumplir la normativa aplicable, notificando cualquier filtración inmediatamente.</p>
<div class="clausula-title">CLÁUSULA SEXTA - SUPERVISIÓN Y COMUNICACIÓN</div>
<p>Coordinación a cargo del Jefe(a) de Agencia ${val(d.nombreAgencia)} de FUNDEA y el representante designado de LA EMPRESA AFILIADA.</p>
<div class="clausula-title">CLÁUSULA SÉPTIMA - LIMITACIÓN DE RESPONSABILIDAD</div>
<p>FUNDEA es la única entidad responsable del análisis y aprobación del crédito. No se generan relaciones laborales ni obligaciones adicionales.</p>
<div class="clausula-title">CLÁUSULA OCTAVA - TERMINACIÓN</div>
<p>FUNDEA podrá revocar la afiliación en cualquier momento mediante notificación escrita. Cualquier modificación deberá hacerse mediante intercambio de cartas.</p>
<div class="clausula-title">CLÁUSULA NOVENA - VIGENCIA</div>
<p>Esta carta de entendimiento entra en vigencia a partir de su firma y por tiempo indefinido.</p>
<div style="text-align:center;font-weight:bold;margin-top:30px">FIRMAS</div>
<div class="firmas-container">
  <div class="firma-box"><div style="font-weight:bold;margin-bottom:40px">Por FUNDEA:</div><span class="linea-firma"></span><div class="info-firma">Nombre: ${val(d.fundeaNombreRep)}<br>Cargo: ${val(d.fundeaCalidad)}<br>DPI: ${val(d.fundeaDpi)}</div></div>
  <div class="firma-box"><div style="font-weight:bold;margin-bottom:40px">Por la Empresa Afiliada:</div><span class="linea-firma"></span><div class="info-firma">Nombre: ${val(d.afiliadoNombreRep)}<br>Cargo: ${val(d.afiliadoCalidad)}<br>DPI: ${val(d.afiliadoDpi)}</div></div>
</div>
<div class="footer">Oficinas Centrales: 15 avenida 2-09 zona 13, Ciudad de Guatemala. PBX: 2444-2222<br>www.fundea.org.gt</div>
</body></html>`;
  }
}
