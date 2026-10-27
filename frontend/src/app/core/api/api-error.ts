import { HttpErrorResponse } from '@angular/common/http';

import { ApiErrorBody } from '../models';

// Backend ma jeden format błędu; tu zamieniamy go na zdanie dla użytkownika.
const MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Nieprawidłowy e-mail lub hasło.',
  INSUFFICIENT_STOCK: 'Brak wystarczającej ilości towaru.',
  PRODUCT_NOT_IN_SHOP: 'Zamówienie zawiera produkt z innego sklepu.',
  DUPLICATE_ORDER_ITEM: 'Ten sam produkt pojawia się w zamówieniu więcej niż raz.',
  INVALID_STATUS_TRANSITION: 'Taka zmiana statusu nie jest dozwolona.',
  ORDER_ALREADY_SHIPPED: 'Wysłanego zamówienia nie można anulować.',
  ORDER_ALREADY_IN_PROGRESS: 'Magazyn już zaczął kompletację – anulowanie nie jest możliwe.',
  ORDER_REF_ALREADY_EXISTS: 'Zamówienie o tym numerze już istnieje.',
  STOCK_BELOW_RESERVED: 'Nowy stan jest niższy niż ilość zarezerwowana pod zamówienia.',
  PRODUCT_IN_USE: 'Produkt ma historię magazynową i nie może zostać usunięty.',
  SHOP_IN_USE: 'Sklep ma produkty lub zamówienia i nie może zostać usunięty.',
  SKU_ALREADY_EXISTS: 'Produkt o tym SKU już istnieje w tym sklepie.',
  EMAIL_ALREADY_EXISTS: 'Konto z tym adresem e-mail już istnieje.',
  FORBIDDEN: 'Twoja rola nie pozwala na tę operację.',
  PRODUCT_NOT_FOUND: 'Nie znaleziono takiego produktu.',
  ORDER_NOT_FOUND: 'Nie znaleziono takiego zamówienia.',
  SHOP_NOT_FOUND: 'Nie znaleziono takiego sklepu.',
  USER_NOT_FOUND: 'Nie znaleziono takiego konta.',
  ROUTE_NOT_FOUND: 'Nie znaleziono takiego zasobu.',
  MISSING_TOKEN: 'Sesja wygasła — zaloguj się ponownie.',
  INVALID_TOKEN: 'Sesja wygasła — zaloguj się ponownie.',
  INACTIVE_ACCOUNT: 'To konto jest nieaktywne.',
  INVALID_JSON: 'Nie udało się odczytać danych żądania.',
  INTERNAL_ERROR: 'Błąd serwera. Spróbuj ponownie za chwilę.',
};

// Komunikaty z backendu są po angielsku i nie nadają się dla użytkownika,
// więc dla nieznanego kodu pokazujemy własny tekst dobrany po statusie HTTP.
const BY_STATUS: Record<number, string> = {
  400: 'Nieprawidłowe dane — sprawdź formularz.',
  401: 'Sesja wygasła — zaloguj się ponownie.',
  403: 'Twoja rola nie pozwala na tę operację.',
  404: 'Nie znaleziono takiego zasobu.',
  409: 'Operacja koliduje z aktualnym stanem danych.',
  500: 'Błąd serwera. Spróbuj ponownie za chwilę.',
};

export function apiErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) return 'Wystąpił nieoczekiwany błąd.';

  if (error.status === 0) return 'Brak połączenia z serwerem.';

  const body = error.error as ApiErrorBody | null;
  const code = body?.error?.code;

  if (code && MESSAGES[code]) {
    const extra = insufficientStockDetails(code, body);

    return extra ? `${MESSAGES[code]} ${extra}` : MESSAGES[code];
  }

  if (code === 'VALIDATION_ERROR') return 'Formularz zawiera błędy – popraw zaznaczone pola.';

  return BY_STATUS[error.status] ?? 'Wystąpił nieoczekiwany błąd.';
}

// Przy braku stanu backend podaje, czego i ile brakuje – szkoda tego nie pokazać.
function insufficientStockDetails(code: string, body: ApiErrorBody | null): string | null {
  if (code !== 'INSUFFICIENT_STOCK' || !Array.isArray(body?.error?.details)) return null;

  const items = body.error.details as { sku: string; requested: number; available: number }[];

  return items
    .map((item) => `${item.sku}: dostępne ${item.available}, żądane ${item.requested}.`)
    .join(' ');
}

// Błędy walidacji z backendu wskazują pole – mapujemy je na komunikaty przy formularzu.
export function fieldErrors(error: unknown): Record<string, string> {
  if (!(error instanceof HttpErrorResponse)) return {};

  const body = error.error as ApiErrorBody | null;
  if (!Array.isArray(body?.error?.details)) return {};

  const details = body.error.details as { field?: string; message?: string }[];

  return Object.fromEntries(
    details
      .filter((detail) => detail.field && detail.message)
      .map((detail) => [detail.field as string, detail.message as string]),
  );
}
