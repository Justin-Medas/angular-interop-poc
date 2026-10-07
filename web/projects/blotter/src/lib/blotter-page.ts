import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'poc-blotter-page',
  templateUrl: './blotter-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BlotterPage {}
