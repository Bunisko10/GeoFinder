# GeoFinder

**GeoFinder** to narzędzie do wyszukiwania i generowania zestawów zadań maturalnych z geografii na podstawie filtrów.

Projekt działa lokalnie w przeglądarce z użyciem prostego serwera HTTP.  
Nie da się go uruchomić przez dwuklik (`file:///`), ponieważ korzysta z JavaScript (`fetch`).

Generator jest również dostępny online przez GitHub Pages:

- https://bunisko10.github.io/GeoFinder/print/generator_student.html  
- https://bunisko10.github.io/GeoFinder/print/generator_teacher.html  

---

## Wymagania

- **Python 3.x**

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

### 1. Zainstaluj Pythona

Pobierz Pythona z:
https://www.python.org/downloads/

Podczas instalacji zaznacz:
- **Add Python to PATH**


### 2. (Jeśli Python nie działa – Windows)

1. Ustawienia → **Apps** → **App execution aliases**
2. Wyłącz:
   - `python.exe`
   - `python3.exe`


### 3. Sprawdź instalację

Otwórz wiersz poleceń (cmd) i wpisz:

```bash
python --version
```
Jeżeli zwróci np. ```Python 3.14.2 ```— wszystko ok.

### 4. Uruchom serwer

Przejdź do folderu projektu:
```cd "C:\twoja\ścieżka\do\GEOFINDER"```

Uruchom serwer:
```python -m http.server```

⚠️ Nie zamykaj okna cmd — serwer musi pozostać uruchomiony podczas korzystania z generatora.


### 5. Otwórz generator

W przeglądarce wejdź na:

```http://localhost:8000/print/generator_student.html```

```http://localhost:8000/print/generator_teacher.html```


### 6. W panelu wyboru zaznacz

- rok arkusza (np. 2025),

- typy zadań, które chcesz uwzględnić (np. wyjaśnij, P/F),

- (opcjonalnie) inne filtry.


### 7. Kliknij przycisk „Generuj arkusz” lub "Generuj losowe zadania"

Generuj arkusz zwraca zawsze identyczną pule zadań.
Dlatego w przypadku chęci użycia filtrów takich **czas pracy**, **liczba punktów** czy **liczba zadań**,
polecam użyć funkcji Generuj losowe zadania.


### 8. Generator automatycznie

- wyszuka zadania spełniające wybrane kryteria,
- złoży je w jeden arkusz,
- wyświetli gotowy zestaw zadań na stronie,
- umożliwi wybór konkretnych zadań do wydruku,
- pozwoli nadać nazwę arkuszowi
- w razie potrzeby może wydrukować również odpowiedzi do zadań.


### 9. Wygenerowany arkusz możesz

- rozwiązać bezpośrednio w przeglądarce,
- wydrukować,
- zapisać jako PDF (przycisk drukuj / drukuj do PDF).


### Gotowe.

---

## Instrukcja dodawania nowych zadań do bazy

### 1. Edycja bazy danych (Excel)

Otwórz plik ```GEOFINDER_index.xlsx```

Dodaj nowe wiersze z danymi zadania:

- rok,
- typ zadania,
- punkty,
- flaga student (T / puste)
- kolumna html – nazwa pliku zadania (KLUCZ!)
- itd.

***Zapisz plik.***

**⚠️ Uwaga: wartości w kolumnie html:**
- muszą być unikalne,
- nie mogą się powtarzać,
- muszą dokładnie odpowiadać nazwie pliku HTML zadania.

### 2. Instalacja wymaganych bibliotek (jednorazowo)

Ten krok wykonujesz tylko raz (jeśli nie masz jeszcze bibliotek).

Otwórz Wiersz poleceń (cmd) (Start → wpisz cmd → Enter)

Przejdź do folderu projektu:

```cd "C:\ścieżka\do\GEOFINDER"```


Zainstaluj wymagane biblioteki:

```pip install -r requirements.txt```


Jeżeli polecenie zakończy się bez błędów — wszystko jest gotowe.

### 3. Generowanie plików JSON

Otwórz Wiersz poleceń (cmd)

Przejdź do folderu projektu

Uruchom skrypt:

```python convert_index_to_json.py```


**⚠️ Dwukrotne kliknięcie pliku .py może działać tylko w niektórych konfiguracjach systemu.
Zalecaną metodą jest uruchamianie skryptu przez wiersz poleceń.**

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

### 5. Styl i poprawność HTML

Baza zadań opiera się na HTML

Należy trzymać się istniejącego style.css

Nie dodawaj własnych stylów inline (jeżeli nie ogarniasz)

Jeżeli:
- coś się nie wyświetla poprawnie,
- nie wiesz, jak odwzorować tabelę lub układ zadania

➡️ Najprościej: wklej do ChatGPT (lub innego narzędzia AI):
- fragment style.css,
- screen zadania
- i wygeneruj HTML zgodny ze stylem projektu.

## 6. Załączniki (mapy, ilustracje)

Jeżeli zadanie zawiera:
- mapę
- schemat
- rysunek

Dodaj plik graficzny do folderu /img.

Jeśli przerabiasz załącznik na HTML (np. by zachować layout / podpisy), dodaj go do folderu /attachments.

W HTML zadania:
- użyj unikalnych id,
- nie dubluj nazw plików.

⚠️ Duplikaty ID lub nazw plików mogą powodować błędy w generatorze.

--- 

## UWAGA

Nie zmieniaj struktury folderów projektu — generator korzysta z konkretnych ścieżek plików.
Zmiana nazw lub lokalizacji folderów może spowodować błędy działania.

---

## Inspiracje

Inspiracją do powstania GeoFinder były m.in. narzędzia takie jak Biologhelp, pokazujące, jak przydatne może być filtrowanie zadań egzaminacyjnych według określonych kryteriów.

Projekt GeoFinder nie jest kopią istniejących rozwiązań — został zaprojektowany od podstaw z myślą o geografii i jej specyfice.

Informacja o źródłach materiałów

Projekt GeoFinder wykorzystuje treści zadań maturalnych pochodzące z arkuszy Centralnej Komisji Egzaminacyjnej (CKE).

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
