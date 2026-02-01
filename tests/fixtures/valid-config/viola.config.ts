/**
 * Test fixture: Valid viola.config.ts
 * This config uses a mock linter for testing purposes
 */
import { viola, BaseLinter } from "@hiisi/viola";

// Mock linter for testing
class TestLinter extends BaseLinter {
  constructor() {
    super({
      id: "test-linter",
      description: "Test linter for fixtures",
    });
  }

  async *check() {
    // No-op for testing
  }
}

export default viola().add(new TestLinter());
