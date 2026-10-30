import * as fs from "fs";
import * as path from "path";
import ts from "typescript";

// Análisis estático de los textos que necesita el cliente (openspec:
// trim-client-messages). Solo lo usan `scripts/generate-client-messages.ts` y su
// prueba; nunca la app en runtime (depende de `typescript` y del disco).
//
// Para cada archivo de ruta de `src/app/[locale]/` recorre su grafo de imports,
// marca como cliente todo lo que está bajo un `"use client"` y, en esos módulos,
// resuelve cada `useTranslations(ns)` y sus llamadas `t("clave")` a rutas de
// mensajes (`ns.clave`). Cada `<ClientMessages scope="…">` recibe la unión de las
// rutas de los archivos de ruta que envuelve, menos lo que ya entregan los
// proveedores que lo rodean (el cliente los fusiona). Ante la duda, sube a un
// nivel más general (el prefijo estático de una clave dinámica, o el namespace
// entero si `t` se usa de una forma que no se puede seguir): sobra texto, nunca
// falta.

/** Nombres de archivo que Next trata como archivos de ruta. */
const ROUTE_FILE = /^(page|layout|error|loading|not-found|template|default)\.tsx$/;

/** Todo el árbol de mensajes: `useMessages()` o un namespace no literal. */
const ALL = "";

export interface ScopeInfo {
  /** Archivo de ruta que renderiza el proveedor, relativo a `src/app/[locale]/`, sin extensión. */
  scope: string;
  /** Proveedor que lo rodea (`null` para el layout raíz). */
  parent: string | null;
  /** Archivos de ruta que quedan bajo este proveedor (el más cercano). */
  routeFiles: string[];
  /** Rutas de mensajes que entrega este proveedor, además de las de los que lo rodean. */
  paths: string[];
}

export interface Analysis {
  scopes: ScopeInfo[];
  /** Usos que no se pudieron acotar a una clave (se entrega el namespace o el prefijo entero). */
  fallbacks: Array<{ location: string; path: string }>;
  /** Rutas de mensajes que pide cada archivo de ruta por sí solo (para medir y elegir dónde poner proveedores). */
  routes: Array<{ routeFile: string; paths: string[] }>;
  /** Problemas de convención (scope que no coincide con su archivo, uso fuera de una ruta). */
  problems: string[];
}

function toPosix(value: string): string {
  return value.replaceAll("\\", "/");
}

function join(ns: string, key: string): string {
  return ns === ALL ? key : `${ns}.${key}`;
}

/** `true` si la ruta `general` incluye a `specific` (`users` ⊇ `users.title`, `users.empty*` ⊇ `users.emptyFollowers`). */
export function coversPath(general: string, specific: string): boolean {
  if (general === ALL || general === specific) return true;
  if (general.endsWith("*")) return specific.startsWith(general.slice(0, -1));
  return specific.startsWith(`${general}.`);
}

/** Quita rutas cubiertas por otra más general y ordena el resultado. */
export function normalizePaths(paths: Iterable<string>): string[] {
  const unique = [...new Set(paths)].sort();
  return unique.filter((candidate) => !unique.some((other) => other !== candidate && coversPath(other, candidate)));
}

/**
 * Prefijo estático de una clave dinámica: hasta el punto (`"kinds.${k}"` →
 * `"kinds"`) o, si el segmento quedó a medias, ese segmento como prefijo
 * (`"empty${v}"` → `"empty*"`: toda clave hermana que empiece así).
 */
function staticPrefix(head: string): string | null {
  if (head === "") return null;
  if (head.endsWith(".")) return head.slice(0, -1);
  return `${head}*`;
}

function hasUseClient(sf: ts.SourceFile): boolean {
  for (const statement of sf.statements) {
    if (!ts.isExpressionStatement(statement) || !ts.isStringLiteral(statement.expression)) break;
    if (statement.expression.text === "use client") return true;
  }
  return false;
}

