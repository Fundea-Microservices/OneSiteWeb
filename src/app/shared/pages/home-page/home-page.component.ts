import { ChangeDetectionStrategy, Component, HostListener } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-home-page',
  imports: [RouterLink],
  templateUrl: './home-page.component.html',
  styleUrls: ['./home-page.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export default class HomePageComponent { 
  showMenu = false;
  isAffixed = false;

  toggleMenu() {
    this.showMenu = !this.showMenu;
    console.log('Clicked menu');
  }

  @HostListener('window:scroll', [])
  onWindowScroll() {
    const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
    this.isAffixed = scrollTop > 50;
    if (this.isAffixed) {
      console.log('OK');
    }
  }

}
