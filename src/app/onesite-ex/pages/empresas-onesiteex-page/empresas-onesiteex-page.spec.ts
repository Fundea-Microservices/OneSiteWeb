import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { provideRouter } from '@angular/router';
import EmpresasOnesiteexPage from './empresas-onesiteex-page';
import { EmpresaExService } from '../../../../services/onesiteex-auth/empresa-ex.service';
import { IEmpresaEx } from '../../../../interfaces/onesiteex-auth/onesiteex-auth';

// El modal de Bootstrap se instancia en ngAfterViewInit; lo stubbeamos para jsdom.
jest.mock('bootstrap', () => ({
  Modal: jest.fn().mockImplementation(() => ({ show: jest.fn(), hide: jest.fn() })),
}));

/**
 * Pruebas de la página contenedora de Empresas (M1): carga inicial, filtros,
 * apertura de modales, upsert (crear/editar), baja lógica y toggle optimista.
 */
describe('EmpresasOnesiteexPage', () => {
  let fixture: ComponentFixture<EmpresasOnesiteexPage>;
  let component: EmpresasOnesiteexPage;
  let service: {
    getEmpresas: jest.Mock;
    createEmpresa: jest.Mock;
    updateEmpresa: jest.Mock;
    deleteEmpresa: jest.Mock;
  };

  const empresas: IEmpresaEx[] = [
    { idEmpresa: 1, nombreEmpresa: 'FUNDEA', codigoEnrolamiento: 'ENR-1', estado: true, fechaCreacion: '2026-01-01', codigo: 'GT1' },
    { idEmpresa: 2, nombreEmpresa: 'Otra', codigoEnrolamiento: 'ENR-2', estado: false, fechaCreacion: '2026-01-02', codigo: null },
  ];

  const listResp = (data: IEmpresaEx[]) => ({
    success: true,
    statusCode: 200,
    message: 'ok',
    data,
    metadata: { total: data.length, page: 1, limit: 10 },
  });

  beforeEach(async () => {
    service = {
      getEmpresas: jest.fn().mockResolvedValue(listResp(empresas)),
      createEmpresa: jest.fn().mockResolvedValue({ success: true, data: empresas[0] }),
      updateEmpresa: jest.fn().mockResolvedValue({ success: true, data: empresas[0] }),
      deleteEmpresa: jest.fn().mockResolvedValue({ success: true, data: { idEmpresa: 1 } }),
    };

    await TestBed.configureTestingModule({
      imports: [EmpresasOnesiteexPage],
      providers: [
        provideRouter([]),
        { provide: EmpresaExService, useValue: service },
      ],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(EmpresasOnesiteexPage);
    component = fixture.componentInstance;
    fixture.detectChanges();      // dispara ngOnInit (fetchData) + ngAfterViewInit
    await fixture.whenStable();
  });

  it('se crea y carga la lista en ngOnInit', () => {
    expect(component).toBeTruthy();
    expect(service.getEmpresas).toHaveBeenCalled();
    expect(component.empresaList()).toEqual(empresas);
    expect(component.pagination().totalItems).toBe(2);
  });

  describe('filtros', () => {
    it('buscar() reinicia a la página 1 y recarga', async () => {
      component.pagination.update(p => ({ ...p, page: 3 }));
      service.getEmpresas.mockClear();
      component.buscar();
      await fixture.whenStable();
      expect(component.pagination().page).toBe(1);
      expect(service.getEmpresas).toHaveBeenCalled();
    });

    it('onChangeEstado() fija el filtro y recarga', async () => {
      component.onChangeEstado('false');
      await fixture.whenStable();
      const args = service.getEmpresas.mock.calls.at(-1)?.[0];
      expect(args.estado).toBe(false);
    });

    it('limpiarFiltros() limpia buscador y estado', async () => {
      component.buscador.set('fun');
      component.filtroEstado.set('true');
      component.limpiarFiltros();
      await fixture.whenStable();
      expect(component.buscador()).toBe('');
      expect(component.filtroEstado()).toBe('');
      expect(component.hayFiltrosActivos()).toBe(false);
    });

    it('fetchData mapea estado "" a undefined (sin filtro)', async () => {
      service.getEmpresas.mockClear();
      component.filtroEstado.set('');
      await component.fetchData();
      const args = service.getEmpresas.mock.calls.at(-1)?.[0];
      expect(args.estado).toBeUndefined();
    });
  });

  describe('modales', () => {
    it('openModal(true) prepara alta', () => {
      component.openModal(true);
      expect(component.nuevo()).toBe(true);
      expect(component.empresaEdit()).toBeNull();
      expect(component.modal().titulo).toBe('Nueva empresa');
    });

    it('openModal(false, empresa) prepara edición con copia', () => {
      component.openModal(false, empresas[0]);
      expect(component.nuevo()).toBe(false);
      expect(component.empresaEdit()).toEqual(empresas[0]);
      expect(component.empresaEdit()).not.toBe(empresas[0]); // copia, no referencia
      expect(component.modal().titulo).toBe('Editar empresa');
    });
  });

  describe('upsert', () => {
    it('crea cuando nuevo()=true', async () => {
      component.openModal(true);
      await component.upsertEmpresa({ nombreEmpresa: 'N', codigoEnrolamiento: 'E' });
      expect(service.createEmpresa).toHaveBeenCalled();
      expect(service.updateEmpresa).not.toHaveBeenCalled();
    });

    it('actualiza cuando nuevo()=false', async () => {
      component.openModal(false, empresas[0]);
      await component.upsertEmpresa({ idEmpresa: 1, nombreEmpresa: 'Editada' });
      expect(service.updateEmpresa).toHaveBeenCalled();
      expect(service.createEmpresa).not.toHaveBeenCalled();
    });

    it('recarga la lista tras un upsert exitoso', async () => {
      service.getEmpresas.mockClear();
      component.openModal(true);
      await component.upsertEmpresa({ nombreEmpresa: 'N', codigoEnrolamiento: 'E' });
      expect(service.getEmpresas).toHaveBeenCalled();
    });
  });

  describe('baja lógica', () => {
    it('deleteEmpresa usa el id de empresaEdit', async () => {
      component.openDeleteModal(empresas[0]);
      await component.deleteEmpresa();
      expect(service.deleteEmpresa).toHaveBeenCalledWith(1);
    });

    it('no llama al servicio sin empresa seleccionada', async () => {
      component.empresaEdit.set(null);
      await component.deleteEmpresa();
      expect(service.deleteEmpresa).not.toHaveBeenCalled();
    });
  });

  describe('toggleEstado (optimista)', () => {
    it('actualiza la lista local en éxito', async () => {
      await component.toggleEstado(empresas[0], false);
      expect(service.updateEmpresa).toHaveBeenCalledWith({ idEmpresa: 1, estado: false });
      expect(component.empresaList().find(e => e.idEmpresa === 1)?.estado).toBe(false);
    });

    it('recarga desde el servidor si falla', async () => {
      service.updateEmpresa.mockResolvedValueOnce(null);
      service.getEmpresas.mockClear();
      await component.toggleEstado(empresas[0], false);
      expect(service.getEmpresas).toHaveBeenCalled();
    });
  });
});
