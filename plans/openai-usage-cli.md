# OpenAI Usage Tracking CLI Tool Implementation Plan

**Goal:** Build a CLI-only dashboard to track OpenAI API usage and costs per API key, with sync/report/watch commands.

## Implementation Steps

[ ] 1. **Project Setup and Dependencies**
   [ ] Install required npm packages (commander, axios, better-sqlite3, cli-table3, chalk, node-cron, node-notifier)
   [ ] Create TypeScript configuration for CLI development
   [ ] Set up folder structure (/src with subdirectories: collectors/, calc/, db/, reporters/)

[ ] 2. **Database Layer**
   [ ] Create SQLite schema file (db/schema.sql) with usage tracking table
   [ ] Implement database initialization and connection module
   [ ] Add migration/setup script for first-time users

[ ] 3. **API Collectors**
   [ ] Implement usage.ts collector for /v1/organization/usage/completions endpoint
   [ ] Add pagination support with LIMIT 30 and cursor handling
   [ ] Implement costs.ts collector for /v1/organization/costs endpoint (optional)
   [ ] Add error handling and retry logic for API failures
   [ ] Support --dry-run flag to test without DB writes

[ ] 4. **Cost Calculator Module**
   [ ] Create price-sheet.json with current OpenAI model pricing
   [ ] Implement cost.ts module to calculate USD from token counts
   [ ] Add model-specific pricing logic
   [ ] Support price updates via configuration

[ ] 5. **CLI Command Structure**
   [ ] Set up main CLI entry point (cli.ts) using Commander
   [ ] Implement `sync` command with --lookback parameter
   [ ] Implement `report` command with filtering options (--from, --to, --channel, --format, --top, --metric)
   [ ] Implement `watch` command with --threshold parameter (optional)

[ ] 6. **Reporters**
   [ ] Create table.ts for ASCII table output using cli-table3
   [ ] Create json.ts for JSON export
   [ ] Create csv.ts for CSV export
   [ ] Add formatting and color support with chalk

[ ] 7. **Configuration and Security**
   [ ] Set up environment variable handling for ADMIN_KEY
   [ ] Add configuration file support for default settings
   [ ] Implement secure key storage recommendations

[ ] 8. **NPM Script Integration**
   [ ] Add `openai-usage` script to package.json
   [ ] Create wrapper script for easy execution
   [ ] Add common usage examples as npm scripts

[ ] 9. **Testing and Documentation**
   [ ] Write unit tests for cost calculations
   [ ] Test API pagination and error scenarios
   [ ] Create README with usage examples
   [ ] Add inline code documentation

**Key Considerations:**

[ ] Rate limiting - Respect OpenAI's API rate limits with appropriate delays
[ ] Data retention - Define how long to keep historical usage data
[ ] Key rotation - Support updating ADMIN_KEY without interrupting service
[ ] Error recovery - Handle partial sync failures gracefully
[ ] Performance - Optimize DB queries for large datasets
[ ] Compatibility - Ensure works with both SQLite and PostgreSQL
[ ] Security - Never log or expose API keys in output