// Ambient declarations for CSS imports used by Expo's *.web.tsx files.
// Metro bundles these for the web target; TypeScript needs the shims so the
// native-target typecheck doesn't trip over them.

declare module "*.module.css" {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module "*.css";
