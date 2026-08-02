import { Component } from '@angular/core';
import { RewardsComponent } from '../../components/rewards/rewards.component';

@Component({
  selector: 'app-store-page',
  imports: [RewardsComponent],
  templateUrl: './store-page.component.html',
  styleUrl: './store-page.component.scss',
})
export default class StorePageComponent {}
