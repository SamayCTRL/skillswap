# Skill Swap - Testing Documentation

## Overview

This project includes a comprehensive testing suite covering unit tests, integration tests, and end-to-end tests. The testing strategy ensures reliability, security, and functionality of the skill-sharing marketplace application.

## Testing Stack

- **Unit Tests**: Jest + Supertest
- **Integration Tests**: Jest + Real Database
- **End-to-End Tests**: Playwright
- **CI/CD**: GitHub Actions
- **Coverage**: Jest Coverage Reports

## Test Categories

### 1. Unit Tests (`tests/unit/`)

#### Backend Unit Tests
- **Routes**: Test API endpoints in isolation with mocked dependencies
- **Middleware**: Test authentication, validation, and security middleware
- **Utilities**: Test helper functions and database utilities

#### Frontend Unit Tests
- **Navigation**: Test client-side routing and state management
- **Components**: Test UI component logic (expandable)

**Run**: `npm run test:unit`

### 2. Integration Tests (`tests/integration/`)

#### API Integration Tests
- **Authentication Flow**: Complete user registration, login, and token refresh
- **Database Integration**: Real database operations with test data
- **Error Handling**: Test error scenarios with actual dependencies

**Run**: `npm run test:integration`

### 3. End-to-End Tests (`tests/e2e/`)

#### User Journey Tests
- **Homepage**: Navigation, responsive design, basic functionality
- **Authentication**: Complete registration and login flows
- **Skills Browsing**: Skill listing, filtering, and details
- **Protected Routes**: Access control and redirects

**Run**: `npm run test:e2e`

## Test Configuration

### Environment Setup

1. **Test Database**: `skill_swap_test`
2. **Test Environment**: `.env.test`
3. **Port**: `3001` (to avoid conflicts)

### Database Setup for Tests

**Note**: Integration tests require PostgreSQL setup. If database is not available, integration tests will be skipped.

```bash
# 1. Install PostgreSQL (if not already installed)
# macOS: brew install postgresql
# Ubuntu: sudo apt-get install postgresql

# 2. Start PostgreSQL service
# macOS: brew services start postgresql
# Ubuntu: sudo service postgresql start

# 3. Create test database
createdb skill_swap_test

# 4. Setup database schema
PGPASSWORD=postgres psql -h localhost -U postgres -d skill_swap_test -f server/models/database.sql

# 5. Run integration tests
npm run test:integration
```

**Alternative: Run only unit tests**
```bash
# Skip database-dependent tests
npm test
# or
npm run test:unit
```

## Running Tests

### Individual Test Suites

```bash
# Unit tests only
npm run test:unit

# Integration tests only  
npm run test:integration

# E2E tests only
npm run test:e2e

# All tests
npm run test:all
```

### Development Testing

```bash
# Watch mode for unit tests
npm run test:watch

# Generate coverage report
npm run test:coverage
```

### CI/CD Testing

Tests automatically run on:
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Multiple Node.js versions (18.x, 20.x)
- Multiple browsers for E2E (Chrome, Firefox, Safari)

## Test Structure Examples

### Unit Test Example

```javascript
describe('Auth Routes', () => {
  test('should register a new user successfully', async () => {
    // Mock dependencies
    db.getUserByEmail.mockResolvedValue(null);
    bcrypt.hash.mockResolvedValue('hashedpassword');
    
    const response = await request(app)
      .post('/api/auth/register')
      .send({ name: 'Test', email: 'test@test.com', password: 'pass123' });
    
    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
  });
});
```

### Integration Test Example

```javascript
describe('Auth Integration Tests', () => {
  test('should complete full registration flow', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send(testUser);
    
    expect(response.status).toBe(201);
    // Test continues with real database operations
  });
});
```

### E2E Test Example

```javascript
test('should navigate to login page', async ({ page }) => {
  await page.goto('/');
  await page.click('button:has-text("Sign In")');
  await expect(page).toHaveURL('/login');
});
```

## Coverage Goals

- **Unit Tests**: >90% code coverage
- **Integration Tests**: All API endpoints covered
- **E2E Tests**: All user journeys covered

## Test Data Management

### Mock Data
- Consistent test fixtures in `tests/setup.js`
- Helper functions for creating test objects
- Predictable UUIDs and timestamps

### Database Cleanup
- Automatic cleanup before/after tests
- Isolated test transactions
- Test-specific database schema

## Debugging Tests

### Failed Tests
1. Check test logs in console output
2. Review browser screenshots (E2E failures)
3. Examine coverage reports for missed paths

### Local Development
```bash
# Run single test file
npx jest tests/unit/routes/auth.test.js

# Run with debug output
DEBUG=* npm test

# Run E2E tests with headed browser
npx playwright test --headed
```

## Continuous Integration

### GitHub Actions Workflow
1. **Setup**: Install dependencies, setup database
2. **Lint**: Code quality checks
3. **Unit Tests**: Fast isolated tests
4. **Integration Tests**: Database integration
5. **Security**: Vulnerability scanning
6. **E2E Tests**: Full user journey testing
7. **Coverage**: Generate and upload coverage reports

### Quality Gates
- All tests must pass
- Coverage must meet thresholds
- Security vulnerabilities must be resolved
- E2E tests must pass in multiple browsers

## Best Practices

### Writing Tests
1. **Arrange, Act, Assert**: Clear test structure
2. **Descriptive Names**: Test names explain what they verify
3. **Single Responsibility**: Each test verifies one thing
4. **Independent Tests**: No test dependencies

### Mocking Strategy
1. **Unit Tests**: Mock all external dependencies
2. **Integration Tests**: Use real database, mock external APIs
3. **E2E Tests**: Real application with test data

### Performance
1. **Parallel Execution**: Tests run in parallel where possible
2. **Timeout Configuration**: Appropriate timeouts for different test types
3. **Selective Testing**: Run relevant tests based on changes

## Future Enhancements

### Planned Additions
- [ ] Visual regression testing
- [ ] Performance testing
- [ ] Load testing with artillery
- [ ] API contract testing
- [ ] Accessibility testing
- [ ] Mobile browser testing

### Monitoring
- [ ] Test result dashboards
- [ ] Coverage tracking over time
- [ ] Flaky test identification
- [ ] Performance metrics

## Troubleshooting

### Common Issues

#### Database Connection
```bash
# Check if PostgreSQL is running
pg_ctl status

# Create test database if missing
createdb skill_swap_test
```

#### Port Conflicts
```bash
# Check what's running on port 3001
lsof -i :3001

# Kill process if needed
kill -9 <PID>
```

#### E2E Test Failures
```bash
# Install browser dependencies
npx playwright install-deps

# Run in headed mode to see what's happening
npx playwright test --headed --debug
```

## Contributing

When adding new features:
1. Write tests first (TDD approach)
2. Ensure all test types are covered
3. Update test documentation
4. Verify CI/CD pipeline passes

For bug fixes:
1. Write failing test that reproduces bug
2. Fix the bug
3. Ensure test passes
4. Verify no regressions