import {
  ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, ElementRef, input, output, signal, viewChild,
} from '@angular/core';

export interface AutocompleteOption<T extends string | number = number> {
  value: T;
  label: string;
  /** Texto secundario (código, usuario...). También entra en la búsqueda. */
  detalle?: string;
}

interface Entrada<T extends string | number> {
  value: T | null;
  label: string;
  detalle?: string;
  esTodos: boolean;
}

let secuencia = 0;

/** Minúsculas y sin tildes, para que "perez" encuentre "Pérez". */
const normalizar = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/**
 * Combo con búsqueda sobre una lista ya cargada. Cada palabra escrita debe
 * aparecer en la etiqueta o en el detalle. Al abrirlo el texto queda vacío y
 * la opción elegida se ve como placeholder, así se escribe sin borrar antes.
 * Emite null con la opción "todos" o con el botón de limpiar.
 */
@Component({
  selector: 'app-autocomplete',
  templateUrl: './autocomplete.html',
  styleUrl: './autocomplete.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AutocompleteComponent<T extends string | number> {
  options = input.required<AutocompleteOption<T>[]>();
  value = input<T | null>(null);
  placeholder = input('Buscar...');
  /** Etiqueta de la opción que emite null. Si no se indica, no se muestra. */
  todosLabel = input<string | null>(null);
  disabled = input(false);
  loading = input(false);
  inputId = input(`autocomplete-${++secuencia}`);
  /** Tope de opciones dibujadas; el resto aparece al refinar la búsqueda. */
  maxResultados = input(50);

  valueChange = output<T | null>();

  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');
  readonly listaId = computed(() => `${this.inputId()}-lista`);

  abierto = signal(false);
  texto = signal('');
  activo = signal(-1);

  seleccionada = computed(() => this.options().find(o => o.value === this.value()) ?? null);

  textoVisible = computed(() => this.abierto() ? this.texto() : (this.seleccionada()?.label ?? ''));

  placeholderVisible = computed(() => {
    if (this.loading()) return 'Cargando...';
    return (this.abierto() && this.seleccionada()?.label) || this.placeholder();
  });

  private indice = computed(() =>
    this.options().map(o => ({ o, texto: normalizar(`${o.label} ${o.detalle ?? ''}`) }))
  );

  private terminos = computed(() => normalizar(this.texto()).split(/\s+/).filter(Boolean));

  private coincidencias = computed(() => {
    const terminos = this.terminos();
    if (!terminos.length) return this.options();
    return this.indice().filter(i => terminos.every(t => i.texto.includes(t))).map(i => i.o);
  });

  totalCoincidencias = computed(() => this.coincidencias().length);

  recortado = computed(() => this.totalCoincidencias() > this.maxResultados());

  entradas = computed<Entrada<T>[]>(() => {
    const opciones: Entrada<T>[] = this.coincidencias()
      .slice(0, this.maxResultados())
      .map(o => ({ value: o.value, label: o.label, detalle: o.detalle, esTodos: false }));
    const todos = this.todosLabel();
    return todos && !this.terminos().length ? [{ value: null, label: todos, esTodos: true }, ...opciones] : opciones;
  });

  abrir() {
    if (this.disabled() || this.abierto()) return;
    this.texto.set('');
    this.abierto.set(true);
    const idx = this.entradas().findIndex(e => e.value === this.value());
    this.activo.set(Math.max(idx, 0));
    this.scrollAlActivo();
  }

  cerrar() {
    this.abierto.set(false);
    this.texto.set('');
    this.activo.set(-1);
  }

  onInput(valor: string) {
    this.texto.set(valor);
    this.abierto.set(true);
    this.activo.set(this.entradas().length ? 0 : -1);
  }

  elegir(entrada: Entrada<T>) {
    this.cerrar();
    if (entrada.value !== this.value()) this.valueChange.emit(entrada.value);
  }

  limpiar() {
    this.cerrar();
    this.valueChange.emit(null);
  }

  onKeydown(event: KeyboardEvent) {
    const total = this.entradas().length;
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.abierto()) { this.abrir(); return; }
        if (total) this.activo.set(Math.min(this.activo() + 1, total - 1));
        this.scrollAlActivo();
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (total) this.activo.set(Math.max(this.activo() - 1, 0));
        this.scrollAlActivo();
        break;
      case 'Enter': {
        const entrada = this.entradas()[this.activo()];
        if (this.abierto() && entrada) {
          event.preventDefault();
          this.elegir(entrada);
        }
        break;
      }
      case 'Escape':
        if (this.abierto()) {
          event.preventDefault();
          event.stopPropagation();
          this.cerrar();
        }
        break;
    }
  }

  opcionId(index: number) { return `${this.listaId()}-${index}`; }

  private scrollAlActivo() {
    // Espera a que se dibuje la lista antes de buscar la opción activa.
    setTimeout(() => {
      this.lista()?.nativeElement.querySelector(`[data-index="${this.activo()}"]`)?.scrollIntoView({ block: 'nearest' });
    });
  }
}
