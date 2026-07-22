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
import { ContratoService } from '../../../../services/aliado/contrato.service';
import { ToastrService } from 'ngx-toastr';

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
  private contratoService = inject(ContratoService);
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

  // Empresas con la carta generándose actualmente (descarga del PDF en curso)
  generandoCartaPorEmpresa = signal<Set<string>>(new Set());

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
          // Solo asignar si no hay ya una solicitud de afiliación asignada a la empresa.
          // La afiliación es única por empresa y tiene prioridad; las de cambio de cuenta
          // (empresaId == null) pueden ser varias y no deben sobrescribir la de afiliación.
          if (solicitudCuenta && !map.get(empresa.empresaId)) {
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

    // Las cuentas rechazadas no cuentan para el límite: se puede registrar una nueva en su lugar
    const cuentasVigentes = cuentas.filter(
      c => this.obtenerEstadoSolicitudPorCuenta(c.cuentaBancariaId || '')?.toUpperCase() !== 'RECHAZADO'
    );
    console.log("🚀 ~ EmpresasRepresentantePage ~ abrirModalNuevaCuenta ~ cuentasVigentes:", cuentasVigentes)

    if (!solicitudAprobada && cuentasVigentes.length >= 1) {
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
      // Solo asociar la cuenta con la solicitud de afiliación mientras esta
      // siga en proceso (no aprobada ni rechazada), es decir, en el flujo de la
      // primera cuenta. Una vez aprobada, las cuentas nuevas generan su propia
      // solicitud de cambio de cuenta y NO deben sobrescribir la de afiliación.
      const estadoSolicitud = solicitud?.estadoSolicitud?.nombre?.toUpperCase();
      const solicitudEnProceso =
        !!estadoSolicitud && estadoSolicitud !== 'APROBADO' && estadoSolicitud !== 'RECHAZADO';
      if (solicitud?.solicitudId && cuenta.cuentaBancariaId && solicitudEnProceso) {
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

  // Indica si la solicitud asociada a una cuenta bancaria puede editarse
  // (solo cuando está en estado ESPERA o CORREGIR).
  puedeEditarSolicitudDesdeCuenta(cuentaBancariaId: string): boolean {
    const estado = this.obtenerEstadoSolicitudPorCuenta(cuentaBancariaId);
    if (!estado) return false;
    const estadoUpper = estado.toUpperCase();
    return estadoUpper === 'ESPERA' || estadoUpper === 'CORREGIR';
  }

  async editarSolicitudDesdeCuenta(cuentaBancariaId: string) {
    if (!this.esPropietarioRepresentante()) {
      this.toastr.warning('Solo el usuario que creó este representante puede realizar esta acción.', 'Sin permiso');
      return;
    }
    const solicitud = this.listadoSolicitudes().find(s => s.cuentaBancariaId === cuentaBancariaId);
    if (!solicitud) {
      this.toastr.warning('No se encontró la solicitud a editar.', 'Sin solicitud');
      return;
    }

    this.cuentaBancariaIdSolicitud.set(cuentaBancariaId);
    this.empresaIdSolicitud.set(''); // No necesitamos empresaId
    this.esEditarSolicitud.set(true);
    this.esEmpresa.set(false);
    this.solicitudFormData.set(this.mapSolicitudToFormData(solicitud));
    this.modalKeySolicitud.set(this.modalKeySolicitud() + 1);
    this.showModalSolicitud.set(true);
  }

  async editarSolicitud(empresaId: string) {
    if (!this.esPropietarioRepresentante()) {
      this.toastr.warning('Solo el usuario que creó este representante puede realizar esta acción.', 'Sin permiso');
      return;
    }
    this.empresaIdSolicitud.set(empresaId);
    this.cuentaBancariaIdSolicitud.set(''); // Limpiar: edición desde empresa
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
    return this.mapSolicitudToFormData(solicitud);
  }

  private mapSolicitudToFormData(solicitud: Solicitud | null | undefined): SolicitudFormData | undefined {
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
      agenciaNombre: solicitud.agenciaNombre || '',
      correoSupervisor: solicitud.correoSupervisor || undefined,
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
        // Si la edición proviene de una cuenta bancaria (solicitud de cambio de
        // cuenta), resolver la solicitud por cuentaBancariaId; si no, por empresa.
        const solicitud = cuentaBancariaIdDesdeCuenta
          ? this.listadoSolicitudes().find(s => s.cuentaBancariaId === cuentaBancariaIdDesdeCuenta)
          : this.getSolicitudPorEmpresa(empresaId);
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
          agenciaNombre: formData.agenciaNombre || null,
          correoSupervisor: formData.correoSupervisor || null,
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
            agenciaNombre: formData.agenciaNombre || null,
            correoSupervisor: formData.correoSupervisor || null,
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
            agenciaNombre: formData.agenciaNombre || null,
            correoSupervisor: formData.correoSupervisor || null,
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

  estaGenerandoCarta(empresaId: string): boolean {
    return this.generandoCartaPorEmpresa().has(empresaId);
  }

  async generarCartaEmpresa(empresaId: string, cuentaBancariaIdOverride?: string): Promise<void> {
    if (this.estaGenerandoCarta(empresaId)) return;

    const representanteId = this.representanteId() || undefined;
    const cuentaBancariaId =
      cuentaBancariaIdOverride || this.getCuentaBancariaEmpresa(empresaId)?.cuentaBancariaId || undefined;

    const generando = new Set(this.generandoCartaPorEmpresa());
    generando.add(empresaId);
    this.generandoCartaPorEmpresa.set(generando);

    let url: string | null = null;
    try {
      const pdf = await this.contratoService.descargarContrato({
        representanteId,
        empresaId,
        cuentaBancariaId,
      });
      url = URL.createObjectURL(pdf);
      const a = document.createElement('a');
      a.href = url;
      a.download = `carta-entendimiento-${empresaId}.pdf`;
      a.click();

      const updated = new Set(this.cartaGeneradaPorEmpresa());
      updated.add(empresaId);
      this.cartaGeneradaPorEmpresa.set(updated);
    } catch (error: any) {
      this.toastr.error(error?.message || 'Error al generar el contrato', 'Error');
    } finally {
      if (url) {
        const objectUrl = url;
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      }
      const generando = new Set(this.generandoCartaPorEmpresa());
      generando.delete(empresaId);
      this.generandoCartaPorEmpresa.set(generando);
    }
  }

  /**
   * Genera el documento para una cuenta bancaria.
   * Si la solicitud asociada es de tipo CAMBIO_CUENTA, genera la carta de cambio
   * de cuenta (endpoint distinto); en cualquier otro caso genera la carta de
   * entendimiento de afiliación (comportamiento actual).
   */
  async generarDocumentoCuenta(empresaId: string, cuenta: ICuentaBancaria): Promise<void> {
    const cuentaBancariaId = cuenta.cuentaBancariaId || '';
    const solicitud = this.listadoSolicitudes().find(s => s.cuentaBancariaId === cuentaBancariaId);

    // Resolver el código del tipo de solicitud
    const tipoSolicitud = solicitud?.tipoSolicitudId
      ? this.tiposSolicitud().find(t => t.tipoSolicitudId === solicitud.tipoSolicitudId)
      : null;
    const codigo = (tipoSolicitud?.codigo || solicitud?.tipoSolicitud?.codigo || '').toUpperCase();

    // Solo la cuenta ligada a la solicitud de AFILIACIÓN genera la carta de
    // entendimiento. Cualquier otra cuenta genera la carta de cambio de cuenta,
    // que ya no requiere una solicitud previa (basta el cuentaBancariaId).
    if (codigo === 'AFILIACION') {
      await this.generarCartaEmpresa(empresaId, cuentaBancariaId);
    } else {
      await this.generarCartaCambioCuenta(empresaId, cuentaBancariaId, solicitud?.solicitudId);
    }
  }

  private async generarCartaCambioCuenta(empresaId: string, cuentaBancariaId: string, solicitudId?: string): Promise<void> {
    if (this.estaGenerandoCarta(empresaId)) return;

    const generando = new Set(this.generandoCartaPorEmpresa());
    generando.add(empresaId);
    this.generandoCartaPorEmpresa.set(generando);

    let url: string | null = null;
    try {
      const pdf = await this.contratoService.descargarContratoCambioCuenta({
        cuentaBancariaId,
        solicitudId,
        representanteId: this.representanteId(),
        empresaId,
      });
      url = URL.createObjectURL(pdf);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cambio-cuenta-bancaria-${cuentaBancariaId}.pdf`;
      a.click();
    } catch (error: any) {
      this.toastr.error(error?.message || 'Error al generar la carta de cambio de cuenta', 'Error');
    } finally {
      if (url) {
        const objectUrl = url;
        setTimeout(() => URL.revokeObjectURL(objectUrl), 10_000);
      }
      const generando = new Set(this.generandoCartaPorEmpresa());
      generando.delete(empresaId);
      this.generandoCartaPorEmpresa.set(generando);
    }
  }
}
