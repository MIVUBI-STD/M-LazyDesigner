import { lintMolangExpression } from "../molangSyntax";

export type AnimationMolangExpressionInput = {
  source: string;
  expression: string;
  expects_value?: boolean;
};

const EASING_DIRECTIONS = ["ease_in", "ease_in_out", "ease_out"] as const;
const EASING_SHAPES = ["back","bounce","circ","cubic","elastic","expo","quad","quart","quint","sine"] as const;
const BASE_MATH_SYMBOLS = [
  "abs","acos","asin","atan","atan2","ceil","clamp","copy_sign","cos","die_roll","die_roll_integer","exp","floor","hermite_blend","inverse_lerp","lerp","lerprotate","ln","max","min","min_angle","mod","pi","pow","random","random_integer","round","sign","sin","sqrt","trunc",
] as const;

export const MOLANG_ANIMATION_MATH_SYMBOLS = Object.freeze([
  ...BASE_MATH_SYMBOLS,
  ...EASING_DIRECTIONS.flatMap((direction) => EASING_SHAPES.map((shape) => `${direction}_${shape}`)),
].sort());

const OFFICIAL_MATH = new Set<string>(MOLANG_ANIMATION_MATH_SYMBOLS);
const VERSION_SENSITIVE_MATH = new Set<string>(MOLANG_ANIMATION_MATH_SYMBOLS.filter((name) => name.startsWith("ease_")));
const NONDETERMINISTIC_MATH = new Set(["die_roll","die_roll_integer","random","random_integer"]);
const SCOPE_ALIASES: Record<string, "query" | "variable" | "temp" | "context" | "global"> = {
  q:"query",query:"query",v:"variable",variable:"variable",t:"temp",temp:"temp",c:"context",context:"context",global:"global",
};
const ISSUE_EXAMPLE_LIMIT = 8;
const sortedUnique = (values: Iterable<string>) => [...new Set(values)].sort((a,b) => a.localeCompare(b));
const normalizedExpression = (value: string) => value.trim();