/** Claves posibles de un argumento de `t(...)`; `null` si no se puede acotar. */
function keyPaths(arg: ts.Expression, checker: ts.TypeChecker): string[] | null {
  if (ts.isStringLiteral(arg) || ts.isNoSubstitutionTemplateLiteral(arg)) return [arg.text];
  if (ts.isParenthesizedExpression(arg) || ts.isAsExpression(arg) || ts.isSatisfiesExpression(arg)) {
    return keyPaths(arg.expression, checker);
  }
  if (ts.isConditionalExpression(arg)) {
    const whenTrue = keyPaths(arg.whenTrue, checker);
    const whenFalse = keyPaths(arg.whenFalse, checker);
    return whenTrue && whenFalse ? [...whenTrue, ...whenFalse] : null;
  }
  // Un tipo de unión de literales (`"a" | "b"`) acota la clave aunque venga de una variable.
  const type = checker.getTypeAtLocation(arg);
  // `undefined`/`null` no son claves (una función que a veces no devuelve nada).
  const parts = (type.isUnion() ? type.types : [type]).filter(
    (part) => !(part.flags & (ts.TypeFlags.Undefined | ts.TypeFlags.Null)),
  );
  if (parts.length > 0 && parts.every((part) => part.isStringLiteral())) {
    return parts.map((part) => (part as ts.StringLiteralType).value);
  }
  if (ts.isTemplateExpression(arg)) {
    const prefix = staticPrefix(arg.head.text);
    return prefix === null ? null : [prefix];
  }
  if (ts.isBinaryExpression(arg) && arg.operatorToken.kind === ts.SyntaxKind.PlusToken) {
    const left = arg.left;
    if (ts.isStringLiteral(left) || ts.isNoSubstitutionTemplateLiteral(left)) {
      const prefix = staticPrefix(left.text);
      return prefix === null ? null : [prefix];
    }
  }
  return null;
}

const T_METHODS = new Set(["rich", "markup", "raw", "has"]);

/** Parámetros de la función o componente declarado por `symbol` (sigue los alias de import). */
function declaredParameters(
  symbol: ts.Symbol | undefined,
  checker: ts.TypeChecker,
): readonly ts.ParameterDeclaration[] | null {
  if (!symbol) return null;
  const target = symbol.flags & ts.SymbolFlags.Alias ? checker.getAliasedSymbol(symbol) : symbol;
  const declaration = target.declarations?.[0];
  if (!declaration || declaration.getSourceFile().isDeclarationFile) return null;
  if (ts.isFunctionDeclaration(declaration) || ts.isMethodDeclaration(declaration)) return declaration.parameters;
  if (
    ts.isVariableDeclaration(declaration) &&
    declaration.initializer &&
    (ts.isArrowFunction(declaration.initializer) || ts.isFunctionExpression(declaration.initializer))
  ) {
    return declaration.initializer.parameters;
  }
  return null;
}

/** `true` si `node` está en el array de dependencias de un hook (`useMemo(…, [t])`): no lee claves. */
function isHookDependency(node: ts.Node): boolean {
  const array = node.parent;
  if (!ts.isArrayLiteralExpression(array) || !ts.isCallExpression(array.parent)) return false;
  const call = array.parent;
  return ts.isIdentifier(call.expression) && /^use[A-Z]/.test(call.expression.text) && call.arguments[0] !== array;
}

/** `true` si `node` es el nombre que se declara (variable, parámetro o desestructuración), no un uso. */
function isDeclarationName(node: ts.Identifier): boolean {
  const parent = node.parent;
  return (
    (ts.isVariableDeclaration(parent) || ts.isParameter(parent) || ts.isBindingElement(parent)) &&
    parent.name === node
  );
}

/**
 * Rutas de mensajes que pide un módulo si se ejecuta en el cliente. Cada `t` se
 * sigue también cuando se pasa a una función o componente del proyecto
 * (`fn(t)`, `<Fila t={t} />`): sus usos ahí cuentan para este módulo.
 */
