import type { ParsedLegacyDump, ParsedRow, SqlScalar } from "./types";

const INCLUDED_TABLES = new Set(["user", "address", "category", "author", "book"]);

const EXCLUDED_COLUMNS = new Map<string, ReadonlySet<string>>([
  ["user", new Set(["Password"])],
]);

export const EXPECTED_COLUMNS: Readonly<Record<string, readonly string[]>> = {
  user: [
    "UserId",
    "CreateDate",
    "FirstName",
    "LastName",
    "PhoneNumber",
    "Email",
    "Username",
    "UserStatus",
    "Password",
    "AddressId",
    "General1",
    "General2",
    "General3",
    "General4",
    "General5",
    "General6",
    "General7",
    "General8",
    "General9",
    "General10",
  ],
  address: [
    "AddressId",
    "ZipCode",
    "City",
    "StreetName",
    "General1",
    "General2",
    "General3",
    "General4",
    "General5",
    "General6",
    "General7",
    "General8",
    "General9",
    "General10",
  ],
  category: ["CategoryId", "CategoryName", "CategoryAbbreviation"],
  author: ["authorid", "firstname", "middlename", "lastname"],
  book: [
    "BookId",
    "Title",
    "Author",
    "CategoryId",
    "PublishedYear",
    "StatusId",
    "Barcode",
    "UserId",
    "Memo",
    "Isbn",
    "Secondowner",
    "General1",
    "General2",
    "General3",
    "General4",
    "General5",
    "General6",
    "General7",
    "General8",
    "General9",
    "General10",
  ],
};

export class ImportValidationError extends Error {
  readonly code: string;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(code: string, message: string, details?: Readonly<Record<string, unknown>>) {
    super(message);
    this.name = "ImportValidationError";
    this.code = code;
    this.details = details;
  }
}

function splitStatements(sql: string): string[] {
  const statements: string[] = [];
  let start = 0;
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;

  for (let index = 0; index < sql.length; index += 1) {
    const character = sql[index];

    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\" && quote !== "`") {
        escaped = true;
      } else if (character === quote) {
        if (quote === "'" && sql[index + 1] === "'") {
          index += 1;
        } else {
          quote = null;
        }
      }
      continue;
    }

    if (character === "'" || character === '"' || character === "`") {
      quote = character;
      continue;
    }

    if (character === ";") {
      statements.push(sql.slice(start, index));
      start = index + 1;
    }
  }

  if (quote !== null) {
    throw new ImportValidationError("UNTERMINATED_SQL_QUOTE", "The SQL dump contains an unterminated quoted value.");
  }

  const remainder = sql.slice(start).trim();
  if (remainder.length > 0) {
    statements.push(remainder);
  }

  return statements;
}

function splitTopLevelCommaList(value: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;

  for (let index = 0; index < value.length; index += 1) {
    const character = value[index];
    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\" && quote !== "`") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
    } else if (character === "," && depth === 0) {
      parts.push(value.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(value.slice(start).trim());
  return parts;
}

function findMatchingParenthesis(value: string, openIndex: number): number {
  let depth = 0;
  let quote: "'" | '"' | "`" | null = null;
  let escaped = false;

  for (let index = openIndex; index < value.length; index += 1) {
    const character = value[index];
    if (quote !== null) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\" && quote !== "`") {
        escaped = true;
      } else if (character === quote) {
        quote = null;
      }
      continue;
    }
    if (character === "'" || character === '"' || character === "`") {
      quote = character;
    } else if (character === "(") {
      depth += 1;
    } else if (character === ")") {
      depth -= 1;
      if (depth === 0) {
        return index;
      }
    }
  }
  return -1;
}

