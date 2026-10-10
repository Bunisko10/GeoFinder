# GeoFinder

**GeoFinder** to narzędzie do wyszukiwania i generowania zestawów zadań maturalnych z geografii na podstawie filtrów.

Projekt działa w dwojaki sposób.

- Generator działa internetowo przez GitHub Pages:
  https://bunisko10.github.io/GeoFinder/index.html
  W tej wersji oferuje on tylko możliwość generowania zadań i ich wydruku
  
- Generator działa również jako narzędzie Desktop (lokalnie na własnym komputerze)
  W tej wersji narzędzie oferuje również możliwość dodawania swoich zadań i ich edycji
  Aby pobrać narzędzie należy wejść na repozytorium projektu, kliknąć w zielony przycisk `Code` i na dole będzie `Download ZIP`. Należy go pobrać i rozpakować.
  
---

## Wymagania

- **Dobre chęci**

---

## Idea projektu

GeoFinder powstał jako narzędzie ułatwiające pracę z zadaniami maturalnymi z geografii.

Celem projektu jest:

- zebranie zadań w uporządkowanej bazie danych,
- możliwość filtrowania ich według roku, typu zadania i innych kryteriów,
- szybkie składanie własnych kart pracy bez ręcznego wyszukiwania zadań.

GeoFinder **nie jest gotowym arkuszem ani „ściągą”** – to narzędzie do świadomego doboru i analizy zadań, zarówno do samodzielnej nauki, jak i do pracy dydaktycznej.

---

## Instrukcja uruchomienia lokalnie

### 1. Otwórz generator

W folderze odnajdź plik `GeoFinder.exe`. 
Automatycznie odpali się przeglądarka z odpalonym narzędziem.

⚠️ Nie zamykaj okna cmd — serwer musi pozostać uruchomiony podczas korzystania z generatora.

### 2. W panelu wyboru zaznacz

- rok arkusza (np. 2025),

- typy zadań, które chcesz uwzględnić (np. wyjaśnij, P/F),

- (opcjonalnie) inne filtry.


### 3. Kliknij przycisk „Generuj arkusz” lub "Generuj losowe zadania"

Generuj arkusz zwraca zawsze identyczną pule zadań.
Dlatego w przypadku chęci użycia filtrów takich **czas pracy**, **liczba punktów** czy **liczba zadań**,
polecam użyć funkcji Generuj losowe zadania.


### 4. Generator automatycznie

- wyszuka zadania spełniające wybrane kryteria,
- złoży je w jeden arkusz,
- wyświetli gotowy zestaw zadań na stronie,
- umożliwi wybór konkretnych zadań do wydruku,
- pozwoli nadać nazwę arkuszowi
- w razie potrzeby może wydrukować również odpowiedzi do zadań.


### 5. Wygenerowany arkusz możesz

- rozwiązać bezpośrednio w przeglądarce,
- wydrukować,
- zapisać jako PDF (przycisk drukuj / drukuj do PDF).


### Gotowe.

---

## Instrukcja dodawania nowych zadań do bazy

### 1. Edycja bazy danych (Excel)

Naciśnij przycisk ```Meneger zadań ```

Możesz wybrać czy chcesz dodać czy wyedytować zadanie

### 2. Instalacja wymaganych bibliotek (jednorazowo)

Ten krok wykonujesz tylko raz (jeśli nie masz jeszcze bibliotek).


### 3. Generowanie plików JSON



### 4. Dodanie treści zadania (HTML)

W folderze /tasks utwórz plik HTML z treścią zadania.

Nazwa pliku musi być identyczna jak wartość w kolumnie html w Excelu.

Zalecana konwencja nazw plików:

CKE_M15R_2020_maj_Z09_0.html

Znaczenie:
- CKE – źródło
- M15 – matura w formule 2015
- R – poziom rozszerzony
- 2020 – rok
- maj – sesja
- Z09 – numer zadania
- 0 – zadanie nierozbite (np. nie 9.1 / 9.2)

Jeśli zadanie jest rozbite:
- użyj 1, 2, itd. (np. Z09_1, Z09_2)

⚠️ Nazwy plików nie mogą się dublować.



## 6. Załączniki (mapy, ilustracje)

Jeżeli zadanie zawiera:
- mapę
- schemat
- rysunek

Dodaj plik graficzny w miejscach "Załączniki"
Jeżeli zadanie jest wiązką lub mapa, i załącznik odnosi do więcej niż jednego zadania, załącznik należy dodać tylko raz. 
Program automatycznie dowiązuje dany załącznik do innych zadań, o ile prawidłowo zostaly one opisane w metadanych.


--- 

## UWAGA

Nie zmieniaj struktury folderów projektu — generator korzysta z konkretnych ścieżek plików.
Zmiana nazw lub lokalizacji folderów może spowodować błędy działania.

---
*W przyszłości może dzięki LAN będzie możliwość robienia testów uczniom przez telefon - uczniowie łączą się na ten sam wi-fi jak laptop nauczyciela, skanują kod QR, wypełniają zadania w teleforach i zakończ, zwraca nauczycielowi zebrane odpowiedzi w folderze odpowiedzi*

*W przyszłości może import i export zadań w łatwy sposób, żeby można się było dzielić w łatwy sposób*

## Inspiracje

Inspiracją do powstania GeoFinder były m.in. narzędzia takie jak Biologhelp, pokazujące, jak przydatne może być filtrowanie zadań egzaminacyjnych według określonych kryteriów.

Projekt GeoFinder nie jest kopią istniejących rozwiązań — został zaprojektowany od podstaw z myślą o geografii i jej specyfice.

Informacja o źródłach materiałów

Projekt GeoFinder wykorzystuje treści zadań maturalnych pochodzące z arkuszy Centralnej Komisji Egzaminacyjnej (CKE).

Dla Ambitnych - projekt można dostosować na potrzeby innych przedmiotów. 

---

## Materiały te:

- są używane wyłącznie w celach edukacyjnych i dydaktycznych,
- nie są przedmiotem sprzedaży ani komercyjnego wykorzystania,
- służą do analizy, porządkowania i ćwiczenia rozwiązywania zadań maturalnych.

Prawa autorskie do treści zadań, poleceń oraz materiałów źródłowych pozostają własnością CKE.
Projekt ma charakter narzędzia pomocniczego (generatora arkuszy) i nie stanowi oficjalnego materiału CKE.

---

## Licencja

Kod projektu (HTML / CSS / JavaScript / Python) udostępniany jest na zasadach licencji MIT.
Treści zadań maturalnych podlegają prawom autorskim CKE i są wykorzystywane wyłącznie w celach edukacyjnych.

---

## Miłego użytkowania! ❤️🫡

---
## ❤️ Dedykacja 

Narzędzie to pragnę zadedykować moim „oprawczyniom geograficznym”, które przez lata maltretowały mnie kserówkami. 
I <3 U baby! 
Bez was by to nie powstało! Kto ma wiedzieć ten będzie wiedział.
