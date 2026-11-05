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
    activo: true,
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

    expect(service['getBancos']).toHaveBeenCalledWith({ page: 2, limit: 10, rubroContable: '', alias: '' });
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

  it('tras crear recarga la página actual y los rubros del filtro', async () => {
    page.pagination.set({ page: 3, pageSize: 10, totalItems: 30 });

    await page.crearBanco(datos as CrearBanco);

    expect(toastr.success).toHaveBeenCalled();
    expect(mockHide).toHaveBeenCalled();
    expect(service['getBancos']).toHaveBeenCalledWith(expect.objectContaining({ page: 3 }));
    expect(service['getBancos']).toHaveBeenCalledWith({ todos: true });
  });

  describe('switch de activo', () => {
    const switchEl = (checked: boolean) => ({ checked } as HTMLInputElement);

    it('desactivar pide confirmación y no llama al API todavía', () => {
      const sw = switchEl(false);

      page.onSwitchActivo(banco, sw);

      expect(sw.checked).toBe(true);
      expect(mockShow).toHaveBeenCalled();
      expect(page.bancoPorDesactivar()).toEqual(banco);
      expect(service['actualizarBanco']).not.toHaveBeenCalled();
    });

    it('al confirmar desactiva y actualiza la fila', async () => {
      page.bancos.set([banco]);
      page.onSwitchActivo(banco, switchEl(false));

      await page.confirmarDesactivar();

      expect(service['actualizarBanco']).toHaveBeenCalledWith(1, { activo: false });
      expect(page.bancos()[0].activo).toBe(false);
      expect(mockHide).toHaveBeenCalled();
      expect(page.cambiandoEstadoId()).toBeNull();
    });

    it('activar no pide confirmación', async () => {
      const inactivo = { ...banco, activo: false };
      page.bancos.set([inactivo]);
      const sw = switchEl(true);

      page.onSwitchActivo(inactivo, sw);
      await fixture.whenStable();

      expect(sw.checked).toBe(false); // se ajusta cuando responde el API, vía la fila
      expect(mockShow).not.toHaveBeenCalled();
      expect(service['actualizarBanco']).toHaveBeenCalledWith(1, { activo: true });
      expect(page.bancos()[0].activo).toBe(true);
    });

    it('si el API falla la fila conserva su estado', async () => {
      const inactivo = { ...banco, activo: false };
      page.bancos.set([inactivo]);
      service['actualizarBanco'].mockRejectedValue(errorApi(500, 'Error interno'));

      page.onSwitchActivo(inactivo, switchEl(true));
      await fixture.whenStable();

      expect(page.bancos()[0].activo).toBe(false);
      expect(toastr.error).toHaveBeenCalledWith('Error interno', 'Catálogo de bancos');
    });
  });

  describe('filtros', () => {
    const ultimaConsulta = () => service['getBancos'].mock.calls.filter(([f]) => !f.todos).at(-1)?.[0];

    afterEach(() => jest.useRealTimers());

    it('arma las opciones de rubro con los valores distintos del catálogo completo', async () => {
      service['getBancos'].mockResolvedValue({
        data: {
          bancos: [
            { ...banco, dynamicsRubroContable: '1102' },
            { ...banco, dynamicsRubroContable: '1101' },
            { ...banco, dynamicsRubroContable: '1102' },
          ],
          metadata: {},
        },
      });

      await page['cargarRubrosContables']();

      expect(service['getBancos']).toHaveBeenCalledWith({ todos: true });
      expect(page.rubrosContables()).toEqual(['1101', '1102']);
    });

    it('el rubro consulta de inmediato y vuelve a la página 1', async () => {
      page.pagination.set({ page: 4, pageSize: 10, totalItems: 50 });

      page.onRubroChange('1101');

      expect(ultimaConsulta()).toEqual({ page: 1, limit: 10, rubroContable: '1101', alias: '', cuenta: undefined });
    });

    it('el alias espera a que se deje de escribir y se envía sin espacios', () => {
      jest.useFakeTimers();

      page.onAliasInput('ru');
      page.onAliasInput(' rural ');
      expect(service['getBancos']).not.toHaveBeenCalled();

      jest.advanceTimersByTime(350);

      expect(service['getBancos']).toHaveBeenCalledTimes(1);
      expect(ultimaConsulta()).toEqual(expect.objectContaining({ alias: 'rural', page: 1 }));
    });

    it('Enter aplica sin esperar el debounce', () => {
      jest.useFakeTimers();

      page.onAliasInput('gyt');
      page.aplicarFiltros();
      jest.advanceTimersByTime(350);

      expect(service['getBancos']).toHaveBeenCalledTimes(1);
    });

    it('la cuenta se envía como número', () => {
      jest.useFakeTimers();

      page.onCuentaInput('10');
      jest.advanceTimersByTime(350);

      expect(ultimaConsulta()).toEqual(expect.objectContaining({ cuenta: 10 }));
    });

    it.each(['-1', '1.5', 'abc', '2147483648'])('una cuenta inválida (%p) no consulta', valor => {
      jest.useFakeTimers();

      page.onCuentaInput(valor);
      jest.advanceTimersByTime(350);

      expect(page.cuentaValida()).toBe(false);
      expect(service['getBancos']).not.toHaveBeenCalled();
    });

    it('no repite la consulta si los filtros no cambiaron', () => {
      page.onAliasInput('rural');
      page.aplicarFiltros();
      page.onAliasInput('rural ');
      page.aplicarFiltros();

      expect(service['getBancos']).toHaveBeenCalledTimes(1);
    });

    it('la paginación conserva los filtros aplicados', () => {
      page.onRubroChange('1101');
      page.onChangePage({ page: 2, pageSize: 10, totalItems: 30 });

      expect(ultimaConsulta()).toEqual(expect.objectContaining({ page: 2, rubroContable: '1101' }));
    });

    it('limpiar quita los tres filtros y vuelve a la página 1', () => {
      page.onRubroChange('1101');
      page.onAliasInput('rural');
      page.onCuentaInput('10');
      page.aplicarFiltros();
      page.pagination.update(p => ({ ...p, page: 3 }));

      page.limpiarFiltros();

      expect(ultimaConsulta()).toEqual({ page: 1, limit: 10, rubroContable: '', alias: '', cuenta: undefined });
      expect(page.hayFiltrosAplicados()).toBe(false);
      expect(page.hayFiltrosEscritos()).toBe(false);
    });

    it('limpiar cancela un alias pendiente del debounce', () => {
      jest.useFakeTimers();

      page.onAliasInput('rural');
      page.limpiarFiltros();
      jest.advanceTimersByTime(350);

      expect(service['getBancos']).not.toHaveBeenCalled();
    });
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
