# Spec: Exclusive Preaching Roles

## Requirements

### Requirement: Preaching Role Exclusivity
Every user MUST have exactly one preaching role assigned from the set `['publicador', 'auxiliar', 'regular']`.

#### Scenario: User created with default preaching role
- **GIVEN** a new user creation payload with no preaching role specified
- **WHEN** the `CreateUserUseCase` processes the request
- **THEN** the system MUST assign `'publicador'` as the default preaching role

#### Scenario: User created or updated with a specific preaching role
- **GIVEN** a user creation or update payload specifying `'regular'`
- **WHEN** the use case processes the request
- **THEN** the system MUST assign `'regular'` and SHALL NOT assign any other preaching role

#### Scenario: Rejection of multiple preaching roles
- **GIVEN** a user creation or update payload containing both `'publicador'` and `'regular'`
- **WHEN** the use case processes the request
- **THEN** the system MUST reject the operation and throw a validation error

### Requirement: Congregational Appointments Coexistence
A user MAY have zero or more congregational appointments (`'anciano'`, `'siervo'`, `'secretario'`, `'coordinador'`) alongside their single preaching role.

#### Scenario: Combining preaching role and elder appointment
- **GIVEN** a user with preaching role `'regular'` and appointment `'anciano'`
- **WHEN** the user is created or updated
- **THEN** the system MUST successfully persist both roles

#### Scenario: Rejection of incompatible appointments
- **GIVEN** a payload containing both `'anciano'` and `'siervo'`
- **WHEN** the use case processes the request
- **THEN** the system MUST reject the operation and throw a validation error

### Requirement: Database Data Integrity
The database MUST NOT contain users with multiple preaching roles or users with zero preaching roles.

#### Scenario: Migration cleanses legacy mixed roles
- **GIVEN** a user in the database with roles `['publicador', 'regular']`
- **WHEN** the data migration script runs
- **THEN** the migration MUST remove `'publicador'` and keep `'regular'`

#### Scenario: Migration assigns default preaching role to appointment-only users
- **GIVEN** a user in the database with only `'anciano'`
- **WHEN** the data migration script runs
- **THEN** the migration MUST add `'publicador'` to the user's roles
