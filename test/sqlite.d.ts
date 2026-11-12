// Nur für die Tests der Bestenliste: SQLite aus Node, ohne @types/node.
declare module 'node:sqlite' {
  export class DatabaseSync {
    constructor(path: string);
    exec(sql: string): void;
    prepare(sql: string): { all(...values: unknown[]): unknown[] };
  }
}
