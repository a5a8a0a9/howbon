import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

interface NavigationItem {
  path: string;
  icon: string;
  label: string;
}

@Component({
  selector: 'app-bottom-nav',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.scss',
})
export class BottomNavComponent {
  protected readonly items: NavigationItem[] = [
    { path: '/home', icon: 'home', label: '首頁' },
    { path: '/journal', icon: 'menu_book', label: '日誌' },
    { path: '/rewards', icon: 'redeem', label: '獎賞' },
    { path: '/store', icon: 'storefront', label: '商店' },
  ];
}
