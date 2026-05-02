import fs from 'fs';

export class JsonStore<T> {
  private readonly path: string;

  constructor(
    filename: string,
    private readonly defaultFactory: () => T,
    private readonly mode?: number,
  ) {
    this.path = `${process.env.KONTEKST_FOLDER}/${filename}`;
  }

  read(): T {
    if (!fs.existsSync(this.path)) {
      const initial = this.defaultFactory();
      this.write(initial);
      return initial;
    }
    return JSON.parse(fs.readFileSync(this.path, 'utf8')) as T;
  }

  write(value: T): void {
    fs.writeFileSync(this.path, JSON.stringify(value, null, 2));
    if (this.mode !== undefined) fs.chmodSync(this.path, this.mode);
  }
}
