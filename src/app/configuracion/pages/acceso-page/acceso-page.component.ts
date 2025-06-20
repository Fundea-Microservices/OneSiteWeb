import { ChangeDetectionStrategy, Component } from '@angular/core';
import { DragDropComponent } from "../../../shared/components/drag-drop/drag-drop.component";

@Component({
  selector: 'app-acceso-page',
  imports: [DragDropComponent],
  templateUrl: './acceso-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class AccesoPageComponent {

 }
