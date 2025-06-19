import { ChangeDetectionStrategy, Component, CUSTOM_ELEMENTS_SCHEMA, effect, EventEmitter, input, Output, signal } from '@angular/core';
import { IMenu } from '../../../../../interfaces/auth';

@Component({
  selector: 'app-menu-tabla',
  imports: [],
  templateUrl: './menu-tabla.component.html',
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuTablaComponent {

  menuList = input<IMenu[]>([]);
  pagination = input<IPagination>({
    page: 1,
    pageSize: 10,
    totalItems: 0
  })

  @Output() openModal = new EventEmitter<IMenu>();
  @Output() openDeleteModal = new EventEmitter<IMenu>();
  @Output() changeActive = new EventEmitter<IMenu>();

  constructor() {
    effect(() => {
      this.menuList();
      this.pagination();
    });
  }

  onOpenModal(menu: IMenu) {
    this.openModal.emit(menu);
  }

  onOpenDeleteModal(menu: IMenu) {
    this.openDeleteModal.emit(menu);
  }

  onChangeActive(menu: IMenu, checked: boolean) {
    menu.active = checked;
    this.changeActive.emit(menu);
  }

}