function collectFilePaths(
  sf: ts.SourceFile,
  checker: ts.TypeChecker,
  onFallback: (node: ts.Node, path: string) => void,
): Set<string> {
  const paths = new Set<string>();
  const scanned = new Map<ts.Symbol, Set<string>>();

  function addWhole(node: ts.Node, wholePath: string): void {
    onFallback(node, wholePath);
    paths.add(wholePath);
  }

  function addKeys(ns: string, arg: ts.Expression | undefined, node: ts.Node): void {
    const keys = arg ? keyPaths(arg, checker) : null;
    if (!keys) {
      addWhole(node, ns);
      return;
    }
    for (const key of keys) paths.add(join(ns, key));
  }

  /** Sigue la `t` hasta el parámetro que la recibe (o su prop `prop`); `false` si no se puede. */
  function followInto(parameter: ts.ParameterDeclaration | undefined, prop: string | null, ns: string): boolean {
    if (!parameter || !ts.isFunctionLike(parameter.parent)) return false;
    let name: ts.Identifier | undefined;
    if (prop === null && ts.isIdentifier(parameter.name)) name = parameter.name;
    if (prop !== null && ts.isObjectBindingPattern(parameter.name)) {
      for (const element of parameter.name.elements) {
        const key = element.propertyName ?? element.name;
        if (ts.isIdentifier(key) && key.text === prop && ts.isIdentifier(element.name)) name = element.name;
      }
    }
    const symbol = name ? checker.getSymbolAtLocation(name) : undefined;
    if (!symbol) return false;
    scanBinding(symbol, ns, parameter.parent);
    return true;
  }

  /** Clasifica cada uso de `symbol` (una `t` con namespace `ns`) dentro de `root`. */
  function scanBinding(symbol: ts.Symbol, ns: string, root: ts.Node): void {
    const seen = scanned.get(symbol) ?? new Set<string>();
    if (seen.has(ns)) return;
    seen.add(ns);
    scanned.set(symbol, seen);

    function classify(node: ts.Identifier): void {
      const parent = node.parent;
      if (ts.isCallExpression(parent) && parent.expression === node) {
        addKeys(ns, parent.arguments[0], parent);
      } else if (
        ts.isPropertyAccessExpression(parent) &&
        parent.expression === node &&
        T_METHODS.has(parent.name.text) &&
        ts.isCallExpression(parent.parent) &&
        parent.parent.expression === parent
      ) {
        addKeys(ns, parent.parent.arguments[0], parent.parent);
      } else if (isHookDependency(node)) {
        // Solo dispara el recálculo.
      } else if (ts.isCallExpression(parent) && parent.arguments.includes(node)) {
        const parameters = declaredParameters(checker.getSymbolAtLocation(parent.expression), checker);
        if (!followInto(parameters?.[parent.arguments.indexOf(node)], null, ns)) addWhole(node, ns);
      } else if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent) && ts.isIdentifier(parent.parent.name)) {
        const element = parent.parent.parent.parent;
        const tag = ts.isJsxOpeningElement(element) || ts.isJsxSelfClosingElement(element) ? element.tagName : null;
        const parameters = tag ? declaredParameters(checker.getSymbolAtLocation(tag), checker) : null;
        if (!followInto(parameters?.[0], parent.parent.name.text, ns)) addWhole(node, ns);
      } else {
        addWhole(node, ns);
      }
    }

    function visit(node: ts.Node): void {
      // Filtro por nombre antes de consultar al checker (es lo caro del análisis).
      if (
        ts.isIdentifier(node) &&
        node.text === symbol.name &&
        !isDeclarationName(node) &&
        checker.getSymbolAtLocation(node) === symbol
      ) {
        classify(node);
      }
      ts.forEachChild(node, visit);
    }
    visit(root);
  }

  function isHook(node: ts.CallExpression, name: string): boolean {
    return ts.isIdentifier(node.expression) && node.expression.text === name;
  }

  // Cada `useTranslations(ns)`: se sigue su constante o, si no, cuenta entero.
  function findHooks(node: ts.Node): void {
    if (ts.isCallExpression(node) && isHook(node, "useMessages")) addWhole(node, ALL);
    if (ts.isCallExpression(node) && isHook(node, "useTranslations")) {
      const [nsArg] = node.arguments;
      const ns = !nsArg ? ALL : ts.isStringLiteral(nsArg) ? nsArg.text : null;
      const parent = node.parent;
      const symbol =
        ts.isVariableDeclaration(parent) && ts.isIdentifier(parent.name)
          ? checker.getSymbolAtLocation(parent.name)
          : undefined;
      if (ns === null) addWhole(node, ALL);
      else if (symbol) scanBinding(symbol, ns, sf);
      else if (ts.isCallExpression(parent) && parent.expression === node) addKeys(ns, parent.arguments[0], parent);
      else addWhole(node, ns);
    }
    ts.forEachChild(node, findHooks);
  }

  findHooks(sf);
  return paths;
}

