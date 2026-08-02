import { DOCUMENT } from '@angular/common';
import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  input,
  output,
} from '@angular/core';

@Component({
  selector: 'app-dialog',
  templateUrl: './app-dialog.component.html',
  styleUrl: './app-dialog.component.scss',
})
export class AppDialogComponent implements AfterViewInit, OnDestroy {
  private readonly document = inject(DOCUMENT);
  private previouslyFocused: HTMLElement | null = null;
  @ViewChild('dialogCard', { read: ElementRef }) private dialogCard?: ElementRef<HTMLElement>;
  readonly title = input.required<string>();
  readonly titleId = input('app-dialog-title');
  readonly kicker = input<string | null>(null);
  readonly role = input<'dialog' | 'alertdialog'>('dialog');
  readonly closeLabel = input<string | null>(null);
  readonly dismissed = output<void>();

  ngAfterViewInit(): void {
    this.previouslyFocused = this.document.activeElement as HTMLElement | null;
    this.dialogCard?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    this.previouslyFocused?.focus();
  }

  protected dismissFromBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.dismissed.emit();
    }
  }
}
