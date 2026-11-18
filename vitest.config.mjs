import { defineConfig } from 'vitest/config';

// getValues() の Date は appsscript.json の timeZone で解釈される。テストも同じにそろえる。
process.env.TZ = 'Asia/Tokyo';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.{mjs,js,ts}'],
  },
});