/** Especificadores de los imports con valor (sin `import type`) de un módulo. */
function importSpecifiers(sf: ts.SourceFile): string[] {
  const specifiers: string[] = [];
  function visit(node: ts.Node): void {
    if (ts.isImportDeclaration(node) && ts.isStringLiteral(node.moduleSpecifier)) {
      const clause = node.importClause;
      const typeOnly =
        clause?.isTypeOnly ||
        (clause &&
          !clause.name &&
          clause.namedBindings &&
          ts.isNamedImports(clause.namedBindings) &&
          clause.namedBindings.elements.length > 0 &&
          clause.namedBindings.elements.every((element) => element.isTypeOnly));
      if (!typeOnly) specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isExportDeclaration(node) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      !node.isTypeOnly
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      specifiers.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return specifiers;
}

interface Declaration {
  scope: string;
  form: "jsx" | "default-export" | "other-call";
}

/**
 * Proveedores que declara un módulo: `<ClientMessages scope="…">` (solo el layout
 * raíz) o `export default withClientMessages("…", Ruta)` (páginas y layouts).
 */
function scopeDeclarations(sf: ts.SourceFile): Declaration[] {
  const declarations: Declaration[] = [];
  function visit(node: ts.Node): void {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      ts.isIdentifier(node.tagName) &&
      node.tagName.text === "ClientMessages"
    ) {
      for (const attribute of node.attributes.properties) {
        if (
          ts.isJsxAttribute(attribute) &&
          ts.isIdentifier(attribute.name) &&
          attribute.name.text === "scope" &&
          attribute.initializer &&
          ts.isStringLiteral(attribute.initializer)
        ) {
          declarations.push({ scope: attribute.initializer.text, form: "jsx" });
        }
      }
    }
    if (
      ts.isCallExpression(node) &&
      ts.isIdentifier(node.expression) &&
      node.expression.text === "withClientMessages" &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0])
    ) {
      const exported = ts.isExportAssignment(node.parent) && !node.parent.isExportEquals;
      declarations.push({ scope: node.arguments[0].text, form: exported ? "default-export" : "other-call" });
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  return declarations;
}

export function analyzeClientMessages(root: string): Analysis {
  const config = ts.readConfigFile(path.join(root, "tsconfig.json"), ts.sys.readFile);
  const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, root);
  const appDir = path.join(root, "src", "app", "[locale]");
  const sourceRoot = path.resolve(root, "src");
  const i18nDir = path.join(sourceRoot, "i18n") + path.sep;

  const routeFiles: string[] = [];
  (function walk(dir: string): void {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (ROUTE_FILE.test(entry.name)) routeFiles.push(path.resolve(full));
    }
  })(appDir);
  routeFiles.sort();

  const program = ts.createProgram({
    rootNames: routeFiles,
    options: { ...parsed.options, noEmit: true, incremental: false },
  });
  const checker = program.getTypeChecker();

  const resolved = new Map<string, string[]>();
  function dependencies(file: string): string[] {
    const cached = resolved.get(file);
    if (cached) return cached;
    const sf = program.getSourceFile(file);
    const result: string[] = [];
    for (const specifier of sf ? importSpecifiers(sf) : []) {
      const resolution = ts.resolveModuleName(specifier, file, parsed.options, ts.sys).resolvedModule;
      if (!resolution || resolution.isExternalLibraryImport) continue;
      const target = path.resolve(resolution.resolvedFileName);
      if (!target.startsWith(sourceRoot) || !/\.tsx?$/.test(target) || target.endsWith(".d.ts")) continue;
      result.push(target);
    }
    resolved.set(file, result);
    return result;
  }

  const fallbacks: Analysis["fallbacks"] = [];
  const filePaths = new Map<string, Set<string>>();
  function pathsOf(file: string): Set<string> {
    let paths = filePaths.get(file);
    if (!paths) {
      const sf = program.getSourceFile(file);
      paths = sf
        ? collectFilePaths(sf, checker, (node, fallbackPath) => {
            // El uso puede estar en otro módulo (una función que recibió la `t`).
            const at = node.getSourceFile();
            const { line } = at.getLineAndCharacterOfPosition(node.getStart(at));
            const location = `${toPosix(path.relative(root, at.fileName))}:${line + 1}`;
            if (!fallbacks.some((f) => f.location === location && f.path === fallbackPath)) {
              fallbacks.push({ location, path: fallbackPath });
            }
          })
        : new Set();
      filePaths.set(file, paths);
    }
    return paths;
  }

  /** Rutas de mensajes de los módulos cliente alcanzables desde un archivo de ruta. */
  function routeNeeds(entry: string): Set<string> {
    const needs = new Set<string>();
    const seen = new Set<string>();
    const stack: Array<[string, boolean]> = [[entry, false]];
    while (stack.length > 0) {
      const [file, parentClient] = stack.pop()!;
      const sf = program.getSourceFile(file);
      if (!sf) continue;
      const client = parentClient || hasUseClient(sf);
      const key = `${client ? "c" : "s"}:${file}`;
      if (seen.has(key)) continue;
      seen.add(key);
      // `src/i18n/` es la fontanería del proveedor (`NestedMessages` lee el contexto
      // padre con `useMessages`), no pide textos.
      if (client && !file.startsWith(i18nDir)) for (const p of pathsOf(file)) needs.add(p);
      for (const dependency of dependencies(file)) stack.push([dependency, client]);
    }
    return needs;
  }

  const idOf = (file: string): string => toPosix(path.relative(appDir, file)).replace(/\.tsx$/, "");
  const problems: string[] = [];

  // Proveedores declarados: el `scope` tiene que ser el propio archivo de ruta, el
  // raíz con `<ClientMessages>` y el resto con `export default withClientMessages(…)`
  // (envuelve todo lo que renderiza el archivo, con cualquier `return`).
  const scopeIds = new Set<string>();
  for (const sf of program.getSourceFiles()) {
    const file = path.resolve(sf.fileName);
    if (!file.startsWith(sourceRoot) || file.endsWith(".d.ts")) continue;
    const isRoute = routeFiles.includes(file);
    const where = isRoute ? idOf(file) : toPosix(path.relative(root, file));
    for (const { scope, form } of scopeDeclarations(sf)) {
      if (!isRoute) {
        problems.push(`${where}: los proveedores de textos solo se declaran en archivos de ruta de src/app/[locale]/`);
      } else if (scope !== where) {
        problems.push(`${where}: el scope "${scope}" debe ser "${where}"`);
      } else if (scope === "layout" ? form !== "jsx" : form !== "default-export") {
        problems.push(
          scope === "layout"
            ? 'layout: el layout raíz envuelve su <body> con <ClientMessages scope="layout">'
            : `${where}: declarar el proveedor como export default withClientMessages("${where}", …)`,
        );
      } else {
        scopeIds.add(scope);
      }
    }
  }
  if (!scopeIds.has("layout")) problems.push('layout: el layout raíz debe renderizar <ClientMessages scope="layout">');

  /** Layout con proveedor más profundo en `dir` (relativo a `[locale]`) o en una carpeta superior. */
  function layoutScopeFrom(dir: string): string | null {
    for (let current = dir; ; current = path.posix.dirname(current)) {
      const layout = current === "." ? "layout" : `${current}/layout`;
      if (scopeIds.has(layout)) return layout;
      if (current === ".") return null;
    }
  }

  /** Proveedor más cercano de un archivo de ruta: la propia página si declara uno, si no el layout. */
  function nearestScope(id: string): string | null {
    if (scopeIds.has(id) && id.endsWith("page")) return id;
    return layoutScopeFrom(path.posix.dirname(id));
  }

  /** Proveedor que rodea a otro: para una página, el layout de su carpeta; para un layout, el de arriba. */
  function parentScope(scope: string): string | null {
    if (scope === "layout") return null;
    const dir = path.posix.dirname(scope);
    if (scope.endsWith("page")) return layoutScopeFrom(dir);
    return dir === "." ? null : layoutScopeFrom(path.posix.dirname(dir));
  }

  const routes = routeFiles.map((file) => ({ routeFile: idOf(file), paths: normalizePaths(routeNeeds(file)) }));

  const needsByScope = new Map<string, { files: string[]; needs: string[] }>();
  for (const scope of scopeIds) needsByScope.set(scope, { files: [], needs: [] });
  for (const route of routes) {
    const scope = nearestScope(route.routeFile);
    if (!scope) continue;
    const bucket = needsByScope.get(scope)!;
    bucket.files.push(route.routeFile);
    bucket.needs.push(...route.paths);
  }

  // El layout raíz entrega solo lo que piden sus propios archivos (cabecera, menú,
  // pie, error, no encontrado): una página que pida más declara su proveedor en vez
  // de agrandar lo que recibe cada respuesta de la app.
  const isRootShellFile = (id: string): boolean => !id.includes("/") && !id.endsWith("page");
  const rootBase = normalizePaths(routes.filter((route) => isRootShellFile(route.routeFile)).flatMap((r) => r.paths));
  for (const route of routes) {
    if (nearestScope(route.routeFile) !== "layout" || isRootShellFile(route.routeFile)) continue;
    const extra = route.paths.filter((candidate) => !rootBase.some((general) => coversPath(general, candidate)));
    if (extra.length > 0) {
      problems.push(
        `${route.routeFile}: pide textos que el layout raíz no entrega (${extra.slice(0, 3).join(", ")}${extra.length > 3 ? ", …" : ""}); ` +
          `declarar export default withClientMessages("${route.routeFile}", …) aquí o en un layout superior`,
      );
    }
  }

  // Lo que entrega cada proveedor sumando los que lo rodean (el cliente los fusiona).
  const provided = new Map<string, string[]>();
  function providedBy(scope: string | null): string[] {
    if (scope === null) return [];
    const cached = provided.get(scope);
    if (cached) return cached;
    const own = ownPaths(scope);
    const result = normalizePaths([...providedBy(parentScope(scope)), ...own]);
    provided.set(scope, result);
    return result;
  }
  function ownPaths(scope: string): string[] {
    const inherited = providedBy(parentScope(scope));
    return normalizePaths(needsByScope.get(scope)!.needs).filter(
      (candidate) => !inherited.some((general) => coversPath(general, candidate)),
    );
  }

  const scopes = [...needsByScope.entries()]
    .map(([scope, { files }]) => ({ scope, parent: parentScope(scope), routeFiles: files, paths: ownPaths(scope) }))
    .sort((a, b) => a.scope.localeCompare(b.scope));
  for (const { scope, paths } of scopes) {
    if (scope !== "layout" && paths.length === 0) {
      problems.push(`${scope}: withClientMessages no aporta textos (todo lo entrega un proveedor superior); quitarlo`);
    }
  }
  fallbacks.sort((a, b) => a.location.localeCompare(b.location, undefined, { numeric: true }));
  return { scopes, routes, fallbacks, problems };
}
