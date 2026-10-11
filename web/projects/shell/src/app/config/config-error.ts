// Config error screen (FR10): the visible, accessible failure state for a bad or missing /config.json.
import { ChangeDetectionStrategy, Component, input } from '@angular/core';

/** FR10: shown instead of the app when /config.json is missing or invalid, so nothing starts half-configured. */
@Component({
  selector: 'poc-config-error',
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './config-error.html',
  styleUrl: './config-error.scss',
})
export class ConfigErrorScreen {
  /** Human-readable problems, each naming the offending path, so the fix is obvious. */
  readonly issues = input.required<string[]>();
}
