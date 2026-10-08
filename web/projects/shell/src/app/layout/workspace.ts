import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Where the agent's plan renders (FR8). Empty until the command bar lands. */
@Component({
  selector: 'poc-workspace',
  template: `
    <h2>Workspace</h2>
    <p>No modules loaded yet.</p>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Workspace {}
