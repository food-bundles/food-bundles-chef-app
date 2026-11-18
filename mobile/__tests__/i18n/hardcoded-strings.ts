/// <reference types="node" />
/**
 * Finds user-facing text written directly in source instead of going through t():
 *  - JSX text and string literals rendered as JSX children ({cond ? 'On' : 'Off'})
 *  - string-literal user-facing props (label, placeholder, accessibilityLabel, …)
 *  - user-facing object properties ({ text: 'Cancel' } alert buttons, { label: … } options)
 *  - Alert.alert(...) title and message literals
 * Used by no-hardcoded-strings.test.ts.
 */
import fs from 'fs';
import path from 'path';
import ts from 'typescript';
import { ROOT, sourceFiles } from './locale-files';

/** JSX props whose string values are read by people (on screen or by a screen reader). */
const USER_FACING_PROPS = new Set([
  'accessibilityHint',
  'accessibilityLabel',
  'actionLabel',
  'cancelLabel',
  'confirmLabel',
  'description',
  'label',
  'manualLabel',
  'message',
  'placeholder',
  'retryLabel',
  'subtitle',
  'title',
]);

/** Object properties that end up on screen (alert buttons, option lists, notifications). */
const USER_FACING_KEYS = new Set([
  'accessibilityLabel',
  'body',
  'cancelLabel',
  'confirmLabel',
  'description',
  'label',
  'message',
  'placeholder',
  'subtitle',
  'text',
  'title',
]);

/**
 * Text that is the same in every language: currency and unit symbols, separators,
 * and placeholder digits. Anything with real words must be translated.
 */
const LANGUAGE_NEUTRAL = /^(RWF|kg|g|l|ml|pcs|AI|[\d\s.,:;%+×x·•—–\-/()#*]+)$/i;
/** An i18n key reference such as "menu.scan.howBody" (translated where it is rendered). */
const I18N_KEY = /^[a-z][A-Za-z0-9_]*(\.[A-Za-z0-9_]+)+$/;

const EXCLUDED = [
  /[\\/]app[\\/]\(dev\)[\\/]/, // dev-only UI gallery, unreachable in production builds
  /[\\/]src[\\/]data[\\/]mock[\\/]/, // sample data for mock adapters, not UI copy
];

export interface HardcodedString {
  file: string;
  line: number;
  text: string;
}

function needsTranslation(text: string): boolean {
  const value = text.replace(/\s+/g, ' ').trim();
  if (!value || LANGUAGE_NEUTRAL.test(value) || I18N_KEY.test(value)) return false;
  return /\p{L}{2,}/u.test(value);
}

/** String literals in positions where they become the rendered value. */
function valueLiterals(expr: ts.Expression | undefined, out: ts.Node[] = []): ts.Node[] {
  if (!expr) return out;
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) out.push(expr);
  else if (ts.isConditionalExpression(expr)) {
    valueLiterals(expr.whenTrue, out);
    valueLiterals(expr.whenFalse, out);
  } else if (
    ts.isBinaryExpression(expr) &&
    [ts.SyntaxKind.BarBarToken, ts.SyntaxKind.QuestionQuestionToken, ts.SyntaxKind.AmpersandAmpersandToken].includes(
      expr.operatorToken.kind,
    )
  ) {
    valueLiterals(expr.right, out);
  } else if (ts.isParenthesizedExpression(expr)) valueLiterals(expr.expression, out);
  else if (ts.isTemplateExpression(expr)) {
    out.push(expr.head);
    expr.templateSpans.forEach((span) => out.push(span.literal));
  }
  return out;
}

function literalText(node: ts.Node): string {
  if (
    ts.isStringLiteral(node) ||
    ts.isNoSubstitutionTemplateLiteral(node) ||
    ts.isTemplateHead(node) ||
    ts.isTemplateMiddle(node) ||
    ts.isTemplateTail(node)
  ) {
    return node.text;
  }
  return '';
}

export function findHardcodedStrings(): HardcodedString[] {
  const found: HardcodedString[] = [];
  for (const file of sourceFiles()) {
    if (EXCLUDED.some((re) => re.test(file))) continue;
    const isTsx = file.endsWith('.tsx');
    const source = ts.createSourceFile(
      file,
      fs.readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      isTsx ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
    );
    const report = (node: ts.Node, text: string) =>
      found.push({
        file: path.relative(ROOT, file).replace(/\\/g, '/'),
        line: source.getLineAndCharacterOfPosition(node.getStart()).line + 1,
        text: text.trim().slice(0, 80),
      });
    const reportLiterals = (nodes: ts.Node[]) =>
      nodes.forEach((n) => {
        const text = literalText(n);
        if (needsTranslation(text)) report(n, text);
      });

    const visit = (node: ts.Node) => {
      if (ts.isJsxText(node) && needsTranslation(node.text)) report(node, node.text);

      if (ts.isJsxExpression(node) && node.parent && (ts.isJsxElement(node.parent) || ts.isJsxFragment(node.parent))) {
        reportLiterals(valueLiterals(node.expression));
      }

      if (ts.isJsxAttribute(node) && USER_FACING_PROPS.has(node.name.getText(source)) && node.initializer) {
        const init = node.initializer;
        if (ts.isStringLiteral(init)) reportLiterals([init]);
        else if (ts.isJsxExpression(init)) reportLiterals(valueLiterals(init.expression));
      }

      if (ts.isPropertyAssignment(node) && USER_FACING_KEYS.has(node.name.getText(source))) {
        reportLiterals(valueLiterals(node.initializer));
      }

      if (ts.isCallExpression(node) && node.expression.getText(source) === 'Alert.alert') {
        reportLiterals(node.arguments.slice(0, 2).flatMap((arg) => valueLiterals(arg)));
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }
  return found;
}
