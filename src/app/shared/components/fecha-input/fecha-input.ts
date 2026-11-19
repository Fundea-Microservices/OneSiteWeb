import { ChangeDetectionStrategy, Component, computed, effect, input, model, signal, untracked } from '@angular/core';

/**
 * Campo de fecha basado en texto (DD/MM/AAAA) con máscara automática.
 * Reemplaza al input type="date" nativo, cuyo selector no funciona de forma
 * confiable en navegadores móviles.
 *
 * - `formato="dmy"`: el valor enlazado se maneja como DD/MM/YYYY
 * - `formato="iso"`: el valor enlazado se maneja como YYYY-MM-DD
 *
 * Mientras la fecha esté incompleta o sea inválida, el valor enlazado queda vacío ('').
 */
@Component({
  selector: 'app-fecha-input',
  templateUrl: './fecha-input.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FechaInput {
  fecha = model<string>('');
  formato = input<'dmy' | 'iso'>('dmy');
  disabled = input<boolean>(false);
  inputClass = input<string>('bg-gray-50 border border-gray-300 text-gray-900 text-sm rounded-lg pl-4 pr-3 h-12 w-full');
  inputId = input<string | undefined>(undefined);

  texto = signal<string>('');
  private ultimoEmitido: string | null = null;

  invalida = computed(() => {
    const t = this.texto();
    return t.length === 10 && !this.parsear(t);
  });

  claseInput = computed(() => this.inputClass() + (this.invalida() ? ' border-red-500! focus:ring-red-500' : ''));

  constructor() {
    // Sincroniza el valor externo → texto visible (carga inicial, datos de Bantotal/DPI, reinicios)
    effect(() => {
      const valor = this.fecha() ?? '';
      untracked(() => {
        if (valor === this.ultimoEmitido) return;
        this.ultimoEmitido = null;
        this.texto.set(this.aTexto(valor));
      });
    });
  }

  onInput(event: Event): void {
    const el = event.target as HTMLInputElement;
    const enmascarado = this.enmascarar(el.value);
    if (el.value !== enmascarado) {
      el.value = enmascarado;
    }
    this.texto.set(enmascarado);

    const partes = this.parsear(enmascarado);
    const nuevoValor = partes ? this.aValor(partes) : '';
    if (nuevoValor !== this.fecha()) {
      this.ultimoEmitido = nuevoValor;
      this.fecha.set(nuevoValor);
    }
  }

  /** Deja solo dígitos e inserta las barras: DD/MM/AAAA */
  private enmascarar(valor: string): string {
    const d = valor.replace(/\D/g, '').substring(0, 8);
    if (d.length <= 2) return d;
    if (d.length <= 4) return `${d.substring(0, 2)}/${d.substring(2)}`;
    return `${d.substring(0, 2)}/${d.substring(2, 4)}/${d.substring(4)}`;
  }

  /** Valida un texto DD/MM/AAAA y retorna sus partes si es una fecha real */
  private parsear(texto: string): { dia: number; mes: number; anio: number } | null {
    const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto);
    if (!m) return null;
    const dia = +m[1];
    const mes = +m[2];
    const anio = +m[3];
    if (anio < 1900 || anio > 2100 || mes < 1 || mes > 12 || dia < 1) return null;
    const diasMes = new Date(anio, mes, 0).getDate();
    if (dia > diasMes) return null;
    return { dia, mes, anio };
  }

  private aValor(p: { dia: number; mes: number; anio: number }): string {
    const dd = String(p.dia).padStart(2, '0');
    const mm = String(p.mes).padStart(2, '0');
    const yyyy = String(p.anio);
    return this.formato() === 'iso' ? `${yyyy}-${mm}-${dd}` : `${dd}/${mm}/${yyyy}`;
  }

  /** Convierte el valor externo (DD/MM/YYYY, DD/MM/YY o YYYY-MM-DD[...]) a texto DD/MM/AAAA */
  private aTexto(valor: string): string {
    if (!valor) return '';
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(valor);
    if (iso) {
      return `${iso[3].padStart(2, '0')}/${iso[2].padStart(2, '0')}/${iso[1]}`;
    }
    const dmy = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/.exec(valor);
    if (dmy) {
      let anio = dmy[3];
      if (anio.length === 2) {
        anio = (parseInt(anio, 10) < 50 ? '20' : '19') + anio;
      }
      return `${dmy[1].padStart(2, '0')}/${dmy[2].padStart(2, '0')}/${anio}`;
    }
    return valor;
  }
}
