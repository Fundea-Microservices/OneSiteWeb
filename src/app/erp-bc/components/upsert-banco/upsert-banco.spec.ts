import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UpsertBancoComponent } from './upsert-banco';
import { ActualizarBanco, Banco, CrearBanco } from '../../../../interfaces/erp-bc/catalogo-bancos';

describe('UpsertBancoComponent', () => {
  let fixture: ComponentFixture<UpsertBancoComponent>;
  let component: UpsertBancoComponent;
  let creado: CrearBanco | undefined;
  let actualizado: ActualizarBanco | undefined;

  const banco: Banco = {
    catalogoBancoId: 1,
    bantotalRubro: '1101',
    bantotalNombre: 'Banrural',
    bantotalAlias: 'BRR',
    bantotalCuenta: 10,
    bantotalSuboperacion: 0,
    dynamicsCodigo: 'BAN01',
    dynamicsRubroContable: '1101',
    fechaCreacion: '2026-11-05T17:22:37.000Z',
  };

  const { catalogoBancoId, fechaCreacion, ...datosValidos } = banco;

  async function iniciar(inicial: Banco | null) {
    fixture.componentRef.setInput('banco', inicial);
    fixture.detectChanges();
    await fixture.whenStable();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [UpsertBancoComponent] });
    fixture = TestBed.createComponent(UpsertBancoComponent);
    component = fixture.componentInstance;
    creado = undefined;
    actualizado = undefined;
    component.crear.subscribe(v => (creado = v));
    component.actualizar.subscribe(v => (actualizado = v));
  });

  it('crea con los 7 campos, sin espacios sobrantes y con números', async () => {
    await iniciar(null);
    component.form().setValue({ ...datosValidos, bantotalNombre: '  Banrural  ' });

    component.onSubmit();

    expect(creado).toEqual(datosValidos);
    expect(actualizado).toBeUndefined();
  });

  it('acepta 0 en cuenta y suboperación', async () => {
    await iniciar(null);
    component.form().setValue({ ...datosValidos, bantotalCuenta: 0, bantotalSuboperacion: 0 });

    expect(component.form().valid).toBe(true);
  });

  it.each([
    ['bantotalRubro', '   '],
    ['bantotalRubro', 'x'.repeat(21)],
    ['bantotalNombre', 'x'.repeat(101)],
    ['bantotalAlias', 'x'.repeat(51)],
    ['bantotalCuenta', null],
    ['bantotalCuenta', -1],
    ['bantotalCuenta', 1.5],
    ['bantotalSuboperacion', 2147483648],
    ['dynamicsCodigo', 'x'.repeat(11)],
    ['dynamicsRubroContable', 'x'.repeat(21)],
  ])('no envía si %s es %p', async (campo, valor) => {
    await iniciar(null);
    component.form().setValue({ ...datosValidos, [campo]: valor });

    component.onSubmit();

    expect(creado).toBeUndefined();
  });

  it('al editar emite solo los campos que cambiaron', async () => {
    await iniciar(banco);
    component.form().patchValue({ bantotalNombre: 'GTC', bantotalCuenta: 11 });

    component.onSubmit();

    expect(actualizado).toEqual({ bantotalNombre: 'GTC', bantotalCuenta: 11 });
    expect(creado).toBeUndefined();
  });

  it('al editar sin cambios emite un objeto vacío', async () => {
    await iniciar(banco);

    component.onSubmit();

    expect(actualizado).toEqual({});
  });
});
