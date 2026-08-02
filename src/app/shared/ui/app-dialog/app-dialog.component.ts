import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-dialog',
  templateUrl: './app-dialog.component.html',
  styleUrl: './app-dialog.component.scss',
})
export class AppDialogComponent {
  readonly title = input.required<string>();
  readonly titleId = input('app-dialog-title');
  readonly kicker = input<string | null>(null);
  readonly role = input<'dialog' | 'alertdialog'>('dialog');
  readonly closeLabel = input<string | null>(null);
  readonly dismissed = output<void>();

  protected dismissFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.dismissed.emit();
    }
  }
}
