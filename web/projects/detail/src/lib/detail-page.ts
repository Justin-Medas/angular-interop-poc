import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'poc-detail-page',
  templateUrl: './detail-page.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DetailPage {}
