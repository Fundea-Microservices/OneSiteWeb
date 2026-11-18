import {
  ChangeDetectionStrategy, Component, computed, CUSTOM_ELEMENTS_SCHEMA, ElementRef, inject, input, OnDestroy, output, signal, viewChild,
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
export class AutocompleteComponent<T extends string | number> implements OnDestroy {
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
  /** Al escribir, primero las que empiezan con el texto, luego las que tienen una palabra que empieza con él. */
  ordenarPorRelevancia = input(false);
  /** Borde rojo de Bootstrap (is-invalid) en el input. */
  invalido = input(false);
  /**
   * Dibuja la lista con position: fixed junto al input. Para usarlo dentro de contenedores
   * con overflow (p. ej. .table-responsive), donde la lista quedaría recortada.
   */
  posicionFija = input(false);

  valueChange = output<T | null>();

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly lista = viewChild<ElementRef<HTMLElement>>('lista');
  readonly listaId = computed(() => `${this.inputId()}-lista`);

  abierto = signal(false);
  texto = signal('');
  activo = signal(-1);
  /** Estilos de la lista con posicionFija (null: se usa la posición normal). */
  estiloLista = signal<Record<string, string> | null>(null);
  private readonly reposicionar = () => this.calcularPosicion();

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
    const encontradas = this.indice().filter(i => terminos.every(t => i.texto.includes(t)));
    if (!this.ordenarPorRelevancia()) return encontradas.map(i => i.o);

    // 0: empieza con lo escrito · 1: alguna palabra empieza con el primer término · 2: lo contiene
    const frase = terminos.join(' ');
    const relevancia = (texto: string) =>
      texto.startsWith(frase) ? 0 : texto.split(/[\s·\-]+/).some(p => p.startsWith(terminos[0])) ? 1 : 2;
    return encontradas
      .map((i, orden) => ({ o: i.o, orden, peso: relevancia(i.texto) }))
      .sort((a, b) => a.peso - b.peso || a.orden - b.orden)
      .map(i => i.o);
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
    this.escucharPosicion(true);
    this.scrollAlActivo();
  }

  cerrar() {
    this.abierto.set(false);
    this.texto.set('');
    this.activo.set(-1);
    this.escucharPosicion(false);
  }

  ngOnDestroy() {
    this.escucharPosicion(false);
  }

  /** Con posicionFija la lista sigue al input al hacer scroll (en cualquier contenedor) o al cambiar el tamaño. */
  private escucharPosicion(activo: boolean) {
    if (!this.posicionFija()) return;
    if (activo) {
      this.calcularPosicion();
      document.addEventListener('scroll', this.reposicionar, true);
      window.addEventListener('resize', this.reposicionar);
    } else {
      document.removeEventListener('scroll', this.reposicionar, true);
      window.removeEventListener('resize', this.reposicionar);
      this.estiloLista.set(null);
    }
  }

  /** Debajo del input; arriba si abajo no cabe y arriba hay más espacio. */
  private calcularPosicion() {
    const input = this.host.nativeElement.querySelector('input');
    if (!input) return;
    const r = input.getBoundingClientRect();
    const abajo = window.innerHeight - r.bottom;
    const arriba = r.top;
    const alto = 260; // max-height de .autocomplete-lista
    const estilo: Record<string, string> = {
      position: 'fixed',
      left: `${r.left}px`,
      width: `${r.width}px`,
      right: 'auto',
    };
    if (abajo < alto && arriba > abajo) {
      estilo['top'] = 'auto';
      estilo['bottom'] = `${window.innerHeight - r.top}px`;
    } else {
      estilo['top'] = `${r.bottom}px`;
      estilo['bottom'] = 'auto';
    }
    this.estiloLista.set(estilo);
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
