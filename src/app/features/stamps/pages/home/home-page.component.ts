import { Component } from '@angular/core';
import { StampCardComponent } from '../../components/stamp-card/stamp-card.component';

@Component({
  selector: 'app-home-page',
  imports: [StampCardComponent],
  templateUrl: './home-page.component.html',
  styleUrl: './home-page.component.scss',
})
export default class HomePageComponent {}
