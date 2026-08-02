import { Component } from '@angular/core';
import { StampJournalComponent } from '../../components/stamp-journal/stamp-journal.component';

@Component({
  selector: 'app-journal-page',
  imports: [StampJournalComponent],
  templateUrl: './journal-page.component.html',
  styleUrl: './journal-page.component.scss',
})
export default class JournalPageComponent {}
