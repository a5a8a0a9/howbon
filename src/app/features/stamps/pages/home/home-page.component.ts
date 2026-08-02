import { Component, inject } from '@angular/core';
import { StampCardComponent } from '../../components/stamp-card/stamp-card.component';
import { StampService } from '../../data-access/stamp.service';

@Component({
  selector: 'app-home-page',
  imports: [StampCardComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export default class HomePageComponent {
  protected readonly stamps = inject(StampService);
}