function parseCreateColumns(statement: string, table: string): readonly string[] {
  const createMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?/i);
  if (!createMatch || createMatch[1].toLowerCase() !== table) {
    return [];
  }
  const openIndex = statement.indexOf("(", createMatch.index! + createMatch[0].length);
  const closeIndex = openIndex >= 0 ? findMatchingParenthesis(statement, openIndex) : -1;
  if (openIndex < 0 || closeIndex < 0) {
    throw new ImportValidationError("INVALID_CREATE_TABLE", `Unable to parse the ${table} table definition.`);
  }
  return splitTopLevelCommaList(statement.slice(openIndex + 1, closeIndex))
    .map((definition) => definition.match(/^`([^`]+)`/u)?.[1] ?? null)
    .filter((column): column is string => column !== null);
}

function decodeMysqlEscape(character: string): string {
  switch (character) {
    case "0": return "\0";
    case "b": return "\b";
    case "n": return "\n";
    case "r": return "\r";
    case "t": return "\t";
    case "Z": return "\u001a";
    default: return character;
  }
}

function parseScalar(input: string, startIndex: number, capture: boolean): { value: SqlScalar | undefined; nextIndex: number } {
  let index = startIndex;
  while (/\s/u.test(input[index] ?? "")) index += 1;

  if (input[index] === "'") {
    index += 1;
    let value = "";
    while (index < input.length) {
      const character = input[index];
      if (character === "\\") {
        const escaped = input[index + 1];
        if (escaped === undefined) {
          throw new ImportValidationError("INVALID_ESCAPED_VALUE", "The SQL dump contains an incomplete escaped value.");
        }
        if (capture) value += decodeMysqlEscape(escaped);
        index += 2;
      } else if (character === "'") {
        if (input[index + 1] === "'") {
          if (capture) value += "'";
          index += 2;
        } else {
          return { value: capture ? value : undefined, nextIndex: index + 1 };
        }
      } else {
        if (capture) value += character;
        index += 1;
      }
    }
    throw new ImportValidationError("UNTERMINATED_SQL_VALUE", "The SQL dump contains an unterminated value.");
  }

  const tokenStart = index;
  while (index < input.length && input[index] !== "," && input[index] !== ")") index += 1;
  const token = input.slice(tokenStart, index).trim();
  if (token.length === 0) {
    throw new ImportValidationError("EMPTY_SQL_VALUE", "The SQL dump contains an empty value token.");
  }
  if (!capture) return { value: undefined, nextIndex: index };
  return { value: /^NULL$/iu.test(token) ? null : token, nextIndex: index };
}

function parseInsertRows(statement: string, table: string, schemaColumns: readonly string[]): readonly ParsedRow[] {
  const insertMatch = statement.match(/INSERT\s+INTO\s+`?([A-Za-z0-9_]+)`?\s*(?:\(([^)]*)\))?\s*VALUES\s*/i);
  if (!insertMatch || insertMatch[1].toLowerCase() !== table) return [];

  const columns = insertMatch[2]
    ? splitTopLevelCommaList(insertMatch[2]).map((column) => column.replaceAll("`", "").trim())
    : [...schemaColumns];
  if (columns.length === 0) {
    throw new ImportValidationError("MISSING_INSERT_COLUMNS", `No column order is available for the ${table} table.`);
  }

  const excludedColumns = EXCLUDED_COLUMNS.get(table) ?? new Set<string>();
  const values = statement.slice(insertMatch.index! + insertMatch[0].length);
  const rows: ParsedRow[] = [];
  let index = 0;

  while (index < values.length) {
    while (/\s|,/u.test(values[index] ?? "")) index += 1;
    if (index >= values.length) break;
    if (values[index] !== "(") {
      throw new ImportValidationError("INVALID_INSERT_TUPLE", `The ${table} insert has an invalid tuple boundary.`);
    }
    index += 1;
    const row: Record<string, SqlScalar> = {};

    for (let columnIndex = 0; columnIndex < columns.length; columnIndex += 1) {
      const column = columns[columnIndex];
      const parsed = parseScalar(values, index, !excludedColumns.has(column));
      index = parsed.nextIndex;
      if (!excludedColumns.has(column)) row[column] = parsed.value ?? null;
      while (/\s/u.test(values[index] ?? "")) index += 1;

      const expectedBoundary = columnIndex === columns.length - 1 ? ")" : ",";
      if (values[index] !== expectedBoundary) {
        throw new ImportValidationError("INVALID_INSERT_ARITY", `The ${table} insert does not match its column definition.`);
      }
      index += 1;
    }
    rows.push(Object.freeze(row));
  }

  return rows;
}

export function parseLegacyDump(sql: string): ParsedLegacyDump {
  const statements = splitStatements(sql);
  const schemas = new Map<string, readonly string[]>();
  const rows = new Map<string, ParsedRow[]>();

  for (const table of INCLUDED_TABLES) rows.set(table, []);

  for (const statement of statements) {
    const createMatch = statement.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?`?([A-Za-z0-9_]+)`?/i);
    if (createMatch) {
      const table = createMatch[1].toLowerCase();
      if (INCLUDED_TABLES.has(table)) schemas.set(table, parseCreateColumns(statement, table));
    }
  }

  for (const table of INCLUDED_TABLES) {
    const actual = schemas.get(table);
    const expected = EXPECTED_COLUMNS[table];
    if (!actual || actual.length !== expected.length || actual.some((column, index) => column !== expected[index])) {
      throw new ImportValidationError("SCHEMA_MISMATCH", `The approved ${table} schema does not match the SQL dump.`);
    }
  }

  for (const statement of statements) {
    const insertMatch = statement.match(/INSERT\s+INTO\s+`?([A-Za-z0-9_]+)`?/i);
    if (!insertMatch) continue;
    const table = insertMatch[1].toLowerCase();
    if (!INCLUDED_TABLES.has(table)) continue;
    rows.get(table)!.push(...parseInsertRows(statement, table, schemas.get(table)!));
  }

  return { schemas, rows };
}
