/**
 * Test fixture: Invalid viola.config.ts
 * This config has syntax errors
 */
import { viola } from "@hiisi/viola";

// Missing export and syntax error
const config = viola().
  // Incomplete chain
