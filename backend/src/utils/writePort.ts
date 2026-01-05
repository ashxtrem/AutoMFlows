import * as fs from 'fs';
import * as path from 'path';

const PORT_FILE = path.join(process.cwd(), '.automflows-port');

export function writePortFile(port: number): void {
  try {
    fs.writeFileSync(PORT_FILE, port.toString(), 'utf8');
  } catch (error) {
    console.warn('Failed to write port file:', error);
  }
}

export function readPortFile(): number | null {
  try {
    if (fs.existsSync(PORT_FILE)) {
      const content = fs.readFileSync(PORT_FILE, 'utf8');
      return parseInt(content.trim(), 10);
    }
  } catch (error) {
    console.warn('Failed to read port file:', error);
  }
  return null;
}

export function deletePortFile(): void {
  try {
    if (fs.existsSync(PORT_FILE)) {
      fs.unlinkSync(PORT_FILE);
    }
  } catch (error) {
    // Ignore errors
  }
}

