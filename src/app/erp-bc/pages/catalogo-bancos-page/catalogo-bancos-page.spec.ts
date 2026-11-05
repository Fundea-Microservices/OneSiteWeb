import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import CatalogoBancosPage from './catalogo-bancos-page';
import { Banco, CrearBanco } from '../../../../interfaces/erp-bc/catalogo-bancos';
import { AuthService } from '../../../../services/auth.service';
import { CatalogoBancosService } from '../../../../services/erp-bc/catalogo-bancos.service';

const mockHide = jest.fn();
const mockShow = jest.fn();

jest.mock('bootstrap', () => ({
  Modal: jest.fn().mockImplementation(() => ({ show: mockShow, hide: mockHide })),
}));

describe('CatalogoBancosPage', () => {
  let fixture: ComponentFixture<CatalogoBancosPage>;
  let page: CatalogoBancosPage;
  let service: { [metodo: string]: jest.Mock };
  let toastr: { success: jest.Mock; error: jest.Mock; warning: jest.Mock; info: jest.Mock };
  let auth: { token: string | null };

  const banco: Banco = {
    catalogoBancoId: 1,
    bantotalRubro: '1101',
    bantotalNombre: 'Banrural',
    bantotalAlias: 'BRR',
    bantotalCuenta: 10,
    bantotalSuboperacion: 0,
    dynamicsCodigo: 'BAN01',
    dynamicsRubroContable: '1101',
    fechaCreacion: null,
  };
  const { catalogoBancoId, fechaCreacion, ...datos } = banco;

  const lista = (total = 1, page = 1) => ({
    data: { bancos: [banco], metadata: { total, page, limit: 10, totalPages: 1, todos: false } },
  });
  const errorApi = (status: number, message: string | string[]) => ({ status, error: { message } });

  beforeEach(async () => {
    jest.clearAllMocks();
    service = {
      getBancos: jest.fn().mockResolvedValue(lista()),
      getBanco: jest.fn().mockResolvedValue({ data: banco }),
      crearBanco: jest.fn().mockResolvedValue({ message: 'creado', data: banco }),
      actualizarBanco: jest.fn().mockResolvedValue({ message: 'actualizado', data: banco }),
    };
    toastr = { success: jest.fn(), error: jest.fn(), warning: jest.fn(), info: jest.fn() };
    auth = { token: 'token' };

    TestBed.configureTestingModule({
      imports: [CatalogoBancosPage],
      providers: [
        provideRouter([]),
        { provide: CatalogoBancosService, useValue: service },
        { provide: ToastrService, useValue: toastr },
        { provide: AuthService, useValue: auth },
      ],
    });

    fixture = TestBed.createComponent(CatalogoBancosPage);
    page = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
    service['getBancos'].mockClear();
  });

  it('carga la lista con la paginación de la respuesta', async () => {
    service['getBancos'].mockResolvedValue(lista(25, 2));
    page.onChangePage({ page: 2, pageSize: 10, totalItems: 1 });
    await fixture.whenStable();

    expect(service['getBancos']).toHaveBeenCalledWith({ page: 2, limit: 10 });
    expect(page.bancos()).toEqual([banco]);
    expect(page.pagination()).toEqual({ page: 2, pageSize: 10, totalItems: 25 });
  });

  it('muestra el error de la lista y permite reintentar', async () => {
    service['getBancos'].mockRejectedValue(errorApi(500, 'Error de conexión'));
    await page.fetchData();

    expect(page.errorLista()).toBe('Error de conexión');
    expect(page.accesoDenegado()).toBe(false);
  });

  it('marca acceso denegado ante un 403 en la lista', async () => {
    service['getBancos'].mockRejectedValue(errorApi(403, 'Forbidden'));
    await page.fetchData();

    expect(page.accesoDenegado()).toBe(true);
    expect(page.errorLista()).toBe('');
  });

  it('no agrega avisos si el 401 ya cerró la sesión', async () => {
    auth.token = null;
    service['getBancos'].mockRejectedValue(errorApi(401, 'Unauthorized'));
    await page.fetchData();

    expect(page.errorLista()).toBe('');
  });

  it('muestra el 401 si la sesión sigue abierta', async () => {
    service['getBancos'].mockRejectedValue(errorApi(401, 'Servicio no disponible'));
    await page.fetchData();

    expect(page.errorLista()).toBe('Servicio no disponible');
  });

  it('ignora la respuesta de una consulta anterior', async () => {
    let resolverVieja!: (valor: unknown) => void;
    service['getBancos'].mockReturnValueOnce(new Promise(r => (resolverVieja = r)));
    service['getBancos'].mockResolvedValueOnce(lista(2));

    const vieja = page.fetchData();
    await page.fetchData();
    resolverVieja(lista(99));
    await vieja;

    expect(page.pagination().totalItems).toBe(2);
    expect(page.isLoading()).toBe(false);
  });

  it('tras crear va a la última página', async () => {
    page.pagination.set({ page: 1, pageSize: 10, totalItems: 10 });

    await page.crearBanco(datos as CrearBanco);

    expect(toastr.success).toHaveBeenCalled();
    expect(mockHide).toHaveBeenCalled();
    expect(service['getBancos']).toHaveBeenCalledWith({ page: 2, limit: 10 });
  });

  it('un duplicado avisa y deja el modal abierto', async () => {
    service['crearBanco'].mockRejectedValue(errorApi(409, '(BANCO_DUPLICADO) La combinación ya existe'));

    await page.crearBanco(datos as CrearBanco);

    expect(toastr.warning).toHaveBeenCalledWith('La combinación ya existe', 'Banco duplicado');
    expect(mockHide).not.toHaveBeenCalled();
    expect(page.isSaving()).toBe(false);
  });

  it('BANCO_SIN_BITACORA no se reintenta: cierra, recarga y avisa', async () => {
    page.bancoEdit.set(banco);
    service['actualizarBanco'].mockRejectedValue(errorApi(500, '(BANCO_SIN_BITACORA) Sin bitácora'));

    await page.actualizarBanco({ bantotalNombre: 'GTC' });

    expect(toastr.warning).toHaveBeenCalled();
    expect(toastr.error).not.toHaveBeenCalled();
    expect(mockHide).toHaveBeenCalled();
    expect(service['getBancos']).toHaveBeenCalled();
  });

  it('otro 500 muestra el mensaje y deja el modal abierto para reintentar', async () => {
    page.bancoEdit.set(banco);
    service['actualizarBanco'].mockRejectedValue(errorApi(500, 'Error interno'));

    await page.actualizarBanco({ bantotalNombre: 'GTC' });

    expect(toastr.error).toHaveBeenCalledWith('Error interno', 'Catálogo de bancos');
    expect(mockHide).not.toHaveBeenCalled();
    expect(service['getBancos']).not.toHaveBeenCalled();
  });

  it('un banco inexistente al guardar cierra el modal y recarga', async () => {
    page.bancoEdit.set(banco);
    service['actualizarBanco'].mockRejectedValue(errorApi(404, '(BANCO_NO_ENCONTRADO) El banco no existe'));

    await page.actualizarBanco({ bantotalNombre: 'GTC' });

    expect(toastr.warning).toHaveBeenCalledWith('El banco no existe', 'Catálogo de bancos');
    expect(mockHide).toHaveBeenCalled();
    expect(service['getBancos']).toHaveBeenCalled();
  });

  it('sin cambios no llama al API', async () => {
    page.bancoEdit.set(banco);

    await page.actualizarBanco({});

    expect(service['actualizarBanco']).not.toHaveBeenCalled();
    expect(toastr.info).toHaveBeenCalled();
    expect(mockHide).toHaveBeenCalled();
  });

  it('al editar abre el modal con el dato vigente', async () => {
    const vigente = { ...banco, bantotalNombre: 'GTC' };
    service['getBanco'].mockResolvedValue({ data: vigente });

    await page.abrirEditar(banco);

    expect(page.bancoEdit()).toEqual(vigente);
    expect(mockShow).toHaveBeenCalled();
    expect(page.abriendoId()).toBeNull();
  });

  it('al editar un banco que ya no existe avisa, no abre el modal y recarga', async () => {
    service['getBanco'].mockRejectedValue(errorApi(404, '(BANCO_NO_ENCONTRADO) El banco no existe'));

    await page.abrirEditar(banco);

    expect(mockShow).not.toHaveBeenCalled();
    expect(toastr.warning).toHaveBeenCalled();
    expect(service['getBancos']).toHaveBeenCalled();
  });
});
