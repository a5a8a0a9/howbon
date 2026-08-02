import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/loading/loading.service';

@Component({
  selector: 'app-loading-mask',
  templateUrl: './loading-mask.component.html',
  styleUrl: './loading-mask.component.scss',
})
export class LoadingMaskComponent {
  protected readonly loading = inject(LoadingService);
}
