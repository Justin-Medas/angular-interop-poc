import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** FR10: shown instead of the app when /config.json is missing or invalid, so nothing starts half-configured. */
@Component({
  selector: 'poc-config-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './config-error.html',
  styleUrl: './config-error.scss',
})
export class ConfigErrorScreen {
  readonly issues = input.required<string[]>();
}
