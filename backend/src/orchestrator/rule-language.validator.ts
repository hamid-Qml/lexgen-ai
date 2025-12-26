export type RuleSeverity = 'info' | 'warning' | 'block';
export type RuleOperator =
  | 'eq'
  | 'ne'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'contains'
  | 'starts_with'
  | 'ends_with'
  | 'regex'
  | 'exists'
  | 'empty';

export type ClauseStatus =
  | 'included'
  | 'excluded'
  | 'mandatory'
  | 'optional'
  | 'recommended';

export type ValidationError = {
  path: string;
  message: string;
};

const OPERATORS = new Set<RuleOperator>([
  'eq',
  'ne',
  'gt',
  'gte',
  'lt',
  'lte',
  'in',
  'contains',
  'starts_with',
  'ends_with',
  'regex',
  'exists',
  'empty',
]);

const CLAUSE_STATUSES = new Set<ClauseStatus>([
  'included',
  'excluded',
  'mandatory',
  'optional',
  'recommended',
]);

const ACTIONS = new Set([
  'warn',
  'block',
  'set_clause_status',
  'set_variant',
  'add_question',
  'set_variable',
]);

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function isVarRef(value: unknown): value is { var: string } {
  return isPlainObject(value) && typeof value.var === 'string' && value.var.length > 0;
}

function addError(errors: ValidationError[], path: string, message: string) {
  errors.push({ path, message });
}

function validateExpression(
  expr: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!isPlainObject(expr)) {
    addError(errors, path, 'Expression must be an object.');
    return;
  }

  const hasAll = Object.prototype.hasOwnProperty.call(expr, 'all');
  const hasAny = Object.prototype.hasOwnProperty.call(expr, 'any');
  const hasNot = Object.prototype.hasOwnProperty.call(expr, 'not');
  const hasVar = Object.prototype.hasOwnProperty.call(expr, 'var');
  const hasOp = Object.prototype.hasOwnProperty.call(expr, 'op');

  const modeCount = [hasAll, hasAny, hasNot, hasVar || hasOp].filter(Boolean)
    .length;
  if (modeCount !== 1) {
    addError(
      errors,
      path,
      'Expression must define exactly one of: all, any, not, or (var + op).',
    );
    return;
  }

  if (hasAll) {
    if (!Array.isArray(expr.all) || expr.all.length === 0) {
      addError(errors, `${path}.all`, 'all must be a non-empty array.');
      return;
    }
    expr.all.forEach((item, index) =>
      validateExpression(item, `${path}.all[${index}]`, errors),
    );
    return;
  }

  if (hasAny) {
    if (!Array.isArray(expr.any) || expr.any.length === 0) {
      addError(errors, `${path}.any`, 'any must be a non-empty array.');
      return;
    }
    expr.any.forEach((item, index) =>
      validateExpression(item, `${path}.any[${index}]`, errors),
    );
    return;
  }

  if (hasNot) {
    if (!expr.not) {
      addError(errors, `${path}.not`, 'not must be an expression.');
      return;
    }
    validateExpression(expr.not, `${path}.not`, errors);
    return;
  }

  if (!hasVar || !hasOp) {
    addError(errors, path, 'Leaf expression must include var and op.');
    return;
  }

  if (typeof expr.var !== 'string' || expr.var.length === 0) {
    addError(errors, `${path}.var`, 'var must be a non-empty string.');
  }

  if (typeof expr.op !== 'string' || !OPERATORS.has(expr.op as RuleOperator)) {
    addError(errors, `${path}.op`, 'op must be a supported operator.');
  }

  const hasValue = Object.prototype.hasOwnProperty.call(expr, 'value');
  const op = expr.op as RuleOperator | undefined;

  if (op && (op === 'exists' || op === 'empty')) {
    return;
  }

  if (!hasValue) {
    addError(errors, `${path}.value`, 'value is required for this operator.');
    return;
  }

  if (op === 'in') {
    const value = (expr as { value?: unknown }).value;
    if (!Array.isArray(value) && !isVarRef(value)) {
      addError(errors, `${path}.value`, 'value must be an array or var reference for in.');
    }
  }
}

