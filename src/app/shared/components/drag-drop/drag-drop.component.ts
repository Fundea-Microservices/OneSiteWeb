// drag-drop.component.ts
import { Component, signal } from '@angular/core';
import Sortable from 'sortablejs';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-drag-drop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './drag-drop.component.html',
  styleUrl: './drag-drop.component.css'
})
export class DragDropComponent {
  listA = signal(['Elemento A1', 'Elemento A2', 'Elemento A3']);
  listB = signal(['Elemento B1', 'Elemento B2', 'Elemento B3']);

  ngAfterViewInit() {
    this.setupSortable('listA', this.listA);
    this.setupSortable('listB', this.listB);
  }

  private setupSortable(id: string, listSignal: any) {
    const el = document.getElementById(id)!;
    Sortable.create(el, {
      group: 'shared',
      animation: 150,
      onEnd: (evt) => {
        const oldIndex = evt.oldIndex!;
        const newIndex = evt.newIndex!;
        if (evt.from === evt.to) {
          // Reordenar dentro del mismo grupo
          const items = [...listSignal()];
          const movedItem = items.splice(oldIndex, 1)[0];
          items.splice(newIndex, 0, movedItem);
          listSignal.set(items);
        } else {
          // Mover entre listas
          const fromSignal = evt.from.id === 'listA' ? this.listA : this.listB;
          const toSignal = evt.to.id === 'listA' ? this.listA : this.listB;

          const fromItems = [...fromSignal()];
          const toItems = [...toSignal()];
          const movedItem = fromItems.splice(oldIndex, 1)[0];
          toItems.splice(newIndex, 0, movedItem);

          fromSignal.set(fromItems);
          toSignal.set(toItems);
        }
      }
    });
  }
}