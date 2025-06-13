import { ChangeDetectionStrategy, Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute, NavigationEnd, RouterLink } from '@angular/router';
import { filter } from 'rxjs';

@Component({
  selector: 'app-breadcrumb',
  imports: [RouterLink],
  templateUrl: './breadcrumb.html',
  styleUrl: './breadcrumb.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreadcrumbComponent implements OnInit {
  public breadcrumbs: { label: string; url: string }[] = [];

  constructor(private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.buildBreadcrumbs(this.route.root);
    });
  }

  private buildBreadcrumbs(route: ActivatedRoute, url: string = '', breadcrumbs: any[] = []) {
  const children: ActivatedRoute[] = route.children;

  if (children.length === 0) {
    this.breadcrumbs = breadcrumbs;
    return;
  }

  for (const child of children) {
    const routeURL: string = child.snapshot.url.map(segment => segment.path).join('/');
    // Solo agrega breadcrumb si hay un segmento
    if (routeURL) {
      url += `/${routeURL}`;
      breadcrumbs.push({
        label: this.formatLabel(routeURL),
        url: url
      });
    }
    // Sigue recorriendo aunque el segmento esté vacío
    this.buildBreadcrumbs(child, url, breadcrumbs);
  }
}

  private formatLabel(segment: string): string {
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  }
}
