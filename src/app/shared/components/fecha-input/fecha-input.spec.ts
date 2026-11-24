import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FechaInput } from './fecha-input';

describe('FechaInput', () => {
  let fixture: ComponentFixture<FechaInput>;
  let component: FechaInput;
  let emitidos: string[];

  function input(): HTMLInputElement {
    return fixture.nativeElement.querySelector('input');
  }

  function mensaje(): string {
    return fixture.nativeElement.querySelector('p')?.textContent?.trim() ?? '';
  }

  function escribir(valor: string) {
    const el = input();
    el.value = valor;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [FechaInput] });
    fixture = TestBed.createComponent(FechaInput);
    component = fixture.componentInstance;
    emitidos = [];
    component.fecha.subscribe(v => emitidos.push(v));
  });

  it('aplica la máscara y emite en formato ISO', () => {
    fixture.componentRef.setInput('formato', 'iso');
    fixture.detectChanges();

    escribir('15032026');

    expect(input().value).toBe('15/03/2026');
    expect(emitidos.at(-1)).toBe('2026-03-15');
    expect(mensaje()).toBe('');
  });

  it('emite vacío y muestra error con una fecha inexistente', () => {
    fixture.detectChanges();

    escribir('31/02/2026');

    expect(component.fecha()).toBe('');
    expect(mensaje()).toBe('Fecha inválida');
  });

  it('muestra el valor externo en formato DD/MM/AAAA', () => {
    fixture.componentRef.setInput('fecha', '2026-11-24');
    fixture.detectChanges();

    expect(input().value).toBe('24/11/2026');
  });

  it('rechaza fechas posteriores a max', () => {
    fixture.componentRef.setInput('formato', 'iso');
    fixture.componentRef.setInput('max', '2026-11-24');
    fixture.detectChanges();

    escribir('25/11/2026');
    expect(component.fecha()).toBe('');
    expect(mensaje()).toBe('La fecha no puede ser posterior al 24/11/2026');

    escribir('24/11/2026');
    expect(component.fecha()).toBe('2026-11-24');
    expect(mensaje()).toBe('');
  });

  it('rechaza fechas anteriores a min', () => {
    fixture.componentRef.setInput('formato', 'iso');
    fixture.componentRef.setInput('min', '2026-01-10');
    fixture.detectChanges();

    escribir('09/01/2026');
    expect(component.fecha()).toBe('');
    expect(mensaje()).toBe('La fecha no puede ser anterior al 10/01/2026');
  });

  it('ignora min/max vacíos', () => {
    fixture.componentRef.setInput('formato', 'iso');
    fixture.componentRef.setInput('min', '');
    fixture.componentRef.setInput('max', '');
    fixture.detectChanges();

    escribir('01/01/1990');
    expect(component.fecha()).toBe('1990-01-01');
  });
});
