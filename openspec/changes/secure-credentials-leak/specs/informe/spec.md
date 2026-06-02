# Informe Specification

## Purpose

The Informe domain manages the lifecycle and access of publisher activity reports. This specification defines the requirements for securely retrieving and listing reports without exposing database credentials to the client-side presentation layer.

## Requirements

### Requirement: GET API Endpoint (SEC-001)

The system MUST expose a GET API endpoint at `/api/informe` to query reports.
It SHALL accept optional filter query parameters: `año` (integer), `mes` (string), `rol` (string), and `grupo` (integer).
It MUST return a JSON response with status 200 containing matching report records upon success, or return status 400 for malformed parameters, or status 500 for server errors.

#### Scenario: Retrieve reports with all filters

- GIVEN reports exist for year 2026, month 'MAY', role 'publicador', and group 1
- WHEN a GET request is made to `/api/informe?año=2026&mes=MAY&rol=publicador&grupo=1`
- THEN the system MUST return status 200 with the matching reports in JSON format

#### Scenario: Retrieve reports with invalid query parameters

- GIVEN the API endpoint `/api/informe`
- WHEN a GET request is made with an invalid year value `año=abc`
- THEN the system MUST return status 400 and an error message

---

### Requirement: Secure Report Querying (SEC-002)

The system MUST execute all database report queries on the server-side, protecting database credentials from frontend exposure.
The application layer Use Case MUST orchestrate the retrieval from the repository port without exposing connection strings or API keys to the client.
All database URL and authentication token values MUST be resolved server-side from environment variables.

#### Scenario: Usecase resolves database client using server-side environment variables

- GIVEN database credentials are configured in server environment variables
- WHEN `GetInformesUseCase` is executed
- THEN it MUST connect to the database securely using the server repository implementation

#### Scenario: Client request triggers usecase execution

- GIVEN a request to `/api/informe`
- WHEN the GET endpoint receives a valid request
- THEN it MUST instantiate the repository and usecase on the server and return the results

---

### Requirement: Client-Side Route Delegation (SEC-003)

The client component `ListaInformes` MUST delegate all data fetching to the server-side API endpoints `/api/informe` and `/api/grupos`.
The component MUST NOT instantiate the database client or import `@libsql/client`.
The component MUST NOT contain hardcoded database URL or write token credentials.
It MUST fetch the reports list and group options using secure HTTPS/HTTP requests.

#### Scenario: Client fetches reports from API endpoint

- GIVEN the `ListaInformes` component is loaded with active filters
- WHEN the component mounts or filters change
- THEN it MUST send an asynchronous GET request to `/api/informe` with the query parameters

#### Scenario: Client fetches group options from API endpoint

- GIVEN the `ListaInformes` component requires the list of groups
- WHEN the component mounts
- THEN it MUST send an asynchronous GET request to `/api/grupos` to retrieve group metadata
