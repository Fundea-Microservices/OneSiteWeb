
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


@Component({
  selector: 'app-empresas-representante-page',
  imports: [RouterLink, UpsertEmpresaRepresentanteComponent, UpsertCuentaRepresentanteComponent, CommonModule],
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
  representanteId = signal('');
  representante = signal<Representante | null>(null);

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

  async ngOnInit() {
    // Cargar catálogos
    this.cargarCatalogos();
    
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
      this.empresas.set((resp.data as any).data.map((e: any) => ({ ...e, open: false })));
    }
  }

  abrirModalNuevaEmpresa() {
    this.esNuevaEmpresa.set(true);
    this.empresaSeleccionada.set({
      empresaId: '',
      representanteId: this.representanteId(),
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

  obtenerNombreDepartamento(codigo: number): string {
    const depto = this.departamentos().find(d => d.valorCore === codigo.toString());
    return depto ? depto.nombre : `Código: ${codigo}`;
  }

  obtenerNombreMunicipio(codigo: number): string {
    const muni = this.municipios().find(m => m.valorCore === codigo.toString());
    return muni ? muni.nombre : `Código: ${codigo}`;
  }

  abrirModalNuevaCuenta(empresaId: string) {
    this.empresaIdCuenta.set(empresaId);
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
    console.log('Cuenta guardada:', cuenta);
    const empresaId = this.empresaIdCuenta();
    
    // Cerrar el modal primero
    this.cerrarModalCuenta();
    
    // Recargar las cuentas de la empresa
    if (empresaId) {
      await this.cargarCuentasEmpresa(empresaId);
    }
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

  async toggleEmpresa(empresa: IEmpresaRepresentante & { open?: boolean }) {
    empresa.open = !empresa.open;
    
    // Si se abre y no se han cargado las cuentas, cargarlas
    if (empresa.open && !this.cuentasPorEmpresa().has(empresa.empresaId)) {
      await this.cargarCuentasEmpresa(empresa.empresaId);
    }
  }

  async cambiarEstadoCuenta(cuenta: ICuentaBancaria, empresaId: string, nuevoEstado: boolean) {
    if (!cuenta.cuentaBancariaId) return;

    try {
      const dto = {
        activo: nuevoEstado
      };

      const resp = await this.cuentaBancariaService.actualizar(cuenta.cuentaBancariaId, dto);
      
      if (resp?.success) {
        // Recargar las cuentas para asegurar que se actualice la vista
        await this.cargarCuentasEmpresa(empresaId);
      }
    } catch (error) {
      console.error('❌ Error al cambiar estado de cuenta:', error);
      // Recargar las cuentas para asegurar consistencia
      await this.cargarCuentasEmpresa(empresaId);
    }
  }
}
