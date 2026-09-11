import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { UpsertEmpresaExComponent } from './upsert-empresa-ex.component';
import { IEmpresaEx, IEmpresaExUpsert } from '../../../../interfaces/onesiteex-auth/onesiteex-auth';

/**
 * Pruebas del formulario reactivo de alta/edición de empresa (M1).
 * Cubren validaciones, reinicio por formKey, y el payload emitido en save.
 */
describe('UpsertEmpresaExComponent', () => {
  let fixture: ComponentFixture<UpsertEmpresaExComponent>;
  let component: UpsertEmpresaExComponent;

  const empresa: IEmpresaEx = {
    idEmpresa: 5,
    nombreEmpresa: 'FUNDEA',
    codigoEnrolamiento: 'ENR-GTDEMO',
    estado: true,
    fechaCreacion: '2026-01-01T00:00:00',
    codigo: 'GTDEMO',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UpsertEmpresaExComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(UpsertEmpresaExComponent);
    component = fixture.componentInstance;
  });

  function initNuevo() {
    fixture.componentRef.setInput('nuevo', true);
    fixture.componentRef.setInput('empresa', null);
    fixture.componentRef.setInput('formKey', 1);
    fixture.detectChanges();
  }

  function initEdicion() {
    fixture.componentRef.setInput('nuevo', false);
    fixture.componentRef.setInput('empresa', empresa);
    fixture.componentRef.setInput('formKey', 2);
    fixture.detectChanges();
  }

  it('se crea', () => {
    initNuevo();
    expect(component).toBeTruthy();
  });

  describe('modo nuevo', () => {
    beforeEach(() => initNuevo());

    it('inicia con el form vacío y estado activo por defecto', () => {
      const v = component.form().value;
      expect(v.nombreEmpresa).toBe('');
      expect(v.codigoEnrolamiento).toBe('');
      expect(v.codigo).toBe('');
      expect(v.estado).toBe(true);
    });

    it('el form es inválido sin nombre ni código de enrolamiento', () => {
      expect(component.form().valid).toBe(false);
    });

    it('el botón dice "Crear empresa"', () => {
      expect(component.btnText).toBe('Crear empresa');
    });

    it('no emite save si el form es inválido', () => {
      const spy = jest.fn();
      component.save.subscribe(spy);
      component.onSubmit();
      expect(spy).not.toHaveBeenCalled();
    });

    it('emite el payload sin idEmpresa cuando es válido', () => {
      let payload: IEmpresaExUpsert | undefined;
      component.save.subscribe(p => (payload = p));

      component.form().patchValue({
        nombreEmpresa: '  Nueva Empresa  ',
        codigoEnrolamiento: '  ENR-1  ',
        codigo: '  N1  ',
        estado: true,
      });
      component.onSubmit();

      expect(payload).toEqual({
        nombreEmpresa: 'Nueva Empresa',
        codigoEnrolamiento: 'ENR-1',
        codigo: 'N1',
        estado: true,
      });
      expect(payload?.idEmpresa).toBeUndefined();
    });

    it('convierte codigo vacío en null en el payload', () => {
      let payload: IEmpresaExUpsert | undefined;
      component.save.subscribe(p => (payload = p));

      component.form().patchValue({ nombreEmpresa: 'X', codigoEnrolamiento: 'E', codigo: '   ' });
      component.onSubmit();

      expect(payload?.codigo).toBeNull();
    });
  });

  describe('modo edición', () => {
    beforeEach(() => initEdicion());

    it('precarga los valores de la empresa', () => {
      const v = component.form().value;
      expect(v.nombreEmpresa).toBe('FUNDEA');
      expect(v.codigoEnrolamiento).toBe('ENR-GTDEMO');
      expect(v.codigo).toBe('GTDEMO');
      expect(v.estado).toBe(true);
    });

    it('el botón dice "Actualizar empresa"', () => {
      expect(component.btnText).toBe('Actualizar empresa');
    });

    it('emite el payload con idEmpresa', () => {
      let payload: IEmpresaExUpsert | undefined;
      component.save.subscribe(p => (payload = p));

      component.form().patchValue({ nombreEmpresa: 'Editada' });
      component.onSubmit();

      expect(payload?.idEmpresa).toBe(5);
      expect(payload?.nombreEmpresa).toBe('Editada');
    });
  });

  it('reinicia el form al cambiar formKey', () => {
    initEdicion();
    expect(component.form().value.nombreEmpresa).toBe('FUNDEA');

    // Simula abrir el modal en modo "nuevo": cambia inputs + formKey.
    fixture.componentRef.setInput('nuevo', true);
    fixture.componentRef.setInput('empresa', null);
    fixture.componentRef.setInput('formKey', 99);
    fixture.detectChanges();

    expect(component.form().value.nombreEmpresa).toBe('');
  });

  it('emite cancel al onCancel()', () => {
    initNuevo();
    const spy = jest.fn();
    component.cancel.subscribe(spy);
    component.onCancel();
    expect(spy).toHaveBeenCalled();
  });

  it('hasError detecta required tras marcar touched', () => {
    initNuevo();
    expect(component.hasError('nombreEmpresa', 'required')).toBe(false);
    component.form().get('nombreEmpresa')?.markAsTouched();
    expect(component.hasError('nombreEmpresa', 'required')).toBe(true);
  });
});