function validateAction(
  action: unknown,
  path: string,
  errors: ValidationError[],
): void {
  if (!isPlainObject(action)) {
    addError(errors, path, 'Action must be an object.');
    return;
  }

  const actionType = action.action;
  if (typeof actionType !== 'string' || !ACTIONS.has(actionType)) {
    addError(errors, `${path}.action`, 'action must be a supported action type.');
    return;
  }

  switch (actionType) {
    case 'warn':
    case 'block': {
      if (typeof action.message !== 'string' || action.message.length === 0) {
        addError(errors, `${path}.message`, 'message is required for this action.');
      }
      if (actionType === 'warn' && action.context !== undefined && !isPlainObject(action.context)) {
        addError(errors, `${path}.context`, 'context must be an object if provided.');
      }
      return;
    }
    case 'set_clause_status': {
      if (typeof action.clause_id !== 'string' || action.clause_id.length === 0) {
        addError(errors, `${path}.clause_id`, 'clause_id is required.');
      }
      if (typeof action.status !== 'string' || !CLAUSE_STATUSES.has(action.status as ClauseStatus)) {
        addError(errors, `${path}.status`, 'status must be a valid clause status.');
      }
      return;
    }
    case 'set_variant': {
      if (typeof action.clause_id !== 'string' || action.clause_id.length === 0) {
        addError(errors, `${path}.clause_id`, 'clause_id is required.');
      }
      if (typeof action.variant_id !== 'string' || action.variant_id.length === 0) {
        addError(errors, `${path}.variant_id`, 'variant_id is required.');
      }
      return;
    }
    case 'add_question': {
      if (typeof action.question_key !== 'string' || action.question_key.length === 0) {
        addError(errors, `${path}.question_key`, 'question_key is required.');
      }
      return;
    }
    case 'set_variable': {
      if (typeof action.variable_key !== 'string' || action.variable_key.length === 0) {
        addError(errors, `${path}.variable_key`, 'variable_key is required.');
      }
      if (!Object.prototype.hasOwnProperty.call(action, 'value')) {
        addError(errors, `${path}.value`, 'value is required for set_variable.');
      }
      return;
    }
    default:
      addError(errors, `${path}.action`, 'Unhandled action type.');
  }
}

export function validateRule(rule: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isPlainObject(rule)) {
    addError(errors, '$', 'Rule must be an object.');
    return errors;
  }

  if (typeof rule.rule_id !== 'string' || rule.rule_id.length === 0) {
    addError(errors, '$.rule_id', 'rule_id is required.');
  }

  if (typeof rule.severity !== 'string' || !['info', 'warning', 'block'].includes(rule.severity)) {
    addError(errors, '$.severity', 'severity must be info, warning, or block.');
  }

  if (rule.description !== undefined && typeof rule.description !== 'string') {
    addError(errors, '$.description', 'description must be a string if provided.');
  }

  if (!Object.prototype.hasOwnProperty.call(rule, 'when')) {
    addError(errors, '$.when', 'when is required.');
  } else {
    validateExpression(rule.when, '$.when', errors);
  }

  if (!Array.isArray(rule.then) || rule.then.length === 0) {
    addError(errors, '$.then', 'then must be a non-empty array.');
  } else {
    rule.then.forEach((item: unknown, index: number) =>
      validateAction(item, `$.then[${index}]`, errors),
    );
  }

  return errors;
}

export function validateRules(rules: unknown): ValidationError[] {
  if (!Array.isArray(rules)) {
    return [{ path: '$', message: 'Rules payload must be an array.' }];
  }

  return rules.flatMap((rule, index) =>
    validateRule(rule).map((error) => ({
      path: `$[${index}]${error.path === '$' ? '' : error.path.slice(1)}`,
      message: error.message,
    })),
  );
}
