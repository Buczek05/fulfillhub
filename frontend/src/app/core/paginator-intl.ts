import { MatPaginatorIntl } from '@angular/material/paginator';

// Material domyślnie ma angielskie etykiety paginatora – UI jest polski, więc je nadpisujemy.
export function polishPaginatorIntl(): MatPaginatorIntl {
  const intl = new MatPaginatorIntl();

  intl.itemsPerPageLabel = 'Na stronę:';
  intl.nextPageLabel = 'Następna strona';
  intl.previousPageLabel = 'Poprzednia strona';
  intl.firstPageLabel = 'Pierwsza strona';
  intl.lastPageLabel = 'Ostatnia strona';
  intl.getRangeLabel = (page, pageSize, length) => {
    if (length === 0 || pageSize === 0) return `0 z ${length}`;

    const start = page * pageSize;
    const end = Math.min(start + pageSize, length);

    return `${start + 1} – ${end} z ${length}`;
  };

  return intl;
}
