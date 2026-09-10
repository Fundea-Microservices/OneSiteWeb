import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ToastrService } from 'ngx-toastr';
import { EmpresaExService } from './empresa-ex.service';
import { IEmpresaEx } from '../../interfaces/onesiteex-auth/onesiteex-auth';

/**
 * Pruebas del servicio de Empresas (M1). Verifican construcción de URL/params,
 * el desempaquetado de la envoltura { success, data, metadata } y el manejo de error.
 */
describe('EmpresaExService', () => {
  let service: EmpresaExService;
  let httpMock: HttpTestingController;
  let toastr: { success: jest.Mock; error: jest.Mock; warning: jest.Mock };

  const BASE = '/onesiteex/auth/empresa';

  const empresaMock: IEmpresaEx = {
    idEmpresa: 1,
    nombreEmpresa: 'FUNDEA',
    codigoEnrolamiento: 'ENR-GTDEMO',
    estado: true,
    fechaCreacion: '2026-01-01T00:00:00',
    codigo: 'GTDEMO',
  };

  beforeEach(() => {
    toastr = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };

    TestBed.configureTestingModule({
      providers: [
        EmpresaExService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ToastrService, useValue: toastr },
      ],
    });

    service = TestBed.inject(EmpresaExService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('se crea', () => {
    expect(service).toBeTruthy();
  });

  describe('getEmpresas', () => {
    it('usa page/limit por defecto y devuelve la envoltura en éxito', async () => {
      const promise = service.getEmpresas();

      const req = httpMock.expectOne(r => r.url.endsWith(BASE));
      expect(req.request.method).toBe('GET');
      expect(req.request.params.get('page')).toBe('1');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush({ success: true, statusCode: 200, message: 'ok', data: [empresaMock], metadata: { total: 1 } });

      const resp = await promise;
      expect(resp?.data).toEqual([empresaMock]);
      expect(resp?.metadata.total).toBe(1);
    });

    it('con all=true envía el parámetro all y omite paginación', async () => {
      const promise = service.getEmpresas({ all: true });

      const req = httpMock.expectOne(r => r.url.endsWith(BASE));
      expect(req.request.params.get('all')).toBe('true');
      expect(req.request.params.get('page')).toBeNull();
      req.flush({ success: true, statusCode: 200, message: 'ok', data: [], metadata: { total: 0 } });

      await promise;
    });

    it('agrega search y estado cuando se pasan', async () => {
      const promise = service.getEmpresas({ search: 'fun', estado: false });

      const req = httpMock.expectOne(r => r.url.endsWith(BASE));
      expect(req.request.params.get('search')).toBe('fun');
      expect(req.request.params.get('estado')).toBe('false');
      req.flush({ success: true, statusCode: 200, message: 'ok', data: [], metadata: { total: 0 } });

      await promise;
    });

    it('devuelve null y notifica en error', async () => {
      const promise = service.getEmpresas();

      const req = httpMock.expectOne(r => r.url.endsWith(BASE));
      req.flush({ message: 'boom' }, { status: 500, statusText: 'Server Error' });

      const resp = await promise;
      expect(resp).toBeNull();
      expect(toastr.error).toHaveBeenCalled();
    });
  });

  describe('getEmpresaById', () => {
    it('hace GET a /base/:id', async () => {
      const promise = service.getEmpresaById(7);

      const req = httpMock.expectOne(r => r.url.endsWith(`${BASE}/7`));
      expect(req.request.method).toBe('GET');
      req.flush({ success: true, statusCode: 200, message: 'ok', data: empresaMock });

      const resp = await promise;
      expect(resp?.data).toEqual(empresaMock);
    });
  });

  describe('createEmpresa', () => {
    it('hace POST con el body esperado y notifica éxito', async () => {
      const promise = service.createEmpresa({
        nombreEmpresa: 'Nueva',
        codigoEnrolamiento: 'ENR-1',
        codigo: 'N1',
        estado: true,
      });

      const req = httpMock.expectOne(r => r.url.endsWith(BASE));
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual({
        nombreEmpresa: 'Nueva',
        codigoEnrolamiento: 'ENR-1',
        codigo: 'N1',
        estado: true,
      });
      req.flush({ success: true, statusCode: 201, message: 'Empresa creada', data: empresaMock });

      const resp = await promise;
      expect(resp?.success).toBe(true);
      expect(toastr.success).toHaveBeenCalled();
    });

    it('omite codigo cuando viene vacío/nulo', async () => {
      const promise = service.createEmpresa({ nombreEmpresa: 'X', codigoEnrolamiento: 'E', codigo: null });

      const req = httpMock.expectOne(r => r.url.endsWith(BASE));
      expect(req.request.body).toEqual({ nombreEmpresa: 'X', codigoEnrolamiento: 'E' });
      req.flush({ success: true, statusCode: 201, message: 'ok', data: empresaMock });

      await promise;
    });

    it('devuelve null y notifica en error', async () => {
      const promise = service.createEmpresa({ nombreEmpresa: 'X', codigoEnrolamiento: 'E' });

      const req = httpMock.expectOne(r => r.url.endsWith(BASE));
      req.flush({ message: 'dup' }, { status: 400, statusText: 'Bad Request' });

      expect(await promise).toBeNull();
      expect(toastr.error).toHaveBeenCalled();
    });
  });

  describe('updateEmpresa', () => {
    it('hace PUT con idEmpresa en el body y solo campos provistos', async () => {
      const promise = service.updateEmpresa({ idEmpresa: 3, nombreEmpresa: 'Editada', estado: false });

      const req = httpMock.expectOne(r => r.url.endsWith(BASE));
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ idEmpresa: 3, nombreEmpresa: 'Editada', estado: false });
      req.flush({ success: true, statusCode: 200, message: 'Empresa actualizada', data: empresaMock });

      const resp = await promise;
      expect(resp?.success).toBe(true);
      expect(toastr.success).toHaveBeenCalled();
    });

    it('normaliza codigo vacío a null', async () => {
      const promise = service.updateEmpresa({ idEmpresa: 3, codigo: '' });

      const req = httpMock.expectOne(r => r.url.endsWith(BASE));
      expect(req.request.body).toEqual({ idEmpresa: 3, codigo: null });
      req.flush({ success: true, statusCode: 200, message: 'ok', data: empresaMock });

      await promise;
    });
  });

  describe('deleteEmpresa', () => {
    it('hace DELETE a /base/:id y notifica éxito', async () => {
      const promise = service.deleteEmpresa(9);

      const req = httpMock.expectOne(r => r.url.endsWith(`${BASE}/9`));
      expect(req.request.method).toBe('DELETE');
      req.flush({ success: true, statusCode: 200, message: 'Empresa dada de baja', data: { idEmpresa: 9 } });

      const resp = await promise;
      expect(resp?.success).toBe(true);
      expect(toastr.success).toHaveBeenCalled();
    });

    it('devuelve null y notifica en error', async () => {
      const promise = service.deleteEmpresa(9);

      const req = httpMock.expectOne(r => r.url.endsWith(`${BASE}/9`));
      req.flush({ message: 'fk' }, { status: 409, statusText: 'Conflict' });

      expect(await promise).toBeNull();
      expect(toastr.error).toHaveBeenCalled();
    });
  });
});
