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
  ]),
]);

export default eslintConfig;
