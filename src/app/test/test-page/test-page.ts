import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-test-page',
  imports: [],
  templateUrl: './test-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TestPage { }