function findMathSymbols(expression: string): string[] {
  const symbols: string[] = [];
  for (const match of expression.matchAll(/\bmath\.([a-z_][a-z0-9_]*)\s*\(/gi)) symbols.push(match[1].toLowerCase());
  if (/\bmath\.pi\b/i.test(expression)) symbols.push("pi");
  return sortedUnique(symbols);
}

function findScopedDependencies(expression: string) {
  const values = { query:[] as string[], variable:[] as string[], temp:[] as string[], context:[] as string[], global:[] as string[] };
  const pattern = /\b(q|query|v|variable|t|temp|c|context|global)\.([a-z_][a-z0-9_]*)/gi;
  for (const match of expression.matchAll(pattern)) {
    const scope = SCOPE_ALIASES[match[1].toLowerCase()];
    values[scope].push(`${scope}.${match[2].toLowerCase()}`);
  }
  return { query: sortedUnique(values.query), variable: sortedUnique(values.variable), temp: sortedUnique(values.temp), context: sortedUnique(values.context), global: sortedUnique(values.global) };
}

function findForbiddenAnimationNamespaces(expression: string): string[] {
  const found: string[] = [];
  for (const match of expression.matchAll(/\b(material|texture|geometry)\.([a-z_][a-z0-9_]*)/gi)) found.push(`${match[1].toLowerCase()}.${match[2].toLowerCase()}`);
  return sortedUnique(found);
}
const compactExpression = (expression:string) => { const compact=expression.replace(/\s+/g," ").trim(); return compact.length<=160?compact:`${compact.slice(0,157)}...`; };

export function analyzeAnimationMolangExpressions(inputs: readonly AnimationMolangExpressionInput[]) {
  const expressions = inputs.map((input) => ({...input,expression:normalizedExpression(input.expression)})).filter((input) => input.expression.length>0);
  const usedMath:string[]=[], unknownMath:string[]=[], versionSensitiveMath:string[]=[], nondeterministicMath:string[]=[], forbiddenNamespaces:string[]=[];
  const dependencies={query:[] as string[],variable:[] as string[],temp:[] as string[],context:[] as string[],global:[] as string[]};
  const usedQueries:string[]=[], unknownQueries:string[]=[], internalQueries:string[]=[], clientOnlyQueries:string[]=[];
  const versionSensitiveQueries=new Map<string,string>();
  const syntaxFeatures:string[]=[];
  let syntaxErrorCount=0, syntaxWarningCount=0, missingReturnCount=0;
  const issueExamples:Array<{source:string;issue:string;detail:string;expression:string}>=[];

  for (const input of expressions) {
    for (const name of findMathSymbols(input.expression)) {
      if (OFFICIAL_MATH.has(name)) { usedMath.push(name); if(VERSION_SENSITIVE_MATH.has(name))versionSensitiveMath.push(name); if(NONDETERMINISTIC_MATH.has(name))nondeterministicMath.push(name); }
      else { unknownMath.push(name); if(issueExamples.length<ISSUE_EXAMPLE_LIMIT)issueExamples.push({source:input.source,issue:"unknown_math",detail:`math.${name}`,expression:compactExpression(input.expression)}); }
    }
    const scoped=findScopedDependencies(input.expression);
    for(const scope of Object.keys(dependencies) as Array<keyof typeof dependencies>)dependencies[scope].push(...scoped[scope]);
    const forbidden=findForbiddenAnimationNamespaces(input.expression); forbiddenNamespaces.push(...forbidden);
    if(forbidden.length&&issueExamples.length<ISSUE_EXAMPLE_LIMIT)issueExamples.push({source:input.source,issue:"forbidden_namespace",detail:forbidden.join(", "),expression:compactExpression(input.expression)});

    const syntax=lintMolangExpression(input.expression);
    syntaxFeatures.push(...syntax.features); usedQueries.push(...syntax.queries.used); unknownQueries.push(...syntax.queries.unknown); internalQueries.push(...syntax.queries.internal_or_deprecated); clientOnlyQueries.push(...syntax.queries.client_only);
    for(const q of syntax.queries.version_sensitive)versionSensitiveQueries.set(q.name,q.min_format_version);
    syntaxErrorCount += syntax.diagnostics.filter((x)=>x.severity==="error").length;
    syntaxWarningCount += syntax.diagnostics.filter((x)=>x.severity==="warning").length;
    for(const d of syntax.diagnostics.slice(0, Math.max(0, ISSUE_EXAMPLE_LIMIT-issueExamples.length))) issueExamples.push({source:input.source,issue:d.code,detail:d.message,expression:compactExpression(input.expression)});

    if(input.expects_value!==false&&input.expression.includes(";")&&!/\breturn\b/i.test(input.expression)&&input.expression.replace(/[\s;]+/g,"").length>0){missingReturnCount+=1;if(issueExamples.length<ISSUE_EXAMPLE_LIMIT)issueExamples.push({source:input.source,issue:"missing_return",detail:"Complex value expression contains statements but no return.",expression:compactExpression(input.expression)});}
  }
  const recognized=sortedUnique(usedMath),unknown=sortedUnique(unknownMath),forbidden=sortedUnique(forbiddenNamespaces);
  return {
    state:"available" as const,
    expression_count:expressions.length,
    official_math_catalog_size:MOLANG_ANIMATION_MATH_SYMBOLS.length,
    math:{used_count:recognized.length,used:recognized,unknown,nondeterministic:sortedUnique(nondeterministicMath),version_sensitive_1_21_120:sortedUnique(versionSensitiveMath)},
    queries:{used:sortedUnique(usedQueries),unknown:sortedUnique(unknownQueries),internal_or_deprecated:sortedUnique(internalQueries),client_only:sortedUnique(clientOnlyQueries),version_sensitive:[...versionSensitiveQueries].sort(([a],[b])=>a.localeCompare(b)).map(([name,min_format_version])=>({name,min_format_version}))},
    dependencies:{query:sortedUnique(dependencies.query),variable:sortedUnique(dependencies.variable),temp:sortedUnique(dependencies.temp),context:sortedUnique(dependencies.context),global:sortedUnique(dependencies.global)},
    syntax:{valid:syntaxErrorCount===0,error_count:syntaxErrorCount,warning_count:syntaxWarningCount,features:sortedUnique(syntaxFeatures)},
    forbidden_animation_namespaces:forbidden,
    complex_missing_return_count:missingReturnCount,
    issue_examples:issueExamples,
    issue_examples_truncated:unknown.length+forbidden.length+missingReturnCount+syntaxErrorCount+syntaxWarningCount>issueExamples.length,
    note:"Current stable Bedrock math and query names are recognized without evaluating gameplay truth. Syntax diagnostics are structural/lint evidence; unknown names are preserved as forward-compatibility review candidates.",
  };
}
