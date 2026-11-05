import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogoBancosService, interpretarErrorBanco } from './catalogo-bancos.service';

describe('interpretarErrorBanco', () => {
  it('separa el código de negocio del mensaje', () => {
    const err = interpretarErrorBanco({
      status: 409,
      error: { message: '(BANCO_DUPLICADO) El banco 3 ya tiene el rubro 1101' },
    });

    expect(err).toEqual({ status: 409, codigo: 'BANCO_DUPLICADO', mensaje: 'El banco 3 ya tiene el rubro 1101' });
  });

  it('une los mensajes cuando llegan como arreglo', () => {
    const err = interpretarErrorBanco({ status: 400, error: { message: ['campo a inválido', 'campo b inválido'] } });

    expect(err).toEqual({ status: 400, codigo: null, mensaje: 'campo a inválido. campo b inválido' });
  });

  it('tolera errores sin cuerpo', () => {
    expect(interpretarErrorBanco({ status: 0, error: null })).toEqual({ status: 0, codigo: null, mensaje: '' });
  });
});

describe('CatalogoBancosService', () => {
  let service: CatalogoBancosService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [CatalogoBancosService, provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CatalogoBancosService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('lista enviando solo page y limit', async () => {
    const promesa = service.getBancos({ page: 2, limit: 20 });

    const req = httpMock.expectOne(r => r.url.endsWith('/financiero-bc/catalogos/bancos'));
    expect(req.request.method).toBe('GET');
    expect(req.request.params.keys().sort()).toEqual(['limit', 'page']);
    expect(req.request.params.get('page')).toBe('2');
    req.flush({ success: true, statusCode: 200, message: 'ok', data: { bancos: [], metadata: {} } });

    expect((await promesa).data.bancos).toEqual([]);
  });

  it('envía los filtros sin espacios y omite los vacíos', async () => {
    const promesa = service.getBancos({ page: 1, limit: 10, rubroContable: '', alias: '  rural ', cuenta: 0 });

    const req = httpMock.expectOne(r => r.url.endsWith('/financiero-bc/catalogos/bancos'));
    expect(req.request.params.keys().sort()).toEqual(['alias', 'cuenta', 'limit', 'page']);
    expect(req.request.params.get('alias')).toBe('rural');
    expect(req.request.params.get('cuenta')).toBe('0');
    req.flush({ success: true, statusCode: 200, message: 'ok', data: { bancos: [], metadata: {} } });

    await promesa;
  });

  it('pide el catálogo completo con todos=true', async () => {
    const promesa = service.getBancos({ todos: true });

    const req = httpMock.expectOne(r => r.url.endsWith('/financiero-bc/catalogos/bancos'));
    expect(req.request.params.keys()).toEqual(['todos']);
    expect(req.request.params.get('todos')).toBe('true');
    req.flush({ success: true, statusCode: 200, message: 'ok', data: { bancos: [], metadata: {} } });

    await promesa;
  });

  it('actualiza por PATCH con solo los cambios', async () => {
    const promesa = service.actualizarBanco(7, { bantotalNombre: 'GTC' });

    const req = httpMock.expectOne(r => r.url.endsWith('/financiero-bc/catalogos/bancos/7'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ bantotalNombre: 'GTC' });
    req.flush({ success: true, statusCode: 200, message: 'ok', data: {} });

    await promesa;
  });

  it('propaga el error para que la pantalla decida', async () => {
    const promesa = service.getBanco(99);

    httpMock
      .expectOne(r => r.url.endsWith('/financiero-bc/catalogos/bancos/99'))
      .flush({ statusCode: 404, message: '(BANCO_NO_ENCONTRADO) No existe', success: false }, { status: 404, statusText: 'Not Found' });

    await expect(promesa).rejects.toMatchObject({ status: 404 });
  });
});
