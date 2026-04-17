# FuelManagementWeb

This project was generated with [Angular CLI](https://github.com/angular/angular-cli) version 17.3.5.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The application will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` to build the project. The build artifacts will be stored in the `dist/` directory.

## Freepik icons (optional)

Some UI areas (e.g., the landing page benefit cards) use SVG icons stored under `src/assets/icons/benefits/`.

If you want to refresh those icons from Freepik via their Icons API, run:

PowerShell:

```powershell
$env:FREEPIK_API_KEY = "<your_api_key>"
npm run fetch:freepik-icons
```

CMD:

```bat
set FREEPIK_API_KEY=<your_api_key>
npm run fetch:freepik-icons
```

Notes:

- Freepik API keys are private (server-to-server). Do **not** put the key in Angular `environment.ts`.
- The script overwrites the local SVG files in `src/assets/icons/benefits/`.

## Running unit tests

Run `ng test` to execute the unit tests via [Karma](https://karma-runner.github.io).

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via a platform of your choice. To use this command, you need to first add a package that implements end-to-end testing capabilities.

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI Overview and Command Reference](https://angular.io/cli) page.
