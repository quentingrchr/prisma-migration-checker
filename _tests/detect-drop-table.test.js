import { detectDropTable } from '../lib/utils';

const prismaWarningExample =
  'You are about to drop the column `price` on the `item` table. All the data in the column will be lost.';

describe('detectDropTable', () => {
  it('should return true if a warning is present', () => {
    const fileContent =
      'ALTER TABLE users DROP COLUMN email; ' + prismaWarningExample;
    expect(detectDropTable(fileContent)).toBe(true);
  });

  it('should return false if no drop statements are found', () => {
    const fileContent = 'CREATE TABLE users (id INT);';
    expect(detectDropTable(fileContent)).toBe(false);
  });

  it('should return false if a column named "drop" or "table" present but not in a drop statement', () => {
    const fileContent = 'CREATE TABLE users (id INT, drop INT);';
    expect(detectDropTable(fileContent)).toBe(false);
  });
});
