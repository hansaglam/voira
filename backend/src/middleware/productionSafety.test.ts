import assert from 'node:assert/strict';
import test from 'node:test';
import { validateProductionConfig } from '../config.js';

test('validateProductionConfig throws with missing variable names in production', () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    ADMIN_SECRET: process.env.ADMIN_SECRET,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    ENABLE_PRONUNCIATION_ASSESSMENT: process.env.ENABLE_PRONUNCIATION_ASSESSMENT,
    AZURE_SPEECH_KEY: process.env.AZURE_SPEECH_KEY,
    AZURE_SPEECH_REGION: process.env.AZURE_SPEECH_REGION,
  };

  process.env.NODE_ENV = 'production';
  process.env.OPENAI_API_KEY = '';
  process.env.ADMIN_SECRET = '';
  process.env.SUPABASE_URL = '';
  process.env.SUPABASE_SERVICE_ROLE_KEY = '';
  process.env.ENABLE_PRONUNCIATION_ASSESSMENT = 'false';

  try {
    assert.throws(
      () => validateProductionConfig(),
      (error: unknown) => {
        const message = error instanceof Error ? error.message : String(error);
        assert.match(message, /OPENAI_API_KEY/);
        assert.match(message, /ADMIN_SECRET/);
        assert.match(message, /SUPABASE_URL/);
        assert.match(message, /SUPABASE_SERVICE_ROLE_KEY/);
        return true;
      },
    );
  } finally {
    process.env.NODE_ENV = previous.NODE_ENV;
    process.env.OPENAI_API_KEY = previous.OPENAI_API_KEY;
    process.env.ADMIN_SECRET = previous.ADMIN_SECRET;
    process.env.SUPABASE_URL = previous.SUPABASE_URL;
    process.env.SUPABASE_SERVICE_ROLE_KEY = previous.SUPABASE_SERVICE_ROLE_KEY;
    process.env.ENABLE_PRONUNCIATION_ASSESSMENT = previous.ENABLE_PRONUNCIATION_ASSESSMENT;
    process.env.AZURE_SPEECH_KEY = previous.AZURE_SPEECH_KEY;
    process.env.AZURE_SPEECH_REGION = previous.AZURE_SPEECH_REGION;
  }
});

test('validateProductionConfig allows development without production secrets', () => {
  const previous = process.env.NODE_ENV;
  process.env.NODE_ENV = 'development';
  try {
    assert.doesNotThrow(() => validateProductionConfig());
  } finally {
    process.env.NODE_ENV = previous;
  }
});
