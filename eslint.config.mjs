import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // 项目级放宽：本项目大量使用 `any` 配合 supabase-js / 第三方 JSON 库，
  // 强制严格类型会显著降低开发效率且无明显收益。保留其他规则。
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      // "set-state-in-effect" 规则过严：业务上 hydration / 跨标签状态同步等场景
      // 必须读 localStorage 后 setState。保留 useEffect 写法。
      "react-hooks/set-state-in-effect": "off",
      // empty interface 用于 BaziInput 别名 / 类型合并
      "@typescript-eslint/no-empty-object-type": "off",
      // 带下划线前缀的参数/变量默认为"有意保留"（如占位 props、catch (e) 等）
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Deployment scripts (use CommonJS require)
    "scripts/**",
    // Service Worker 是独立运行时,变量/错误处理遵循浏览器 API 习惯
    "public/sw.js",
  ]),
]);

export default eslintConfig;
